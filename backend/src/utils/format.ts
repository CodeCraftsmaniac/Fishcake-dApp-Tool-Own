/**
 * Format Utilities - Token amounts, balances, addresses
 */

import { ethers } from "ethers";
import { TOKEN_DECIMALS, getTokenSymbol } from "../config/addresses.js";

export function toWei(amount: string | number, decimals: number = 6): bigint {
    return ethers.parseUnits(amount.toString(), decimals);
}

export function fromWei(amount: bigint, decimals: number = 6): string {
    return ethers.formatUnits(amount, decimals);
}

export function toFCCWei(amount: string | number): bigint {
    return toWei(amount, TOKEN_DECIMALS.FCC);
}

export function fromFCCWei(amount: bigint): string {
    return fromWei(amount, TOKEN_DECIMALS.FCC);
}

export function toUSDTWei(amount: string | number): bigint {
    return toWei(amount, TOKEN_DECIMALS.USDT);
}

export function fromUSDTWei(amount: bigint): string {
    return fromWei(amount, TOKEN_DECIMALS.USDT);
}

export function toPOLWei(amount: string | number): bigint {
    return toWei(amount, TOKEN_DECIMALS.POL);
}

export function fromPOLWei(amount: bigint): string {
    return fromWei(amount, TOKEN_DECIMALS.POL);
}

export function formatTokenAmount(
    amount: bigint,
    tokenAddress: string,
    includeSymbol: boolean = true
): string {
    const symbol = getTokenSymbol(tokenAddress);
    const decimals = TOKEN_DECIMALS.FCC;
    const formatted = fromWei(amount, decimals);
    const rounded = formatNumber(parseFloat(formatted), 2);
    return includeSymbol ? `${rounded} ${symbol}` : rounded;
}

export function formatNumber(value: number, decimals: number = 2): string {
    return value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export function formatCompactNumber(value: number): string {
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toFixed(2);
}

export function shortenAddress(address: string, chars: number = 4): string {
    if (address.length <= chars * 2 + 2) {
        return address;
    }
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatHash(hash: string, chars: number = 8): string {
    if (hash.length <= chars * 2 + 2) {
        return hash;
    }
    return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}

export function formatFCCBalance(balance: bigint): string {
    const amount = parseFloat(fromFCCWei(balance));
    return formatCompactNumber(amount);
}

export function formatUSDTBalance(balance: bigint): string {
    const amount = parseFloat(fromUSDTWei(balance));
    return formatNumber(amount, 2);
}

export function formatPOLBalance(balance: bigint): string {
    const amount = parseFloat(fromPOLWei(balance));
    return formatNumber(amount, 4);
}

export function formatDropProgress(done: number, total: number): string {
    return `${done}/${total}`;
}

export function parseUserAmount(input: string): number | null {
    const cleaned = input.replace(/[,\s]/g, "");
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || parsed < 0) {
        return null;
    }
    return parsed;
}

export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}

export function normalizeAddress(address: string): string {
    return ethers.getAddress(address);
}

export function compareAddresses(addr1: string, addr2: string): boolean {
    return addr1.toUpperCase() === addr2.toUpperCase();
}

export function formatEventId(id: number): string {
    return `#${id}`;
}

export function parseEventId(input: string): number | null {
    const cleaned = input.replace(/^#/, "").trim();
    const parsed = parseInt(cleaned, 10);
    if (isNaN(parsed) || parsed < 1) {
        return null;
    }
    return parsed;
}
