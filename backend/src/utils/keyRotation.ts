/**
 * Key rotation mechanism for encryption keys.
 * Supports rotating the ENCRYPTION_KEY used for wallet private key encryption.
 * Rotation creates a new key, re-encrypts all wallets, and archives the old key.
 * Uses Supabase for all database operations.
 */

import crypto from 'crypto';
import { supabase, walletOps } from '../mining/databaseAdapter.js';
import { encryptPrivateKey, decryptPrivateKey } from '../mining/encryption.js';
import logger from './logger.js';

export interface KeyRotationResult {
  success: boolean;
  walletsRotated: number;
  walletsFailed: number;
  oldKeyArchived: boolean;
  error?: string;
}

/**
 * Get the current encryption key from environment
 */
function getCurrentKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  return key;
}

/**
 * Generate a new encryption key
 */
export function generateNewEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Archive old key hash for audit trail (never store the actual key)
 */
async function archiveOldKeyHash(oldKey: string): Promise<void> {
  const keyHash = crypto.createHash('sha256').update(oldKey).digest('hex');
  const timestamp = Date.now();

  try {
    const newKey = getCurrentKey();
    const newKeyHash = crypto.createHash('sha256').update(newKey).digest('hex');

    const { error } = await supabase()
      .from('mining_logs')
      .insert({
        wallet_id: null,
        event_id: null,
        level: 'INFO',
        action: 'KEY_ROTATION',
        message: `Encryption key rotated`,
        tx_hash: null,
        metadata: JSON.stringify({ old_key_hash: keyHash, new_key_hash: newKeyHash, rotated_at: timestamp }),
      });

    if (error) throw error;

    logger.info('Archived old encryption key hash', { keyHash: keyHash.slice(0, 16) + '...' });
  } catch (error) {
    logger.error('Failed to archive old key hash:', { error: (error as Error).message });
  }
}

/**
 * Rotate encryption key: re-encrypt all wallets with a new key
 * 
 * IMPORTANT: This function should be called with the OLD key still in ENCRYPTION_KEY.
 * The new key should be passed as a parameter and set in the environment AFTER successful rotation.
 * 
 * @param newKey - The new encryption key to use
 * @returns Result of the rotation operation
 */
export async function rotateEncryptionKey(newKey: string): Promise<KeyRotationResult> {
  const oldKey = getCurrentKey();

  if (newKey === oldKey) {
    return {
      success: false,
      walletsRotated: 0,
      walletsFailed: 0,
      oldKeyArchived: false,
      error: 'New key must be different from current key',
    };
  }

  if (!/^[0-9a-fA-F]{64}$/.test(newKey)) {
    return {
      success: false,
      walletsRotated: 0,
      walletsFailed: 0,
      oldKeyArchived: false,
      error: 'New key must be a 64-character hex string',
    };
  }

  logger.info('Starting encryption key rotation...');

  // Get all wallets
  const { data: wallets, error: fetchError } = await supabase()
    .from('mining_wallets')
    .select('id, encrypted_key, salt, iv, auth_tag');

  if (fetchError) throw fetchError;

  let walletsRotated = 0;
  let walletsFailed = 0;

  for (const wallet of (wallets || [])) {
    try {
      // Decrypt with old key
      const encryptedData: import('../mining/encryption.js').EncryptedData = {
        encrypted: wallet.encrypted_key,
        salt: wallet.salt,
        iv: wallet.iv,
        authTag: wallet.auth_tag,
      };
      const decrypted = decryptPrivateKey(encryptedData, oldKey);

      // Re-encrypt with new key
      const reEncrypted = encryptPrivateKey(decrypted, newKey);

      // Update wallet
      const { error: updateError } = await supabase()
        .from('mining_wallets')
        .update({
          encrypted_key: reEncrypted.encrypted,
          salt: reEncrypted.salt,
          iv: reEncrypted.iv,
          auth_tag: reEncrypted.authTag,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      if (updateError) throw updateError;
      walletsRotated++;
    } catch (error) {
      walletsFailed++;
      logger.error(`Failed to rotate key for wallet ${wallet.id}:`, {
        error: (error as Error).message,
        walletId: wallet.id,
      });
    }
  }

  try {
    // Archive old key hash
    await archiveOldKeyHash(oldKey);

    // Update the environment variable (in-memory only; must be updated in .env manually)
    process.env.ENCRYPTION_KEY = newKey;

    logger.info('Encryption key rotation completed', {
      walletsRotated,
      walletsFailed,
    });

    return {
      success: walletsFailed === 0,
      walletsRotated,
      walletsFailed,
      oldKeyArchived: true,
    };
  } catch (error) {
    logger.error('Key rotation failed:', { error: (error as Error).message });
    return {
      success: false,
      walletsRotated,
      walletsFailed,
      oldKeyArchived: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get key rotation history
 */
export async function getKeyRotationHistory(): Promise<Array<{
  id: number;
  oldKeyHash: string;
  newKeyHash: string;
  rotatedAt: number;
  walletsRotated: number;
  walletsFailed: number;
}>> {
  try {
    const { data, error } = await supabase()
      .from('mining_logs')
      .select('id, metadata, created_at')
      .eq('action', 'KEY_ROTATION')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data || []).map((row: any) => {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      return {
        id: row.id,
        oldKeyHash: meta?.old_key_hash || '',
        newKeyHash: meta?.new_key_hash || '',
        rotatedAt: meta?.rotated_at || 0,
        walletsRotated: 0,
        walletsFailed: 0,
      };
    });
  } catch {
    return [];
  }
}
