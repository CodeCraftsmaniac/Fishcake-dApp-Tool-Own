# 🐟 Fishcake dApp Tool — Complete Technical Specification

> **Version**: 4.0 (Production-Ready)  
> **Network**: Polygon Mainnet (Chain ID: 137)  
> **Tokens**: FCC & USDT — both use **6 decimals** | POL/MATIC — **18 decimals**  
> **Last Updated**: 2026-04-06

---

## Table of Contents

### PART 1: FOUNDATION
1. [System Architecture](#1-system-architecture)
2. [Contract Addresses & Configuration](#2-contract-addresses--configuration)
3. [Token Decimals & Formatting](#3-token-decimals--formatting)
4. [Wallet Connection & Encryption](#4-wallet-connection--encryption)
5. [ERC-20 Approval Flow](#5-erc-20-approval-flow)

### PART 2: CORE FEATURES (fishcake.io Replication)
6. [Create Event](#6-feature-create-event)
7. [My Events (List + 3-State Status)](#7-feature-my-events)
8. [Event Detail View](#8-feature-event-detail-view)
9. [Event Detail — Button Logic](#9-event-detail--button-logic)
10. [Drop (Send Reward)](#10-feature-drop)
11. [Batch Drop](#11-feature-batch-drop)
12. [Claim Reward / QR Code](#12-feature-claim-reward--qr-code)
13. [Finish Event (Refund + Mining)](#13-feature-finish-event)
14. [Drop History](#14-feature-drop-history)
15. [Buy FCC Token](#15-feature-buy-fcc-token)
16. [Mint NFT (Basic & Pro)](#16-feature-mint-nft)
17. [Profile / Dashboard](#17-feature-profile--dashboard)
18. [Map View](#18-feature-map-view)
19. [Mining Reward System](#19-mining-reward-system)
20. [NFT System](#20-nft-system)
21. [Redemption Pool](#21-redemption-pool)

### PART 3: MINING AUTOMATION SYSTEM
22. [Mining Automation Overview](#22-mining-automation-overview)
23. [Automation Flow (Complete)](#23-complete-automation-flow)
24. [Mining Database Schema](#24-mining-database-schema)
25. [Mining API Endpoints](#25-mining-api-endpoints)
26. [Event State Machine](#26-event-state-machine)
27. [Mining Backend Services](#27-mining-backend-services)
28. [Edge Cases & Error Handling](#28-edge-cases--error-handling)
29. [Mining Security](#29-mining-security)
30. [Mining UI/UX](#30-mining-uiux)

### PART 4: IMPLEMENTATION REFERENCE
31. [Complete ABIs](#31-complete-abis)
32. [TypeScript Interfaces](#32-typescript-interfaces)
33. [Utility Functions](#33-utility-functions)
34. [Complete API Endpoints](#34-complete-api-endpoints)
35. [CLI Flow Walkthrough](#35-cli-flow-walkthrough)
36. [Recommended File Structure](#36-recommended-file-structure)
37. [Implementation Checklist](#37-implementation-checklist)

---

# PART 1: FOUNDATION

## 1. System Architecture

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
│   Supabase   │    │   Polygon    │    │    Logs      │
│   Database   │    │    RPC       │    │   (File)     │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 2. Contract Addresses & Configuration

### Production Addresses (Polygon Mainnet)

| Contract | Address | API Field Name | What It Does |
|----------|---------|---------------|-------------|
| **FishcakeEventManager** | `0x2CAf752814f244b3778e30c27051cc6B45CB1fc9` | `FishcakeEventManager` | Create events, drop rewards, finish events |
| **FCC Token** | `0x84eBc138F4Ab844A3050a6059763D269dC9951c6` | `FccToken` | FCC ERC-20 token (6 decimals) |
| **USDT (Polygon)** | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | `UsdtToken` | USDT PoS token (6 decimals) |
| **NftManager** | `0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B` | `NFTManager` | NFT minting, deadline checks |
| **StakingManager** | `0x19C6bf3Ae8DFf14967C1639b96887E8778738417` | — | FCC staking |
| **DirectSalePool** | `0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE` | `DirectSalePool` | Regular-price FCC buy (<1000 USDT) |
| **InvestorSalePool** | `0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B` | `InvestorSalePool` | Tiered-price FCC buy (>=1000 USDT) |
| **RedemptionPool** | `0x953E6DB14753552050B04a6393a827661bB4913a` | `RedemptionPool` | FCC burn/redeem (time-locked) |
| **MATIC Token** | `0x0000000000000000000000000000000000001010` | hardcoded | Native POL token (18 decimals) |

### Key Constants

```typescript
export const CONTRACTS = {
  EVENT_MANAGER: "0x2CAf752814f244b3778e30c27051cc6B45CB1fc9",
  FCC_TOKEN: "0x84eBc138F4Ab844A3050a6059763D269dC9951c6",
  USDT_TOKEN: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  NFT_MANAGER: "0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B",
  DIRECT_SALE_POOL: "0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE",
  INVESTOR_SALE_POOL: "0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B",
  REDEMPTION_POOL: "0x953E6DB14753552050B04a6393a827661bB4913a",
};

// From Smart Contract
const MAX_DEADLINE = 2592000;      // 30 days in seconds
const MIN_TOTAL_DROP = 1000000;    // 1 FCC/USDT (6 decimals)
const MAX_DROP_COUNT_CAP = 100;
const MINING_POOL_TOTAL = 300000000000000; // 300M FCC
const MINING_COOLDOWN = 86400;     // 24 hours
```

### RPC & Explorer

```
RPC URL:    https://polygon-rpc.com
Chain ID:   137
Explorer:   https://polygonscan.com
API Port:   3001
```

### Dynamic Address Loading

The frontend fetches addresses from the backend API at startup:

```typescript
const data = await fetch("/api/contract/info");
// Response: { FccToken, UsdtToken, NFTManager, FishcakeEventManager, 
//             DirectSalePool, InvestorSalePool, RedemptionPool }
```

**CLI behavior**: Use hardcoded addresses as fallback, but attempt to fetch from `/api/contract/info` on startup.

---

## 3. Token Decimals & Formatting

> ⚠️ **CRITICAL**: FCC and USDT use **6 decimals**, POL uses **18 decimals**.

### Token Lookup

```typescript
const TOKENS = {
    '0x84eBc138F4Ab844A3050a6059763D269dC9951c6': { symbol: 'FCC',  decimals: 6 },
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': { symbol: 'USDT', decimals: 6 },
};
```

### Conversion Functions

```typescript
import { ethers } from 'ethers';

// Human-readable → on-chain value
function toWei(amount: string, decimals: number = 6): bigint {
    return ethers.parseUnits(amount, decimals);  // "10.5" → 10500000n
}

// On-chain value → human-readable
function fromWei(amount: bigint, decimals: number = 6): string {
    return ethers.formatUnits(amount, decimals);  // 10500000n → "10.5"
}

// Format balance for display
function formatBalance(balance: string | undefined): string {
    if (!balance) return "0";
    const formatted = parseFloat(balance).toFixed(10);
    const trimmed = formatted.replace(/\.?0+$/, "");
    return trimmed.replace(/(\.\d{2})\d+/, "$1");  // Keep 2 decimal places
}
```

---

## 4. Wallet Connection & Encryption

The CLI has no browser wallet. Use **private key import + AES-256-GCM encryption**.

### First-Time Setup

```
1. User enters private key (or mnemonic)
2. User sets a passphrase
3. CLI encrypts private key:
   a. PBKDF2(passphrase, salt, 100000) → 32-byte AES key
   b. Generate random 12-byte nonce/IV
   c. AES-256-GCM encrypt(privateKey, aesKey, nonce) → ciphertext + authTag
   d. Save { ciphertext, nonce, salt, authTag } to keystore file
4. Never store raw private key on disk
```

### Every Run After

```
1. User enters passphrase
2. CLI reads keystore file
3. Derive key: PBKDF2(passphrase, salt, 100000)
4. Decrypt: AES-256-GCM open(ciphertext, derivedKey, nonce)
5. Verify authTag
6. Derive wallet address from ECDSA public key
7. Display:
   ✅ Wallet Connected
   Address: 0xABCD...1234
   Network: Polygon (137)
```

### Security Requirements

- **PBKDF2**: 100,000 iterations minimum
- **Salt**: Unique per wallet, 16 bytes
- **IV/Nonce**: Random 12 bytes per encryption
- **AuthTag**: 16 bytes (GCM mode)
- **Clear sensitive data** from memory after use

---

## 5. ERC-20 Approval Flow

Before creating an event or buying tokens, the wallet MUST approve the target contract to spend tokens.

### Check Current Allowance

```typescript
const allowance = await tokenContract.allowance(walletAddress, spenderAddress);
// If allowance >= amount → skip approval
// If allowance < amount → need approval TX first
```

### Send Approval Transaction

```typescript
const approveTx = await tokenContract.approve(
    spenderAddress,  // EventManager, NFTManager, SalePool, etc.
    amount           // amount in 6-decimal wei
);
await approveTx.wait();  // Wait for confirmation
```

---

# PART 2: CORE FEATURES

## 6. FEATURE: Create Event

### Input Fields

| # | Field | Type | Required | Contract Param |
|---|-------|------|----------|---------------|
| 1 | Campaign Name | string | ✅ | `_businessName` |
| 2 | Description | string | ✅ | Part of `_activityContent` (JSON) |
| 3 | Physical Address | string | ❌ | Part of `_activityContent` (JSON) |
| 4 | Link/URL | string | ❌ | Part of `_activityContent` (JSON) |
| 5 | Start Time | datetime | ✅ | Part of `_activityContent` (JSON) |
| 6 | End Time (Deadline) | datetime | ✅ | `_activityDeadLine` (unix timestamp) |
| 7 | Latitude | number | ✅ | Part of `_latitudeLongitude` |
| 8 | Longitude | number | ✅ | Part of `_latitudeLongitude` |
| 9 | Token | "FCC" or "USDT" | ✅ | `_tokenContractAddr` |
| 10 | Drop Type | "Even" or "Random" | ✅ | `_dropType` (1=Even, 2=Random) |
| 11 | Min Reward (each) | number | ✅ (Random only) | `_minDropAmt` (6 decimals) |
| 12 | Max Reward (each) | number | ✅ | `_maxDropAmt` (6 decimals) |
| 13 | Number of Drops | integer | ✅ | `_dropNumber` |

### Activity Content JSON

```typescript
const activityContent = JSON.stringify({
    activityContentDescription: "Buy coffee, get FCC!",
    activityContentAddress: "123 Main St, NYC",
    activityContentLink: "https://mycoffee.shop",
    eventStartTime: "2026-04-05T09:00:00.000Z",
    eventEndTime: "2026-04-15T09:00:00.000Z",
});
```

### Budget Calculation

```
totalDropAmts = maxReward × dropNumber
// Example: 10 FCC per drop × 50 drops = 500 FCC total
// In wei: 10_000_000 × 50 = 500_000_000
```

### Validation Rules (9 checks)

```
1. dropType must be 1 or 2
2. maxDropAmt >= minDropAmt
3. totalDropAmts > 0
4. deadline > current time
5. deadline < current time + 30 days (2,592,000 seconds)
6. totalDropAmts == maxDropAmt × dropNumber
7. totalDropAmts >= 1_000_000 (minimum 1 FCC/USDT)
8. dropNumber <= 100 OR dropNumber <= totalDropAmts / 1_000_000
9. tokenContractAddr must be FCC or USDT address
```

### Transaction Flow

```
STEP 1: Validate all inputs locally
STEP 2: Check token balance >= totalDropAmts
STEP 3: Check allowance — call tokenContract.allowance(wallet, EventManager)
STEP 4: If allowance < totalDropAmts → send approve(EventManager, totalDropAmts)
STEP 5: Wait for approval TX confirmation
STEP 6: Send activityAdd() with 10 parameters
STEP 7: Wait for TX confirmation
STEP 8: Parse return value → get activityId
STEP 9: Display: "✅ Event #3319 created! TX: 0x..."
```

### Contract Call

```typescript
const tx = await fishcakeEventManager.activityAdd(
    businessName,           // "Coffee Shop Promo"
    activityContent,        // JSON string
    latitudeLongitude,      // "40.7128,-74.0060"
    deadlineTimestamp,      // 1713200000 (unix seconds)
    totalDropAmts,          // 500_000_000n (500 FCC)
    dropType,               // 1 (Even) or 2 (Random)
    dropNumber,             // 50
    minDropAmt,             // 0n (for Even) or min in wei
    maxDropAmt,             // 10_000_000n (10 FCC)
    tokenContractAddr       // FCC or USDT address
);
const receipt = await tx.wait();
```

---

## 7. FEATURE: My Events

### API Call

```typescript
const response = await fetch(`/api/activity/list?` + new URLSearchParams({
    pageNum: "1",
    pageSize: "50",
    businessAccount: walletAddress,
    activityStatus: "1",  // 1=active, 2=finished, 3=expired
}));
const { items, count } = await response.json().then(r => r.obj);
```

### Three-State Event Status

```
STATUS 1 (Active):   activity_status = 1 AND deadline > now
STATUS 2 (Finished): activity_status = 2 (owner called activityFinish)
STATUS 3 (Expired):  activity_status = 1 AND deadline < now
```

### CLI Display

```
╔══════════════════════════════════════════════════╗
║  📋 MY EVENTS                                    ║
╠══════════════════════════════════════════════════╣
║  ✅ ACTIVE EVENTS                                ║
║  ├─ #3319 Coffee Shop FCC Drop                   ║
║  │  Token: FCC │ Drops: 45/100 │ Expires: 2d 5h ║
║                                                  ║
║  ⏰ EXPIRED                                      ║
║  ├─ #3280 Old Promo │ Drops: 10/20              ║
║                                                  ║
║  🏁 FINISHED                                     ║
║  ├─ #3200 Launch Event │ Mined: 12.5 FCC        ║
╚══════════════════════════════════════════════════╝
```

---

## 8. FEATURE: Event Detail View

### Reading from Contract

```typescript
// activityInfoArrs is 0-indexed, activityId is 1-indexed
const baseInfo = await contract.activityInfoArrs(activityId - 1);
const extInfo = await contract.activityInfoExtArrs(activityId - 1);
```

**baseInfo returns:**
- activityId, businessAccount, businessName, activityContent
- latitudeLongitude, activityCreateTime, activityDeadLine
- dropType, dropNumber, minDropAmt, maxDropAmt, tokenContractAddr

**extInfo returns:**
- activityId, alreadyDropAmts, alreadyDropNumber
- businessMinedAmt, businessMinedWithdrawedAmt, activityStatus

### Display Fields

| Field | Source | Format |
|-------|--------|--------|
| Event ID | `baseInfo.activityId` | `#3319` |
| Campaign Name | `baseInfo.businessName` | Plain text |
| Description | `JSON.parse(activityContent).activityContentDescription` | Parsed |
| Location | `baseInfo.latitudeLongitude` | "40.7128,-74.0060" |
| Deadline | `baseInfo.activityDeadLine` | Unix → formatted |
| Token | Compare with FCC address | "FCC" or "USDT" |
| Drop Type | `baseInfo.dropType` | 1 = "Even", 2 = "Random" |
| Total Budget | `fromWei(maxDropAmt * dropNumber)` | "500.00 FCC" |
| Drops Done | `extInfo.alreadyDropNumber / baseInfo.dropNumber` | "45/100" |
| Status | `extInfo.activityStatus` + deadline check | Active/Expired/Finished |

---

## 9. Event Detail — Button Logic

```
IS EVENT ENDED? (deadline passed OR activityStatus === 2)
├── YES → Show: [Finished] (disabled)
│
└── NO → IS VIEWER THE OWNER?
    ├── YES → Show: [End The Event] → calls activityFinish()
    │
    └── NO → IS VIEWER CONNECTED?
        ├── YES → Show: [Claim Rewards] → opens QR dialog
        └── NO → Show: [Claim Rewards] → opens address input first
```

---

## 10. FEATURE: Drop

### Pre-Drop Validation (6 checks)

```typescript
// 1. Check: hasn't already received a drop from this event
const alreadyDropped = await contract.activityDroppedToAccount(activityId, recipient);

// 2. Check: event is active
const extInfo = await contract.activityInfoExtArrs(activityId - 1);
if (extInfo.activityStatus !== 1) throw "Event already finished";

// 3. Check: deadline not passed
const baseInfo = await contract.activityInfoArrs(activityId - 1);
if (baseInfo.activityDeadLine < Math.floor(Date.now() / 1000)) throw "Event expired";

// 4. Check: caller is the event owner
if (baseInfo.businessAccount.toLowerCase() !== walletAddress.toLowerCase())
    throw "Only the event owner can drop rewards";

// 5. Check: drops remaining
if (extInfo.alreadyDropNumber >= baseInfo.dropNumber) throw "No drops remaining";

// 6. Determine amount based on dropType
let amount = baseInfo.dropType === 1 ? baseInfo.maxDropAmt : userSpecifiedAmount;
```

### Contract Call

```typescript
const tx = await fishcakeEventManager.drop(
    activityId,       // Which event
    recipientAddress, // Who gets tokens
    dropAmount        // Amount in 6-dec wei
);
await tx.wait();
```

---

## 11. FEATURE: Batch Drop

```typescript
async function batchDrop(activityId: number, recipients: string[], amounts: bigint[]) {
    const results = [];
    for (let i = 0; i < recipients.length; i++) {
        try {
            const alreadyDropped = await contract.activityDroppedToAccount(
                activityId, recipients[i]
            );
            if (alreadyDropped) {
                results.push({ address: recipients[i], status: "SKIPPED" });
                continue;
            }
            
            const tx = await contract.drop(activityId, recipients[i], amounts[i]);
            const receipt = await tx.wait();
            results.push({ address: recipients[i], status: "SUCCESS", txHash: receipt.hash });
        } catch (err) {
            results.push({ address: recipients[i], status: "FAILED", reason: err.message });
        }
    }
    return results;
}
```

---

## 12. FEATURE: Claim Reward / QR Code

### QR Code JSON Structure

**For Even/Fixed drops (dropType = 1):**
```json
{
    "businessAccount": "0xOwnerWallet...",
    "activity": 3319,
    "address": "0xRecipientWallet...",
    "rewardAmt": "10.0",
    "tokenType": 1
}
```

**For Random drops (dropType = 2):**
```json
{
    "activity": 3319,
    "address": "0xRecipientWallet...",
    "rewardAmt": "7.53",
    "tokenType": 1
}
```

Token type: `1` = FCC, `2` = USDT

### Random Amount Calculation

```typescript
const randomReward = Math.random() * (maxDropAmt - minDropAmt) + minDropAmt;
const rewardAmt = randomReward.toFixed(2);
```

---

## 13. FEATURE: Finish Event

### Contract Call

```typescript
const tx = await fishcakeEventManager.activityFinish(activityId);
const receipt = await tx.wait();
```

### What Happens On-Chain

```
1. Verify caller is event owner
2. Verify event not already finished
3. Set activityStatus = 2
4. Calculate refund:
   returnAmount = (maxDropAmt × dropNumber) - alreadyDropAmts
5. Transfer unused tokens back to owner
6. Calculate mining reward (if owner has valid NFT):
   effectiveValue = min(alreadyDropAmts, alreadyDropNumber × 20 × 1e6)
   miningReward = effectiveValue × minePercent / 100
7. Transfer mining reward
8. Emit: ActivityFinish(activityId, tokenAddr, returnAmount, minedAmount)
```

### Display After Finish

```
✅ Event #3319 finished!
TX: 0xabc...def

Summary:
├─ Total Budget:    500.00 FCC
├─ Drops Executed:  45 / 100
├─ Amount Dropped:  450.00 FCC
├─ Refunded:        +50.00 FCC
└─ Mining Reward:   +12.50 FCC
```

---

## 14. FEATURE: Drop History

### API Call

```typescript
// Received drops:
const received = await fetch(`/api/drop/list?address=${wallet}&dropType=1`);

// Sent drops:
const sent = await fetch(`/api/drop/list?address=${wallet}&dropType=2`);
```

### Display Format

```
Received (+green):
  ☑ Coffee Shop FCC Drop
    Jan 15, 2026                              +10.00 FCC

Sent (-red):
  ☐ Coffee Shop FCC Drop
    Jan 15, 2026                              -10.00 FCC
```

---

## 15. FEATURE: Buy FCC Token

### Tier Pricing (USDT → FCC)

| Tier | USDT Range | Rate | Pool |
|------|-----------|------|------|
| Regular | < 1,000 USDT | 1 USDT = 10 FCC | DirectSalePool |
| Tier 4 | 1,000 – 4,999 USDT | 1 USDT = 11.11 FCC | InvestorSalePool |
| Tier 3 | 5,000 – 9,999 USDT | 1 USDT = 12.50 FCC | InvestorSalePool |
| Tier 2 | 10,000 – 99,999 USDT | 1 USDT = 14.28 FCC | InvestorSalePool |
| Tier 1 | 100,000+ USDT | 1 USDT = 16.66 FCC | InvestorSalePool |

### Contract Routing

```typescript
if (usdtAmount < 1000) {
    contract = DirectSalePool;
} else {
    contract = InvestorSalePool;
}
await contract.buyFccByUsdtAmount(usdtAmount * 1e6);
```

---

## 16. FEATURE: Mint NFT

### NFT Types and Pricing

| Type | Cost | Effect |
|------|------|--------|
| **Basic NFT** | 8 USDT | Half mining rate (25%) |
| **Pro NFT** | 80 USDT | Full mining rate (50%) |

### Contract Call

```typescript
await nftManager.createNFT(
    businessName,        // string
    description,         // string
    imgUrl,              // string (empty "")
    businessAddress,     // string (empty for Basic)
    webSite,             // string (empty for Basic)
    social,              // string
    type                 // 1 = Pro, 2 = Basic
);
```

---

## 17. FEATURE: Profile / Dashboard

### Sections

1. **NFT List** - Carousel showing owned NFTs
2. **Current Balance** - FCC, USDT, POL balances
3. **Mining Dashboard** - Mining stats and history

### Balance Formatting

```typescript
// USDT/FCC: 6 decimals
ethers.formatUnits(balance, 6);

// POL: 18 decimals
ethers.formatUnits(balance, 18);
```

---

## 18. FEATURE: Map View

### Pin Types

```typescript
function determinePinSource(activity): "pro" | "basic" | "activity" {
    if (activity.proDeadline > 0) return "pro";      // Gold pin
    if (activity.basicDeadline > 0) return "basic";  // Silver pin
    return "activity";                                // Regular pin
}
```

### Filters

```
activityStatus: 0=All, 1=Ongoing, 2=Ended
activityFilter: 0=All, 1=Pro, 2=Basic
tokenContractAddr: FCC or USDT address
businessName: Search by name
activityId: Search by ID
```

---

## 19. Mining Reward System

### Mining Tier Table (4-tier halving)

| Total FCC Mined | Mine % (Pro NFT) | Mine % (Basic NFT) | Max Per Event |
|----------------|-------------------|---------------------|---------------|
| 0 – 30M | 50% | 25% | 60 FCC |
| 30M – 100M | 40% | 20% | 30 FCC |
| 100M – 200M | 20% | 10% | 15 FCC |
| 200M – 300M | 10% | 5% | 8 FCC |
| 300M+ | 0% | 0% | Mining stops |

### Mining Formula

```
effectiveDropValue = min(alreadyDropAmts, alreadyDropNumber × 20 × 1e6)
miningReward = effectiveDropValue × minePercent / 100
if (miningReward > maxMineAmtLimit) miningReward = maxMineAmtLimit
```

### Mining Eligibility

- **Pro NFT**: Full mine percent → `getMerchantNTFDeadline(address)`
- **Basic NFT**: Half mine percent → `getUserNTFDeadline(address)`
- **No NFT**: No mining reward
- **24-hour cooldown**: Each wallet can only mine once per 24 hours

---

## 20. NFT System

### Check NFT Status

```typescript
const proDeadline = await nftManager.getMerchantNTFDeadline(walletAddress);
const basicDeadline = await nftManager.getUserNTFDeadline(walletAddress);
const now = Math.floor(Date.now() / 1000);

if (proDeadline > now) status = "Pro NFT (active)";
else if (basicDeadline > now) status = "Basic NFT (active)";
else status = "No NFT (mining disabled)";
```

---

## 21. Redemption Pool

The Redemption Pool is **currently time-locked** and will unlock around 2027:

```typescript
const unlockTimestamp = 1820399835;  // ~year 2027
```

Pool address: `0x953E6DB14753552050B04a6393a827661bB4913a`

---

# PART 3: MINING AUTOMATION SYSTEM

## 22. Mining Automation Overview

The Mining Automation System:
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

## 23. Complete Automation Flow

### Phase 0: Initial Setup (One-Time)

```
1. User imports wallets (bulk private keys)
   └─→ System encrypts with AES-256-GCM
   └─→ Stores in database
   └─→ Fetches on-chain balances

2. User configures 2 drop recipient addresses
   └─→ Address 1: receives 12 FCC per event
   └─→ Address 2: receives 12 FCC per event
   └─→ Total: 24 FCC per event

3. User enables automation
   └─→ Scheduler starts
   └─→ System runs 24/7 automatically
```

### Phase 1: NFT Minting

```
FOR EACH wallet without valid NFT:
  1. Check NFT status
  2. Approve USDT spend
  3. Mint NFT (BASIC: 10 USDT, PRO: 100 USDT)
  4. Wait for confirmation
  5. Update database
```

### Phase 2: Event Creation (Daily)

```
FOR EACH active wallet:
  CHECK CONDITIONS:
  ├─ Has valid NFT pass?
  ├─ No active event running?
  ├─ Last event completed > 23 hours ago?
  └─ Has enough FCC balance (>= 24 FCC)?

  IF ALL TRUE:
    1. Approve FCC (24 FCC)
    2. Create event on-chain
    3. Record in database
```

### Phase 3: Drop Execution

```
FOR EACH event with status='CREATED':
  1. Drop 12 FCC to recipient 1
  2. Wait 2 seconds
  3. Drop 12 FCC to recipient 2
  4. Update: drops_checklist = '2/2'
```

### Phase 4: Mining Reward Validation

```
FOR EACH event with status='DROPS_COMPLETE':
  1. Get wallet FCC balance BEFORE
  2. Poll every 30 seconds for up to 1 hour
  3. Check if balance increased by >= 6 FCC
  4. If reward received → MINING_COMPLETE
```

### Phase 5: Finish Event

```
FOR EACH event with status='MINING_COMPLETE':
  1. Call activityFinish(eventId)
  2. Update database: status = 'FINISHED'
  3. Schedule next: completed_at + 5 minutes
```

### Phase 6: Daily Cycle Repeat

```
TIMING EXAMPLE:
Day 1:
  Event Created:    04:00:00 UTC
  Drops Complete:   04:00:30 UTC
  Reward Received:  04:15:00 UTC
  Event Finished:   04:15:05 UTC

Day 2:
  Next Event Start: 04:20:05 UTC (+5 min from finish)
  (also must be 23+ hours from Day 1 start)
```

---

## 24. Mining Database Schema

```sql
-- Wallet storage
CREATE TABLE mining_wallets (
    id INTEGER PRIMARY KEY,
    address TEXT NOT NULL UNIQUE,
    encrypted_key TEXT NOT NULL,
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    status TEXT DEFAULT 'active',    -- active | paused | error | nft_expired
    failure_count INTEGER DEFAULT 0,
    nft_type TEXT DEFAULT 'NONE',    -- NONE | BASIC | PRO
    nft_expiry_at DATETIME,
    last_event_id INTEGER,
    next_event_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Global config
CREATE TABLE mining_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    recipient_address_1 TEXT NOT NULL,
    recipient_address_2 TEXT NOT NULL,
    fcc_per_recipient TEXT DEFAULT '12',
    total_fcc_per_event TEXT DEFAULT '24',
    expected_mining_reward TEXT DEFAULT '6',
    scheduler_enabled BOOLEAN DEFAULT FALSE,
    event_interval_hours INTEGER DEFAULT 24,
    offset_minutes INTEGER DEFAULT 5,
    max_concurrent_events INTEGER DEFAULT 3
);

-- Event tracking
CREATE TABLE mining_events (
    id INTEGER PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    chain_event_id INTEGER,
    status TEXT DEFAULT 'PENDING',
    drops_checklist TEXT DEFAULT '0/2',
    drop_1_completed BOOLEAN DEFAULT FALSE,
    drop_1_tx_hash TEXT,
    drop_2_completed BOOLEAN DEFAULT FALSE,
    drop_2_tx_hash TEXT,
    total_dropped TEXT,
    reward_received TEXT,
    started_at DATETIME,
    finished_at DATETIME,
    FOREIGN KEY (wallet_id) REFERENCES mining_wallets(id)
);

-- Individual drops
CREATE TABLE mining_drops (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL,
    recipient_address TEXT NOT NULL,
    amount TEXT NOT NULL,
    drop_number INTEGER NOT NULL,
    tx_hash TEXT,
    status TEXT DEFAULT 'PENDING',
    FOREIGN KEY (event_id) REFERENCES mining_events(id)
);

-- Audit logs
CREATE TABLE mining_logs (
    id INTEGER PRIMARY KEY,
    wallet_id INTEGER,
    event_id INTEGER,
    level TEXT DEFAULT 'INFO',
    action TEXT NOT NULL,
    message TEXT NOT NULL,
    tx_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 25. Mining API Endpoints

### Wallet Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mining/wallets/import` | Bulk import wallets |
| GET | `/api/mining/wallets` | List all wallets |
| DELETE | `/api/mining/wallets/:address` | Remove wallet |
| PATCH | `/api/mining/wallets/:address/status` | Pause/resume |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mining/config` | Get config |
| PUT | `/api/mining/config/recipients` | Set drop recipients |
| PUT | `/api/mining/config/scheduler` | Configure scheduler |

### Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mining/events` | List events |
| GET | `/api/mining/events/:id` | Event details |
| POST | `/api/mining/scheduler/start` | Enable automation |
| POST | `/api/mining/scheduler/stop` | Disable automation |
| GET | `/api/mining/stats` | Get statistics |

---

## 26. Event State Machine

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
   ┌─────────────┴───────┐     │
   ▼                     ▼     │
┌────────────┐    ┌──────────┐ │
│  TIMEOUT   │    │ REWARD   │─┘
│  (1 hour)  │    │ DETECTED │
└────────────┘    └────┬─────┘
                       │ >= 6 FCC
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
```

---

## 27. Mining Backend Services

### Scheduler Service

```typescript
export class MiningScheduler {
  start(): void {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      await this.processReadyWallets();
    });
  }

  private async processReadyWallets(): Promise<void> {
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
      LIMIT ?
    `, [config.max_concurrent_events]);

    for (const wallet of readyWallets) {
      await EventProcessor.processWallet(wallet);
    }
  }
}
```

### Event Processor

```typescript
export class EventProcessor {
  static async processWallet(wallet: MiningWallet): Promise<void> {
    // Check NFT
    if (wallet.nft_type === 'NONE' || this.isNFTExpired(wallet)) {
      await this.mintNFT(wallet);
    }
    
    // Create event
    const eventId = await this.createEvent(signer, config);
    
    // Execute drops
    await this.executeDrop(signer, eventId, config.recipient_address_1, 1);
    await this.delay(2000);
    await this.executeDrop(signer, eventId, config.recipient_address_2, 2);
    
    // Monitor reward
    const rewardReceived = await this.monitorMiningReward(wallet.address);
    
    // Finish event
    if (rewardReceived) {
      await this.finishEvent(signer, eventId);
    }
  }
}
```

---

## 28. Edge Cases & Error Handling

### Failed Drops
- Retry up to 3 times with exponential backoff
- If still fails, mark event as FAILED
- Increment wallet failure count

### Partial Completion
- Mark as TIMEOUT after 1 hour
- Continue monitoring in background
- Allow manual finish via API

### Duplicate Wallets
- Check if address already exists
- Use UNIQUE constraint on address

### NFT Expiration
- Check nft_expiry_at > NOW()
- Set wallet status = 'nft_expired'
- Alert user in dashboard

### Insufficient Balance
- Check FCC balance >= 24 FCC
- Check POL balance >= 0.1 POL for gas
- Skip wallet this cycle (not an error)

---

## 29. Mining Security

1. **Private Key Encryption**
   - AES-256-GCM with unique salt and IV per wallet
   - PBKDF2 key derivation (100,000 iterations)
   - Keys decrypted only when needed, cleared after use

2. **API Authentication**
   - JWT tokens with 24-hour expiry
   - Refresh token rotation
   - Rate limiting: 10 requests/minute

3. **Database Security**
   - Parameterized queries
   - Audit logging for all sensitive operations

4. **Network Security**
   - HTTPS only
   - CORS restricted to known origins
   - No private keys transmitted over API

---

## 30. Mining UI/UX

### Visual Workflow Canvas

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VISUAL WORKFLOW CANVAS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐                 │
│    │ MINT NFT │──────│  CREATE  │──────│  DROP 1  │                 │
│    │   PASS   │      │  EVENT   │      │  12 FCC  │                 │
│    └──────────┘      └──────────┘      └────┬─────┘                 │
│         ○                 ○                 │                        │
│      skipped           running             ▼                        │
│                                       ┌──────────┐                  │
│                                       │  DROP 2  │                  │
│                                       │  12 FCC  │                  │
│                                       └────┬─────┘                  │
│                                            │                        │
│    ┌──────────┐      ┌──────────┐      ┌───▼──────┐                 │
│    │  FINISH  │◄─────│  CHECK   │◄─────│ VALIDATE │                 │
│    │  EVENT   │      │  REWARD  │      │   2/2    │                 │
│    └──────────┘      └──────────┘      └──────────┘                 │
│         ○                 ○                 ●                        │
│      pending           pending          completed                   │
│                                                                      │
│   ● = completed   ◐ = running   ○ = pending   ✖ = failed           │
│                                                                      │
│   [START AUTOMATION]  [STOP]  [RESET]                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Node Status Colors

| Status | Color | Animation |
|--------|-------|-----------|
| Pending | Gray | None |
| Running | Blue | Pulsing glow |
| Completed | Green | Checkmark |
| Failed | Red | Warning icon |
| Skipped | Purple | Dash icon |

### Tabs

1. **Workflow** - Visual workflow canvas
2. **Wallets** - Manage imported wallets
3. **Logs** - Execution history
4. **Settings** - Configure recipients, scheduler

---

# PART 4: IMPLEMENTATION REFERENCE

## 31. Complete ABIs

### FishcakeEventManager ABI

```json
[
    {
        "name": "activityAdd",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            { "name": "_businessName", "type": "string" },
            { "name": "_activityContent", "type": "string" },
            { "name": "_latitudeLongitude", "type": "string" },
            { "name": "_activityDeadLine", "type": "uint256" },
            { "name": "_totalDropAmts", "type": "uint256" },
            { "name": "_dropType", "type": "uint8" },
            { "name": "_dropNumber", "type": "uint256" },
            { "name": "_minDropAmt", "type": "uint256" },
            { "name": "_maxDropAmt", "type": "uint256" },
            { "name": "_tokenContractAddr", "type": "address" }
        ],
        "outputs": [
            { "name": "_ret", "type": "bool" },
            { "name": "_activityId", "type": "uint256" }
        ]
    },
    {
        "name": "activityFinish",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{ "name": "_activityId", "type": "uint256" }],
        "outputs": [{ "name": "_ret", "type": "bool" }]
    },
    {
        "name": "drop",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            { "name": "_activityId", "type": "uint256" },
            { "name": "_userAccount", "type": "address" },
            { "name": "_dropAmt", "type": "uint256" }
        ],
        "outputs": [{ "name": "_ret", "type": "bool" }]
    },
    {
        "name": "activityInfoArrs",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{ "name": "", "type": "uint256" }],
        "outputs": [
            { "name": "activityId", "type": "uint256" },
            { "name": "businessAccount", "type": "address" },
            { "name": "businessName", "type": "string" },
            { "name": "activityContent", "type": "string" },
            { "name": "latitudeLongitude", "type": "string" },
            { "name": "activityCreateTime", "type": "uint256" },
            { "name": "activityDeadLine", "type": "uint256" },
            { "name": "dropType", "type": "uint8" },
            { "name": "dropNumber", "type": "uint256" },
            { "name": "minDropAmt", "type": "uint256" },
            { "name": "maxDropAmt", "type": "uint256" },
            { "name": "tokenContractAddr", "type": "address" }
        ]
    },
    {
        "name": "activityInfoExtArrs",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{ "name": "", "type": "uint256" }],
        "outputs": [
            { "name": "activityId", "type": "uint256" },
            { "name": "alreadyDropAmts", "type": "uint256" },
            { "name": "alreadyDropNumber", "type": "uint256" },
            { "name": "businessMinedAmt", "type": "uint256" },
            { "name": "businessMinedWithdrawedAmt", "type": "uint256" },
            { "name": "activityStatus", "type": "uint8" }
        ]
    },
    {
        "name": "activityDroppedToAccount",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            { "name": "_activityId", "type": "uint256" },
            { "name": "_userAccount", "type": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool" }]
    },
    {
        "name": "ActivityAdd",
        "type": "event",
        "inputs": [
            { "indexed": true, "name": "who", "type": "address" },
            { "indexed": true, "name": "_activityId", "type": "uint256" },
            { "indexed": false, "name": "_totalDropAmts", "type": "uint256" }
        ]
    },
    {
        "name": "ActivityFinish",
        "type": "event",
        "inputs": [
            { "indexed": true, "name": "_activityId", "type": "uint256" },
            { "indexed": false, "name": "_tokenContractAddr", "type": "address" },
            { "indexed": false, "name": "_returnAmount", "type": "uint256" },
            { "indexed": false, "name": "_minedAmount", "type": "uint256" }
        ]
    },
    {
        "name": "Drop",
        "type": "event",
        "inputs": [
            { "indexed": true, "name": "who", "type": "address" },
            { "indexed": true, "name": "_activityId", "type": "uint256" },
            { "indexed": false, "name": "_dropAmt", "type": "uint256" }
        ]
    }
]
```

### ERC-20 ABI

```json
[
    {
        "name": "approve",
        "type": "function",
        "inputs": [
            { "name": "_spender", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool" }]
    },
    {
        "name": "allowance",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            { "name": "_owner", "type": "address" },
            { "name": "_spender", "type": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256" }]
    },
    {
        "name": "balanceOf",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{ "name": "_owner", "type": "address" }],
        "outputs": [{ "name": "balance", "type": "uint256" }]
    },
    {
        "name": "decimals",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint8" }]
    }
]
```

---

## 32. TypeScript Interfaces

### Activity (Event) Type

```typescript
interface Activity {
    id: string;
    activityId: number;
    businessAccount: string;
    businessName: string;
    activityContent: string;
    latitudeLongitude: string;
    activityCreateTime: number;
    activityDeadline: number;
    dropType: number;
    dropNumber: number;
    minDropAmt: number;
    maxDropAmt: number;
    tokenContractAddr: string;
    activityStatus: number;
    alreadyDropNumber: number;
    basicDeadline: number;
    proDeadline: number;
    returnAmount: number;
    minedAmount: number;
}
```

### Drop Record Type

```typescript
interface DropRecord {
    id: string;
    activityId: number;
    address: string;
    dropAmount: number;
    dropType: number;
    timestamp: number;
    tokenContractAddr: string;
    businessName: string;
    transactionHash: string;
    returnAmount: number;
    minedAmount: number;
}
```

### NFT Type

```typescript
interface NFT {
    id: string;
    who: string;
    tokenId: number;
    businessName: string;
    description: string;
    imgUrl: string;
    businessAddress: string;
    webSite: string;
    social: string;
    contractAddress: string;
    costValue: number;
    deadline: number;
    nftType: number;  // 1=Pro, 2=Basic
}
```

---

## 33. Utility Functions

### Parse Activity Content

```typescript
function parseActivityContent(content: string): string {
    try {
        const parsed = JSON.parse(content);
        return parsed?.activityContentDescription || content;
    } catch {
        return content;
    }
}
```

### Determine NFT Badge

```typescript
function determinePinSource(activity: Activity): "pro" | "basic" | "activity" {
    if (activity.proDeadline > 0) return "pro";
    if (activity.basicDeadline > 0) return "basic";
    return "activity";
}
```

### NFT Pricing

```typescript
const NFT_COST = {
    basic: { type: 2, amount: 8 },   // 8 USDT
    pro:   { type: 1, amount: 80 },  // 80 USDT
};
```

### Status Filters

```typescript
const STATUS_FILTERS = {
    all:      { text: "All",     value: 0 },
    ongoing:  { text: "Ongoing", value: 1 },
    ended:    { text: "Ended",   value: 2 },
};

const TOKEN_FILTERS = {
    all:  { text: "All Token", value: 0 },
    fcc:  { text: "FCC",       value: 1 },
    usdt: { text: "USDT",      value: 2 },
};
```

---

## 34. Complete API Endpoints

| Endpoint | Method | Purpose | Key Params |
|----------|--------|---------|------------|
| `/api/activity/list` | GET | List events | `pageNum, pageSize, businessAccount, activityStatus, tokenContractAddr` |
| `/api/activity/info` | GET | Event detail | `activityId` |
| `/api/drop/list` | GET | Drop history | `pageNum, pageSize, address, dropType` |
| `/api/contract/info` | GET | Contract addresses | — |
| `/api/chain_info/balance` | GET | Wallet balance | `address` |
| `/api/nft/list` | GET | NFT list | `pageNum, pageSize, address` |
| `/api/nft/detail` | GET | NFT detail | `businessAccount` |
| `/api/nft/nft_count` | GET | NFT count | — |
| `/api/mining/record` | GET | Mining history | `address` |
| `/api/mining/rank` | GET | Mining leaderboard | `monthFilter` |
| `/ping` | GET | Health check | — |

---

## 35. CLI Flow Walkthrough

### First Run (No Keystore)

```
╔════════════════════════════════════════════════════╗
║   🐟  F I S H C A K E   C L I   T O O L          ║
║         v1.0 — Polygon Mainnet                     ║
╠════════════════════════════════════════════════════╣
║   No wallet found.                                 ║
║                                                    ║
║   1. Import Private Key                            ║
║   2. Import Mnemonic Phrase                        ║
║   3. Exit                                          ║
╚════════════════════════════════════════════════════╝
> 1

Enter your private key: ••••••••••••••••••••••••
Set a passphrase: ••••••••
Confirm passphrase: ••••••••

✅ Wallet encrypted & saved!
   Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18
```

### Main Menu

```
╔════════════════════════════════════════════════════╗
║  🐟 Fishcake CLI Tool v1.0                        ║
║  ✅ 0x742d...bD18 │ 🔗 Polygon │ 💰 10,234 FCC   ║
╠════════════════════════════════════════════════════╣
║  ┌─ EVENT MANAGEMENT ──────────────────────┐       ║
║  │  1.  Create Event                       │       ║
║  │  2.  My Events                          │       ║
║  │  3.  Event Detail (by ID)               │       ║
║  │  4.  Finish Event                       │       ║
║  └─────────────────────────────────────────┘       ║
║  ┌─ DROP & REWARD ─────────────────────────┐       ║
║  │  5.  Drop Reward (single address)       │       ║
║  │  6.  Batch Drop (CSV / multi)           │       ║
║  │  7.  Generate Claim QR Code             │       ║
║  │  8.  Drop History                       │       ║
║  └─────────────────────────────────────────┘       ║
║  ┌─ TOKEN & NFT ───────────────────────────┐       ║
║  │  9.  Buy FCC (USDT → FCC)              │       ║
║  │  10. Sell FCC (FCC → USDT)              │       ║
║  │  11. Mint Basic NFT (8 USDT)            │       ║
║  │  12. Mint Pro NFT (80 USDT)             │       ║
║  └─────────────────────────────────────────┘       ║
║  ┌─ ACCOUNT ───────────────────────────────┐       ║
║  │  13. Dashboard (Balance + NFTs)         │       ║
║  │  14. Mining Status                      │       ║
║  │  15. Browse Events (Map/List)           │       ║
║  └─────────────────────────────────────────┘       ║
║  0.  Exit                                          ║
╚════════════════════════════════════════════════════╝
```

---

## 36. Recommended File Structure

```
fishcake-tool/
├── package.json
├── .env.example
├── .gitignore
│
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express entry point
│   │   ├── config/
│   │   │   ├── addresses.ts       # Contract addresses
│   │   │   └── abis.ts            # All ABIs
│   │   ├── database/
│   │   │   ├── supabase.ts        # Supabase client
│   │   │   └── migration.sql      # Schema
│   │   ├── mining/
│   │   │   ├── MiningAutomationEngine.ts
│   │   │   └── miningRoutes.ts
│   │   ├── blockchain/
│   │   │   ├── provider.ts        # RPC connection
│   │   │   └── contracts.ts       # Contract instances
│   │   └── utils/
│   │       ├── encryption.ts      # AES-256-GCM
│   │       └── logger.ts
│   └── package.json
│
├── Web-App/
│   ├── src/
│   │   ├── app/
│   │   │   ├── mining/page.tsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   └── mining/
│   │   │       ├── WorkflowCanvas.tsx
│   │   │       ├── WalletManager.tsx
│   │   │       └── ExecutionLogs.tsx
│   │   └── lib/
│   │       └── stores/
│   │           └── miningStore.ts
│   └── package.json
│
└── CLI-App/
    ├── src/
    │   ├── index.ts               # Entry point
    │   ├── wallet/
    │   │   └── keystore.ts
    │   ├── features/
    │   │   ├── createEvent.ts
    │   │   ├── drop.ts
    │   │   └── ...
    │   └── cli/
    │       ├── menu.ts
    │       └── prompts.ts
    └── package.json
```

---

## 37. Implementation Checklist

### Backend
- [x] Express server setup
- [x] Supabase database connection
- [x] Wallet encryption service (AES-256-GCM)
- [x] Wallet import endpoint
- [x] NFT minting service
- [x] Event creation service
- [x] Drop execution service
- [x] Mining reward monitor
- [x] Event finish service
- [x] Scheduler (node-cron)
- [x] All REST API endpoints
- [x] RPC connection pool with failover
- [x] Rate limiter
- [x] JWT authentication

### Web UI
- [x] Wallet import form
- [x] Wallet list with status
- [x] Recipient configuration
- [x] Start/Stop automation buttons
- [x] Live event progress display
- [x] Statistics dashboard
- [x] Visual workflow canvas (n8n-style)
- [x] Event history table
- [x] Animated sidebar link

### CLI
- [x] Wallet import prompts
- [x] Status commands
- [x] Manual event trigger
- [x] Mint NFT menu
- [x] Event list display
- [x] Config commands

---

*End of Fishcake Complete Specification*
