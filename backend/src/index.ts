/**
 * @fishcake/backend - Shared Backend for Fishcake CLI and Web Applications
 * 
 * This package contains all business logic, blockchain interactions,
 * and data management for the Fishcake ecosystem.
 */

// Services - Business Logic Layer (main API for frontends)
// This is the primary interface - all business logic goes through services
export * from './services/index.js';

// Namespaced exports for lower-level access
export * as Blockchain from './blockchain/index.js';
export * as Wallet from './wallet/index.js';
export * as Config from './config/index.js';
export * as Utils from './utils/index.js';
export * as Api from './api/index.js';
export * as Cache from './cache/index.js';
export * as Storage from './storage/index.js';

// Types - these don't conflict since services re-export what's needed
// Export only the core types that aren't already in services
export type {
    CreateEventParams,
    TransactionResult,
    WalletBalances,
} from './types/index.js';

// Version info
export const BACKEND_VERSION = '1.0.0';



