/**
 * Keystore Management - Enterprise-Grade Wallet Security
 * 
 * Security Implementation (matching Fishcake wallet-sdk + fishcake-service):
 * - AES-256-GCM authenticated encryption (AEAD)
 * - PBKDF2 key derivation with 100,000 iterations (industry standard)
 * - BIP-39 mnemonic support (12/15/18/21/24 words, multi-language)
 * - BIP-44 HD wallet derivation (m/44'/60'/0'/0/0)
 * - Secure random nonce generation
 * - Memory-safe operations with buffer clearing
 * - File permission protection (0600)
 * 
 * References:
 * - wallet-sdk-main/wallet/bip/bip.ts (BIP-39/44 implementation)
 * - fishcake-service-main/service/reward_service/reward_service.go (AES-GCM)
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as bip39 from "bip39";
import { HDKey } from "@scure/bip32";
import { ethers } from "ethers";

// Encryption constants (matching fishcake-service Go implementation)
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;          // 256 bits
const NONCE_LENGTH = 12;        // 96 bits (GCM standard)
const AUTH_TAG_LENGTH = 16;     // 128 bits
const PBKDF2_ITERATIONS = 100_000;  // Industry standard for 2024
const PBKDF2_DIGEST = "sha512";
const SALT_LENGTH = 32;         // 256 bits

// BIP-44 derivation path for Ethereum
const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/0";

// Supported mnemonic languages (from wallet-sdk)
export type MnemonicLanguage = 
    | "english" 
    | "chinese_simplified" 
    | "chinese_traditional"
    | "french" 
    | "italian" 
    | "japanese" 
    | "korean" 
    | "spanish";

// Keystore version 2 with enhanced security
interface EncryptedKeystore {
    version: 2;
    crypto: {
        cipher: "aes-256-gcm";
        ciphertext: string;
        nonce: string;
        authTag: string;
        kdf: "pbkdf2";
        kdfparams: {
            iterations: number;
            digest: string;
            salt: string;
        };
    };
    meta: {
        createdAt: string;
        derivedFrom: "privateKey" | "mnemonic";
        address: string;
    };
}

// Legacy keystore format (version 1) for backward compatibility
interface LegacyKeystore {
    version: 1;
    ciphertext: string;
    nonce: string;
    authTag: string;
}

/**
 * Derive encryption key from passphrase using PBKDF2
 * More secure than simple SHA-256 hash (used in fishcake-service)
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
 * Legacy key derivation for version 1 keystores (backward compatibility)
 * Matches fishcake-service Go implementation exactly
 */
function deriveKeyLegacy(passphrase: string): Buffer {
    return crypto.createHash("sha256").update(passphrase).digest();
}

/**
 * Securely clear sensitive data from memory
 */
function secureClear(buffer: Buffer | Uint8Array): void {
    crypto.randomFillSync(buffer);
    buffer.fill(0);
}

/**
 * Encrypt private key with AES-256-GCM (version 2)
 * Enhanced security with PBKDF2 key derivation
 */
export function encryptPrivateKey(privateKey: string, passphrase: string, address?: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(passphrase, salt);
    const nonce = crypto.randomBytes(NONCE_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
    
    let ciphertext = cipher.update(privateKey, "utf8", "hex");
    ciphertext += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    // Derive address if not provided
    let walletAddress = address;
    if (!walletAddress) {
        try {
            const wallet = new ethers.Wallet(normalizePrivateKey(privateKey));
            walletAddress = wallet.address;
        } catch {
            walletAddress = "unknown";
        }
    }
    
    const keystore: EncryptedKeystore = {
        version: 2,
        crypto: {
            cipher: "aes-256-gcm",
            ciphertext,
            nonce: nonce.toString("hex"),
            authTag: authTag.toString("hex"),
            kdf: "pbkdf2",
            kdfparams: {
                iterations: PBKDF2_ITERATIONS,
                digest: PBKDF2_DIGEST,
                salt: salt.toString("hex"),
            },
        },
        meta: {
            createdAt: new Date().toISOString(),
            derivedFrom: "privateKey",
            address: walletAddress,
        },
    };
    
    // Clear sensitive buffers
    secureClear(key);
    secureClear(salt);
    secureClear(nonce);
    
    return JSON.stringify(keystore, null, 2);
}

/**
 * Decrypt private key from keystore
 * Supports both version 1 (legacy) and version 2 (enhanced)
 */
export function decryptPrivateKey(keystoreData: string, passphrase: string): string {
    const keystore = JSON.parse(keystoreData);
    
    if (keystore.version === 2) {
        return decryptV2(keystore as EncryptedKeystore, passphrase);
    } else if (keystore.version === 1) {
        return decryptV1(keystore as LegacyKeystore, passphrase);
    } else {
        throw new Error("Unsupported keystore version");
    }
}

/**
 * Decrypt version 2 keystore (PBKDF2 + AES-256-GCM)
 */
function decryptV2(keystore: EncryptedKeystore, passphrase: string): string {
    const salt = Buffer.from(keystore.crypto.kdfparams.salt, "hex");
    const nonce = Buffer.from(keystore.crypto.nonce, "hex");
    const authTag = Buffer.from(keystore.crypto.authTag, "hex");
    
    const key = deriveKey(passphrase, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAuthTag(authTag);
    
    try {
        let privateKey = decipher.update(keystore.crypto.ciphertext, "hex", "utf8");
        privateKey += decipher.final("utf8");
        
        // Clear sensitive buffer
        secureClear(key);
        
        return privateKey;
    } catch {
        secureClear(key);
        throw new Error("Invalid passphrase or corrupted keystore");
    }
}

/**
 * Decrypt version 1 keystore (legacy SHA-256 + AES-256-GCM)
 * For backward compatibility with existing keystores
 */
function decryptV1(keystore: LegacyKeystore, passphrase: string): string {
    const key = deriveKeyLegacy(passphrase);
    const nonce = Buffer.from(keystore.nonce, "hex");
    const authTag = Buffer.from(keystore.authTag, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAuthTag(authTag);
    
    try {
        let privateKey = decipher.update(keystore.ciphertext, "hex", "utf8");
        privateKey += decipher.final("utf8");
        return privateKey;
    } catch {
        throw new Error("Invalid passphrase or corrupted keystore");
    }
}

/**
 * Generate a new BIP-39 mnemonic phrase
 * Matches wallet-sdk generateMnemonic function
 */
export function generateMnemonic(
    wordCount: 12 | 15 | 18 | 21 | 24 = 12,
    language: MnemonicLanguage = "english"
): string {
    // Map word count to entropy bits
    const entropyBits = {
        12: 128,
        15: 160,
        18: 192,
        21: 224,
        24: 256,
    }[wordCount];
    
    // Get wordlist for language
    const wordlist = getWordlist(language);
    
    // Generate mnemonic
    const entropy = crypto.randomBytes(entropyBits / 8);
    return bip39.entropyToMnemonic(entropy.toString("hex"), wordlist);
}

/**
 * Validate a BIP-39 mnemonic phrase
 * Matches wallet-sdk validateMnemonic function
 */
export function validateMnemonic(mnemonic: string, language: MnemonicLanguage = "english"): boolean {
    const wordlist = getWordlist(language);
    return bip39.validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

/**
 * Derive private key from mnemonic using BIP-44 path
 * Matches wallet-sdk createAddress function
 */
export function mnemonicToPrivateKey(
    mnemonic: string,
    passphrase: string = "",
    accountIndex: number = 0
): { privateKey: string; address: string } {
    // Validate mnemonic
    if (!validateMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic phrase");
    }
    
    // Generate seed from mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase(), passphrase);
    
    // Create HD wallet from seed
    const hdKey = HDKey.fromMasterSeed(seed);
    
    // Derive key at path m/44'/60'/0'/0/{accountIndex}
    const derivationPath = `m/44'/60'/0'/0/${accountIndex}`;
    const childKey = hdKey.derive(derivationPath);
    
    if (!childKey.privateKey) {
        throw new Error("Failed to derive private key");
    }
    
    // Convert to hex string
    const privateKeyHex = Buffer.from(childKey.privateKey).toString("hex");
    const normalizedKey = `0x${privateKeyHex}`;
    
    // Get address from private key
    const wallet = new ethers.Wallet(normalizedKey);
    
    // Clear sensitive data
    secureClear(seed);
    if (childKey.privateKey) {
        secureClear(childKey.privateKey);
    }
    
    return {
        privateKey: normalizedKey,
        address: wallet.address,
    };
}

/**
 * Encrypt mnemonic for secure storage
 */
export function encryptMnemonic(mnemonic: string, passphrase: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(passphrase, salt);
    const nonce = crypto.randomBytes(NONCE_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
    
    let ciphertext = cipher.update(mnemonic, "utf8", "hex");
    ciphertext += cipher.final("hex");
    
    const authTag = cipher.getAuthTag();
    
    // Derive address for metadata
    const { address } = mnemonicToPrivateKey(mnemonic);
    
    const keystore: EncryptedKeystore = {
        version: 2,
        crypto: {
            cipher: "aes-256-gcm",
            ciphertext,
            nonce: nonce.toString("hex"),
            authTag: authTag.toString("hex"),
            kdf: "pbkdf2",
            kdfparams: {
                iterations: PBKDF2_ITERATIONS,
                digest: PBKDF2_DIGEST,
                salt: salt.toString("hex"),
            },
        },
        meta: {
            createdAt: new Date().toISOString(),
            derivedFrom: "mnemonic",
            address,
        },
    };
    
    // Clear sensitive buffers
    secureClear(key);
    secureClear(salt);
    secureClear(nonce);
    
    return JSON.stringify(keystore, null, 2);
}

/**
 * Get BIP-39 wordlist for language
 */
function getWordlist(language: MnemonicLanguage): string[] {
    switch (language) {
        case "english":
            return bip39.wordlists.english;
        case "chinese_simplified":
            return bip39.wordlists.chinese_simplified;
        case "chinese_traditional":
            return bip39.wordlists.chinese_traditional;
        case "french":
            return bip39.wordlists.french;
        case "italian":
            return bip39.wordlists.italian;
        case "japanese":
            return bip39.wordlists.japanese;
        case "korean":
            return bip39.wordlists.korean;
        case "spanish":
            return bip39.wordlists.spanish;
        default:
            return bip39.wordlists.english;
    }
}

/**
 * Save keystore to file with secure permissions
 */
export function saveKeystore(keystorePath: string, encryptedData: string): void {
    const dir = path.dirname(keystorePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); // rwx------
    }
    
    // Write file with restricted permissions (owner read/write only)
    fs.writeFileSync(keystorePath, encryptedData, { 
        encoding: "utf8",
        mode: 0o600, // rw-------
    });
}

/**
 * Load keystore from file
 */
export function loadKeystore(keystorePath: string): string | null {
    if (!fs.existsSync(keystorePath)) {
        return null;
    }
    return fs.readFileSync(keystorePath, "utf8");
}

/**
 * Check if keystore file exists
 */
export function keystoreExists(keystorePath: string): boolean {
    return fs.existsSync(keystorePath);
}

/**
 * Securely delete keystore file (overwrite before delete)
 */
export function deleteKeystore(keystorePath: string): void {
    if (fs.existsSync(keystorePath)) {
        // Overwrite file content with random data before deletion
        const stats = fs.statSync(keystorePath);
        const randomData = crypto.randomBytes(stats.size);
        fs.writeFileSync(keystorePath, randomData);
        
        // Delete the file
        fs.unlinkSync(keystorePath);
    }
}

/**
 * Validate private key format (64 hex chars, with or without 0x prefix)
 */
export function validatePrivateKey(privateKey: string): boolean {
    const cleanKey = privateKey.trim().startsWith("0x") 
        ? privateKey.trim().slice(2) 
        : privateKey.trim();
    
    // Must be exactly 64 hex characters
    if (cleanKey.length !== 64) {
        return false;
    }
    
    // Must be valid hex
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
        return false;
    }
    
    // Verify it can create a valid wallet
    try {
        new ethers.Wallet(`0x${cleanKey}`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Normalize private key to 0x-prefixed format
 */
export function normalizePrivateKey(privateKey: string): string {
    const cleanKey = privateKey.trim();
    if (cleanKey.startsWith("0x")) {
        return cleanKey.toLowerCase();
    }
    return `0x${cleanKey.toLowerCase()}`;
}

/**
 * Get keystore metadata (address and creation info)
 */
export function getKeystoreInfo(keystorePath: string): { 
    address: string; 
    version: number; 
    derivedFrom: string;
    createdAt: string;
} | null {
    const data = loadKeystore(keystorePath);
    if (!data) return null;
    
    try {
        const keystore = JSON.parse(data);
        if (keystore.version === 2) {
            return {
                address: keystore.meta.address,
                version: keystore.version,
                derivedFrom: keystore.meta.derivedFrom,
                createdAt: keystore.meta.createdAt,
            };
        } else if (keystore.version === 1) {
            return {
                address: "unknown",
                version: 1,
                derivedFrom: "privateKey",
                createdAt: "unknown",
            };
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Migrate a version 1 keystore to version 2
 */
export function migrateKeystore(
    keystorePath: string, 
    passphrase: string
): boolean {
    const data = loadKeystore(keystorePath);
    if (!data) return false;
    
    const keystore = JSON.parse(data);
    if (keystore.version !== 1) return false;
    
    try {
        // Decrypt with legacy method
        const privateKey = decryptV1(keystore, passphrase);
        
        // Re-encrypt with version 2
        const newKeystore = encryptPrivateKey(privateKey, passphrase);
        
        // Backup old keystore
        const backupPath = keystorePath + ".v1.backup";
        fs.writeFileSync(backupPath, data, { mode: 0o600 });
        
        // Save new keystore
        saveKeystore(keystorePath, newKeystore);
        
        return true;
    } catch {
        return false;
    }
}
