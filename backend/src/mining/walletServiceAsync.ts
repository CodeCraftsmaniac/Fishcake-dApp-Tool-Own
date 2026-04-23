/**
 * Wallet Service - Async version with Supabase
 */

import { ethers } from 'ethers';
import { walletOps, logOps, MiningWallet } from './databaseAdapter.js';
import { encrypt, decrypt, EncryptedData } from './encryption.js';
import logger from '../utils/logger.js';

const CONTRACTS = {
  FCC_TOKEN: '0x84eBc138F4Ab844A3050a6059763D269dC9951c6',
  USDT_TOKEN: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  NFT_MANAGER: '0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B',
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
];

const NFT_ABI = [
  'function getMerchantNFT(address) view returns (uint256 tokenId, uint8 nftType, uint256 mintedAt, uint256 expiredAt, bool isValid)',
];

export interface WalletImportResult {
  success: boolean;
  address?: string;
  error?: string;
}

export { MiningWallet };

/**
 * Import multiple wallets from private keys
 */
export async function importWallets(
  privateKeys: string[],
  passphrase: string,
  provider: ethers.JsonRpcProvider
): Promise<WalletImportResult[]> {
  const results: WalletImportResult[] = [];

  for (const privateKey of privateKeys) {
    try {
      // Validate private key
      const normalizedKey = privateKey.trim();
      if (!normalizedKey) {
        results.push({ success: false, error: 'Empty private key' });
        continue;
      }

      // Create wallet to get address
      let wallet: ethers.Wallet;
      try {
        wallet = new ethers.Wallet(normalizedKey);
      } catch {
        results.push({ success: false, error: 'Invalid private key format' });
        continue;
      }

      const address = wallet.address;

      // Check if already exists
      const existing = await walletOps.getByAddress(address);
      if (existing) {
        results.push({ success: false, address, error: 'Wallet already exists' });
        continue;
      }

      // Encrypt private key
      const encrypted = encrypt(normalizedKey, passphrase);

      // Check NFT status
      const nftContract = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_ABI, provider);
      let nftType: 'NONE' | 'BASIC' | 'PRO' = 'NONE';
      let nftExpiry: number | null = null;

      try {
        const [, nftTypeNum, , expiredAt, isValid] = await nftContract.getMerchantNFT(address);
        if (isValid && Number(expiredAt) > Math.floor(Date.now() / 1000)) {
          nftType = nftTypeNum === 1 ? 'PRO' : 'BASIC';
          nftExpiry = Number(expiredAt);
        }
      } catch {
        // No NFT or error fetching
      }

      // Fetch initial balances
      let fccBalance = '0';
      let usdtBalance = '0';
      let polBalance = '0';

      try {
        const fccContract = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, provider);
        const usdtContract = new ethers.Contract(CONTRACTS.USDT_TOKEN, ERC20_ABI, provider);

        const [fcc, usdt, pol] = await Promise.all([
          fccContract.balanceOf(address),
          usdtContract.balanceOf(address),
          provider.getBalance(address),
        ]);

        fccBalance = ethers.formatUnits(fcc, 6);
        usdtBalance = ethers.formatUnits(usdt, 6);
        polBalance = ethers.formatEther(pol);
      } catch (error) {
        logger.error(`Failed to fetch balances for ${address}:`, { error: (error as Error).message });
      }

      // Insert into database
      await walletOps.insert({
        address,
        encrypted_key: encrypted.encrypted,
        salt: encrypted.salt,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        nft_type: nftType,
        nft_expiry_at: nftExpiry,
        fcc_balance: fccBalance,
        usdt_balance: usdtBalance,
        pol_balance: polBalance,
      });

      // Log import
      await logOps.insert({
        wallet_id: null,
        event_id: null,
        level: 'SUCCESS',
        action: 'WALLET_IMPORT',
        message: `Wallet ${address.slice(0, 8)}...${address.slice(-6)} imported`,
        tx_hash: null,
        metadata: JSON.stringify({ nft_type: nftType }),
      });

      results.push({ success: true, address });
    } catch (error) {
      results.push({ success: false, error: (error as Error).message });
    }
  }

  return results;
}

/**
 * Update wallet balances from chain
 */
export async function updateWalletBalances(
  address: string,
  provider: ethers.JsonRpcProvider
): Promise<void> {
  const wallet = await walletOps.getByAddress(address);
  if (!wallet) return;

  try {
    const fccContract = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(CONTRACTS.USDT_TOKEN, ERC20_ABI, provider);

    const [fccBalance, usdtBalance, polBalance] = await Promise.all([
      fccContract.balanceOf(address),
      usdtContract.balanceOf(address),
      provider.getBalance(address),
    ]);

    await walletOps.updateBalances(
      wallet.id,
      ethers.formatUnits(fccBalance, 6),
      ethers.formatUnits(usdtBalance, 6),
      ethers.formatEther(polBalance)
    );
  } catch (error) {
    logger.error(`Failed to update balances for ${address}:`, { error: (error as Error).message });
  }
}

/**
 * Get all wallets
 */
export async function getAllWallets(): Promise<MiningWallet[]> {
  return walletOps.getAll();
}

/**
 * Get active wallets
 */
export async function getActiveWallets(): Promise<MiningWallet[]> {
  return walletOps.getActive();
}

/**
 * Get wallets ready for new mining event
 */
export async function getReadyWallets(offsetMinutes: number, maxConcurrent: number): Promise<MiningWallet[]> {
  return walletOps.getReadyForEvent(offsetMinutes, maxConcurrent);
}

/**
 * Get wallet by address
 */
export async function getWalletByAddress(address: string): Promise<MiningWallet | null> {
  return walletOps.getByAddress(address);
}

/**
 * Delete wallet by address
 */
export async function deleteWalletFromMining(address: string): Promise<boolean> {
  const deleted = await walletOps.delete(address);
  
  if (deleted) {
    await logOps.insert({
      wallet_id: null,
      event_id: null,
      level: 'INFO',
      action: 'WALLET_DELETE',
      message: `Wallet ${address.slice(0, 8)}...${address.slice(-6)} deleted`,
      tx_hash: null,
      metadata: null,
    });
    return true;
  }
  
  return false;
}

/**
 * Update wallet status
 */
export async function updateWalletStatus(
  walletId: number,
  status: 'active' | 'paused' | 'error' | 'nft_expired',
  failureCount: number = 0,
  lastError: string | null = null
): Promise<void> {
  await walletOps.updateStatus(walletId, status, failureCount, lastError);
}

/**
 * Update wallet NFT info
 */
export async function updateWalletNFT(
  walletId: number,
  nftType: 'NONE' | 'BASIC' | 'PRO',
  expiryTimestamp: number | null,
  tokenId: number | null
): Promise<void> {
  await walletOps.updateNFT(walletId, nftType, expiryTimestamp, tokenId);
}

/**
 * Decrypt wallet private key
 */
export async function decryptWalletKey(wallet: MiningWallet, passphrase: string): Promise<string> {
  const raw = await walletOps.getByAddress(wallet.address);
  
  if (!raw) {
    throw new Error('Wallet not found');
  }

  const encrypted: EncryptedData = {
    encrypted: raw.encrypted_key,
    salt: raw.salt,
    iv: raw.iv,
    authTag: raw.auth_tag,
  };

  return decrypt(encrypted, passphrase);
}

/**
 * Get wallet count by status
 */
export async function getWalletStats(): Promise<{
  total: number;
  active: number;
  paused: number;
  error: number;
  nftExpired: number;
}> {
  const wallets = await getAllWallets();
  return {
    total: wallets.length,
    active: wallets.filter(w => w.status === 'active').length,
    paused: wallets.filter(w => w.status === 'paused').length,
    error: wallets.filter(w => w.status === 'error').length,
    nftExpired: wallets.filter(w => w.status === 'nft_expired').length,
  };
}
