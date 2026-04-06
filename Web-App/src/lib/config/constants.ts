/**
 * Fishcake Web App Configuration
 * Contract addresses and chain config for Polygon Mainnet
 */

// RPC endpoints (prioritized - fastest first)
export const RPC_ENDPOINTS = [
  'https://polygon-mainnet.g.alchemy.com/v2/ho45p9JtQwjYllbKWKWNH',
  'https://lb.drpc.live/polygon/Ai-2uYNWu0OmkBvx0BdHgkDK29YkMEwR8aE0Grar0DFx',
  'https://polygon-rpc.com',
] as const;

// Primary RPC
export const POLYGON_RPC = RPC_ENDPOINTS[0];

// Chain configuration
export const POLYGON_CHAIN_ID = 137;

export const CHAIN_CONFIG = {
  id: POLYGON_CHAIN_ID,
  name: 'Polygon',
  network: 'polygon',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [POLYGON_RPC] },
    public: { http: [POLYGON_RPC] },
  },
  blockExplorers: {
    default: { name: 'Polygonscan', url: 'https://polygonscan.com' },
  },
} as const;

// Contract addresses (Polygon Mainnet)
export const CONTRACTS = {
  EVENT_MANAGER: '0x2CAf752814f244b3778e30c27051cc6B45CB1fc9',
  FCC_TOKEN: '0x84eBc138F4Ab844A3050a6059763D269dC9951c6',
  USDT_TOKEN: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  NFT_MANAGER: '0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B',
  STAKING_MANAGER: '0x19C6bf3Ae8DFf14967C1639b96887E8778738417',
  DIRECT_SALE_POOL: '0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE',
  INVESTOR_SALE_POOL: '0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B',
  REDEMPTION_POOL: '0x953E6DB14753552050B04a6393a827661bB4913a',
  MATIC_TOKEN: '0x0000000000000000000000000000000000001010',
} as const;

// Token decimals (CRITICAL: FCC and USDT use 6 decimals!)
export const TOKEN_DECIMALS = {
  FCC: 6,
  USDT: 6,
  POL: 18,
} as const;

// NFT costs in USDT
export const NFT_COSTS = {
  BASIC: 500,  // 500 USDT
  PRO: 2000,   // 2000 USDT
} as const;

// NFT validity periods
export const NFT_VALIDITY = {
  BASIC: 365 * 24 * 60 * 60, // 1 year in seconds
  PRO: 365 * 24 * 60 * 60,   // 1 year in seconds
} as const;

// FCC pool thresholds
export const POOL_THRESHOLDS = {
  USDT_INVESTOR_MIN: 1000,  // >= 1000 USDT uses InvestorSalePool
  FCC_INVESTOR_MIN: 16666,  // >= 16666 FCC uses InvestorSalePool
} as const;

// Default location (Banani, Dhaka)
export const DEFAULT_LOCATION = '23.7937,90.4066';

// Helper functions
export function getTokenSymbol(tokenAddress: string): 'FCC' | 'USDT' | 'POL' | 'UNKNOWN' {
  const addr = tokenAddress.toLowerCase();
  if (addr === CONTRACTS.FCC_TOKEN.toLowerCase()) return 'FCC';
  if (addr === CONTRACTS.USDT_TOKEN.toLowerCase()) return 'USDT';
  if (addr === CONTRACTS.MATIC_TOKEN.toLowerCase()) return 'POL';
  return 'UNKNOWN';
}

export function getTokenDecimals(tokenAddress: string): number {
  const symbol = getTokenSymbol(tokenAddress);
  if (symbol === 'UNKNOWN') return 18;
  return TOKEN_DECIMALS[symbol];
}

export function isFCCToken(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === CONTRACTS.FCC_TOKEN.toLowerCase();
}

export function getExplorerUrl(type: 'tx' | 'address' | 'token', hash: string): string {
  const base = CHAIN_CONFIG.blockExplorers.default.url;
  const paths = { tx: 'tx', address: 'address', token: 'token' };
  return `${base}/${paths[type]}/${hash}`;
}

export function getFishcakeEventUrl(eventId: number): string {
  return `https://fishcake.io/event?activityId=${eventId}`;
}
