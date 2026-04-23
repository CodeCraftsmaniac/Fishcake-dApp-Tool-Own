// Mining Database Schema - SQLite implementation
import Database, { Database as DatabaseType, Statement } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';

const DB_PATH = process.env.MINING_DB_PATH || path.join(process.cwd(), 'data', 'mining.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
export const db: DatabaseType = new Database(DB_PATH);

// DB write queue for handling busy/locked states
const writeQueue: Array<{ fn: () => void; resolve: (value: unknown) => void; reject: (reason: Error) => void }> = [];
let isProcessingQueue = false;

export function queueWrite<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if ((error as Error).message?.includes('locked') || (error as Error).message?.includes('BUSY')) {
      // Queue for retry
      logger.warn('DB locked, queuing write operation');
      return new Promise<T>((resolve, reject) => {
        writeQueue.push({ fn: () => fn(), resolve: resolve as (value: unknown) => void, reject });
        processQueue();
      }) as T;
    }
    throw error;
  }
}

function processQueue(): void {
  if (isProcessingQueue || writeQueue.length === 0) return;
  isProcessingQueue = true;

  const item = writeQueue.shift()!;
  try {
    const result = item.fn();
    item.resolve(result);
  } catch (error) {
    item.reject(error as Error);
  } finally {
    isProcessingQueue = false;
    if (writeQueue.length > 0) {
      setTimeout(processQueue, 100);
    }
  }
}

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
export function initializeDatabase(): void {
  // Mining Wallets Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mining_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL UNIQUE,
      encrypted_key TEXT NOT NULL,
      salt TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'error', 'nft_expired')),
      failure_count INTEGER DEFAULT 0,
      last_error TEXT,
      
      nft_type TEXT DEFAULT 'NONE' CHECK(nft_type IN ('NONE', 'BASIC', 'PRO')),
      nft_expiry_at INTEGER,
      nft_token_id INTEGER,
      
      fcc_balance TEXT DEFAULT '0',
      usdt_balance TEXT DEFAULT '0',
      pol_balance TEXT DEFAULT '0',
      
      last_event_id INTEGER,
      next_event_at INTEGER,
      
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);

  // Mining Config Table (single row)
  db.exec(`
    CREATE TABLE IF NOT EXISTS mining_config (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
      
      recipient_address_1 TEXT NOT NULL DEFAULT '',
      recipient_address_2 TEXT NOT NULL DEFAULT '',
      
      fcc_per_recipient TEXT DEFAULT '12',
      total_fcc_per_event TEXT DEFAULT '24',
      expected_mining_reward TEXT DEFAULT '6',
      
      scheduler_enabled INTEGER DEFAULT 0,
      event_interval_hours INTEGER DEFAULT 24,
      offset_minutes INTEGER DEFAULT 5,
      max_concurrent_events INTEGER DEFAULT 3,
      
      max_retries INTEGER DEFAULT 3,
      retry_delay_seconds INTEGER DEFAULT 60,
      
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);

  // Insert default config if not exists
  db.exec(`
    INSERT OR IGNORE INTO mining_config (id) VALUES (1)
  `);

  // Scheduler State Table (for persistence across restarts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduler_state (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      is_running INTEGER DEFAULT 0,
      passphrase_hash TEXT,
      started_at INTEGER,
      last_tick_at INTEGER,
      processing_wallets TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);

  // Insert default scheduler state if not exists
  db.exec(`
    INSERT OR IGNORE INTO scheduler_state (id) VALUES (1)
  `);

  // Mining Events Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mining_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      
      chain_event_id INTEGER,
      
      status TEXT DEFAULT 'PENDING' CHECK(status IN (
        'PENDING', 'CREATED', 'DROPPING', 'DROPS_COMPLETE', 
        'MONITORING', 'MINING_COMPLETE', 'FINISHING', 'FINISHED',
        'FAILED', 'TIMEOUT'
      )),
      
      drops_checklist TEXT DEFAULT '0/2',
      drop_1_completed INTEGER DEFAULT 0,
      drop_1_tx_hash TEXT,
      drop_1_amount TEXT,
      drop_2_completed INTEGER DEFAULT 0,
      drop_2_tx_hash TEXT,
      drop_2_amount TEXT,
      total_dropped TEXT,
      
      reward_eligible INTEGER DEFAULT 0,
      reward_received TEXT,
      reward_tx_hash TEXT,
      
      total_gas_used TEXT,
      total_gas_cost TEXT,
      
      started_at INTEGER,
      drops_completed_at INTEGER,
      reward_received_at INTEGER,
      finished_at INTEGER,
      
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      
      FOREIGN KEY (wallet_id) REFERENCES mining_wallets(id) ON DELETE CASCADE
    )
  `);

  // Mining Drops Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mining_drops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      
      recipient_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      drop_number INTEGER NOT NULL CHECK(drop_number IN (1, 2)),
      
      tx_hash TEXT,
      block_number INTEGER,
      gas_used TEXT,
      
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED')),
      error_message TEXT,
      
      created_at INTEGER DEFAULT (unixepoch()),
      confirmed_at INTEGER,
      
      FOREIGN KEY (event_id) REFERENCES mining_events(id) ON DELETE CASCADE
    )
  `);

  // Mining Rewards Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mining_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      wallet_id INTEGER NOT NULL,
      
      expected_amount TEXT DEFAULT '6',
      actual_amount TEXT,
      
      balance_before TEXT,
      balance_after TEXT,
      detected_at INTEGER,
      
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'DETECTED', 'CONFIRMED', 'FAILED')),
      
      created_at INTEGER DEFAULT (unixepoch()),
      
      FOREIGN KEY (event_id) REFERENCES mining_events(id) ON DELETE CASCADE,
      FOREIGN KEY (wallet_id) REFERENCES mining_wallets(id) ON DELETE CASCADE
    )
  `);

  // Mining Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mining_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      wallet_id INTEGER,
      event_id INTEGER,
      
      level TEXT DEFAULT 'INFO' CHECK(level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS')),
      action TEXT NOT NULL,
      message TEXT NOT NULL,
      
      tx_hash TEXT,
      metadata TEXT,
      
      created_at INTEGER DEFAULT (unixepoch())
    )
  `);

  // Refresh Tokens Table (for JWT persistence)
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `);

  // Pending Nonces Table (for nonce persistence across restarts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_nonces (
      address TEXT PRIMARY KEY,
      nonce INTEGER NOT NULL,
      pending_count INTEGER NOT NULL DEFAULT 1,
      last_updated INTEGER NOT NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_wallets_status ON mining_wallets(status);
    CREATE INDEX IF NOT EXISTS idx_wallets_next_event ON mining_wallets(next_event_at);
    CREATE INDEX IF NOT EXISTS idx_events_status ON mining_events(status);
    CREATE INDEX IF NOT EXISTS idx_events_wallet ON mining_events(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_events_wallet_status ON mining_events(wallet_id, status);
    CREATE INDEX IF NOT EXISTS idx_events_created_status ON mining_events(created_at DESC, status);
    CREATE INDEX IF NOT EXISTS idx_drops_event ON mining_drops(event_id);
    CREATE INDEX IF NOT EXISTS idx_logs_wallet ON mining_logs(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_logs_action ON mining_logs(action);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON mining_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
  `);

  logger.info('✅ Mining database initialized');
}

/**
 * Close database connection gracefully
 */
export function closeDatabase(): void {
  try {
    db.close();
    logger.info('✅ Mining database connection closed');
  } catch (error) {
    logger.error('Error closing database:', { error: (error as Error).message });
  }
}

// Type definitions for database row results
export interface MiningWalletRow {
  id: number;
  address: string;
  encrypted_key: string;
  salt: string;
  iv: string;
  auth_tag: string;
  nft_type: string;
  nft_expiry_at: number | null;
  nft_token_id: number | null;
  fcc_balance: string | null;
  usdt_balance: string | null;
  pol_balance: string | null;
  status: string;
  failure_count: number;
  last_error: string | null;
  last_event_id: number | null;
  next_event_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface MiningConfigRow {
  id: number;
  recipient_address_1: string;
  recipient_address_2: string;
  fcc_per_recipient: string;
  total_fcc_per_event: string;
  expected_mining_reward: string;
  offset_minutes: number;
  max_retries: number;
  scheduler_enabled: number;
  max_concurrent_wallets: number;
  created_at: number;
  updated_at: number;
}

export interface MiningEventRow {
  id: number;
  wallet_id: number;
  chain_event_id: number | null;
  status: string;
  drops_checklist: string;
  drop_1_completed: number;
  drop_1_tx_hash: string | null;
  drop_2_completed: number;
  drop_2_tx_hash: string | null;
  total_dropped: string | null;
  reward_eligible: number;
  reward_received: string | null;
  started_at: number;
  finished_at: number | null;
}

export interface MiningDropRow {
  id: number;
  event_id: number;
  recipient_address: string;
  amount: string;
  tx_hash: string | null;
  status: string;
  created_at: number;
}

export interface MiningLogRow {
  id: number;
  wallet_id: number | null;
  event_id: number | null;
  level: string;
  message: string;
  details: string | null;
  created_at: number;
}

// Type for statement operations
type StatementOps<T> = {
  insert: Statement;
  getByAddress?: Statement<[string], T>;
  getAll?: Statement<[], T>;
  getActive?: Statement<[], T>;
  getReadyForEvent?: Statement<[number, number], T>;
  updateStatus?: Statement;
  updateNFT?: Statement;
  updateBalances?: Statement;
  updateLastEvent?: Statement;
  delete?: Statement;
  get?: Statement;
  updateRecipients?: Statement;
  updateAmounts?: Statement;
  updateScheduler?: Statement;
};

// Initialize database FIRST before creating prepared statements
initializeDatabase();

// Wallet operations
export const walletOps: Record<string, Statement> = {
  insert: db.prepare(`
    INSERT INTO mining_wallets (address, encrypted_key, salt, iv, auth_tag, nft_type)
    VALUES (@address, @encrypted_key, @salt, @iv, @auth_tag, @nft_type)
  `),

  getByAddress: db.prepare(`
    SELECT * FROM mining_wallets WHERE address = ? COLLATE NOCASE
  `),

  getAll: db.prepare(`
    SELECT * FROM mining_wallets ORDER BY created_at DESC
  `),

  getActive: db.prepare(`
    SELECT * FROM mining_wallets WHERE status = 'active'
  `),

  getReadyForEvent: db.prepare(`
    SELECT w.* FROM mining_wallets w
    LEFT JOIN mining_events e ON w.last_event_id = e.id
    WHERE w.status = 'active'
      AND (w.nft_expiry_at IS NULL OR w.nft_expiry_at > unixepoch())
      AND (
        w.last_event_id IS NULL
        OR (
          e.status = 'FINISHED'
          AND e.finished_at + (? * 60) <= unixepoch()
        )
        OR (
          e.status IN ('ERROR', 'TIMEOUT')
        )
      )
    ORDER BY w.id
    LIMIT ?
  `),

  updateStatus: db.prepare(`
    UPDATE mining_wallets 
    SET status = @status, failure_count = @failure_count, last_error = @last_error, updated_at = unixepoch()
    WHERE id = @id
  `),

  updateNFT: db.prepare(`
    UPDATE mining_wallets 
    SET nft_type = @nft_type, nft_expiry_at = @nft_expiry_at, nft_token_id = @nft_token_id, updated_at = unixepoch()
    WHERE id = @id
  `),

  updateBalances: db.prepare(`
    UPDATE mining_wallets 
    SET fcc_balance = @fcc_balance, usdt_balance = @usdt_balance, pol_balance = @pol_balance, updated_at = unixepoch()
    WHERE id = @id
  `),

  updateLastEvent: db.prepare(`
    UPDATE mining_wallets 
    SET last_event_id = @last_event_id, next_event_at = @next_event_at, updated_at = unixepoch()
    WHERE id = @id
  `),

  delete: db.prepare(`
    DELETE FROM mining_wallets WHERE address = ? COLLATE NOCASE
  `),
};

// Config operations
export const configOps: Record<string, Statement> = {
  get: db.prepare(`SELECT * FROM mining_config WHERE id = 1`),

  updateRecipients: db.prepare(`
    UPDATE mining_config 
    SET recipient_address_1 = @recipient_address_1, recipient_address_2 = @recipient_address_2, updated_at = unixepoch()
    WHERE id = 1
  `),

  updateScheduler: db.prepare(`
    UPDATE mining_config 
    SET scheduler_enabled = @scheduler_enabled, event_interval_hours = @event_interval_hours, 
        offset_minutes = @offset_minutes, max_concurrent_events = @max_concurrent_events, updated_at = unixepoch()
    WHERE id = 1
  `),

  updateAmounts: db.prepare(`
    UPDATE mining_config 
    SET fcc_per_recipient = @fcc_per_recipient, total_fcc_per_event = @total_fcc_per_event, 
        expected_mining_reward = @expected_mining_reward, updated_at = unixepoch()
    WHERE id = 1
  `),
};

// Scheduler state operations
export const schedulerOps: Record<string, Statement> = {
  get: db.prepare(`SELECT * FROM scheduler_state WHERE id = 1`),
  
  start: db.prepare(`
    UPDATE scheduler_state 
    SET is_running = 1, passphrase_hash = @passphrase_hash, started_at = unixepoch(), 
        last_tick_at = unixepoch(), updated_at = unixepoch()
    WHERE id = 1
  `),
  
  stop: db.prepare(`
    UPDATE scheduler_state 
    SET is_running = 0, passphrase_hash = NULL, processing_wallets = '[]', updated_at = unixepoch()
    WHERE id = 1
  `),
  
  updateTick: db.prepare(`
    UPDATE scheduler_state 
    SET last_tick_at = unixepoch(), processing_wallets = @processing_wallets, updated_at = unixepoch()
    WHERE id = 1
  `),
};

// Event operations
export const eventOps: Record<string, Statement> = {
  insert: db.prepare(`
    INSERT INTO mining_events (wallet_id, status, started_at)
    VALUES (@wallet_id, 'PENDING', unixepoch())
  `),

  getById: db.prepare(`SELECT * FROM mining_events WHERE id = ?`),

  getByWallet: db.prepare(`
    SELECT * FROM mining_events WHERE wallet_id = ? ORDER BY created_at DESC
  `),

  getByStatus: db.prepare(`
    SELECT * FROM mining_events WHERE status = ? ORDER BY created_at DESC
  `),

  getRecent: db.prepare(`
    SELECT e.*, w.address as wallet_address 
    FROM mining_events e
    JOIN mining_wallets w ON e.wallet_id = w.id
    ORDER BY e.created_at DESC
    LIMIT ?
  `),

  updateStatus: db.prepare(`
    UPDATE mining_events 
    SET status = @status, updated_at = unixepoch()
    WHERE id = @id
  `),

  updateChainId: db.prepare(`
    UPDATE mining_events 
    SET chain_event_id = @chain_event_id, status = 'CREATED', updated_at = unixepoch()
    WHERE id = @id
  `),

  updateDrop1: db.prepare(`
    UPDATE mining_events 
    SET drop_1_completed = 1, drop_1_tx_hash = @tx_hash, drop_1_amount = @amount,
        drops_checklist = '1/2', updated_at = unixepoch()
    WHERE id = @id
  `),

  updateDrop2: db.prepare(`
    UPDATE mining_events 
    SET drop_2_completed = 1, drop_2_tx_hash = @tx_hash, drop_2_amount = @amount,
        drops_checklist = '2/2', total_dropped = @total, status = 'DROPS_COMPLETE',
        drops_completed_at = unixepoch(), updated_at = unixepoch()
    WHERE id = @id
  `),

  updateReward: db.prepare(`
    UPDATE mining_events 
    SET reward_eligible = 1, reward_received = @amount, status = 'MINING_COMPLETE',
        reward_received_at = unixepoch(), updated_at = unixepoch()
    WHERE id = @id
  `),

  finish: db.prepare(`
    UPDATE mining_events 
    SET status = 'FINISHED', finished_at = unixepoch(), updated_at = unixepoch()
    WHERE id = @id
  `),

  updateError: db.prepare(`
    UPDATE mining_events 
    SET status = 'FAILED', error_message = @error, retry_count = retry_count + 1, updated_at = unixepoch()
    WHERE id = @id
  `),
};

// Drop operations
export const dropOps: Record<string, Statement> = {
  insert: db.prepare(`
    INSERT INTO mining_drops (event_id, recipient_address, amount, drop_number)
    VALUES (@event_id, @recipient_address, @amount, @drop_number)
  `),

  getByEvent: db.prepare(`
    SELECT * FROM mining_drops WHERE event_id = ? ORDER BY drop_number
  `),

  updateStatus: db.prepare(`
    UPDATE mining_drops 
    SET status = @status, tx_hash = @tx_hash, block_number = @block_number, 
        gas_used = @gas_used, confirmed_at = CASE WHEN @status = 'CONFIRMED' THEN unixepoch() ELSE confirmed_at END
    WHERE id = @id
  `),

  updateError: db.prepare(`
    UPDATE mining_drops 
    SET status = 'FAILED', error_message = @error
    WHERE id = @id
  `),
};

// Log operations
export const logOps: Record<string, Statement> = {
  insert: db.prepare(`
    INSERT INTO mining_logs (wallet_id, event_id, level, action, message, tx_hash, metadata)
    VALUES (@wallet_id, @event_id, @level, @action, @message, @tx_hash, @metadata)
  `),

  getRecent: db.prepare(`
    SELECT * FROM mining_logs ORDER BY created_at DESC LIMIT ?
  `),

  getByWallet: db.prepare(`
    SELECT * FROM mining_logs WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ?
  `),

  getByLevel: db.prepare(`
    SELECT * FROM mining_logs WHERE level = ? ORDER BY created_at DESC LIMIT ?
  `),

  getByAction: db.prepare(`
    SELECT * FROM mining_logs WHERE action = ? ORDER BY created_at DESC LIMIT ?
  `),
};

// Stats operations
export const statsOps: Record<string, Statement> = {
  getOverview: db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM mining_wallets WHERE status = 'active') as active_wallets,
      (SELECT COUNT(*) FROM mining_wallets) as total_wallets,
      (SELECT COUNT(*) FROM mining_events WHERE date(created_at, 'unixepoch') = date('now')) as events_today,
      (SELECT COUNT(*) FROM mining_events) as events_total,
      (SELECT COALESCE(SUM(CAST(total_dropped AS REAL)), 0) FROM mining_events WHERE status = 'FINISHED') as fcc_distributed,
      (SELECT COALESCE(SUM(CAST(reward_received AS REAL)), 0) FROM mining_events WHERE reward_eligible = 1) as rewards_collected,
      (SELECT ROUND(100.0 * COUNT(CASE WHEN status = 'FINISHED' THEN 1 END) / NULLIF(COUNT(*), 0), 2) FROM mining_events) as success_rate
  `),
};

// Refresh token operations
export const refreshTokenOps: Record<string, Statement> = {
  store: db.prepare(`
    INSERT INTO refresh_tokens (token_hash, user_id, session_id, expires_at)
    VALUES (?, ?, ?, ?)
  `),

  getByHash: db.prepare(`
    SELECT * FROM refresh_tokens WHERE token_hash = ?
  `),

  deleteByHash: db.prepare(`
    DELETE FROM refresh_tokens WHERE token_hash = ?
  `),

  deleteByUserId: db.prepare(`
    DELETE FROM refresh_tokens WHERE user_id = ?
  `),

  cleanupExpired: db.prepare(`
    DELETE FROM refresh_tokens WHERE expires_at < unixepoch()
  `),
};

// Pending nonce operations
export const nonceOps: Record<string, Statement> = {
  get: db.prepare(`
    SELECT * FROM pending_nonces WHERE address = ?
  `),

  upsert: db.prepare(`
    INSERT INTO pending_nonces (address, nonce, pending_count, last_updated)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET
      nonce = excluded.nonce,
      pending_count = excluded.pending_count,
      last_updated = excluded.last_updated
  `),

  delete: db.prepare(`
    DELETE FROM pending_nonces WHERE address = ?
  `),

  clearAll: db.prepare(`
    DELETE FROM pending_nonces
  `),
};

export default db;
