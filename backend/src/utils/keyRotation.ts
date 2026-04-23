/**
 * Key rotation mechanism for encryption keys.
 * Supports rotating the ENCRYPTION_KEY used for wallet private key encryption.
 * Rotation creates a new key, re-encrypts all wallets, and archives the old key.
 */

import crypto from 'crypto';
import { db } from '../mining/database.js';
import { encryptPrivateKey, decryptPrivateKey } from '../mining/encryption.js';
import logger from './logger.js';

const KEY_ROTATION_PREFIX = 'key_rotation_';

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
function archiveOldKeyHash(oldKey: string): void {
  const keyHash = crypto.createHash('sha256').update(oldKey).digest('hex');
  const timestamp = Date.now();

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS key_rotation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        old_key_hash TEXT NOT NULL,
        new_key_hash TEXT NOT NULL,
        rotated_at INTEGER NOT NULL,
        wallets_rotated INTEGER DEFAULT 0,
        wallets_failed INTEGER DEFAULT 0
      )
    `).run();

    const newKey = getCurrentKey();
    const newKeyHash = crypto.createHash('sha256').update(newKey).digest('hex');

    db.prepare(`
      INSERT INTO key_rotation_log (old_key_hash, new_key_hash, rotated_at)
      VALUES (?, ?, ?)
    `).run(keyHash, newKeyHash, timestamp);

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
  const wallets = db.prepare(`
    SELECT id, encrypted_key, salt, iv, auth_tag FROM mining_wallets
  `).all() as Array<{ id: number; encrypted_key: string; salt: string; iv: string; auth_tag: string }>;

  let walletsRotated = 0;
  let walletsFailed = 0;

  const updateStmt = db.prepare(`
    UPDATE mining_wallets SET encrypted_key = ?, salt = ?, iv = ?, auth_tag = ?, updated_at = unixepoch()
    WHERE id = ?
  `);

  const rotateTransaction = db.transaction(() => {
    for (const wallet of wallets) {
      try {
        // Decrypt with old key - construct EncryptedData object
        const encryptedData: import('../mining/encryption.js').EncryptedData = {
          encrypted: wallet.encrypted_key,
          salt: wallet.salt,
          iv: wallet.iv,
          authTag: wallet.auth_tag,
        };
        const decrypted = decryptPrivateKey(encryptedData, oldKey);

        // Re-encrypt with new key
        const reEncrypted = encryptPrivateKey(decrypted, newKey);

        updateStmt.run(
          reEncrypted.encrypted,
          reEncrypted.salt,
          reEncrypted.iv,
          reEncrypted.authTag,
          wallet.id
        );

        walletsRotated++;
      } catch (error) {
        walletsFailed++;
        logger.error(`Failed to rotate key for wallet ${wallet.id}:`, {
          error: (error as Error).message,
          walletId: wallet.id,
        });
      }
    }
  });

  try {
    rotateTransaction();

    // Archive old key hash
    archiveOldKeyHash(oldKey);

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
export function getKeyRotationHistory(): Array<{
  id: number;
  oldKeyHash: string;
  newKeyHash: string;
  rotatedAt: number;
  walletsRotated: number;
  walletsFailed: number;
}> {
  try {
    return db.prepare(`
      SELECT * FROM key_rotation_log ORDER BY rotated_at DESC LIMIT 10
    `).all() as Array<{
      id: number;
      oldKeyHash: string;
      newKeyHash: string;
      rotatedAt: number;
      walletsRotated: number;
      walletsFailed: number;
    }>;
  } catch {
    return [];
  }
}
