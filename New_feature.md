# Fishcake Mining Automation System - Complete Technical Specification

> **Version**: 3.0 (Production-Ready)  
> **Architecture**: Backend-driven, shared by CLI & Web frontends  
> **Network**: Polygon Mainnet (Chain ID: 137)  
> **Last Updated**: 2026-04-06

---

## Executive Summary

This document defines a **fully automated** Fishcake mining system that:
1. Imports and manages multiple wallets
2. Mints NFT passes automatically
3. Creates daily mining events (one per wallet per day)
4. Drops FCC rewards to 2 designated addresses (12 FCC each = 24 FCC total)
5. Monitors drop completion (2/2 checklist)
6. Checks mining reward eligibility (6 FCC reward for 24 FCC drops)
7. Finishes events automatically when eligible
8. Repeats daily with 5-minute offset from previous completion

**Zero manual intervention required after initial setup.**

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                          │
├─────────────────────────────┬────────────────────────────────────┤
│         Web App             │           CLI App                  │
│    (Next.js Frontend)       │     (Node.js Terminal)             │
│  - Wallet Import Form       │  - inquirer Prompts                │
│  - Mining Dashboard         │  - Progress Display                │
│  - Status Monitor           │  - Status Commands                 │
└─────────────┬───────────────┴──────────────┬─────────────────────┘
              │         REST API             │
              └──────────────┬───────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         BACKEND SERVER                           │
│                      (Node.js + Express)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   REST API   │  │   Scheduler  │  │   Event Processor    │   │
│  │   Endpoints  │  │  (node-cron) │  │   (State Machine)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Wallet     │  │    Drop      │  │   Mining Reward      │   │
│  │   Service    │  │   Service    │  │   Validator          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   SQLite     │    │   Polygon    │    │    Logs      │
│   Database   │    │    RPC       │    │   (File)     │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Complete Automation Flow

### Phase 0: Initial Setup (One-Time)

```
┌─────────────────────────────────────────────────────────────────┐
│                    INITIAL CONFIGURATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User imports wallets (bulk private keys)                     │
│     └─→ System encrypts with AES-256-GCM                        │
│     └─→ Stores in database                                       │
│     └─→ Fetches on-chain balances                               │
│                                                                  │
│  2. User configures 2 drop recipient addresses                  │
│     └─→ Address 1: receives 12 FCC per event                    │
│     └─→ Address 2: receives 12 FCC per event                    │
│     └─→ Total: 24 FCC per event                                 │
│                                                                  │
│  3. User enables automation                                      │
│     └─→ Scheduler starts                                         │
│     └─→ System runs 24/7 automatically                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 1: NFT Minting (Automatic per wallet)

```
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: MINT NFT PASS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FOR EACH wallet without valid NFT:                              │
│                                                                  │
│    1. Check NFT status                                           │
│       IF nftType == 'NONE' OR nftExpired:                       │
│                                                                  │
│    2. Approve USDT spend                                         │
│       └─→ USDT.approve(NFT_MANAGER, 10 USDT for BASIC)          │
│       └─→ OR approve(NFT_MANAGER, 100 USDT for PRO)             │
│                                                                  │
│    3. Mint NFT                                                   │
│       └─→ NFTManager.mintMerchantNFT(type, metadata)            │
│                                                                  │
│    4. Wait for confirmation (1-2 blocks)                        │
│                                                                  │
│    5. Update database with:                                      │
│       └─→ NFT type (BASIC/PRO)                                  │
│       └─→ Expiry date (1 year from now)                         │
│       └─→ FCC reward received                                    │
│                                                                  │
│  NEXT: Proceed to Event Creation                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Event Creation (Daily, Automatic)

```
┌─────────────────────────────────────────────────────────────────┐
│                STEP 2: CREATE MINING EVENT (Daily)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGER: Scheduler checks every minute                         │
│                                                                  │
│  FOR EACH active wallet:                                         │
│                                                                  │
│    CHECK CONDITIONS:                                             │
│    ├─ Has valid NFT pass? (not expired)                         │
│    ├─ No active event running?                                  │
│    ├─ Last event completed > 23 hours ago?                      │
│    └─ Has enough FCC balance (>= 24 FCC)?                       │
│                                                                  │
│    IF ALL TRUE:                                                  │
│                                                                  │
│    1. Approve FCC spend                                          │
│       └─→ FCC.approve(EVENT_MANAGER, 24000000) // 24 FCC        │
│                                                                  │
│    2. Create Event on-chain                                      │
│       └─→ EventManager.activityAdd({                            │
│             businessName: "Mining Event",                        │
│             activityContent: JSON.stringify({type: "mining"}),   │
│             latitudeLongitude: "0,0",                            │
│             tokenContractAddr: FCC_TOKEN,                        │
│             totalDropAmts: 24000000,      // 24 FCC (6 decimals)│
│             dropType: 1,                   // Fixed amount       │
│             dropNumber: 2,                 // 2 recipients       │
│             minDropAmt: 12000000,          // 12 FCC             │
│             maxDropAmt: 12000000,          // 12 FCC             │
│             activityDeadline: now + 86400  // 24 hours           │
│           })                                                     │
│                                                                  │
│    3. Record in database                                         │
│       └─→ event_id, wallet_id, status='CREATED', timestamp      │
│                                                                  │
│  NEXT: Proceed to Drop Execution                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Drop Execution (Automatic)

```
┌─────────────────────────────────────────────────────────────────┐
│           STEP 3: DROP FCC TO 2 ADDRESSES (Auto)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FOR EACH event with status='CREATED':                          │
│                                                                  │
│  RECIPIENT 1:                                                    │
│  ├─ 1. Call EventManager.drop(eventId, recipient1, 12000000)    │
│  ├─ 2. Wait for confirmation                                    │
│  ├─ 3. Update database: drops_completed = 1                     │
│  └─ 4. Log transaction hash                                      │
│                                                                  │
│  DELAY: 2 seconds (rate limiting)                               │
│                                                                  │
│  RECIPIENT 2:                                                    │
│  ├─ 1. Call EventManager.drop(eventId, recipient2, 12000000)    │
│  ├─ 2. Wait for confirmation                                    │
│  ├─ 3. Update database: drops_completed = 2                     │
│  └─ 4. Log transaction hash                                      │
│                                                                  │
│  UPDATE EVENT STATUS:                                            │
│  └─→ status = 'DROPS_COMPLETE'                                  │
│  └─→ drops_checklist = '2/2'                                    │
│  └─→ total_dropped = 24 FCC                                     │
│                                                                  │
│  NEXT: Proceed to Mining Reward Check                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                    ┌───────────────────┐
                    │  DROP CHECKLIST   │
                    ├───────────────────┤
                    │  [✓] Drop 1: 12 FCC│
                    │  [✓] Drop 2: 12 FCC│
                    │  ────────────────  │
                    │  Total: 24 FCC ✓  │
                    │  Status: 2/2      │
                    └───────────────────┘
```

### Phase 4: Mining Reward Validation (Automatic)

```
┌─────────────────────────────────────────────────────────────────┐
│         STEP 4: CHECK MINING REWARD ELIGIBILITY                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FOR EACH event with status='DROPS_COMPLETE':                   │
│                                                                  │
│  ELIGIBILITY CRITERIA:                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✓ Total drops completed: 24 FCC                            ││
│  │  ✓ Drop 1 completed: 12 FCC to address 1                    ││
│  │  ✓ Drop 2 completed: 12 FCC to address 2                    ││
│  │  ✓ Drops checklist: 2/2                                      ││
│  │  ✓ Expected mining reward: 6 FCC (25% of 24 FCC)            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  VALIDATION PROCESS:                                             │
│                                                                  │
│  1. Get wallet FCC balance BEFORE event                          │
│  2. Poll every 30 seconds for up to 1 hour                      │
│  3. Check if balance increased by >= 6 FCC                      │
│                                                                  │
│  IF REWARD RECEIVED (balance increased >= 6 FCC):               │
│  └─→ Mark event as MINING_COMPLETE                              │
│  └─→ Record exact reward amount                                  │
│  └─→ Proceed to Finish Event                                    │
│                                                                  │
│  IF TIMEOUT (1 hour, no reward):                                │
│  └─→ Mark event as REWARD_PENDING                               │
│  └─→ Continue monitoring in background                          │
│                                                                  │
│  NEXT: Finish Event                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 5: Finish Event (Automatic)

```
┌─────────────────────────────────────────────────────────────────┐
│                STEP 5: FINISH EVENT (Auto)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FOR EACH event with status='MINING_COMPLETE':                  │
│                                                                  │
│  1. Call EventManager.activityFinish(eventId)                   │
│     └─→ Closes event on-chain                                   │
│     └─→ Marks as completed in contract                          │
│                                                                  │
│  2. Update database:                                             │
│     └─→ status = 'FINISHED'                                     │
│     └─→ completed_at = NOW()                                    │
│     └─→ mining_reward_received = 6 FCC                          │
│                                                                  │
│  3. Calculate next event time:                                   │
│     └─→ next_event_time = completed_at + 5 minutes              │
│                                                                  │
│  4. Log completion:                                              │
│     └─→ Event #[id] completed successfully                      │
│     └─→ Mining reward: 6 FCC                                    │
│     └─→ Next event scheduled: [time]                            │
│                                                                  │
│  NEXT: Wait for next daily cycle                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 6: Daily Cycle Repeat (Automatic, +5 min offset)

```
┌─────────────────────────────────────────────────────────────────┐
│              STEP 6: NEXT DAY AUTOMATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SCHEDULER LOGIC (runs every minute):                           │
│                                                                  │
│  1. Query wallets ready for next event:                         │
│     SELECT * FROM mining_wallets w                               │
│     JOIN mining_events e ON w.last_event_id = e.id              │
│     WHERE w.status = 'active'                                    │
│       AND e.status = 'FINISHED'                                  │
│       AND NOW() >= e.completed_at + INTERVAL 5 MINUTES          │
│       AND NOW() >= e.completed_at + INTERVAL 23 HOURS           │
│                                                                  │
│  2. For each ready wallet:                                       │
│     └─→ GO TO Phase 1 (or Phase 2 if NFT valid)                 │
│                                                                  │
│  TIMING EXAMPLE:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Day 1:                                                       ││
│  │   Event Created:    04:00:00 UTC                             ││
│  │   Drops Complete:   04:00:30 UTC                             ││
│  │   Reward Received:  04:15:00 UTC                             ││
│  │   Event Finished:   04:15:05 UTC                             ││
│  │                                                               ││
│  │ Day 2:                                                       ││
│  │   Next Event Start: 04:20:05 UTC (+5 min from finish)        ││
│  │   (but also must be 23+ hours from Day 1 start)              ││
│  │                                                               ││
│  │ Day 3:                                                       ││
│  │   Next Event Start: 04:25:10 UTC (+5 min from Day 2 finish)  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  CYCLE REPEATS INDEFINITELY                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Complete)

```sql
-- =====================================================
-- TABLE: mining_wallets
-- Stores imported wallets with encrypted private keys
-- =====================================================
CREATE TABLE mining_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL UNIQUE,
    encrypted_key TEXT NOT NULL,          -- AES-256-GCM encrypted
    salt TEXT NOT NULL,                   -- Unique per wallet
    iv TEXT NOT NULL,                     -- Initialization vector
    auth_tag TEXT NOT NULL,               -- GCM auth tag
    
    -- Status tracking
    status TEXT DEFAULT 'active',         -- active | paused | error | nft_expired
    failure_count INTEGER DEFAULT 0,      -- Auto-pause after 3 failures
    last_error TEXT,                       -- Last error message
    
    -- NFT info (cached)
    nft_type TEXT DEFAULT 'NONE',         -- NONE | BASIC | PRO
    nft_expiry_at DATETIME,               -- When NFT expires
    nft_token_id INTEGER,                  -- On-chain NFT token ID
    
    -- Scheduling
    last_event_id INTEGER,                 -- FK to last event
    next_event_at DATETIME,               -- When next event should start
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: mining_config
-- Global configuration for mining automation
-- =====================================================
CREATE TABLE mining_config (
    id INTEGER PRIMARY KEY DEFAULT 1,     -- Single row config
    
    -- Drop recipients (exactly 2)
    recipient_address_1 TEXT NOT NULL,
    recipient_address_2 TEXT NOT NULL,
    
    -- Drop amounts
    fcc_per_recipient TEXT DEFAULT '12',  -- 12 FCC per drop
    total_fcc_per_event TEXT DEFAULT '24',-- 24 FCC total
    
    -- Mining reward
    expected_mining_reward TEXT DEFAULT '6', -- 6 FCC (25% of 24)
    
    -- Scheduler settings
    scheduler_enabled BOOLEAN DEFAULT FALSE,
    event_interval_hours INTEGER DEFAULT 24,
    offset_minutes INTEGER DEFAULT 5,     -- Delay between daily cycles
    max_concurrent_events INTEGER DEFAULT 3,
    
    -- Retry settings
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: mining_events
-- Tracks each mining event lifecycle
-- =====================================================
CREATE TABLE mining_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    
    -- On-chain reference
    chain_event_id INTEGER,               -- Event ID from contract
    
    -- Event lifecycle status
    status TEXT DEFAULT 'PENDING',
    -- PENDING → CREATED → DROPPING → DROPS_COMPLETE → 
    -- MONITORING → MINING_COMPLETE → FINISHING → FINISHED
    -- OR: FAILED, TIMEOUT
    
    -- Drop tracking
    drops_checklist TEXT DEFAULT '0/2',   -- "0/2", "1/2", "2/2"
    drop_1_completed BOOLEAN DEFAULT FALSE,
    drop_1_tx_hash TEXT,
    drop_1_amount TEXT,
    drop_2_completed BOOLEAN DEFAULT FALSE,
    drop_2_tx_hash TEXT,
    drop_2_amount TEXT,
    total_dropped TEXT,                   -- Total FCC dropped
    
    -- Mining reward
    reward_eligible BOOLEAN DEFAULT FALSE,
    reward_received TEXT,                 -- Actual FCC received
    reward_tx_hash TEXT,
    
    -- Gas tracking
    total_gas_used TEXT,
    total_gas_cost TEXT,
    
    -- Timing
    started_at DATETIME,
    drops_completed_at DATETIME,
    reward_received_at DATETIME,
    finished_at DATETIME,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_id) REFERENCES mining_wallets(id)
);

-- =====================================================
-- TABLE: mining_drops
-- Individual drop transactions
-- =====================================================
CREATE TABLE mining_drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    
    recipient_address TEXT NOT NULL,
    amount TEXT NOT NULL,                 -- FCC amount (6 decimals)
    drop_number INTEGER NOT NULL,         -- 1 or 2
    
    -- Transaction
    tx_hash TEXT,
    block_number INTEGER,
    gas_used TEXT,
    
    -- Status
    status TEXT DEFAULT 'PENDING',        -- PENDING | SUBMITTED | CONFIRMED | FAILED
    error_message TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    
    FOREIGN KEY (event_id) REFERENCES mining_events(id)
);

-- =====================================================
-- TABLE: mining_rewards
-- Mining reward receipts
-- =====================================================
CREATE TABLE mining_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    wallet_id INTEGER NOT NULL,
    
    -- Reward details
    expected_amount TEXT DEFAULT '6',     -- Expected 6 FCC
    actual_amount TEXT,                   -- Actual received
    
    -- Detection
    balance_before TEXT,
    balance_after TEXT,
    detected_at DATETIME,
    
    -- Status
    status TEXT DEFAULT 'PENDING',        -- PENDING | DETECTED | CONFIRMED | FAILED
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES mining_events(id),
    FOREIGN KEY (wallet_id) REFERENCES mining_wallets(id)
);

-- =====================================================
-- TABLE: mining_logs
-- Audit log for all operations
-- =====================================================
CREATE TABLE mining_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    wallet_id INTEGER,
    event_id INTEGER,
    
    level TEXT DEFAULT 'INFO',            -- DEBUG | INFO | WARN | ERROR
    action TEXT NOT NULL,                 -- WALLET_IMPORT, NFT_MINT, EVENT_CREATE, etc.
    message TEXT NOT NULL,
    
    -- Context
    tx_hash TEXT,
    metadata TEXT,                        -- JSON additional data
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_wallets_status ON mining_wallets(status);
CREATE INDEX idx_wallets_next_event ON mining_wallets(next_event_at);
CREATE INDEX idx_events_status ON mining_events(status);
CREATE INDEX idx_events_wallet ON mining_events(wallet_id);
CREATE INDEX idx_drops_event ON mining_drops(event_id);
CREATE INDEX idx_logs_wallet ON mining_logs(wallet_id);
CREATE INDEX idx_logs_action ON mining_logs(action);
```

---

## API Endpoints (Complete)

### Wallet Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mining/wallets/import` | Bulk import wallets |
| GET | `/api/mining/wallets` | List all wallets with status |
| GET | `/api/mining/wallets/:address` | Get single wallet details |
| DELETE | `/api/mining/wallets/:address` | Remove wallet |
| PATCH | `/api/mining/wallets/:address/status` | Pause/resume wallet |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mining/config` | Get current config |
| PUT | `/api/mining/config/recipients` | Set drop recipients |
| PUT | `/api/mining/config/scheduler` | Configure scheduler |

### NFT Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mining/nft/preview` | Preview batch mint costs |
| POST | `/api/mining/nft/mint` | Execute batch mint |
| GET | `/api/mining/nft/status/:address` | Check NFT status |

### Event Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mining/events` | List all events |
| GET | `/api/mining/events/:id` | Get event details |
| GET | `/api/mining/events/:id/drops` | Get drop status |
| POST | `/api/mining/events/create-manual` | Manually trigger event |

### Scheduler Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mining/scheduler/start` | Enable automation |
| POST | `/api/mining/scheduler/stop` | Disable automation |
| GET | `/api/mining/scheduler/status` | Get scheduler state |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mining/stats` | Get aggregated stats |
| GET | `/api/mining/stats/daily` | Daily breakdown |
| GET | `/api/mining/logs` | Get audit logs |

---

## Event State Machine

```
                              ┌─────────────┐
                              │   PENDING   │
                              └──────┬──────┘
                                     │ createEvent()
                                     ▼
                              ┌─────────────┐
                              │   CREATED   │
                              └──────┬──────┘
                                     │ startDrops()
                                     ▼
                              ┌─────────────┐
                              │  DROPPING   │
                              └──────┬──────┘
                                     │ both drops confirmed
                                     ▼
                           ┌─────────────────────┐
                           │   DROPS_COMPLETE    │
                           │  (checklist: 2/2)   │
                           └──────────┬──────────┘
                                      │ startMonitoring()
                                      ▼
                              ┌─────────────┐
                              │ MONITORING  │◄──────┐
                              └──────┬──────┘       │
                                     │              │ poll every 30s
                                     │              │
              ┌────────────┬─────────┴───────┬──────┘
              │            │                 │
              ▼            ▼                 │
       ┌────────────┐ ┌──────────┐           │
       │  TIMEOUT   │ │ REWARD   │           │
       │  (1 hour)  │ │ DETECTED │───────────┘
       └────────────┘ └────┬─────┘
                           │ >= 6 FCC received
                           ▼
                   ┌───────────────────┐
                   │  MINING_COMPLETE  │
                   └─────────┬─────────┘
                             │ finishEvent()
                             ▼
                      ┌─────────────┐
                      │  FINISHING  │
                      └──────┬──────┘
                             │ confirmed
                             ▼
                      ┌─────────────┐
                      │  FINISHED   │
                      └─────────────┘
                             │
                             │ +5 minutes + 23 hours
                             ▼
                       NEXT CYCLE
```

---

## Backend Services Implementation

### 1. Scheduler Service

```typescript
// backend/src/services/MiningScheduler.ts

import cron from 'node-cron';
import { db } from '../database';
import { EventProcessor } from './EventProcessor';
import { logger } from '../utils/logger';

export class MiningScheduler {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  start(): void {
    if (this.isRunning) return;
    
    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processReadyWallets();
    });
    
    this.isRunning = true;
    logger.info('Mining scheduler started');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('Mining scheduler stopped');
  }

  private async processReadyWallets(): Promise<void> {
    const config = await db.getMiningConfig();
    if (!config.scheduler_enabled) return;

    // Find wallets ready for new event
    const readyWallets = await db.query(`
      SELECT w.* FROM mining_wallets w
      LEFT JOIN mining_events e ON w.last_event_id = e.id
      WHERE w.status = 'active'
        AND w.nft_type != 'NONE'
        AND (w.nft_expiry_at IS NULL OR w.nft_expiry_at > datetime('now'))
        AND (
          w.last_event_id IS NULL
          OR (
            e.status = 'FINISHED'
            AND datetime(e.finished_at, '+5 minutes') <= datetime('now')
            AND datetime(e.started_at, '+23 hours') <= datetime('now')
          )
        )
      ORDER BY w.id
      LIMIT ?
    `, [config.max_concurrent_events]);

    for (const wallet of readyWallets) {
      try {
        await EventProcessor.processWallet(wallet);
      } catch (error) {
        logger.error(`Failed to process wallet ${wallet.address}`, error);
        await this.handleWalletError(wallet, error);
      }
    }
  }

  private async handleWalletError(wallet: any, error: Error): Promise<void> {
    const newFailureCount = wallet.failure_count + 1;
    
    if (newFailureCount >= 3) {
      await db.updateWallet(wallet.id, {
        status: 'error',
        failure_count: newFailureCount,
        last_error: error.message
      });
      logger.warn(`Wallet ${wallet.address} paused after 3 failures`);
    } else {
      await db.updateWallet(wallet.id, {
        failure_count: newFailureCount,
        last_error: error.message
      });
    }
  }
}
```

### 2. Event Processor Service

```typescript
// backend/src/services/EventProcessor.ts

import { ethers } from 'ethers';
import { getProvider, getSigner } from '../blockchain/provider';
import { CONTRACTS, EVENT_MANAGER_ABI, ERC20_ABI } from '../config';
import { db } from '../database';
import { logger } from '../utils/logger';

export class EventProcessor {
  
  static async processWallet(wallet: MiningWallet): Promise<void> {
    // Check if NFT needs minting
    if (wallet.nft_type === 'NONE' || this.isNFTExpired(wallet)) {
      await this.mintNFT(wallet);
    }
    
    // Create and process event
    await this.createAndProcessEvent(wallet);
  }

  private static async createAndProcessEvent(wallet: MiningWallet): Promise<void> {
    const config = await db.getMiningConfig();
    const signer = getSigner(wallet.encrypted_key, wallet.salt, wallet.iv);
    
    // STEP 1: Create Event
    logger.info(`Creating event for wallet ${wallet.address}`);
    
    const eventId = await this.createEvent(signer, config);
    
    const event = await db.createEvent({
      wallet_id: wallet.id,
      chain_event_id: eventId,
      status: 'CREATED'
    });
    
    // STEP 2: Execute Drops
    logger.info(`Executing drops for event ${eventId}`);
    
    await this.executeDrop(signer, eventId, config.recipient_address_1, 1, event.id);
    await this.delay(2000); // Rate limit
    await this.executeDrop(signer, eventId, config.recipient_address_2, 2, event.id);
    
    await db.updateEvent(event.id, {
      status: 'DROPS_COMPLETE',
      drops_checklist: '2/2',
      drops_completed_at: new Date()
    });
    
    // STEP 3: Monitor for Mining Reward
    logger.info(`Monitoring mining reward for event ${eventId}`);
    
    const rewardReceived = await this.monitorMiningReward(wallet.address, event.id);
    
    if (rewardReceived) {
      await db.updateEvent(event.id, { status: 'MINING_COMPLETE' });
      
      // STEP 4: Finish Event
      await this.finishEvent(signer, eventId, event.id);
      
      // Schedule next event
      await db.updateWallet(wallet.id, {
        last_event_id: event.id,
        next_event_at: new Date(Date.now() + 5 * 60 * 1000) // +5 minutes
      });
    }
  }

  private static async createEvent(
    signer: ethers.Wallet,
    config: MiningConfig
  ): Promise<number> {
    const eventManager = new ethers.Contract(
      CONTRACTS.EVENT_MANAGER,
      EVENT_MANAGER_ABI,
      signer
    );
    const fcc = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, signer);
    
    // Approve FCC
    const approvalTx = await fcc.approve(
      CONTRACTS.EVENT_MANAGER,
      ethers.parseUnits('24', 6) // 24 FCC
    );
    await approvalTx.wait();
    
    // Create event
    const tx = await eventManager.activityAdd(
      'Mining Event',
      JSON.stringify({ type: 'mining', automated: true }),
      '0,0',
      CONTRACTS.FCC_TOKEN,
      ethers.parseUnits('24', 6),  // 24 FCC total
      1,                            // Fixed drop type
      2,                            // 2 recipients
      ethers.parseUnits('12', 6),  // 12 FCC min
      ethers.parseUnits('12', 6),  // 12 FCC max
      Math.floor(Date.now() / 1000) + 86400 // 24h deadline
    );
    
    const receipt = await tx.wait();
    
    // Get event ID from logs (event ActivityAdded)
    const eventId = await this.getEventIdFromReceipt(eventManager, receipt);
    
    return eventId;
  }

  private static async executeDrop(
    signer: ethers.Wallet,
    eventId: number,
    recipient: string,
    dropNumber: number,
    dbEventId: number
  ): Promise<void> {
    const eventManager = new ethers.Contract(
      CONTRACTS.EVENT_MANAGER,
      EVENT_MANAGER_ABI,
      signer
    );
    
    const tx = await eventManager.drop(
      eventId,
      recipient,
      ethers.parseUnits('12', 6) // 12 FCC
    );
    
    const receipt = await tx.wait();
    
    // Update database
    await db.createDrop({
      event_id: dbEventId,
      recipient_address: recipient,
      amount: '12000000',
      drop_number: dropNumber,
      tx_hash: receipt.hash,
      block_number: receipt.blockNumber,
      status: 'CONFIRMED'
    });
    
    await db.updateEvent(dbEventId, {
      [`drop_${dropNumber}_completed`]: true,
      [`drop_${dropNumber}_tx_hash`]: receipt.hash,
      drops_checklist: `${dropNumber}/2`
    });
    
    logger.info(`Drop ${dropNumber}/2 completed: ${receipt.hash}`);
  }

  private static async monitorMiningReward(
    walletAddress: string,
    eventId: number
  ): Promise<boolean> {
    const provider = getProvider();
    const fcc = new ethers.Contract(CONTRACTS.FCC_TOKEN, ERC20_ABI, provider);
    
    const startBalance = await fcc.balanceOf(walletAddress);
    const targetReward = ethers.parseUnits('6', 6); // 6 FCC
    
    // Poll every 30 seconds for up to 1 hour
    for (let i = 0; i < 120; i++) {
      await this.delay(30000);
      
      const currentBalance = await fcc.balanceOf(walletAddress);
      const received = currentBalance - startBalance;
      
      if (received >= targetReward) {
        const actualReward = ethers.formatUnits(received, 6);
        
        await db.updateEvent(eventId, {
          reward_eligible: true,
          reward_received: actualReward,
          reward_received_at: new Date()
        });
        
        logger.info(`Mining reward received: ${actualReward} FCC`);
        return true;
      }
    }
    
    logger.warn(`Timeout waiting for mining reward for event ${eventId}`);
    await db.updateEvent(eventId, { status: 'TIMEOUT' });
    return false;
  }

  private static async finishEvent(
    signer: ethers.Wallet,
    chainEventId: number,
    dbEventId: number
  ): Promise<void> {
    const eventManager = new ethers.Contract(
      CONTRACTS.EVENT_MANAGER,
      EVENT_MANAGER_ABI,
      signer
    );
    
    await db.updateEvent(dbEventId, { status: 'FINISHING' });
    
    const tx = await eventManager.activityFinish(chainEventId);
    await tx.wait();
    
    await db.updateEvent(dbEventId, {
      status: 'FINISHED',
      finished_at: new Date()
    });
    
    logger.info(`Event ${chainEventId} finished successfully`);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Edge Cases & Error Handling

### 1. Failed Drops

```typescript
// If drop 1 fails:
// - Retry up to 3 times with exponential backoff
// - If still fails, mark event as FAILED
// - Log error, increment wallet failure count
// - Do NOT attempt drop 2 (preserve ordering)

// If drop 2 fails:
// - Retry up to 3 times
// - If still fails, mark event as PARTIAL_COMPLETE
// - Can retry later with manual intervention
```

### 2. Partial Completion

```typescript
// Status: DROPS_COMPLETE but no reward after 1 hour
// - Mark as TIMEOUT
// - Continue monitoring in background (lower priority)
// - Allow manual finish via API
```

### 3. Duplicate Wallets

```typescript
// On wallet import:
// - Check if address already exists
// - If exists with status 'error', allow re-import (update)
// - If exists with status 'active', reject duplicate
// - Use UNIQUE constraint on address column
```

### 4. NFT Expiration

```typescript
// Before creating event:
// - Check nft_expiry_at > NOW()
// - If expired, set wallet status = 'nft_expired'
// - Alert user in dashboard
// - Do not process until NFT renewed
```

### 5. Insufficient Balance

```typescript
// Before event creation:
// - Check FCC balance >= 24 FCC
// - Check POL balance >= estimated gas (0.1 POL)
// - If insufficient, skip wallet this cycle
// - Do NOT mark as error (temporary condition)
```

---

## Security Considerations

1. **Private Key Encryption**
   - AES-256-GCM with unique salt and IV per wallet
   - PBKDF2 key derivation (100,000 iterations)
   - Keys decrypted only when needed, cleared after use

2. **API Authentication**
   - JWT tokens with 24-hour expiry
   - Refresh token rotation
   - Rate limiting: 10 requests/minute

3. **Database Security**
   - SQLite file encrypted at rest
   - Parameterized queries (SQL injection prevention)
   - Audit logging for all sensitive operations

4. **Network Security**
   - HTTPS only
   - CORS restricted to known origins
   - No private keys transmitted over API

---

## Scaling Strategy

### Phase 1: Single Server (1-50 wallets)
- Single Node.js process
- SQLite database
- All processing sequential

### Phase 2: Horizontal Scaling (50-500 wallets)
- Multiple worker processes
- Redis for job queue
- PostgreSQL for shared state

### Phase 3: Enterprise (500+ wallets)
- Kubernetes deployment
- Separate scheduler, worker, API pods
- RPC load balancing across multiple providers

---

## User Experience Flow

### Web UI Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🍥 Fishcake Mining Dashboard                      [Connected]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AUTOMATION STATUS                                        │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  🟢 RUNNING                    [Stop Automation]   │  │   │
│  │  │  Active Wallets: 5/5                               │  │   │
│  │  │  Events Today: 5                                   │  │   │
│  │  │  FCC Distributed: 120 FCC                          │  │   │
│  │  │  Mining Rewards: 30 FCC                            │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  WALLETS                              [+ Import Wallets] │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ Address       │ Status │ Last Event │ Next Event  │  │   │
│  │  ├───────────────┼────────┼────────────┼─────────────┤  │   │
│  │  │ 0x1234...abcd │ Active │ 2h ago ✓  │ In 22h      │  │   │
│  │  │ 0x5678...efgh │ Active │ 2h ago ✓  │ In 22h      │  │   │
│  │  │ 0x9abc...ijkl │ Running│ In Progress│ -           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LIVE EVENT PROGRESS (Wallet: 0x9abc...)                 │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Step 1: Create Event     ✅ Complete              │  │   │
│  │  │  Step 2: Drop #1 (12 FCC) ✅ Complete              │  │   │
│  │  │  Step 3: Drop #2 (12 FCC) ✅ Complete              │  │   │
│  │  │  Step 4: Checklist        ✅ 2/2                   │  │   │
│  │  │  Step 5: Mining Reward    ⏳ Monitoring...         │  │   │
│  │  │  Step 6: Finish Event     ⬜ Pending               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### User Journey

1. **Connect Wallet** → User enters password to unlock wallet
2. **Import Wallets** → Paste private keys or upload CSV
3. **Configure Recipients** → Set 2 drop addresses
4. **Enable Automation** → Click "Start Mining"
5. **Monitor** → Dashboard shows real-time progress
6. **Collect Rewards** → Mining rewards auto-deposited

---

## Implementation Checklist

### Backend (Required)
- [ ] SQLite database setup with all tables
- [ ] Wallet encryption service (AES-256-GCM)
- [ ] Wallet import endpoint
- [ ] NFT minting service
- [ ] Event creation service
- [ ] Drop execution service
- [ ] Mining reward monitor
- [ ] Event finish service
- [ ] Scheduler (node-cron)
- [ ] Retry handler with exponential backoff
- [ ] Logging system
- [ ] All REST API endpoints

### Web UI (Required)
- [ ] Wallet import form (paste/CSV)
- [ ] Wallet list with status
- [ ] Recipient configuration
- [ ] Start/Stop automation buttons
- [ ] Live event progress display
- [ ] Statistics dashboard
- [ ] Error notifications

### CLI (Optional Enhancement)
- [ ] Wallet import prompts
- [ ] Status commands
- [ ] Manual event trigger

---

## Contract Addresses (Polygon Mainnet)

```typescript
export const CONTRACTS = {
  EVENT_MANAGER: "0x2CAf752814f244b3778e30c27051cc6B45CB1fc9",
  FCC_TOKEN: "0x84eBc138F4Ab844A3050a6059763D269dC9951c6",
  USDT_TOKEN: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  NFT_MANAGER: "0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B",
  DIRECT_SALE_POOL: "0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE",
  INVESTOR_SALE_POOL: "0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B",
};
```

---

## Summary

This document provides a **complete, production-ready specification** for the Fishcake Mining Automation System. The system is designed to:

1. ✅ Run fully automatically after initial setup
2. ✅ Handle multiple wallets in parallel
3. ✅ Create daily mining events with 5-minute offset
4. ✅ Execute drops with 2/2 checklist tracking
5. ✅ Validate mining reward eligibility (6 FCC for 24 FCC drops)
6. ✅ Finish events automatically
7. ✅ Repeat cycle indefinitely

**No manual intervention required after configuration.**
