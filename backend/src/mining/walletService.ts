// Wallet Service for Mining Automation
import { ethers } from 'ethers';
import { walletOps, logOps, db } from './database.js';
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

export interface MiningWallet {
  id: number;
  address: string;
  status: 'active' | 'paused' | 'error' | 'nft_expired';
  nft_type: 'NONE' | 'BASIC' | 'PRO';
  nft_expiry_at: number | null;
  fcc_balance: string;
  usdt_balance: string;
  pol_balance: string;
  failure_count: number;
  last_error: string | null;
  created_at: number;
}

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
      const existing = walletOps.getByAddress.get(address);
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

      // Insert into database
      walletOps.insert.run({
        address,
        encrypted_key: encrypted.encrypted,
        salt: encrypted.salt,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        nft_type: nftType,
      });

      // Log import
      logOps.insert.run({
        wallet_id: null,
        event_id: null,
        level: 'SUCCESS',
        action: 'WALLET_IMPORT',
        message: `Wallet ${address.slice(0, 8)}...${address.slice(-6)} imported`,
        tx_hash: null,
        metadata: JSON.stringify({ nft_type: nftType }),
      });

      results.push({ success: true, address });

      // Fetch balances in background
      updateWalletBalances(address, provider).catch(() => {});
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
  const wallet = walletOps.getByAddress.get(address) as MiningWallet | undefined;
  if (!wallet) return;

  try {
    const fccContract = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, provider);
    const usdtContract = new ethers.Contract(CONTRACTS.USDT_TOKEN, ERC20_ABI, provider);

    const [fccBalance, usdtBalance, polBalance] = await Promise.all([
      fccContract.balanceOf(address),
      usdtContract.balanceOf(address),
      provider.getBalance(address),
    ]);

    walletOps.updateBalances.run({
      id: wallet.id,
      fcc_balance: ethers.formatUnits(fccBalance, 6),
      usdt_balance: ethers.formatUnits(usdtBalance, 6),
      pol_balance: ethers.formatEther(polBalance),
    });
  } catch (error) {
    logger.error(`Failed to update balances for ${address}:`, { error: (error as Error).message });
  }
}

/**
 * Get all wallets
 */
export function getAllWallets(): MiningWallet[] {
  return walletOps.getAll.all() as MiningWallet[];
}

/**
 * Get active wallets
 */
export function getActiveWallets(): MiningWallet[] {
  return walletOps.getActive.all() as MiningWallet[];
}

/**
 * Get wallets ready for new mining event
 */
export function getReadyWallets(offsetMinutes: number, maxConcurrent: number): MiningWallet[] {
  return walletOps.getReadyForEvent.all(offsetMinutes, maxConcurrent) as MiningWallet[];
}

/**
 * Get wallet by address
 */
export function getWalletByAddress(address: string): MiningWallet | undefined {
  return walletOps.getByAddress.get(address) as MiningWallet | undefined;
}

/**
 * Delete wallet by address
 */
export function deleteWallet(address: string): boolean {
  const result = walletOps.delete.run(address);
  
  if (result.changes > 0) {
    logOps.insert.run({
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
export function updateWalletStatus(
  walletId: number,
  status: 'active' | 'paused' | 'error' | 'nft_expired',
  failureCount: number = 0,
  lastError: string | null = null
): void {
  walletOps.updateStatus.run({
    id: walletId,
    status,
    failure_count: failureCount,
    last_error: lastError,
  });
}

/**
 * Update wallet NFT info
 */
export function updateWalletNFT(
  walletId: number,
  nftType: 'NONE' | 'BASIC' | 'PRO',
  expiryTimestamp: number | null,
  tokenId: number | null
): void {
  walletOps.updateNFT.run({
    id: walletId,
    nft_type: nftType,
    nft_expiry_at: expiryTimestamp,
    nft_token_id: tokenId,
  });
}

/**
 * Decrypt wallet private key
 */
export function decryptWalletKey(wallet: MiningWallet, passphrase: string): string {
  const raw = walletOps.getByAddress.get(wallet.address) as {
    encrypted_key: string;
    salt: string;
    iv: string;
    auth_tag: string;
  };

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
export function getWalletStats(): {
  total: number;
  active: number;
  paused: number;
  error: number;
  nftExpired: number;
} {
  const wallets = getAllWallets();
  return {
    total: wallets.length,
    active: wallets.filter(w => w.status === 'active').length,
    paused: wallets.filter(w => w.status === 'paused').length,
    error: wallets.filter(w => w.status === 'error').length,
    nftExpired: wallets.filter(w => w.status === 'nft_expired').length,
  };
}
