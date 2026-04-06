/**
 * TypeScript Types and Interfaces for Fishcake CLI
 */

export interface Activity {
    id?: string;
    activityId: number;
    businessAccount: string;
    businessName: string;
    activityContent: string;
    latitudeLongitude: string;
    activityCreateTime: number;
    activityDeadLine: number;
    dropType: number;
    dropNumber: number;
    minDropAmt: bigint;
    maxDropAmt: bigint;
    tokenContractAddr: string;
}

export interface ActivityExt {
    activityId: number;
    alreadyDropAmts: bigint;
    alreadyDropNumber: number;
    businessMinedAmt: bigint;
    businessMinedWithdrawedAmt: bigint;
    activityStatus: number;
}

export interface ActivityFull extends Activity {
    ext: ActivityExt;
}

export interface ActivityContentParsed {
    activityContentDescription?: string;
    activityContentAddress?: string;
    activityContentLink?: string;
    eventStartTime?: string;
    eventEndTime?: string;
}

export interface DropRecord {
    id?: string;
    activityId: number;
    address?: string;
    businessAccount?: string;
    dropAddress?: string;
    dropAmount: bigint | string;
    dropType: number;
    timestamp: number;
    tokenContractAddr: string;
    businessName: string;
    transactionHash?: string;
    txHash?: string;
}

export interface NFT {
    id?: string;
    who: string;
    tokenId: number;
    businessName: string;
    description: string;
    imgUrl: string;
    businessAddress: string;
    webSite: string;
    social: string;
    contractAddress: string;
    costValue: bigint;
    deadline: number;
    nftType: number;
}

export interface CreateEventParams {
    businessName: string;
    description: string;
    address?: string;
    link?: string;
    latitude: number;
    longitude: number;
    startTime: Date;
    endTime: Date;
    token: "FCC" | "USDT";
    dropType: 1 | 2;
    minDropAmt: number;
    maxDropAmt: number;
    dropNumber: number;
}

export interface DropParams {
    activityId: number;
    recipientAddress: string;
    amount: bigint;
}

export interface BatchDropResult {
    address: string;
    status: "SUCCESS" | "SKIPPED" | "FAILED";
    txHash?: string;
    amount?: string;
    reason?: string;
}

export interface QRClaimData {
    businessAccount?: string;
    activity: number;
    address: string;
    rewardAmt: string;
    tokenType: 1 | 2;
}

export interface MintNFTParams {
    businessName: string;
    description: string;
    imgUrl?: string;
    businessAddress?: string;
    webSite?: string;
    social: string;
    type: 1 | 2;
}

export interface WalletBalances {
    fcc: bigint;
    usdt: bigint;
    pol: bigint;
}

export interface APIResponse<T> {
    code: number;
    msg: string;
    obj: T;
}

export interface PaginatedResponse<T> {
    currentPage: number;
    pageSize: number;
    result: T[];
    total: number;
}

export interface ContractInfoResponse {
    FccToken: string;
    UsdtToken: string;
    NFTManager: string;
    FishcakeEventManager: string;
    DirectSalePool: string;
    InvestorSalePool: string;
    RedemptionPool: string;
}

export interface BalanceResponse {
    usdt_balance: string;
    fcc_balance: string;
    pol_balance: string;
}

export interface MiningInfo {
    totalMined: bigint;
    currentTier: number;
    proPercent: number;
    basicPercent: number;
    maxPerEvent: number;
}

export interface NFTStatus {
    hasProNFT: boolean;
    hasBasicNFT: boolean;
    proDeadline: number;
    basicDeadline: number;
    proActive: boolean;
    basicActive: boolean;
}

export interface TransactionResult {
    success: boolean;
    hash?: string;
    error?: string;
    gasUsed?: bigint;
}

export type ActivityStatus = "active" | "expired" | "finished";

export interface GroupedActivities {
    active: ActivityFull[];
    expired: ActivityFull[];
    finished: ActivityFull[];
}

export interface BuyFCCParams {
    direction: "usdt-to-fcc" | "fcc-to-usdt";
    amount: number;
    useInvestorPool: boolean;
}

export interface SalePoolInfo {
    pool: "direct" | "investor";
    poolAddress: string;
    estimatedOutput: bigint;
}

export type DropHistoryFilter = "received" | "sent";
export type SortOrder = "newest" | "oldest";

export interface DropHistoryFilters {
    type: DropHistoryFilter;
    sort: SortOrder;
}

export interface EventFilters {
    status: "all" | "ongoing" | "ended";
    token: "all" | "FCC" | "USDT";
    search?: string;
}

export const DROP_TYPE = {
    EVEN: 1,
    RANDOM: 2,
} as const;

export const ACTIVITY_STATUS = {
    ACTIVE: 1,
    FINISHED: 2,
} as const;

export const NFT_TYPE = {
    PRO: 1,
    BASIC: 2,
} as const;

export const TOKEN_TYPE = {
    FCC: 1,
    USDT: 2,
} as const;
