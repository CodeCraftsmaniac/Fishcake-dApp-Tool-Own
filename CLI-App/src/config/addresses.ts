/**
 * Contract Addresses for Fishcake CLI
 * Polygon Mainnet (Chain ID: 137)
 * 
 * CRITICAL: These are PROXY addresses (UUPS upgradeable)
 */

export const CONTRACTS = {
    EVENT_MANAGER: "0x2CAf752814f244b3778e30c27051cc6B45CB1fc9",
    FCC_TOKEN: "0x84eBc138F4Ab844A3050a6059763D269dC9951c6",
    USDT_TOKEN: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    NFT_MANAGER: "0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B",
    STAKING_MANAGER: "0x19C6bf3Ae8DFf14967C1639b96887E8778738417",
    DIRECT_SALE_POOL: "0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE",
    INVESTOR_SALE_POOL: "0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B",
    REDEMPTION_POOL: "0x953E6DB14753552050B04a6393a827661bB4913a",
    MATIC_TOKEN: "0x0000000000000000000000000000000000001010",
} as const;

export const CHAIN_CONFIG = {
    CHAIN_ID: 137,
    CHAIN_NAME: "Polygon Mainnet",
    RPC_URL: "https://polygon-mainnet.g.alchemy.com/v2/ho45p9JtQwjYllbKWKWNH",
    EXPLORER_URL: "https://polygonscan.com",
    CURRENCY: {
        name: "POL",
        symbol: "POL",
        decimals: 18,
    },
} as const;

export const TOKEN_DECIMALS = {
    FCC: 6,
    USDT: 6,
    POL: 18,
} as const;

export const NFT_COST = {
    BASIC: {
        type: 2,
        amount: 8,      // 8 USDT
        amountWei: 8_000_000n,  // 8 USDT in 6 decimals
    },
    PRO: {
        type: 1,
        amount: 80,     // 80 USDT
        amountWei: 80_000_000n, // 80 USDT in 6 decimals
    },
} as const;

export const SALE_POOL_THRESHOLDS = {
    USDT_THRESHOLD: 1000,      // >= 1000 USDT goes to InvestorSalePool
    FCC_THRESHOLD: 16666,      // >= 16666 FCC goes to InvestorSalePool
} as const;

export const MINING_TIERS = [
    { maxMined: 30_000_000,  proPercent: 50, basicPercent: 25, maxPerEvent: 60 },
    { maxMined: 100_000_000, proPercent: 40, basicPercent: 20, maxPerEvent: 30 },
    { maxMined: 200_000_000, proPercent: 20, basicPercent: 10, maxPerEvent: 15 },
    { maxMined: 300_000_000, proPercent: 10, basicPercent: 5,  maxPerEvent: 8 },
] as const;

export type ContractName = keyof typeof CONTRACTS;
export type TokenSymbol = keyof typeof TOKEN_DECIMALS;

let dynamicAddresses: Record<string, string> | null = null;

export function setDynamicAddresses(addresses: {
    FccToken?: string;
    UsdtToken?: string;
    NFTManager?: string;
    FishcakeEventManager?: string;
    DirectSalePool?: string;
    InvestorSalePool?: string;
    RedemptionPool?: string;
}): void {
    dynamicAddresses = {
        EVENT_MANAGER: addresses.FishcakeEventManager || CONTRACTS.EVENT_MANAGER,
        FCC_TOKEN: addresses.FccToken || CONTRACTS.FCC_TOKEN,
        USDT_TOKEN: addresses.UsdtToken || CONTRACTS.USDT_TOKEN,
        NFT_MANAGER: addresses.NFTManager || CONTRACTS.NFT_MANAGER,
        DIRECT_SALE_POOL: addresses.DirectSalePool || CONTRACTS.DIRECT_SALE_POOL,
        INVESTOR_SALE_POOL: addresses.InvestorSalePool || CONTRACTS.INVESTOR_SALE_POOL,
        REDEMPTION_POOL: addresses.RedemptionPool || CONTRACTS.REDEMPTION_POOL,
    };
}

export function getAddress(contract: ContractName): string {
    if (dynamicAddresses && dynamicAddresses[contract]) {
        return dynamicAddresses[contract]!;
    }
    return CONTRACTS[contract];
}

export function isFCCToken(address: string): boolean {
    const fccAddress = getAddress("FCC_TOKEN");
    return address.toUpperCase() === fccAddress.toUpperCase();
}

export function isUSDTToken(address: string): boolean {
    const usdtAddress = getAddress("USDT_TOKEN");
    return address.toUpperCase() === usdtAddress.toUpperCase();
}

export function getTokenSymbol(address: string): "FCC" | "USDT" | "UNKNOWN" {
    if (isFCCToken(address)) return "FCC";
    if (isUSDTToken(address)) return "USDT";
    return "UNKNOWN";
}

export function getTokenDecimals(address: string): number {
    const symbol = getTokenSymbol(address);
    if (symbol === "FCC") return TOKEN_DECIMALS.FCC;
    if (symbol === "USDT") return TOKEN_DECIMALS.USDT;
    return 6;
}
