# Mining Automation System - Technical Specification

> **Version**: 2.0  
> **Architecture**: Backend-driven, shared by CLI & Web frontends  
> **Network**: Polygon Mainnet (Chain ID: 137)

---

## Overview

Automated multi-wallet mining event management system that:
- Imports and manages multiple wallets securely
- Mints NFT passes in batch
- Creates daily mining events automatically
- Distributes FCC rewards to designated wallets
- Tracks all operations in a shared database

---

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   CLI App   │     │   Web App   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │ REST API
       ┌─────────▼─────────┐
       │      Backend      │
       │  (Node.js/Express)│
       └─────────┬─────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌──────────┐
│ SQLite │  │ Polygon│  │ Scheduler│
│   DB   │  │  RPC   │  │  (cron)  │
└────────┘  └────────┘  └──────────┘
```

---

## Phase 1: Wallet Management

### 1.1 Bulk Wallet Import

**Endpoint**: `POST /api/mining/wallets/import`

**Input Methods**:
| Method | Format | Security |
|--------|--------|----------|
| Direct paste | JSON array of private keys | AES-256-GCM encryption |
| CSV upload | File with one key per line | Encrypted at rest |

**Request**:
```typescript
interface ImportWalletsRequest {
  privateKeys: string[];           // Raw private keys (encrypted in transit via HTTPS)
  encryptionPassword: string;      // User password for storage encryption
}
```

**Processing**:
1. Validate each private key format (64 hex chars)
2. Derive wallet address from each key
3. Encrypt private keys with AES-256-GCM + user password
4. Store encrypted keys in database
5. Fetch on-chain balances in parallel (max 5 concurrent)

**Response**:
```typescript
interface ImportResult {
  wallets: {
    address: string;
    balances: { pol: string; usdt: string; fcc: string };
    nftPass: 'NONE' | 'BASIC' | 'PRO';
    nftExpiry: number | null;      // Unix timestamp
    status: 'active' | 'error';
    error?: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}
```

### 1.2 Wallet Storage Schema

```sql
CREATE TABLE mining_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL,      -- AES-256-GCM encrypted
  salt TEXT NOT NULL,               -- Unique per wallet
  iv TEXT NOT NULL,                 -- Initialization vector
  status TEXT DEFAULT 'active',     -- active | paused | error
  failure_count INTEGER DEFAULT 0,
  last_event_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Phase 2: NFT Pass Minting

### 2.1 Batch Mint Preview

**Endpoint**: `POST /api/mining/nft/preview`

**Request**:
```typescript
interface MintPreviewRequest {
  walletAddresses: string[];
  passType: 'BASIC' | 'PRO';
}
```

**Response**:
```typescript
interface MintPreview {
  estimates: {
    address: string;
    currentUSDT: string;
    mintCost: string;              // 10 USDT (BASIC) or 100 USDT (PRO)
    remainingUSDT: string;
    fccReward: string;             // Estimated based on contract logic
    canMint: boolean;
    reason?: string;               // "Insufficient USDT" or "Already has pass"
  }[];
  totals: {
    totalCost: string;
    walletsEligible: number;
    walletsIneligible: number;
  };
}
```

### 2.2 Execute Batch Mint

**Endpoint**: `POST /api/mining/nft/mint`

**Processing**:
1. For each eligible wallet (sequential to avoid nonce conflicts):
   - Approve USDT spend to NFT_MANAGER
   - Call `mintMerchantNFT(passType, metadata)`
   - Wait for confirmation
   - Fetch actual FCC received from Transfer event logs

**Gas Management**:
- Fetch current gas price from Polygon
- Apply 1.2x multiplier for priority
- Max gas price cap: 500 gwei
- Retry with higher gas if tx fails

**Response**:
```typescript
interface MintResult {
  results: {
    address: string;
    success: boolean;
    txHash?: string;
    fccReceived?: string;          // Actual from blockchain
    passType?: 'BASIC' | 'PRO';
    expiryDate?: string;           // ISO 8601
    error?: string;
    gasUsed?: string;
  }[];
}
```

---

## Phase 3: Mining Event Configuration

### 3.1 Configure Drop Recipients

**Endpoint**: `POST /api/mining/config/recipients`

**Request**:
```typescript
interface ConfigureRecipientsRequest {
  recipients: string[];            // 2 wallet addresses
  fccPerRecipient: string;         // Amount per drop (e.g., "12")
}
```

**Storage**:
```sql
CREATE TABLE mining_config (
  id INTEGER PRIMARY KEY,
  recipient_addresses TEXT NOT NULL,  -- JSON array
  fcc_per_recipient TEXT NOT NULL,
  total_fcc_per_event TEXT NOT NULL,  -- Calculated: recipients × fccPerRecipient
  target_mining_reward TEXT NOT NULL, -- Expected: 6 FCC
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Event Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Drop Type | 1 (Fixed) | Equal amounts |
| Recipients | 2 addresses | User configured |
| FCC per recipient | 12 FCC | Configurable |
| Total drop | 24 FCC | 2 × 12 |
| Mining reward | 6 FCC | 25% of drop |
| Event duration | 24 hours | Auto-close after |

---

## Phase 4: Automated Event Lifecycle

### 4.1 Event State Machine

```
┌─────────────┐
│   PENDING   │ ← Initial state after creation
└──────┬──────┘
       │ drops executed
       ▼
┌─────────────┐
│  DROPPING   │ ← FCC being distributed
└──────┬──────┘
       │ all drops complete
       ▼
┌─────────────┐
│  MONITORING │ ← Waiting for mining reward
└──────┬──────┘
       │ reward received OR timeout
       ▼
┌─────────────┐
│  COMPLETED  │ ← Ready for next cycle
└─────────────┘
```

### 4.2 Event Execution Flow

**Endpoint**: `POST /api/mining/events/create` (called by scheduler)

**For each active wallet**:
```typescript
async function executeEventCycle(wallet: MiningWallet): Promise<void> {
  // 1. Create event on-chain
  const eventId = await createEvent({
    businessName: 'Mining Event',
    tokenAddress: CONTRACTS.FCC_TOKEN,
    totalDropAmount: '24000000',     // 24 FCC (6 decimals)
    dropType: 1,                      // Fixed
    dropNumber: 2,                    // 2 recipients
    minDropAmt: '12000000',           // 12 FCC
    maxDropAmt: '12000000',           // 12 FCC
    deadline: now() + 86400,          // 24 hours
  });

  // 2. Execute drops
  for (const recipient of config.recipients) {
    await drop(eventId, recipient, '12000000');
    await delay(2000);  // Rate limit
  }

  // 3. Monitor for mining reward
  await monitorMiningReward(wallet.address, eventId);

  // 4. Finish event
  await finishEvent(eventId);
}
```

### 4.3 Mining Reward Detection

```typescript
async function monitorMiningReward(
  walletAddress: string,
  eventId: number
): Promise<boolean> {
  const startBalance = await getFCCBalance(walletAddress);
  const targetReward = parseUnits('6', 6);  // 6 FCC
  
  // Poll every 30 seconds for up to 1 hour
  for (let i = 0; i < 120; i++) {
    await delay(30000);
    
    const currentBalance = await getFCCBalance(walletAddress);
    const received = currentBalance - startBalance;
    
    if (received >= targetReward) {
      return true;  // Mining reward received
    }
  }
  
  return false;  // Timeout
}
```

---

## Phase 5: Scheduling & Automation

### 5.1 Scheduler Configuration

```typescript
interface SchedulerConfig {
  enabled: boolean;
  startTimeUTC: string;            // "04:00" - first event time
  intervalMinutes: number;         // 5 minutes between wallet events
  maxConcurrentEvents: number;     // 3 - rate limiting
  retryOnFailure: boolean;
  maxRetries: number;              // 3
}
```

### 5.2 Daily Cycle Cron Job

**Schedule**: Runs every minute, checks for pending work

```typescript
// Backend scheduler (node-cron)
cron.schedule('* * * * *', async () => {
  const config = await getSchedulerConfig();
  if (!config.enabled) return;

  const pendingWallets = await db.query(`
    SELECT w.* FROM mining_wallets w
    LEFT JOIN mining_events e ON w.last_event_id = e.id
    WHERE w.status = 'active'
    AND (
      w.last_event_id IS NULL
      OR (e.status = 'COMPLETED' AND e.completed_at < datetime('now', '-23 hours'))
    )
    ORDER BY w.id
    LIMIT ?
  `, [config.maxConcurrentEvents]);

  for (const wallet of pendingWallets) {
    await queueEventCreation(wallet);
  }
});
```

### 5.3 Event History Schema

```sql
CREATE TABLE mining_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id INTEGER NOT NULL,
  chain_event_id INTEGER,          -- On-chain event ID
  status TEXT DEFAULT 'PENDING',
  drops_completed INTEGER DEFAULT 0,
  mining_reward_received TEXT,
  tx_hashes TEXT,                  -- JSON array
  gas_used TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  FOREIGN KEY (wallet_id) REFERENCES mining_wallets(id)
);

CREATE TABLE mining_drops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  recipient_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES mining_events(id)
);
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mining/wallets/import` | Bulk import wallets |
| GET | `/api/mining/wallets` | List all mining wallets |
| DELETE | `/api/mining/wallets/:address` | Remove wallet |
| POST | `/api/mining/nft/preview` | Preview batch mint |
| POST | `/api/mining/nft/mint` | Execute batch mint |
| POST | `/api/mining/config/recipients` | Set drop recipients |
| GET | `/api/mining/config` | Get current config |
| POST | `/api/mining/scheduler/start` | Enable automation |
| POST | `/api/mining/scheduler/stop` | Disable automation |
| GET | `/api/mining/events` | List all events |
| GET | `/api/mining/events/:id` | Event details |
| GET | `/api/mining/stats` | Aggregated statistics |

---

## Error Handling & Recovery

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 5000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < RETRY_CONFIG.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, i),
        RETRY_CONFIG.maxDelayMs
      );
      await sleep(delay);
    }
  }
  
  throw new Error(`${context} failed after ${RETRY_CONFIG.maxRetries} retries: ${lastError.message}`);
}
```

### Wallet Status Management

| Condition | Action |
|-----------|--------|
| 3 consecutive failures | Mark wallet as `error`, pause automation |
| Insufficient POL for gas | Alert user, pause wallet |
| NFT expired | Alert user, require renewal |
| RPC timeout | Retry with exponential backoff |

---

## Security Considerations

1. **Private Key Storage**: AES-256-GCM with PBKDF2 key derivation (100k iterations)
2. **Session Management**: Keys decrypted only when needed, cleared from memory after use
3. **API Authentication**: JWT tokens with 24-hour expiry
4. **Rate Limiting**: Max 10 requests/minute per endpoint
5. **Audit Logging**: All sensitive operations logged with timestamps

---

## Monitoring Dashboard (Web UI)

### Real-time Stats
- Active wallets count
- Events created today
- Total FCC distributed
- Mining rewards collected
- Success/failure rates

### Wallet Table
| Address | Status | Last Event | Reward | Next Scheduled |
|---------|--------|------------|--------|----------------|
| 0x1234... | Active | 2h ago | 6 FCC ✓ | In 22h |
| 0x5678... | Error | Failed | - | Paused |

### Event History
| Event ID | Wallet | Created | Drops | Reward | Status |
|----------|--------|---------|-------|--------|--------|
| 3421 | 0x1234... | 04:10 UTC | 2/2 | 6 FCC | Completed |
| 3420 | 0x5678... | 04:05 UTC | 1/2 | - | Failed |

---

## Implementation Checklist

### Backend Layer
- [ ] Wallet import with encryption
- [ ] Batch NFT minting
- [ ] Event creation service
- [ ] Drop execution service
- [ ] Mining reward monitor
- [ ] Scheduler (node-cron)
- [ ] SQLite database setup
- [ ] REST API endpoints
- [ ] Error handling & retries
- [ ] Logging system

### Web Layer (UI Only)
- [ ] Wallet import form
- [ ] Wallet list table
- [ ] Mint preview/confirm dialog
- [ ] Recipient configuration form
- [ ] Scheduler controls
- [ ] Event history table
- [ ] Real-time stats dashboard
- [ ] Error notifications

### CLI Layer (UI Only)
- [ ] Wallet import prompts
- [ ] Mint selection menu
- [ ] Config commands
- [ ] Status commands
- [ ] Event list display

---

## Notes

- **Do NOT duplicate business logic** in CLI or Web - all logic lives in Backend
- **Token decimals**: FCC = 6, USDT = 6, POL = 18
- **Gas estimation**: Always use `estimateGas()` + 20% buffer
- **Nonce management**: Sequential transactions per wallet to avoid conflicts
