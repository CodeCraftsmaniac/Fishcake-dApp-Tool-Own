/**
 * Services Layer - Re-exports all services
 * 
 * This is the main entry point for all business logic.
 * Frontend screens should import from here, not directly from service files.
 */

// Event management
export {
    getEventInfo,
    getUserEvents,
    isEventOwner,
    createEvent,
    createQuickEvent,
    finishEvent,
    calculateEventRefund,
    validateEventCreation,
    checkEventCreationBalance,
    EventStatus,
    type EventBaseInfo,
    type EventExtInfo,
    type EventFullInfo,
    type CreateEventInput,
    type CreateEventResult,
} from "./EventService.js";

// Drop operations
export {
    validateDrop,
    executeDrop,
    executeBatchDrop,
    getDropHistory,
    calculateRemainingCapacity,
    type DropValidation,
    type DropResult,
    type BatchDropResult,
    type DropHistoryEntry,
} from "./DropService.js";

// Token swaps
export {
    getBuyPool,
    getSellPool,
    getBuyQuote,
    getSellQuote,
    checkSwapBalance,
    buyFCC,
    sellFCC,
    getPoolInfo,
    SWAP_THRESHOLDS,
    FCC_PRICE_USDT,
    type SwapPool,
    type SwapQuote,
    type SwapResult,
} from "./SwapService.js";

// NFT management
export {
    validateMintInput,
    getMintCost,
    checkMintBalance,
    getNFTStatus,
    mintNFT,
    mintFromTemplate,
    getTemplates,
    getTemplatesByType,
    NFTType,
    NFTStatus,
    NFT_COSTS,
    NFT_TEMPLATES,
    type NFTTemplate,
    type NFTMintInput,
    type NFTInfo,
    type MintResult,
} from "./NFTService.js";

// Dashboard data
export {
    fetchBalances,
    fetchPassInfo,
    fetchGasPrice,
    fetchUserEvents,
    fetchDashboardData,
    refreshBalances,
    refreshGas,
    formatTimeRemaining,
    formatPassValidity,
    eventToSummary,
    type BalanceData,
    type PassInfo,
    type EventSummary,
    type DashboardData,
} from "./DashboardService.js";

// Wallet management
export {
    hasWallet,
    isWalletUnlocked,
    getCurrentWalletAddress,
    listWallets,
    validatePrivateKey,
    validatePassword,
    importWallet,
    importWalletsBatch,
    unlockWallet,
    getLastActiveWallet,
    logout,
    deleteWallet,
    getSigningWallet,
    isValidAddress,
    formatAddress,
    type WalletInfo,
    type ImportResult,
    type UnlockResult,
} from "./WalletService.js";

// Quick airdrop
export {
    getSavedAddresses,
    calculateAirdropCost,
    validateQuickAirdrop,
    executeQuickAirdrop,
    executeCustomAirdrop,
    executePowerUserAirdrop,
    QUICK_AIRDROP_TEMPLATES,
    type QuickAirdropConfig,
    type QuickAirdropResult,
    type AirdropProgress,
} from "./QuickAirdropService.js";
