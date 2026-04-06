// Encryption Module - AES-256-GCM with PBKDF2
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha256';

export interface EncryptedData {
  encrypted: string;  // hex encoded
  salt: string;       // hex encoded
  iv: string;         // hex encoded
  authTag: string;    // hex encoded
}

/**
 * Derive encryption key from passphrase using PBKDF2
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @param passphrase - User's passphrase
 * @returns Encrypted data with salt, iv, and authTag
 */
export function encrypt(plaintext: string, passphrase: string): EncryptedData {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from passphrase
  const key = deriveKey(passphrase, salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - The encrypted data object
 * @param passphrase - User's passphrase
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong passphrase or tampered data)
 */
export function decrypt(encryptedData: EncryptedData, passphrase: string): string {
  // Parse hex strings back to buffers
  const salt = Buffer.from(encryptedData.salt, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  
  // Derive key from passphrase
  const key = deriveKey(passphrase, salt);
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt a private key for storage
 * @param privateKey - The private key (with or without 0x prefix)
 * @param passphrase - User's passphrase
 */
export function encryptPrivateKey(privateKey: string, passphrase: string): EncryptedData {
  // Normalize private key (remove 0x if present)
  const normalizedKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  return encrypt(normalizedKey, passphrase);
}

/**
 * Decrypt a private key from storage
 * @param encryptedData - The encrypted key data
 * @param passphrase - User's passphrase
 * @returns Private key with 0x prefix
 */
export function decryptPrivateKey(encryptedData: EncryptedData, passphrase: string): string {
  const key = decrypt(encryptedData, passphrase);
  return key.startsWith('0x') ? key : `0x${key}`;
}

/**
 * Verify if a passphrase can decrypt the data
 * @param encryptedData - The encrypted data
 * @param passphrase - The passphrase to verify
 * @returns true if passphrase is correct
 */
export function verifyPassphrase(encryptedData: EncryptedData, passphrase: string): boolean {
  try {
    decrypt(encryptedData, passphrase);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure random passphrase
 * @param length - Length of passphrase (default 32)
 */
export function generatePassphrase(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

/**
 * Hash a passphrase for comparison (not encryption)
 * @param passphrase - The passphrase to hash
 */
export function hashPassphrase(passphrase: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 32, PBKDF2_DIGEST);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a passphrase against a hash
 * @param passphrase - The passphrase to verify
 * @param storedHash - The stored hash (salt:hash format)
 */
export function verifyPassphraseHash(passphrase: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 32, PBKDF2_DIGEST);
  return hash.toString('hex') === hashHex;
}
