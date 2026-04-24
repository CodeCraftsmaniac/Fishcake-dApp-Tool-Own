// Mining Module Barrel Export

// Database (Supabase)
export { supabase as db, initializeDatabase, walletOps, configOps, eventOps, dropOps, logOps, statsOps, schedulerOps, refreshTokenOps, nonceOps } from './databaseAdapter.js';
export type { MiningWallet, MiningConfig, SchedulerState } from './databaseAdapter.js';

// Encryption
export { encrypt, decrypt, encryptPrivateKey, decryptPrivateKey, verifyPassphrase, generatePassphrase } from './encryption.js';
export type { EncryptedData } from './encryption.js';

// Wallet Service (Supabase)
export { 
  importWallets, 
} from './walletServiceAsync.js';
export type { WalletImportResult } from './walletServiceAsync.js';

// Event Processor (Supabase)
export { processWallet } from './eventProcessorAsync.js';

// Scheduler (Supabase)
export { MiningScheduler, miningScheduler } from './schedulerAsync.js';

// Routes (Supabase)
export { default as miningRoutes } from './miningRoutesAsync.js';
