/**
 * Wallet Connection - Ethers.js integration
 */

import { ethers, JsonRpcProvider, Wallet } from "ethers";
import { getAddress, TOKEN_DECIMALS } from "../config/addresses.js";
import { ERC20_ABI } from "../config/abis.js";
import type { WalletBalances } from "../types/index.js";

let provider: JsonRpcProvider | null = null;
let wallet: Wallet | null = null;

export function initializeProvider(rpcUrl: string): JsonRpcProvider {
    provider = new JsonRpcProvider(rpcUrl);
    return provider;
}

export function getProvider(): JsonRpcProvider {
    if (!provider) {
        throw new Error("Provider not initialized. Call initializeProvider first.");
    }
    return provider;
}

export function initializeWallet(privateKey: string): Wallet {
    const p = getProvider();
    wallet = new Wallet(privateKey, p);
    return wallet;
}

export function isWalletInitialized(): boolean {
    return wallet !== null;
}

export function disconnectWallet(): void {
    wallet = null;
}

export function getWallet(): Wallet {
    if (!wallet) {
        throw new Error("Wallet not initialized. Call initializeWallet first.");
    }
    return wallet;
}

export function getWalletAddress(): string {
    return getWallet().address;
}

export function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function getBalances(): Promise<WalletBalances> {
    const w = getWallet();
    const p = getProvider();
    
    const fccContract = new ethers.Contract(getAddress("FCC_TOKEN"), ERC20_ABI, p);
    const usdtContract = new ethers.Contract(getAddress("USDT_TOKEN"), ERC20_ABI, p);
    
    const [fcc, usdt, pol] = await Promise.all([
        fccContract.balanceOf(w.address) as Promise<bigint>,
        usdtContract.balanceOf(w.address) as Promise<bigint>,
        p.getBalance(w.address),
    ]);
    
    return { fcc, usdt, pol };
}

export async function getFCCBalance(): Promise<bigint> {
    const w = getWallet();
    const p = getProvider();
    const contract = new ethers.Contract(getAddress("FCC_TOKEN"), ERC20_ABI, p);
    return contract.balanceOf(w.address) as Promise<bigint>;
}

export async function getUSDTBalance(): Promise<bigint> {
    const w = getWallet();
    const p = getProvider();
    const contract = new ethers.Contract(getAddress("USDT_TOKEN"), ERC20_ABI, p);
    return contract.balanceOf(w.address) as Promise<bigint>;
}

export async function getPOLBalance(): Promise<bigint> {
    const w = getWallet();
    const p = getProvider();
    return p.getBalance(w.address);
}

export async function getChainId(): Promise<bigint> {
    const p = getProvider();
    const network = await p.getNetwork();
    return network.chainId;
}

export async function verifyConnection(): Promise<{ 
    connected: boolean; 
    chainId: bigint; 
    blockNumber: number 
}> {
    try {
        const p = getProvider();
        const [network, blockNumber] = await Promise.all([
            p.getNetwork(),
            p.getBlockNumber(),
        ]);
        return {
            connected: true,
            chainId: network.chainId,
            blockNumber,
        };
    } catch {
        return {
            connected: false,
            chainId: 0n,
            blockNumber: 0,
        };
    }
}

export function formatBalance(balance: bigint, decimals: number): string {
    return ethers.formatUnits(balance, decimals);
}

export function parseAmount(amount: string | number, decimals: number): bigint {
    return ethers.parseUnits(amount.toString(), decimals);
}

export function formatFCC(amount: bigint): string {
    return formatBalance(amount, TOKEN_DECIMALS.FCC);
}

export function formatUSDT(amount: bigint): string {
    return formatBalance(amount, TOKEN_DECIMALS.USDT);
}

export function formatPOL(amount: bigint): string {
    return formatBalance(amount, TOKEN_DECIMALS.POL);
}

export function parseFCC(amount: string | number): bigint {
    return parseAmount(amount, TOKEN_DECIMALS.FCC);
}

export function parseUSDT(amount: string | number): bigint {
    return parseAmount(amount, TOKEN_DECIMALS.USDT);
}

export function parsePOL(amount: string | number): bigint {
    return parseAmount(amount, TOKEN_DECIMALS.POL);
}

export async function estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    const p = getProvider();
    return p.estimateGas(tx);
}

export async function getGasPrice(): Promise<bigint> {
    const p = getProvider();
    const feeData = await p.getFeeData();
    return feeData.gasPrice || 0n;
}

export function getTxLink(hash: string): string {
    return `https://polygonscan.com/tx/${hash}`;
}

export function getAddressLink(address: string): string {
    return `https://polygonscan.com/address/${address}`;
}
