/**
 * Validation Utilities
 * All validation rules for Fishcake CLI
 */

import { ethers } from "ethers";
import { isFCCToken, isUSDTToken, getAddress } from "../config/addresses.js";
import type { CreateEventParams, Activity, ActivityExt } from "../types/index.js";

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateCreateEventParams(params: CreateEventParams): ValidationResult {
    const errors: string[] = [];
    
    if (!params.businessName || params.businessName.trim().length === 0) {
        errors.push("Business name is required");
    }
    
    if (params.businessName && params.businessName.length > 100) {
        errors.push("Business name must be 100 characters or less");
    }
    
    if (!params.description || params.description.trim().length === 0) {
        errors.push("Description is required");
    }
    
    if (params.dropType !== 1 && params.dropType !== 2) {
        errors.push("Drop type must be 1 (Even) or 2 (Random)");
    }
    
    if (params.maxDropAmt < params.minDropAmt) {
        errors.push("Max drop amount must be >= min drop amount");
    }
    
    if (params.dropType === 1 && params.maxDropAmt !== params.minDropAmt) {
        errors.push("For Even drop type, min and max amounts must be equal");
    }
    
    if (params.dropNumber < 1) {
        errors.push("Drop number must be at least 1");
    }
    
    if (params.dropNumber > 10000) {
        errors.push("Drop number cannot exceed 10,000");
    }
    
    const now = new Date();
    if (params.endTime <= now) {
        errors.push("End time (deadline) must be in the future");
    }
    
    const maxDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (params.endTime > maxDeadline) {
        errors.push("End time cannot be more than 30 days in the future");
    }
    
    if (params.startTime >= params.endTime) {
        errors.push("Start time must be before end time");
    }
    
    if (params.latitude < -90 || params.latitude > 90) {
        errors.push("Latitude must be between -90 and 90");
    }
    
    if (params.longitude < -180 || params.longitude > 180) {
        errors.push("Longitude must be between -180 and 180");
    }
    
    const totalDropAmts = params.maxDropAmt * params.dropNumber;
    if (totalDropAmts < 1) {
        errors.push("Total drop amount must be at least 1 token");
    }
    
    if (params.token !== "FCC" && params.token !== "USDT") {
        errors.push("Token must be FCC or USDT");
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function validateDropPreConditions(
    activity: Activity,
    activityExt: ActivityExt,
    recipientAddress: string,
    callerAddress: string,
    dropAmount: bigint,
    alreadyDropped: boolean
): ValidationResult {
    const errors: string[] = [];
    
    if (!ethers.isAddress(recipientAddress)) {
        errors.push("Invalid recipient address");
    }
    
    if (alreadyDropped) {
        errors.push("This address has already received a drop from this event");
    }
    
    if (activityExt.activityStatus !== 1) {
        errors.push("Event is not active (already finished)");
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (Number(activity.activityDeadLine) < now) {
        errors.push("Event has expired");
    }
    
    if (activity.businessAccount.toLowerCase() !== callerAddress.toLowerCase()) {
        errors.push("Only the event owner can drop rewards");
    }
    
    if (activityExt.alreadyDropNumber >= activity.dropNumber) {
        errors.push("No drops remaining for this event");
    }
    
    if (dropAmount < activity.minDropAmt) {
        errors.push(`Drop amount is below minimum (${activity.minDropAmt})`);
    }
    
    if (dropAmount > activity.maxDropAmt) {
        errors.push(`Drop amount exceeds maximum (${activity.maxDropAmt})`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function validateAddress(address: string): boolean {
    return ethers.isAddress(address);
}

export function validateAddresses(addresses: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (const addr of addresses) {
        const trimmed = addr.trim();
        if (trimmed && ethers.isAddress(trimmed)) {
            valid.push(ethers.getAddress(trimmed));
        } else if (trimmed) {
            invalid.push(trimmed);
        }
    }
    
    return { valid, invalid };
}

export function validateTokenAddress(address: string): boolean {
    return isFCCToken(address) || isUSDTToken(address);
}

export function validatePrivateKey(privateKey: string): boolean {
    const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    if (cleanKey.length !== 64) return false;
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) return false;
    return true;
}

export function validateEventId(id: number): boolean {
    return Number.isInteger(id) && id >= 1;
}

export function validateDropAmount(
    amount: number,
    min: number,
    max: number
): boolean {
    return amount >= min && amount <= max;
}

export function validateNFTFields(params: {
    businessName: string;
    description: string;
    social: string;
    businessAddress?: string;
    webSite?: string;
    type: 1 | 2;
}): ValidationResult {
    const errors: string[] = [];
    
    if (!params.businessName || params.businessName.trim().length === 0) {
        errors.push("Business name is required");
    }
    
    if (!params.description || params.description.trim().length === 0) {
        errors.push("Description is required");
    }
    
    if (!params.social || params.social.trim().length === 0) {
        errors.push("Social link is required");
    }
    
    if (params.type === 1) {
        if (!params.businessAddress || params.businessAddress.trim().length === 0) {
            errors.push("Business address is required for Pro NFT");
        }
        if (!params.webSite || params.webSite.trim().length === 0) {
            errors.push("Website is required for Pro NFT");
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function validateBuyAmount(
    amount: number,
    direction: "usdt-to-fcc" | "fcc-to-usdt"
): ValidationResult {
    const errors: string[] = [];
    
    if (amount <= 0) {
        errors.push("Amount must be greater than 0");
    }
    
    if (direction === "usdt-to-fcc" && amount < 0.01) {
        errors.push("Minimum USDT amount is 0.01");
    }
    
    if (direction === "fcc-to-usdt" && amount < 1) {
        errors.push("Minimum FCC amount is 1");
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

export function validateLatLng(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function validateURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
