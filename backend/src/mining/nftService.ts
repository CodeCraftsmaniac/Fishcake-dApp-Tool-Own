// NFT Service - Mint preview and batch operations
import { ethers } from 'ethers';
import { logOps, walletOps } from './database.js';
import { decryptWalletKey, MiningWallet, updateWalletNFT } from './walletService.js';
import { getOptimizedGasPrice } from './gasOptimizer.js';

const CONTRACTS = {
  NFT_MANAGER: '0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B',
  USDT_TOKEN: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  FCC_TOKEN: '0x84eBc138F4Ab844A3050a6059763D269dC9951c6',
};

// NFT costs
const NFT_COSTS = {
  BASIC: { usdt: '10', fccReward: '20' }, // 10 USDT, get 20 FCC
  PRO: { usdt: '100', fccReward: '200' }, // 100 USDT, get 200 FCC
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const NFT_MANAGER_ABI = [
  'function getMerchantNFT(address) view returns (uint256 tokenId, uint8 nftType, uint256 mintedAt, uint256 expiredAt, bool isValid)',
  'function mintMerchantNFT(uint8 _nftType, string _name, string _description, string _businessAddress, string _website, string _socialMedia)',
];

export interface NFTPreviewResult {
  wallet: string;
  currentNFT: 'NONE' | 'BASIC' | 'PRO';
  nftExpiry: number | null;
  canMint: boolean;
  reason?: string;
  usdtBalance: string;
  usdtRequired: string;
  polBalance: string;
  estimatedGas: string;
  estimatedFccReward: string;
}

export interface NFTMintResult {
  wallet: string;
  success: boolean;
  txHash?: string;
  error?: string;
  fccReceived?: string;
}

/**
 * Preview NFT minting for multiple wallets
 */
export async function previewBatchMint(
  wallets: MiningWallet[],
  nftType: 'BASIC' | 'PRO',
  provider: ethers.JsonRpcProvider
): Promise<NFTPreviewResult[]> {
  const results: NFTPreviewResult[] = [];
  const nftCost = NFT_COSTS[nftType];
  const usdtRequired = ethers.parseUnits(nftCost.usdt, 6);

  for (const wallet of wallets) {
    try {
      // Get current NFT status
      const nftContract = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, provider);
      const [, nftTypeNum, , expiredAt, isValid] = await nftContract.getMerchantNFT(wallet.address);
      
      let currentNFT: 'NONE' | 'BASIC' | 'PRO' = 'NONE';
      let nftExpiry: number | null = null;
      
      if (isValid && Number(expiredAt) > Math.floor(Date.now() / 1000)) {
        currentNFT = nftTypeNum === 1 ? 'PRO' : 'BASIC';
        nftExpiry = Number(expiredAt);
      }

      // Get balances
      const usdtContract = new ethers.Contract(CONTRACTS.USDT_TOKEN, ERC20_ABI, provider);
      const [usdtBalance, polBalance] = await Promise.all([
        usdtContract.balanceOf(wallet.address),
        provider.getBalance(wallet.address),
      ]);

      // Estimate gas
      const gasEstimate = await getOptimizedGasPrice(provider);
      const estimatedGas = ethers.formatEther(gasEstimate.gasPrice * 300000n); // ~300k gas for mint

      // Check if can mint
      let canMint = true;
      let reason = '';

      if (currentNFT !== 'NONE') {
        canMint = false;
        reason = `Already has ${currentNFT} NFT (expires ${new Date(nftExpiry! * 1000).toISOString()})`;
      } else if (usdtBalance < usdtRequired) {
        canMint = false;
        reason = `Insufficient USDT (need ${nftCost.usdt}, have ${ethers.formatUnits(usdtBalance, 6)})`;
      } else if (polBalance < ethers.parseEther('0.1')) {
        canMint = false;
        reason = 'Insufficient POL for gas (need ~0.1)';
      }

      results.push({
        wallet: wallet.address,
        currentNFT,
        nftExpiry,
        canMint,
        reason,
        usdtBalance: ethers.formatUnits(usdtBalance, 6),
        usdtRequired: nftCost.usdt,
        polBalance: ethers.formatEther(polBalance),
        estimatedGas,
        estimatedFccReward: nftCost.fccReward,
      });
    } catch (error) {
      results.push({
        wallet: wallet.address,
        currentNFT: 'NONE',
        nftExpiry: null,
        canMint: false,
        reason: (error as Error).message,
        usdtBalance: '0',
        usdtRequired: nftCost.usdt,
        polBalance: '0',
        estimatedGas: '0',
        estimatedFccReward: '0',
      });
    }
  }

  return results;
}

/**
 * Execute batch NFT minting
 */
export async function executeBatchMint(
  wallets: MiningWallet[],
  nftType: 'BASIC' | 'PRO',
  passphrase: string,
  provider: ethers.JsonRpcProvider,
  onProgress?: (completed: number, total: number, result: NFTMintResult) => void
): Promise<NFTMintResult[]> {
  const results: NFTMintResult[] = [];
  const nftTypeNum = nftType === 'PRO' ? 1 : 2;
  const nftCost = NFT_COSTS[nftType];
  const usdtAmount = ethers.parseUnits(nftCost.usdt, 6);

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    
    try {
      // Decrypt wallet
      const privateKey = decryptWalletKey(wallet, passphrase);
      const signer = new ethers.Wallet(privateKey, provider);

      // Get initial FCC balance
      const fccContract = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, provider);
      const fccBefore = await fccContract.balanceOf(wallet.address);

      // Approve USDT
      const usdtContract = new ethers.Contract(CONTRACTS.USDT_TOKEN, ERC20_ABI, signer);
      const allowance = await usdtContract.allowance(wallet.address, CONTRACTS.NFT_MANAGER);
      
      if (allowance < usdtAmount) {
        const approveTx = await usdtContract.approve(CONTRACTS.NFT_MANAGER, usdtAmount);
        await approveTx.wait();
      }

      // Mint NFT
      const nftContract = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, signer);
      
      // Build metadata based on type
      const name = `Mining Wallet ${wallet.address.slice(0, 8)}`;
      const description = 'Automated mining wallet';
      
      let mintTx;
      if (nftType === 'PRO') {
        // PRO requires address and website
        mintTx = await nftContract.mintMerchantNFT(
          nftTypeNum,
          name,
          description,
          wallet.address, // Business address (can be same)
          'https://fishcake.io',
          ''
        );
      } else {
        // BASIC only needs name, desc, social
        mintTx = await nftContract.mintMerchantNFT(
          nftTypeNum,
          name,
          description,
          '',
          '',
          ''
        );
      }

      const receipt = await mintTx.wait();

      // Check FCC received
      const fccAfter = await fccContract.balanceOf(wallet.address);
      const fccReceived = ethers.formatUnits(fccAfter - fccBefore, 6);

      // Update wallet NFT info
      const expiryTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      updateWalletNFT(wallet.id, nftType, expiryTimestamp, null);

      // Log success
      logOps.insert.run({
        wallet_id: wallet.id,
        event_id: null,
        level: 'SUCCESS',
        action: 'NFT_BATCH_MINT',
        message: `${nftType} NFT minted, received ${fccReceived} FCC`,
        tx_hash: receipt.hash,
        metadata: JSON.stringify({ fcc_received: fccReceived }),
      });

      const result: NFTMintResult = {
        wallet: wallet.address,
        success: true,
        txHash: receipt.hash,
        fccReceived,
      };

      results.push(result);
      onProgress?.(i + 1, wallets.length, result);

      // Delay between mints to avoid issues
      if (i < wallets.length - 1) {
        await delay(3000);
      }
    } catch (error) {
      const result: NFTMintResult = {
        wallet: wallet.address,
        success: false,
        error: (error as Error).message,
      };

      // Log failure
      logOps.insert.run({
        wallet_id: wallet.id,
        event_id: null,
        level: 'ERROR',
        action: 'NFT_BATCH_MINT',
        message: (error as Error).message,
        tx_hash: null,
        metadata: null,
      });

      results.push(result);
      onProgress?.(i + 1, wallets.length, result);
    }
  }

  return results;
}

/**
 * Check NFT status for a single address
 */
export async function checkNFTStatus(
  address: string,
  provider: ethers.JsonRpcProvider
): Promise<{
  hasNFT: boolean;
  nftType: 'NONE' | 'BASIC' | 'PRO';
  tokenId: number | null;
  mintedAt: number | null;
  expiredAt: number | null;
  isValid: boolean;
}> {
  const nftContract = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, provider);
  
  try {
    const [tokenId, nftTypeNum, mintedAt, expiredAt, isValid] = await nftContract.getMerchantNFT(address);
    
    return {
      hasNFT: Number(tokenId) > 0,
      nftType: Number(tokenId) === 0 ? 'NONE' : (nftTypeNum === 1 ? 'PRO' : 'BASIC'),
      tokenId: Number(tokenId) || null,
      mintedAt: Number(mintedAt) || null,
      expiredAt: Number(expiredAt) || null,
      isValid,
    };
  } catch {
    return {
      hasNFT: false,
      nftType: 'NONE',
      tokenId: null,
      mintedAt: null,
      expiredAt: null,
      isValid: false,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
