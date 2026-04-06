// Event Processing Service for Mining Automation
import { ethers } from 'ethers';
import { eventOps, dropOps, walletOps, logOps, configOps, db } from './database.js';
import { MiningWallet, decryptWalletKey, updateWalletStatus } from './walletService.js';

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

export interface MiningEvent {
  id: number;
  wallet_id: number;
  chain_event_id: number | null;
  status: string;
  drops_checklist: string;
  drop_1_completed: number;
  drop_1_tx_hash: string | null;
  drop_2_completed: number;
  drop_2_tx_hash: string | null;
  total_dropped: string | null;
  reward_eligible: number;
  reward_received: string | null;
  started_at: number;
  finished_at: number | null;
}

export interface MiningConfig {
  recipient_address_1: string;
  recipient_address_2: string;
  fcc_per_recipient: string;
  total_fcc_per_event: string;
  expected_mining_reward: string;
  offset_minutes: number;
  max_retries: number;
  scheduler_enabled: number;
  max_concurrent_wallets: number;
}

/**
 * Process a single wallet through the mining workflow
 */
export async function processWallet(
  wallet: MiningWallet,
  passphrase: string,
  provider: ethers.JsonRpcProvider
): Promise<void> {
  const config = configOps.get.get() as MiningConfig;
  
  // Validate config
  if (!config.recipient_address_1 || !config.recipient_address_2) {
    throw new Error('Recipients not configured');
  }

  // Get signer
  const privateKey = decryptWalletKey(wallet, passphrase);
  const signer = new ethers.Wallet(privateKey, provider);

  // Create event record
  const eventResult = eventOps.insert.run({ wallet_id: wallet.id });
  const eventId = eventResult.lastInsertRowid as number;

  try {
    // Step 1: Check/Mint NFT if needed
    if (wallet.nft_type === 'NONE') {
      await mintNFT(signer, wallet.id, eventId);
    }

    // Step 2: Create on-chain event
    const chainEventId = await createOnChainEvent(signer, config, wallet.id, eventId);

    // Step 3: Execute drops
    await executeDrop(signer, chainEventId, config.recipient_address_1, config.fcc_per_recipient, 1, eventId);
    await executeDrop(signer, chainEventId, config.recipient_address_2, config.fcc_per_recipient, 2, eventId);

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
    walletOps.updateLastEvent.run({
      id: wallet.id,
      last_event_id: eventId,
      next_event_at: finishedAt + (config.offset_minutes * 60),
    });

    // Reset failure count on success
    updateWalletStatus(wallet.id, 'active', 0, null);

    logOps.insert.run({
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
    eventOps.updateError.run({
      id: eventId,
      error: (error as Error).message,
    });

    // Update wallet failure count
    const newFailureCount = wallet.failure_count + 1;
    const newStatus = newFailureCount >= config.max_retries ? 'error' : 'active';
    updateWalletStatus(wallet.id, newStatus, newFailureCount, (error as Error).message);

    logOps.insert.run({
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

  logOps.insert.run({
    wallet_id: walletId,
    event_id: eventId,
    level: 'INFO',
    action: 'NFT_MINT_START',
    message: 'Minting NFT pass...',
    tx_hash: null,
    metadata: null,
  });

  // Mint Basic NFT (type 2)
  const tx = await nftManager.mintMerchantNFT(
    2, // BASIC
    'Mining Wallet',
    'Automated mining wallet',
    '',
    '',
    ''
  );

  const receipt = await tx.wait();

  // Update wallet NFT info
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
  walletOps.updateNFT.run({
    id: walletId,
    nft_type: 'BASIC',
    nft_expiry_at: expiryTimestamp,
    nft_token_id: null,
  });

  logOps.insert.run({
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

  logOps.insert.run({
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
    deadline
  );

  const receipt = await tx.wait();

  // Get chain event ID
  const chainEventId = Number(await eventManager.activityIdAcc());

  // Update event record
  eventOps.updateChainId.run({
    id: eventId,
    chain_event_id: chainEventId,
  });

  logOps.insert.run({
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
  const dropResult = dropOps.insert.run({
    event_id: eventId,
    recipient_address: recipient,
    amount,
    drop_number: dropNumber,
  });
  const dropId = dropResult.lastInsertRowid as number;

  logOps.insert.run({
    wallet_id: null,
    event_id: eventId,
    level: 'INFO',
    action: `DROP_${dropNumber}_START`,
    message: `Dropping ${amount} FCC to ${recipient.slice(0, 8)}...`,
    tx_hash: null,
    metadata: null,
  });

  try {
    const tx = await eventManager.drop(chainEventId, recipient, dropAmount);
    const receipt = await tx.wait();

    // Update drop record
    dropOps.updateStatus.run({
      id: dropId,
      status: 'CONFIRMED',
      tx_hash: receipt.hash,
      block_number: receipt.blockNumber,
      gas_used: receipt.gasUsed.toString(),
    });

    // Update event record
    if (dropNumber === 1) {
      eventOps.updateDrop1.run({
        id: eventId,
        tx_hash: receipt.hash,
        amount,
      });
    } else {
      const totalAmount = (parseFloat(amount) * 2).toString();
      eventOps.updateDrop2.run({
        id: eventId,
        tx_hash: receipt.hash,
        amount,
        total: totalAmount,
      });
    }

    logOps.insert.run({
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
    dropOps.updateError.run({
      id: dropId,
      error: (error as Error).message,
    });
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

  eventOps.updateStatus.run({ id: eventId, status: 'MONITORING' });

  logOps.insert.run({
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
      
      eventOps.updateReward.run({
        id: eventId,
        amount,
      });

      logOps.insert.run({
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
  eventOps.updateStatus.run({ id: eventId, status: 'TIMEOUT' });

  logOps.insert.run({
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

  eventOps.updateStatus.run({ id: eventId, status: 'FINISHING' });

  logOps.insert.run({
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

  eventOps.finish.run({ id: eventId });

  logOps.insert.run({
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
 * Get recent events
 */
export function getRecentEvents(limit: number = 50): MiningEvent[] {
  return eventOps.getRecent.all(limit) as MiningEvent[];
}

/**
 * Get events by wallet
 */
export function getEventsByWallet(walletId: number): MiningEvent[] {
  return eventOps.getByWallet.all(walletId) as MiningEvent[];
}

/**
 * Get mining statistics
 */
export function getMiningStats() {
  return statsOps.getOverview.get();
}

// Import statsOps
import { statsOps } from './database.js';

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
