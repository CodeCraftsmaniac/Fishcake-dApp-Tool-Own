import { describe, it, expect } from 'vitest';
import { encryptPrivateKey, decryptPrivateKey, verifyPassphrase, hashPassphrase, generatePassphrase, verifyPassphraseHash, type EncryptedData } from '../src/mining/encryption.js';

describe('Encryption', () => {
  const testPrivateKey = '0x' + 'a'.repeat(64);
  const testPassphrase = 'test-passphrase-123';
  let encryptedData: EncryptedData;

  it('should encrypt a private key', () => {
    encryptedData = encryptPrivateKey(testPrivateKey, testPassphrase);
    expect(encryptedData.encrypted).toBeDefined();
    expect(encryptedData.salt).toBeDefined();
    expect(encryptedData.iv).toBeDefined();
    expect(encryptedData.authTag).toBeDefined();
    expect(encryptedData.encrypted.length).toBeGreaterThan(0);
  });

  it('should decrypt a private key with correct passphrase', () => {
    const decrypted = decryptPrivateKey(encryptedData, testPassphrase);
    expect(decrypted).toBe(testPrivateKey);
  });

  it('should fail to decrypt with wrong passphrase', () => {
    expect(() => {
      decryptPrivateKey(encryptedData, 'wrong-passphrase');
    }).toThrow();
  });

  it('should hash passphrase with random salt (hashes differ)', () => {
    const hash1 = hashPassphrase(testPassphrase);
    const hash2 = hashPassphrase(testPassphrase);
    // Each call generates a random salt, so hashes should differ
    expect(hash1).not.toBe(hash2);
    // But both should verify correctly
    expect(verifyPassphraseHash(testPassphrase, hash1)).toBe(true);
    expect(verifyPassphraseHash(testPassphrase, hash2)).toBe(true);
  });

  it('should generate a random passphrase', () => {
    const passphrase = generatePassphrase();
    expect(passphrase.length).toBeGreaterThanOrEqual(12);
  });

  it('should verify passphrase hash correctly', () => {
    const hash = hashPassphrase(testPassphrase);
    expect(verifyPassphraseHash(testPassphrase, hash)).toBe(true);
    expect(verifyPassphraseHash('wrong-passphrase', hash)).toBe(false);
  });
});
