/**
 * Contract Instances for Fishcake CLI
 */

import { ethers, Contract } from "ethers";
import { getProvider, getGasTracker } from "./provider.js";
import { getWallet } from "../wallet/connection.js";
import { getAddress } from "../config/addresses.js";
import {
    EVENT_MANAGER_ABI,
    ERC20_ABI,
    NFT_MANAGER_ABI,
    SALE_POOL_ABI,
    REDEMPTION_POOL_ABI,
    STAKING_MANAGER_ABI,
} from "../config/abis.js";

/**
 * Get gas override for fast transaction confirmation
 * Returns an object to spread into contract function calls
 */
export async function getFastGasOverride(): Promise<{ gasPrice: bigint }> {
    const gasData = await getGasTracker();
    return { gasPrice: gasData.fast };
}

/**
 * Get rapid gas override for urgent transactions
 */
export async function getRapidGasOverride(): Promise<{ gasPrice: bigint }> {
    const gasData = await getGasTracker();
    return { gasPrice: gasData.rapid };
}

export function getEventManagerContract(withSigner: boolean = false): Contract {
    const address = getAddress("EVENT_MANAGER");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, EVENT_MANAGER_ABI, providerOrSigner);
}

export function getFCCContract(withSigner: boolean = false): Contract {
    const address = getAddress("FCC_TOKEN");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, ERC20_ABI, providerOrSigner);
}

export function getUSDTContract(withSigner: boolean = false): Contract {
    const address = getAddress("USDT_TOKEN");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, ERC20_ABI, providerOrSigner);
}

export function getNFTManagerContract(withSigner: boolean = false): Contract {
    const address = getAddress("NFT_MANAGER");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, NFT_MANAGER_ABI, providerOrSigner);
}

export function getDirectSalePoolContract(withSigner: boolean = false): Contract {
    const address = getAddress("DIRECT_SALE_POOL");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, SALE_POOL_ABI, providerOrSigner);
}

export function getInvestorSalePoolContract(withSigner: boolean = false): Contract {
    const address = getAddress("INVESTOR_SALE_POOL");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, SALE_POOL_ABI, providerOrSigner);
}

export function getRedemptionPoolContract(withSigner: boolean = false): Contract {
    const address = getAddress("REDEMPTION_POOL");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, REDEMPTION_POOL_ABI, providerOrSigner);
}

export function getStakingManagerContract(withSigner: boolean = false): Contract {
    const address = getAddress("STAKING_MANAGER");
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(address, STAKING_MANAGER_ABI, providerOrSigner);
}

export function getTokenContract(tokenAddress: string, withSigner: boolean = false): Contract {
    const providerOrSigner = withSigner ? getWallet() : getProvider();
    return new ethers.Contract(tokenAddress, ERC20_ABI, providerOrSigner);
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<bigint> {
    const contract = getTokenContract(tokenAddress);
    return contract.balanceOf(walletAddress) as Promise<bigint>;
}

export async function getTokenAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
): Promise<bigint> {
    const contract = getTokenContract(tokenAddress);
    return contract.allowance(ownerAddress, spenderAddress) as Promise<bigint>;
}

export async function getTokenDecimals(tokenAddress: string): Promise<number> {
    const contract = getTokenContract(tokenAddress);
    return contract.decimals() as Promise<number>;
}

export async function getTokenSymbol(tokenAddress: string): Promise<string> {
    const contract = getTokenContract(tokenAddress);
    return contract.symbol() as Promise<string>;
}
