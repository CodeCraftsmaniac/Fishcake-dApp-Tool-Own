/**
 * Wallet Manager - Multi-wallet support with batch import
 * Manages multiple wallets for power users
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { ethers } from "ethers";
import {
    encryptPrivateKey,
    decryptPrivateKey,
    validatePrivateKey,
    normalizePrivateKey,
} from "../wallet/keystore.js";

const CACHE_DIR = path.join(os.homedir(), ".fishcake-cli");
const WALLETS_FILE = path.join(CACHE_DIR, "wallets.json");

export interface StoredWallet {
    id: string;
    label: string;
    address: string;
    encryptedKey: string;
    createdAt: string;
    lastUsed?: string;
    isActive?: boolean;
}

interface WalletsData {
    wallets: StoredWallet[];
    activeWalletId: string | null;
}

function ensureCacheDir(): void {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

export function loadWalletsData(): WalletsData {
    try {
        if (!fs.existsSync(WALLETS_FILE)) {
            return { wallets: [], activeWalletId: null };
        }
        const data = fs.readFileSync(WALLETS_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        return { wallets: [], activeWalletId: null };
    }
}

export function saveWalletsData(data: WalletsData): void {
    ensureCacheDir();
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

/**
 * Add a new wallet with encrypted storage
 */
export function addWallet(
    privateKey: string,
    passphrase: string,
    label?: string
): { success: boolean; wallet?: StoredWallet; error?: string } {
    if (!validatePrivateKey(privateKey)) {
        return { success: false, error: "Invalid private key format" };
    }

    const normalizedKey = normalizePrivateKey(privateKey);
    const wallet = new ethers.Wallet(normalizedKey);
    const address = wallet.address;

    // Check if wallet already exists
    const data = loadWalletsData();
    const existing = data.wallets.find(
        (w) => w.address.toLowerCase() === address.toLowerCase()
    );
    if (existing) {
        return { success: false, error: "Wallet already exists" };
    }

    // Encrypt the private key
    const encryptedKey = encryptPrivateKey(normalizedKey, passphrase, address);

    const id = `wallet-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const storedWallet: StoredWallet = {
        id,
        label: label || `Wallet ${data.wallets.length + 1}`,
        address,
        encryptedKey,
        createdAt: new Date().toISOString(),
    };

    data.wallets.push(storedWallet);
    
    // Set as active if it's the first wallet
    if (data.wallets.length === 1) {
        data.activeWalletId = id;
        storedWallet.isActive = true;
    }
    
    saveWalletsData(data);

    return { success: true, wallet: storedWallet };
}

/**
 * Batch import multiple wallets
 */
export function batchImportWallets(
    privateKeys: string[],
    passphrase: string
): { imported: StoredWallet[]; failed: { key: string; error: string }[] } {
    const imported: StoredWallet[] = [];
    const failed: { key: string; error: string }[] = [];

    for (let i = 0; i < privateKeys.length; i++) {
        const key = privateKeys[i].trim();
        if (!key) continue;

        const result = addWallet(key, passphrase, `Wallet ${i + 1}`);
        if (result.success && result.wallet) {
            imported.push(result.wallet);
        } else {
            failed.push({
                key: `${key.slice(0, 10)}...`,
                error: result.error || "Unknown error",
            });
        }
    }

    return { imported, failed };
}

/**
 * Get all stored wallets
 */
export function getWallets(): StoredWallet[] {
    return loadWalletsData().wallets;
}

/**
 * Get active wallet
 */
export function getActiveWallet(): StoredWallet | null {
    const data = loadWalletsData();
    if (!data.activeWalletId) return null;
    return data.wallets.find((w) => w.id === data.activeWalletId) || null;
}

/**
 * Set active wallet
 */
export function setActiveWallet(walletId: string): boolean {
    const data = loadWalletsData();
    const wallet = data.wallets.find((w) => w.id === walletId);
    if (!wallet) return false;

    // Update isActive flags
    data.wallets.forEach((w) => (w.isActive = w.id === walletId));
    data.activeWalletId = walletId;
    saveWalletsData(data);
    return true;
}

/**
 * Unlock wallet and get private key
 */
export function unlockWallet(
    walletId: string,
    passphrase: string
): { success: boolean; privateKey?: string; error?: string } {
    const data = loadWalletsData();
    const wallet = data.wallets.find((w) => w.id === walletId);
    if (!wallet) {
        return { success: false, error: "Wallet not found" };
    }

    try {
        const privateKey = decryptPrivateKey(wallet.encryptedKey, passphrase);
        
        // Update last used
        wallet.lastUsed = new Date().toISOString();
        saveWalletsData(data);
        
        return { success: true, privateKey };
    } catch {
        return { success: false, error: "Invalid passphrase" };
    }
}

/**
 * Delete a wallet
 */
export function deleteWallet(walletId: string): boolean {
    const data = loadWalletsData();
    const index = data.wallets.findIndex((w) => w.id === walletId);
    if (index === -1) return false;

    data.wallets.splice(index, 1);
    
    // If deleted wallet was active, set first remaining as active
    if (data.activeWalletId === walletId) {
        data.activeWalletId = data.wallets.length > 0 ? data.wallets[0].id : null;
        if (data.wallets.length > 0) {
            data.wallets[0].isActive = true;
        }
    }
    
    saveWalletsData(data);
    return true;
}

/**
 * Update wallet label
 */
export function updateWalletLabel(walletId: string, newLabel: string): boolean {
    const data = loadWalletsData();
    const wallet = data.wallets.find((w) => w.id === walletId);
    if (!wallet) return false;

    wallet.label = newLabel;
    saveWalletsData(data);
    return true;
}

/**
 * Clear all wallets (logout all)
 */
export function clearAllWallets(): void {
    saveWalletsData({ wallets: [], activeWalletId: null });
}

/**
 * Check if any wallets exist
 */
export function hasWallets(): boolean {
    return loadWalletsData().wallets.length > 0;
}
