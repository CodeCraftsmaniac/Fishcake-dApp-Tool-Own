/**
 * NFT Service - Business logic for NFT minting operations
 * NO UI CODE - Pure business logic for NFT management
 */

import { ethers } from "ethers";
import { getNFTManagerContract, getFastGasOverride } from "../blockchain/contracts.js";
import { approveNFTManager } from "../blockchain/approval.js";
import { getWalletAddress, getFCCBalance } from "../wallet/connection.js";
import { getAddress, TOKEN_DECIMALS } from "../config/addresses.js";
import { toWei, fromWei } from "../utils/format.js";
import type { TransactionResult } from "../types/index.js";

// NFT Types
export const NFTType = {
    PRO: 1,      // 5 fields: name, desc, address, website, social
    BASIC: 2,    // 3 fields: name, desc, social
} as const;

// NFT Status
export const NFTStatus = {
    NONE: 0,
    BASIC: 1,
    PRO: 2,
} as const;

// NFT costs
export const NFT_COSTS = {
    BASIC: 500,   // 500 FCC
    PRO: 2000,    // 2000 FCC
} as const;

// NFT templates
export interface NFTTemplate {
    id: string;
    name: string;
    description: string;
    type: 1 | 2;
    // Pro-only fields
    address?: string;
    website?: string;
    social: string;
}

export const NFT_TEMPLATES: NFTTemplate[] = [
    {
        id: "template-1",
        name: "CryptoStore",
        description: "Your trusted cryptocurrency store and exchange",
        type: 2,
        social: "https://twitter.com/cryptostore",
    },
    {
        id: "template-2",
        name: "NFT Gallery",
        description: "Premium digital art gallery and NFT marketplace",
        type: 2,
        social: "https://discord.gg/nftgallery",
    },
    {
        id: "template-3",
        name: "DeFi Hub",
        description: "Decentralized finance solutions and yield farming",
        type: 2,
        social: "https://t.me/defihub",
    },
    {
        id: "template-4",
        name: "Blockchain Cafe",
        description: "Coffee shop accepting crypto payments",
        type: 1,
        address: "123 Crypto Street, Web3 City",
        website: "https://blockchaincafe.io",
        social: "https://instagram.com/blockchaincafe",
    },
    {
        id: "template-5",
        name: "Web3 Studio",
        description: "Professional blockchain development services",
        type: 1,
        address: "456 Decentralized Ave, Meta Town",
        website: "https://web3studio.dev",
        social: "https://linkedin.com/company/web3studio",
    },
];

export interface NFTMintInput {
    type: 1 | 2;  // PRO = 1, BASIC = 2
    name: string;
    description: string;
    // Pro-only fields
    address?: string;
    website?: string;
    social: string;
}

export interface NFTInfo {
    tokenId: number;
    type: number;
    owner: string;
    expiryTime: number;
    isValid: boolean;
    daysRemaining: number;
    name: string;
    description: string;
}

export interface MintResult extends TransactionResult {
    tokenId?: number;
    type?: number;
}

/**
 * Validate NFT mint input
 */
export function validateMintInput(input: NFTMintInput): { valid: boolean; error?: string } {
    if (!input.name || input.name.length < 2) {
        return { valid: false, error: "Name must be at least 2 characters" };
    }
    if (!input.description || input.description.length < 5) {
        return { valid: false, error: "Description must be at least 5 characters" };
    }
    if (!input.social) {
        return { valid: false, error: "Social link is required" };
    }
    
    if (input.type === NFTType.PRO) {
        if (!input.address || input.address.length < 5) {
            return { valid: false, error: "Physical address is required for Pro NFT" };
        }
        if (!input.website) {
            return { valid: false, error: "Website is required for Pro NFT" };
        }
        // Basic URL validation
        try {
            new URL(input.website);
        } catch {
            return { valid: false, error: "Invalid website URL" };
        }
    }
    
    return { valid: true };
}

/**
 * Get NFT mint cost
 */
export function getMintCost(type: 1 | 2): number {
    return type === NFTType.PRO ? NFT_COSTS.PRO : NFT_COSTS.BASIC;
}

/**
 * Check if user has sufficient balance for minting
 */
export async function checkMintBalance(type: 1 | 2): Promise<{
    sufficient: boolean;
    balance: string;
    required: string;
}> {
    const cost = getMintCost(type);
    const requiredWei = toWei(cost.toString(), TOKEN_DECIMALS.FCC);
    const balanceWei = await getFCCBalance();
    
    return {
        sufficient: balanceWei >= requiredWei,
        balance: fromWei(balanceWei, TOKEN_DECIMALS.FCC),
        required: cost.toString(),
    };
}

/**
 * Get current NFT status for wallet
 */
export async function getNFTStatus(address?: string): Promise<{
    hasPass: boolean;
    passType: "basic" | "pro" | null;
    tokenId: number | null;
    expiryTime: number | null;
    daysRemaining: number;
    isExpired: boolean;
}> {
    try {
        const walletAddress = address || getWalletAddress();
        const nftManager = getNFTManagerContract();
        
        // Try to get NFT balance
        const balance = await nftManager.balanceOf(walletAddress);
        
        if (balance === 0n) {
            return {
                hasPass: false,
                passType: null,
                tokenId: null,
                expiryTime: null,
                daysRemaining: 0,
                isExpired: false,
            };
        }

        // Get token ID
        const tokenId = await nftManager.tokenOfOwnerByIndex(walletAddress, 0);
        
        // Get token info
        const info = await nftManager.nftInfos(tokenId);
        const nftType = Number(info.nftType);
        const expiryTime = Number(info.expirationDate);
        
        const now = Math.floor(Date.now() / 1000);
        const isExpired = expiryTime <= now;
        const daysRemaining = isExpired ? 0 : Math.floor((expiryTime - now) / 86400);

        return {
            hasPass: true,
            passType: nftType === 1 ? "pro" : "basic",
            tokenId: Number(tokenId),
            expiryTime,
            daysRemaining,
            isExpired,
        };
    } catch {
        return {
            hasPass: false,
            passType: null,
            tokenId: null,
            expiryTime: null,
            daysRemaining: 0,
            isExpired: false,
        };
    }
}

/**
 * Mint a new NFT
 */
export async function mintNFT(
    input: NFTMintInput,
    onApprovalStart?: () => void,
    onApprovalComplete?: (txHash: string) => void,
    onMintStart?: () => void,
    onMintComplete?: (tokenId: number, txHash: string) => void
): Promise<MintResult> {
    try {
        // Validate input
        const validation = validateMintInput(input);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Check balance
        const balanceCheck = await checkMintBalance(input.type);
        if (!balanceCheck.sufficient) {
            return { 
                success: false, 
                error: `Insufficient FCC balance. Have: ${balanceCheck.balance}, Need: ${balanceCheck.required}` 
            };
        }

        // Check if already has NFT
        const status = await getNFTStatus();
        if (status.hasPass && !status.isExpired) {
            return { success: false, error: "You already have an active NFT pass" };
        }

        const cost = getMintCost(input.type);
        const costWei = toWei(cost.toString(), TOKEN_DECIMALS.FCC);

        // Approve FCC
        if (onApprovalStart) onApprovalStart();
        
        const approvalResult = await approveNFTManager(getAddress("FCC_TOKEN"), costWei);
        if (approvalResult.needed && !approvalResult.result?.success) {
            return { success: false, error: approvalResult.result?.error || "Approval failed" };
        }
        
        if (approvalResult.needed && approvalResult.result?.hash && onApprovalComplete) {
            onApprovalComplete(approvalResult.result.hash);
        }

        // Mint NFT
        if (onMintStart) onMintStart();
        
        const nftManager = getNFTManagerContract(true);
        const gasOverride = await getFastGasOverride();

        let tx;
        if (input.type === NFTType.PRO) {
            tx = await nftManager.mintProNFT(
                input.name,
                input.description,
                input.address,
                input.website,
                input.social,
                gasOverride
            );
        } else {
            tx = await nftManager.mintBasicNFT(
                input.name,
                input.description,
                input.social,
                gasOverride
            );
        }

        const receipt = await tx.wait();

        if (receipt.status !== 1) {
            return { success: false, error: "Transaction reverted" };
        }

        // Extract token ID from Transfer event
        let tokenId = 0;
        const transferSig = nftManager.interface.getEvent("Transfer")?.topicHash;
        
        for (const log of receipt.logs) {
            try {
                if (log.topics[0] === transferSig) {
                    // Transfer(from, to, tokenId) - tokenId is topics[3]
                    tokenId = Number(BigInt(log.topics[3]));
                    break;
                }
            } catch {
                continue;
            }
        }

        if (onMintComplete) onMintComplete(tokenId, receipt.hash);

        return {
            success: true,
            hash: receipt.hash,
            gasUsed: receipt.gasUsed,
            tokenId,
            type: input.type,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Mint from template
 */
export async function mintFromTemplate(
    templateId: string,
    onApprovalStart?: () => void,
    onApprovalComplete?: (txHash: string) => void,
    onMintStart?: () => void,
    onMintComplete?: (tokenId: number, txHash: string) => void
): Promise<MintResult> {
    const template = NFT_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
        return { success: false, error: "Template not found" };
    }

    return mintNFT(
        {
            type: template.type,
            name: template.name,
            description: template.description,
            address: template.address,
            website: template.website,
            social: template.social,
        },
        onApprovalStart,
        onApprovalComplete,
        onMintStart,
        onMintComplete
    );
}

/**
 * Get all available templates
 */
export function getTemplates(): NFTTemplate[] {
    return NFT_TEMPLATES;
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: 1 | 2): NFTTemplate[] {
    return NFT_TEMPLATES.filter(t => t.type === type);
}
