/**
 * Event Processing Service for Mining Automation - Async/Supabase version
 * 
 * All database operations are async and use Supabase for persistence.
 */

import { ethers } from 'ethers';
import {
  eventOps,
  dropOps,
  walletOps,
  logOps,
  configOps,
  MiningWallet,
  MiningConfig,
} from './databaseAdapter.js';
import { decryptWalletKey, updateWalletStatus } from './walletServiceAsync.js';

const CONTRACTS = {
  EVENT_MANAGER: '0x2CAf752814f244b3778e30c27051cc6B45CB1fc9',
  FCC_TOKEN: '0x84eBc138F4Ab844A3050a6059763D269dC9951c6',
  NFT_MANAGER: '0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B',
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const EVENT_MANAGER_ABI = [
  'function activityAdd(string _businessName, string _activityContent, string _latitudeLongitude, address _tokenContractAddr, uint256 _totalDropAmts, uint256 _dropType, uint256 _dropNumber, uint256 _minDropAmt, uint256 _maxDropAmt, uint256 _activityDeadline)',
  'function drop(uint256 _activityId, address _to, uint256 _dropAmt)',
  'function activityFinish(uint256 _activityId)',
  'function activityIdAcc() view returns (uint256)',
  'function activityInfoArrs(uint256) view returns (uint256 activityId, address businessAccount, string businessName, string activityContent, string latitudeLongitude, address tokenContractAddr, uint256 totalDropAmts, uint256 dropType, uint256 dropNumber, uint256 minDropAmt, uint256 maxDropAmt, uint256 activityDeadline)',
  'function activityInfoExtArrs(uint256) view returns (uint256 activityId, uint256 activityStatus, uint256 alreadyDropAmts, uint256 alreadyDropNumber, uint256 businessMinedAmt, uint256 businessMinedWithdrawn)',
];

const NFT_MANAGER_ABI = [
  'function getMerchantNFT(address) view returns (uint256 tokenId, uint8 nftType, uint256 mintedAt, uint256 expiredAt, bool isValid)',
  'function mintMerchantNFT(uint8 _nftType, string _name, string _description, string _businessAddress, string _website, string _socialMedia)',
];

/**
 * Process a single wallet through the mining workflow
 */
export async function processWallet(
  wallet: MiningWallet,
  passphrase: string,
  provider: ethers.JsonRpcProvider
): Promise<void> {
  const config = await configOps.get() as MiningConfig;

  // Validate config
  if (!config.recipient_address_1 || !config.recipient_address_2) {
    throw new Error('Recipients not configured');
  }

  // Get signer
  const privateKey = await decryptWalletKey(wallet, passphrase);
  const signer = new ethers.Wallet(privateKey, provider);

  // Create event record
  const eventId = await eventOps.insert(wallet.id);

  try {
    // Step 1: Check/Mint NFT if needed
    if (wallet.nft_type === 'NONE') {
      await mintNFT(signer, wallet.id, eventId);
    }

    // Step 2: Create on-chain event
    const chainEventId = await createOnChainEvent(signer, config, wallet.id, eventId);

    // Step 3: Execute drops (handle partial failure)
    let drop1Success = false;
    try {
      await executeDrop(signer, chainEventId, config.recipient_address_1, config.fcc_per_recipient, 1, eventId);
      drop1Success = true;
    } catch (drop1Error) {
      await eventOps.updateStatus(eventId, 'FAILED');
      throw drop1Error;
    }

    try {
      await executeDrop(signer, chainEventId, config.recipient_address_2, config.fcc_per_recipient, 2, eventId);
    } catch (drop2Error) {
      await eventOps.updateStatus(eventId, 'PARTIAL');
      await logOps.insert({
        wallet_id: wallet.id,
        event_id: eventId,
        level: 'WARN',
        action: 'PARTIAL_DROP',
        message: `Drop 1 succeeded but Drop 2 failed: ${(drop2Error as Error).message}`,
        tx_hash: null,
        metadata: null,
      });
      throw drop2Error;
    }

    // Step 4: Monitor for mining reward
    const rewardReceived = await monitorMiningReward(
      signer.address,
      config.expected_mining_reward,
      provider,
      eventId
    );

    // Step 5: Finish event
    await finishEvent(signer, chainEventId, eventId);

    // Update wallet for next cycle
    const finishedAt = Math.floor(Date.now() / 1000);
    await walletOps.updateLastEvent(wallet.id, eventId, finishedAt + (config.offset_minutes * 60));

    // Reset failure count on success
    await updateWalletStatus(wallet.id, 'active', 0, null);


    await logOps.insert({
      wallet_id: wallet.id,
      event_id: eventId,
      level: 'SUCCESS',
      action: 'MINING_COMPLETE',
      message: `Mining cycle completed. Reward: ${rewardReceived ? config.expected_mining_reward : '0'} FCC`,
      tx_hash: null,
      metadata: JSON.stringify({ chain_event_id: chainEventId }),
    });
  } catch (error) {
    // Update event as failed
    await eventOps.updateError(eventId, (error as Error).message);

    // Update wallet failure count
    const newFailureCount = (wallet.failure_count || 0) + 1;
    const newStatus = newFailureCount >= (config.max_retries || 3) ? 'error' : 'active';
    await updateWalletStatus(wallet.id, newStatus as 'active' | 'paused' | 'error' | 'nft_expired', newFailureCount, (error as Error).message);

    await logOps.insert({
      wallet_id: wallet.id,
      event_id: eventId,
      level: 'ERROR',
      action: 'MINING_FAILED',
      message: (error as Error).message,
      tx_hash: null,
      metadata: null,
    });

    throw error;
  }
}

/**
 * Mint NFT Pass for wallet
 */
async function mintNFT(
  signer: ethers.Wallet,
  walletId: number,
  eventId: number
): Promise<void> {
  const nftManager = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, signer);

  await logOps.insert({
    wallet_id: walletId,
    event_id: eventId,
    level: 'INFO',
    action: 'NFT_MINT_START',
    message: 'Minting NFT pass...',
    tx_hash: null,
    metadata: null,
  });

  const tx = await nftManager.mintMerchantNFT(
    2, // BASIC
    'Mining Wallet',
    'Automated mining wallet',
    '',
    '',
    ''
  );

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error('NFT mint transaction failed - no receipt');
  }
  if (receipt.status !== 1) {
    throw new Error(`NFT mint transaction reverted: ${receipt.hash}`);
  }

  // Update wallet NFT info
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
  await walletOps.updateNFT(walletId, 'BASIC', expiryTimestamp, null);

  await logOps.insert({
    wallet_id: walletId,
    event_id: eventId,
    level: 'SUCCESS',
    action: 'NFT_MINT_COMPLETE',
    message: 'NFT pass minted successfully',
    tx_hash: receipt.hash,
    metadata: null,
  });
}

/**
 * Create mining event on-chain
 */
async function createOnChainEvent(
  signer: ethers.Wallet,
  config: MiningConfig,
  walletId: number,
  eventId: number
): Promise<number> {
  const eventManager = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);
  const fcc = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, signer);

  const totalAmount = ethers.parseUnits(config.total_fcc_per_event, 6);
  const dropAmount = ethers.parseUnits(config.fcc_per_recipient, 6);

  await logOps.insert({
    wallet_id: walletId,
    event_id: eventId,
    level: 'INFO',
    action: 'EVENT_CREATE_START',
    message: `Creating event with ${config.total_fcc_per_event} FCC...`,
    tx_hash: null,
    metadata: null,
  });

  // Check and approve FCC
  const allowance = await fcc.allowance(signer.address, CONTRACTS.EVENT_MANAGER);
  if (allowance < totalAmount) {
    const approveTx = await fcc.approve(CONTRACTS.EVENT_MANAGER, totalAmount);
    await approveTx.wait();
  }

  // Create event
  const deadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
  const tx = await eventManager.activityAdd(
    'Mining Event',
    JSON.stringify({ type: 'mining', automated: true, timestamp: Date.now() }),
    '0,0',
    CONTRACTS.FCC_TOKEN,
    totalAmount,
    1, // Fixed amount
    2, // 2 recipients
    dropAmount,
    dropAmount,
    deadline,
    { gasLimit: 500000 }
  );

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error('Event creation transaction failed - no receipt');
  }
  if (receipt.status !== 1) {
    throw new Error(`Event creation transaction reverted: ${receipt.hash}`);
  }

  // Get chain event ID
  const chainEventId = Number(await eventManager.activityIdAcc());

  // Update event record
  await eventOps.updateChainId(eventId, chainEventId);

  await logOps.insert({
    wallet_id: walletId,
    event_id: eventId,
    level: 'SUCCESS',
    action: 'EVENT_CREATE_COMPLETE',
    message: `Event #${chainEventId} created on-chain`,
    tx_hash: receipt.hash,
    metadata: JSON.stringify({ chain_event_id: chainEventId }),
  });

  return chainEventId;
}

/**
 * Execute a drop to recipient
 */
async function executeDrop(
  signer: ethers.Wallet,
  chainEventId: number,
  recipient: string,
  amount: string,
  dropNumber: 1 | 2,
  eventId: number
): Promise<void> {
  const eventManager = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);
  const dropAmount = ethers.parseUnits(amount, 6);

  // Insert drop record
  const dropRecord = await dropOps.insert(eventId, recipient, amount, dropNumber);
  const dropId = dropRecord.id;

  await logOps.insert({
    wallet_id: null,
    event_id: eventId,
    level: 'INFO',
    action: `DROP_${dropNumber}_START`,
    message: `Dropping ${amount} FCC to ${recipient.slice(0, 8)}...`,
    tx_hash: null,
    metadata: null,
  });

  try {
    const tx = await eventManager.drop(chainEventId, recipient, dropAmount, {
      gasLimit: 300000,
    });

    // Wait with timeout
    const receipt = await Promise.race([
      tx.wait(1),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Transaction confirmation timeout (120s)')), 120000)
      )
    ]);

    if (!receipt) {
      throw new Error('Drop transaction failed - no receipt');
    }
    if (receipt.status !== 1) {
      throw new Error(`Drop transaction reverted: ${receipt.hash}`);
    }

    // Update drop record
    await dropOps.updateStatus(dropId, 'CONFIRMED', receipt.hash, receipt.blockNumber, receipt.gasUsed.toString());

    // Update event record
    if (dropNumber === 1) {
      await eventOps.updateDrop1(eventId, receipt.hash, amount);
    } else {
      const totalAmount = (parseFloat(amount) * 2).toString();
      await eventOps.updateDrop2(eventId, receipt.hash, amount, totalAmount);
    }

    await logOps.insert({
      wallet_id: null,
      event_id: eventId,
      level: 'SUCCESS',
      action: `DROP_${dropNumber}_COMPLETE`,
      message: `Drop ${dropNumber}/2 completed: ${amount} FCC to ${recipient.slice(0, 8)}...`,
      tx_hash: receipt.hash,
      metadata: JSON.stringify({ block: receipt.blockNumber }),
    });

    // Small delay between drops
    await delay(2000);
  } catch (error) {
    await dropOps.updateError(dropId, (error as Error).message);
    throw error;
  }
}

/**
 * Monitor for mining reward
 */
async function monitorMiningReward(
  walletAddress: string,
  expectedReward: string,
  provider: ethers.JsonRpcProvider,
  eventId: number
): Promise<boolean> {
  const fcc = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, provider);
  const startBalance = await fcc.balanceOf(walletAddress);
  const targetReward = ethers.parseUnits(expectedReward, 6);

  await eventOps.updateStatus(eventId, 'MONITORING');

  await logOps.insert({
    wallet_id: null,
    event_id: eventId,
    level: 'INFO',
    action: 'REWARD_MONITOR_START',
    message: `Monitoring for ${expectedReward} FCC mining reward...`,
    tx_hash: null,
    metadata: JSON.stringify({ start_balance: ethers.formatUnits(startBalance, 6) }),
  });

  // Poll every 30 seconds for up to 1 hour
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    await delay(30000);

    const currentBalance = await fcc.balanceOf(walletAddress);
    const received = currentBalance - startBalance;

    if (received >= targetReward) {
      const amount = ethers.formatUnits(received, 6);

      await eventOps.updateReward(eventId, amount);

      await logOps.insert({
        wallet_id: null,
        event_id: eventId,
        level: 'SUCCESS',
        action: 'REWARD_RECEIVED',
        message: `Mining reward received: ${amount} FCC`,
        tx_hash: null,
        metadata: JSON.stringify({
          balance_before: ethers.formatUnits(startBalance, 6),
          balance_after: ethers.formatUnits(currentBalance, 6),
        }),
      });

      return true;
    }
  }

  // Timeout
  await eventOps.updateStatus(eventId, 'TIMEOUT');

  await logOps.insert({
    wallet_id: null,
    event_id: eventId,
    level: 'WARN',
    action: 'REWARD_TIMEOUT',
    message: 'Timeout waiting for mining reward (1 hour)',
    tx_hash: null,
    metadata: null,
  });

  return false;
}

/**
 * Finish event on-chain
 */
async function finishEvent(
  signer: ethers.Wallet,
  chainEventId: number,
  eventId: number
): Promise<void> {
  const eventManager = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);

  await eventOps.updateStatus(eventId, 'FINISHING');

  await logOps.insert({
    wallet_id: null,
    event_id: eventId,
    level: 'INFO',
    action: 'EVENT_FINISH_START',
    message: `Finishing event #${chainEventId}...`,
    tx_hash: null,
    metadata: null,
  });

  const tx = await eventManager.activityFinish(chainEventId);
  const receipt = await tx.wait();

  await eventOps.finish(eventId);

  await logOps.insert({
    wallet_id: null,
    event_id: eventId,
    level: 'SUCCESS',
    action: 'EVENT_FINISH_COMPLETE',
    message: `Event #${chainEventId} finished successfully`,
    tx_hash: receipt.hash,
    metadata: null,
  });
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
