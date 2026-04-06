// Mining Module Barrel Export

// Database
export { db, initializeDatabase, walletOps, configOps, eventOps, dropOps, logOps, statsOps, schedulerOps } from './database.js';

// Encryption
export { encrypt, decrypt, encryptPrivateKey, decryptPrivateKey, verifyPassphrase, generatePassphrase } from './encryption.js';
export type { EncryptedData } from './encryption.js';

// Wallet Service
export { 
  importWallets, 
  getAllWallets, 
  getActiveWallets, 
  getReadyWallets,
  getWalletByAddress,
  deleteWallet as deleteWalletFromMining,
  updateWalletStatus,
  updateWalletNFT,
  decryptWalletKey,
  getWalletStats,
  updateWalletBalances,
} from './walletService.js';
export type { WalletImportResult, MiningWallet } from './walletService.js';

// Event Processor
export { processWallet, getRecentEvents, getEventsByWallet, getMiningStats } from './eventProcessor.js';
export type { MiningEvent, MiningConfig } from './eventProcessor.js';

// Scheduler
export { MiningScheduler, miningScheduler } from './scheduler.js';

// Legacy exports for compatibility
export { MiningAutomationEngine, miningEngine } from './MiningAutomationEngine.js';
export type { WorkflowStep } from './MiningAutomationEngine.js';

// Routes
export { default as miningRoutes } from './miningRoutes.js';
