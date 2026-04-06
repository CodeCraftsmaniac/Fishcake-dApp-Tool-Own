# 🐟 Fishcake CLI dApp Tool — Complete Specification

> **Purpose**: Everything needed to build the CLI tool that replicates fishcake.io  
> **Network**: Polygon Mainnet (Chain ID: 137)  
> **Tokens**: FCC & USDT — both use **6 decimals**  
> **Source**: Extracted from all 11 fishcake.io repositories

### Source File Reference (Where to Find Every Feature)

> All reference repos are in the `reference-repos-for-tool/` folder.

**Smart Contracts (on-chain logic):**
- `reference-repos-for-tool/fishcake-contracts-main/src/contracts/core/FishcakeEventManagerV2.sol` → activityAdd, drop, activityFinish, mining
- `reference-repos-for-tool/fishcake-contracts-main/src/contracts/core/token/FishCakeCoin.sol` → FCC token, 6 decimals, burn
- `reference-repos-for-tool/fishcake-contracts-main/src/contracts/core/token/NftManagerV5.sol` → NFT mint, deadlines, booster
- `reference-repos-for-tool/fishcake-contracts-main/src/contracts/core/StakingManager.sol` → staking, APR tiers
- `reference-repos-for-tool/fishcake-contracts-main/src/contracts/core/DirectSalePool.sol` → regular token sale
- `reference-repos-for-tool/fishcake-contracts-main/src/contracts/core/InvestorSalePool.sol` → tiered token sale

**Frontend (feature flows, form fields, TX logic):**
- `reference-repos-for-tool/fishcake-web3-main/src/pages/create-event/components/EventCreateForm.tsx` → Create Event form fields
- `reference-repos-for-tool/fishcake-web3-main/src/components/global/CreateEventTransaction/CreateEventContainer.tsx` → approve + activityAdd TX
- `reference-repos-for-tool/fishcake-web3-main/src/pages/event/components/ActivityInfo.tsx` → Event detail display
- `reference-repos-for-tool/fishcake-web3-main/src/pages/event/components/ClaimDialog.tsx` → QR code JSON structure
- `reference-repos-for-tool/fishcake-web3-main/src/pages/event/components/ClaimButton.tsx` → Claim/Finish/Drop button logic
- `reference-repos-for-tool/fishcake-web3-main/src/components/global/FinishActivityTransaction/FinishActivityContainer.tsx` → Finish Event TX
- `reference-repos-for-tool/fishcake-web3-main/src/pages/event/components/ActivityOwnerRewardInfo.tsx` → Owner tracker (refund + mining)
- `reference-repos-for-tool/fishcake-web3-main/src/pages/buy-token/components/NftCreateForm.tsx` → Buy FCC tier table
- `reference-repos-for-tool/fishcake-web3-main/src/components/global/BuyTokenTransaction/BuyTokenContainer.tsx` → Buy FCC TX (DirectSale/InvestorSale)
- `reference-repos-for-tool/fishcake-web3-main/src/pages/mint-pro-nft/components/NftCreateForm.tsx` → Pro NFT form fields
- `reference-repos-for-tool/fishcake-web3-main/src/pages/mint-basic-nft/components/NftCreateForm.tsx` → Basic NFT form fields
- `reference-repos-for-tool/fishcake-web3-main/src/components/global/MintNFTTransaction/MintNFTContainer.tsx` → NFT mint TX (approve + createNFT)
- `reference-repos-for-tool/fishcake-web3-main/src/pages/profile/components/BalanceTable.tsx` → Balance display (FCC/USDT/POL)
- `reference-repos-for-tool/fishcake-web3-main/src/pages/profile/components/NFTList.tsx` → NFT list + detail modal
- `reference-repos-for-tool/fishcake-web3-main/src/pages/received/index.tsx` → Received/Sent toggle + sort
- `reference-repos-for-tool/fishcake-web3-main/src/pages/received/components/RecordsList.tsx` → Drop record display format
- `reference-repos-for-tool/fishcake-web3-main/src/pages/map/index.tsx` → Map with search + filters
- `reference-repos-for-tool/fishcake-web3-main/src/pages/redemption-pool/components/Info.tsx` → Redemption countdown timer
- `reference-repos-for-tool/fishcake-web3-main/src/services/contract/contract.ts` → All ABIs + contract addresses + decimals
- `reference-repos-for-tool/fishcake-web3-main/src/hooks/useContractInfo.ts` → Contract address API mapping (CRITICAL)
- `reference-repos-for-tool/fishcake-web3-main/src/hooks/useIsContractApproved.ts` → Allowance check pattern
- `reference-repos-for-tool/fishcake-web3-main/src/utils/fishcake.ts` → Utility functions (parse, format, filters)
- `reference-repos-for-tool/fishcake-web3-main/src/utils/fishcakeType.ts` → TypeScript interfaces
- `reference-repos-for-tool/fishcake-web3-main/src/services/modules/activities.ts` → Activity list API (`/api/activity/list`)
- `reference-repos-for-tool/fishcake-web3-main/src/services/modules/recevied.ts` → Drop list API (`/api/drop/list`)
- `reference-repos-for-tool/fishcake-web3-main/src/services/modules/profile.ts` → NFT list + activity info API
- `reference-repos-for-tool/fishcake-web3-main/src/services/modules/contract.ts` → Contract info + balance API (`/api/contract/info`)
- `reference-repos-for-tool/fishcake-web3-main/src/services/modules/kanban.ts` → NFT count + TX count API (`/api/nft/nft_count`)

**Backend (API, DB, indexing):**
- `reference-repos-for-tool/fishcake-service-main/fishcake.go` → API routes + worker setup
- `reference-repos-for-tool/fishcake-service-main/api/chain_info/chain_info.go` → Balance + gas price + raw TX
- `reference-repos-for-tool/fishcake-service-main/database/activity/activity_info.go` → Activity DB schema + mining logic
- `reference-repos-for-tool/fishcake-service-main/database/drop/drop_info.go` → Drop record schema
- `reference-repos-for-tool/fishcake-service-main/service/reward_service/reward_service.go` → AES-256-GCM key management

**Telegram Bot (ABI reference):**
- `reference-repos-for-tool/fishcake.io-telegram-bot/src/blockchain/abi.ts` → Complete ABI with view functions
- `reference-repos-for-tool/fishcake.io-telegram-bot/src/blockchain/decoder.ts` → Event decoding patterns
- `reference-repos-for-tool/fishcake.io-telegram-bot/src/config/index.ts` → Config constants

---

## Table of Contents

### 🔧 PART A: SETUP & FOUNDATION
1. [Contract Addresses & ABIs](#1-contract-addresses--abis)
2. [Wallet Connection Flow](#2-wallet-connection-flow)
3. [Token Decimals & Formatting](#3-token-decimals--formatting)
4. [ERC-20 Approval Flow](#4-erc-20-approval-flow)
5. [Key Constants & Configuration](#22-key-constants--configuration)

### 🎯 PART B: ALL FEATURES (Every fishcake.io Function)
6. [Create Event](#5-feature-create-event)
7. [My Events (List + 3-State Status)](#6-feature-my-events)
8. [Event Detail View](#7-feature-event-detail-view)
9. [Event Detail — Button Logic](#32-event-detail--button-logic)
10. [Drop (Send Reward to Address)](#8-feature-drop)
11. [Batch Drop (Multiple Addresses)](#9-feature-batch-drop)
12. [Claim Reward / QR Code](#10-feature-claim-reward--qr-code)
13. [Finish Event (End + Refund + Mining)](#11-feature-finish-event)
14. [Drop History (Sent/Received)](#12-feature-drop-history)
15. [Drop Record Display Format](#30-drop-record-display-format-exact)
16. [Buy FCC Token (USDT ↔ FCC Swap)](#23-feature-buy-fcc-token-usdt--fcc-swap)
17. [Mint NFT (Basic & Pro)](#24-feature-mint-nft-basic--pro)
18. [Profile / Dashboard](#25-feature-profile--dashboard)
19. [Map View (Event Discovery)](#27-feature-map-view-event-discovery)
20. [Map Search & Filter Parameters](#31-map-search--filter-parameters)
21. [Redemption Pool (Time-Locked)](#29-feature-redemption-pool-time-locked)
22. [Mining Reward System](#13-mining-reward-system)
23. [NFT System (Affects Mining)](#14-nft-system)

### 📦 PART C: REFERENCE & IMPLEMENTATION
24. [Complete ABI (Copy-Paste Ready)](#16-complete-abi)
25. [TypeScript Interfaces (Data Shapes)](#19-typescript-interfaces-exact-data-shapes)
26. [Utility Functions](#20-utility-functions-from-fishcakeio-source)
27. [Complete API Endpoints](#21-complete-api-endpoints-all-discovered)
28. [Complete Fishcake dApp Page Map](#28-complete-fishcake-dapp-page-map)
29. [CLI Flow (Full Interactive Walkthrough)](#33-cli-flow-full-interactive-walkthrough)
30. [Recommended File Structure](#18-recommended-file-structure)

---

## 1. Contract Addresses & ABIs

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

### ⚠️ Dynamic Address Loading (How the Real Frontend Does It)

The frontend does NOT hardcode addresses. It fetches them from the backend API at startup:

```typescript
// From useContractInfo.ts — the frontend loads addresses at boot
const data = await fetch("/api/contract/info");
// Response: { FccToken, UsdtToken, NFTManager, FishcakeEventManager, 
//             DirectSalePool, InvestorSalePool, RedemptionPool }
```

**CLI behavior**: Use hardcoded addresses as fallback, but attempt to fetch from `/api/contract/info` on startup. If API is reachable → use dynamic addresses. If unreachable → use hardcoded.

**IMPORTANT naming quirk**: In the frontend code, `MERCHANT_MANAGER_CONTRACT_ADDRESS` maps to `data.FishcakeEventManager`. These are the SAME contract — the EventManager IS the "Merchant Manager".

Source: `reference-repos-for-tool/fishcake-web3-main/src/hooks/useContractInfo.ts`

### RPC & Explorer

```
RPC URL:    https://polygon-rpc.com
Chain ID:   137
Explorer:   https://polygonscan.com
Backend:    /api (port 8189)
```

---

## 2. Wallet Connection Flow

The CLI has no browser wallet. Use **private key import + AES-256-GCM encryption**.

### First-Time Setup

```
1. User enters private key (or mnemonic)
2. User sets a passphrase
3. CLI encrypts private key:
   a. SHA-256(passphrase) → 32-byte AES key
   b. Generate random 12-byte nonce
   c. AES-256-GCM encrypt(privateKey, aesKey, nonce) → ciphertext
   d. Save { ciphertext, nonce } to keystore file
4. Never store raw private key on disk
```

### Every Run After

```
1. User enters passphrase
2. CLI reads keystore file
3. Decrypt: AES-256-GCM open(ciphertext, SHA-256(passphrase), nonce)
4. Derive wallet address from ECDSA public key
5. Display:
   ✅ Wallet Connected
   Address: 0xABCD...1234
   Network: Polygon (137)
```

Source: `fishcake-service-main/service/reward_service/reward_service.go` — this is exactly how the production backend handles keys.

---

## 3. Token Decimals & Formatting

> ⚠️ **CRITICAL**: Both FCC and USDT use **6 decimals**, NOT 18.

### Token Lookup

```typescript
const TOKENS = {
    '0x84eBc138F4Ab844A3050a6059763D269dC9951c6': { symbol: 'FCC',  decimals: 6 },
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': { symbol: 'USDT', decimals: 6 },
};
```

### Conversion Functions

```typescript
// Human-readable → on-chain value
function toWei(amount: string, decimals: number = 6): bigint {
    return ethers.parseUnits(amount, decimals);  // "10.5" → 10500000n
}

// On-chain value → human-readable
function fromWei(amount: bigint, decimals: number = 6): string {
    return ethers.formatUnits(amount, decimals);  // 10500000n → "10.5"
}
```

Source: `fishcake-web3-main/src/services/contract/contract.ts` line 18-19: `FCC_DECIMALS = 6; USDT_DECIMALS = 6`

---

## 4. ERC-20 Approval Flow

Before creating an event, the user's wallet MUST approve the FishcakeEventManager contract to spend their tokens.

### Check Current Allowance

```typescript
const allowance = await tokenContract.allowance(walletAddress, FISHCAKE_EVENT_MANAGER);
// If allowance >= totalDropAmts → skip approval
// If allowance < totalDropAmts → need approval TX first
```

### Send Approval Transaction

```typescript
const approveTx = await tokenContract.approve(
    FISHCAKE_EVENT_MANAGER,  // spender
    totalDropAmts             // amount in 6-decimal wei
);
await approveTx.wait();  // Wait for confirmation
```

Source: `fishcake-web3-main/src/hooks/useIsContractApproved.ts` — calls `allowance(owner, spender)`
Source: `fishcake-web3-main/src/components/global/CreateEventTransaction/CreateEventContainer.tsx` lines 66-73

---

## 5. FEATURE: Create Event

### What the User Inputs

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

### How `_activityContent` is Built

The description field is a **JSON string**, not plain text:

```typescript
const activityContent = JSON.stringify({
    activityContentDescription: "Buy coffee, get FCC!",
    activityContentAddress: "123 Main St, NYC",
    activityContentLink: "https://mycoffee.shop",
    eventStartTime: "2026-04-05T09:00:00.000Z",
    eventEndTime: "2026-04-15T09:00:00.000Z",
});
```

Source: `fishcake-web3-main/src/pages/create-event/components/EventCreateForm.tsx` lines 211-218

### How `_latitudeLongitude` is Built

```typescript
const latitudeLongitude = `${lat},${lng}`;  // e.g. "40.7128,-74.0060"
```

### Budget Calculation

```
totalDropAmts = maxReward × dropNumber
// Example: 10 FCC per drop × 50 drops = 500 FCC total budget
// In wei: 10_000_000 × 50 = 500_000_000
```

### Validation Rules (8 checks, all MUST pass)

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

Source: `fishcake-contracts-main/src/contracts/core/FishcakeEventManagerV2.sol` activityAdd()

### Complete Transaction Flow

```
STEP 1: Validate all inputs locally (8 rules above)
STEP 2: Check token balance >= totalDropAmts
STEP 3: Check allowance — call tokenContract.allowance(wallet, EventManager)
STEP 4: If allowance < totalDropAmts → send approve(EventManager, totalDropAmts)
STEP 5: Wait for approval TX confirmation
STEP 6: Send activityAdd() with 10 parameters
STEP 7: Wait for TX confirmation
STEP 8: Parse return value → get activityId
STEP 9: Display: "✅ Event #3319 created! TX: 0x..."
```

### The Contract Call

```typescript
const tx = await fishcakeEventManager.activityAdd(
    businessName,           // "Coffee Shop Promo"
    activityContent,        // JSON string (see above)
    latitudeLongitude,      // "40.7128,-74.0060"
    deadlineTimestamp,       // 1713200000 (unix seconds)
    totalDropAmts,           // 500_000_000n (500 FCC in 6-dec wei)
    dropType,                // 1 (Even) or 2 (Random)
    dropNumber,              // 50
    minDropAmt,              // 0n (for Even) or min in 6-dec wei
    maxDropAmt,              // 10_000_000n (10 FCC in 6-dec wei)
    tokenContractAddr        // FCC or USDT address
);
const receipt = await tx.wait();
// activityId is auto-assigned: activityInfoArrs.length + 1
```

---

## 6. FEATURE: My Events

### API Call

```typescript
const response = await fetch(`/api/activity/list?` + new URLSearchParams({
    pageNum: "1",
    pageSize: "50",
    businessAccount: walletAddress,   // Filter by connected wallet
    activityStatus: "1",              // 1=active, 2=finished, 3=expired
}));
const { items, count } = await response.json().then(r => r.obj);
```

Source: `fishcake-web3-main/src/services/modules/activities.ts`

### Three-State Event Status Model

```
STATUS 1 (Active):   activity_status = 1 AND deadline > now
STATUS 2 (Finished): activity_status = 2 (owner called activityFinish)
STATUS 3 (Expired):  activity_status = 1 AND deadline < now (timed out, never finished)
```

Source: `fishcake-service-main/database/activity/activity_info.go` lines 419-430

### CLI Display

```
╔══════════════════════════════════════════════════╗
║  📋 MY EVENTS                                    ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  ✅ ACTIVE EVENTS                                ║
║  ├─ #3319 Coffee Shop FCC Drop                   ║
║  │  Token: FCC │ Drops: 45/100 │ Expires: 2d 5h ║
║  │  Budget: 1000 FCC │ Spent: 450 FCC            ║
║  └─ #3320 Birthday Giveaway                      ║
║     Token: USDT │ Drops: 2/50 │ Expires: 15d 3h ║
║                                                  ║
║  ⏰ EXPIRED (can still finish to get refund)     ║
║  ├─ #3280 Old Promo                              ║
║  │  Drops: 10/20 │ Expired 3d ago                ║
║                                                  ║
║  🏁 FINISHED                                     ║
║  ├─ #3200 Launch Event                           ║
║  │  Drops: 100/100 │ Refund: 0 FCC │ Mined: 12.5 FCC ║
║  └─ #3150 Test Drop                              ║
║     Drops: 5/10 │ Refund: 50 FCC │ Mined: 0 FCC ║
╚══════════════════════════════════════════════════╝
```

---

## 7. FEATURE: Event Detail View

### Reading Activity from Contract (On-chain)

```typescript
// activityInfoArrs is 0-indexed, activityId is 1-indexed
const baseInfo = await contract.activityInfoArrs(activityId - 1);
const extInfo  = await contract.activityInfoExtArrs(activityId - 1);
```

`baseInfo` returns:
```
activityId, businessAccount, businessName, activityContent,
latitudeLongitude, activityCreateTime, activityDeadLine,
dropType, dropNumber, minDropAmt, maxDropAmt, tokenContractAddr
```

`extInfo` returns:
```
activityId, alreadyDropAmts, alreadyDropNumber,
businessMinedAmt, businessMinedWithdrawedAmt, activityStatus
```

Source: `fishcake.io-telegram-bot/src/blockchain/abi.ts` lines 89-122

### What to Display

| Field | Value | Format |
|-------|-------|--------|
| Event ID | `baseInfo.activityId` | `#3319` |
| Campaign Name | `baseInfo.businessName` | Plain text |
| Description | `JSON.parse(baseInfo.activityContent).activityContentDescription` | Parsed from JSON |
| Address | `JSON.parse(baseInfo.activityContent).activityContentAddress` | If present |
| Link | `JSON.parse(baseInfo.activityContent).activityContentLink` | If present |
| Location | `baseInfo.latitudeLongitude` | "40.7128,-74.0060" |
| Created | `baseInfo.activityCreateTime` | Unix → formatted date |
| Deadline | `baseInfo.activityDeadLine` | Unix → formatted date |
| Token | Compare `baseInfo.tokenContractAddr` with FCC address | "FCC" or "USDT" |
| Drop Type | `baseInfo.dropType` | 1 = "Even/Fixed", 2 = "Random" |
| Total Budget | `fromWei(maxDropAmt * dropNumber)` | "500.00 FCC" |
| Drops Done | `extInfo.alreadyDropNumber` / `baseInfo.dropNumber` | "45/100" |
| Amount Dropped | `fromWei(extInfo.alreadyDropAmts)` | "450.00 FCC" |
| Status | `extInfo.activityStatus` + deadline check | "Active" / "Expired" / "Finished" |
| Owner | `baseInfo.businessAccount` | Wallet address |
| Refund | `fromWei(returnAmount)` | Only if finished |
| Mining Reward | `fromWei(minedAmount)` | Only if finished |

### Owner-Only Section (when wallet === businessAccount)

```
 ┌─ Merchant Event Tracker ─────────────────────┐
 │ Deposited:      -500.00 FCC  (tokens locked)  │
 │ Already Dropped: 450.00 FCC  (sent to users)  │
 │ Refunded:       +50.00 FCC   (after finish)   │
 │ Mining Reward:  +12.50 FCC   (after finish)   │
 └───────────────────────────────────────────────┘
```

Source: `fishcake-web3-main/src/pages/event/components/ActivityInfo.tsx` and `ActivityOwnerRewardInfo.tsx`

---

## 8. FEATURE: Drop (Send Reward to Address)

### What "Drop" Means

The event owner sends tokens from the event's budget to a specific wallet address.

### The Contract Call

```typescript
const tx = await fishcakeEventManager.drop(
    activityId,       // Which event (uint256)
    recipientAddress, // Who gets tokens (address)
    dropAmount        // How much in 6-dec wei (uint256)
);
```

### Pre-Drop Validation (MUST do before sending TX)

```typescript
// 1. Check: hasn't already received a drop from this event
const alreadyDropped = await contract.activityDroppedToAccount(activityId, recipient);
if (alreadyDropped) throw "This address already received a drop from this event";

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

// 6. Determine amount
let amount;
if (baseInfo.dropType === 1) {
    amount = baseInfo.maxDropAmt;  // Fixed: always maxDropAmt
} else {
    // Random: user specifies, must be between min and max
    if (userAmount < baseInfo.minDropAmt || userAmount > baseInfo.maxDropAmt)
        throw "Amount out of bounds";
    amount = userAmount;
}
```

### What Happens On-Chain After Drop

```
1. Tokens transferred from contract → recipient
2. Recipient marked as "already dropped" (no duplicate drops)
3. alreadyDropAmts += dropAmount
4. alreadyDropNumber += 1
5. Emits Drop(ownerAddress, activityId, dropAmount) event
```

Source: `fishcake-contracts-main/src/contracts/core/FishcakeEventManagerV2.sol` drop()

---

## 9. FEATURE: Batch Drop (Multiple Addresses)

The contract only accepts **one address per `drop()` call**. For batch drops, loop:

```typescript
async function batchDrop(activityId: number, recipients: string[], amounts: bigint[]) {
    const results = [];
    for (let i = 0; i < recipients.length; i++) {
        try {
            // Pre-check each recipient
            const alreadyDropped = await contract.activityDroppedToAccount(
                activityId, recipients[i]
            );
            if (alreadyDropped) {
                results.push({ address: recipients[i], status: "SKIPPED", reason: "Already dropped" });
                continue;
            }

            const tx = await contract.drop(activityId, recipients[i], amounts[i]);
            const receipt = await tx.wait();
            results.push({
                address: recipients[i],
                status: "SUCCESS",
                txHash: receipt.hash,
                amount: fromWei(amounts[i])
            });
        } catch (err) {
            results.push({ address: recipients[i], status: "FAILED", reason: err.message });
        }
    }
    return results;  // Display as progress table
}
```

---

## 10. FEATURE: Claim Reward / QR Code

### How It Works on fishcake.io

1. **Visitor** opens an event page and clicks "Claim Rewards"
2. A QR code is generated containing the claim data
3. The **event owner** scans this QR with their Fishcake app
4. The owner's app calls `drop()` to send tokens to the visitor

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
// For random drops, amount is randomized between min and max
const randomReward = Math.random() * (maxDropAmt - minDropAmt) + minDropAmt;
const rewardAmt = randomReward.toFixed(2);
```

### Reward Display

```typescript
if (dropType === 1) {
    display = fromWei(maxDropAmt);             // "10.0 FCC"
} else {
    display = `${fromWei(minDropAmt)} - ${fromWei(maxDropAmt)}`;  // "5.0 - 15.0 FCC"
}
```

Source: `fishcake-web3-main/src/pages/event/components/ClaimDialog.tsx`

---

## 11. FEATURE: Finish Event (End + Refund + Mining)

### When to Use

- Owner wants to end an event early
- Event has expired and owner wants their unused tokens back
- Owner wants to claim mining rewards

### The Contract Call

```typescript
const tx = await fishcakeEventManager.activityFinish(activityId);
const receipt = await tx.wait();
// Parse ActivityFinish event from receipt logs
```

Single transaction, no approval needed.

Source: `fishcake-web3-main/src/components/global/FinishActivityTransaction/FinishActivityContainer.tsx`

### What the Contract Does

```
1. Verify caller is event owner (msg.sender == businessAccount)
2. Verify event not already finished (activityStatus == 1)
3. Set activityStatus = 2

4. Calculate refund:
   returnAmount = (maxDropAmt × dropNumber) - alreadyDropAmts

5. If returnAmount > 0:
   Transfer unused tokens back to owner

6. Calculate mining reward (if owner has valid NFT):
   effectiveValue = min(alreadyDropAmts, alreadyDropNumber × 20 × 1e6)
   miningReward = effectiveValue × minePercent / 100

7. Transfer mining reward (FCC from mining pool)

8. Emit: ActivityFinish(activityId, tokenAddr, returnAmount, minedAmount)
```

### What to Display After Finish

```
✅ Event #3319 finished!
TX: 0xabc...def

Summary:
├─ Total Budget:    500.00 FCC
├─ Drops Executed:  45 / 100
├─ Amount Dropped:  450.00 FCC
├─ Refunded:        +50.00 FCC  ← returned to your wallet
└─ Mining Reward:   +12.50 FCC  ← mined from FCC pool

View on Polygonscan: https://polygonscan.com/tx/0xabc...def
```

---

## 12. FEATURE: Drop History

### API Call

```typescript
const response = await fetch(`/api/drop/list?` + new URLSearchParams({
    pageNum: "1",
    pageSize: "100",
    address: walletAddress,
    dropType: "2",  // "1"=received, "2"=sent
}));
```

### On-Chain Query (Alternative)

```typescript
// Query Drop events for a specific activity
const filter = contract.filters.Drop(null, activityId);
const events = await contract.queryFilter(filter, fromBlock, toBlock);
// Each event has: who (business), activityId, dropAmt
```

Source: `fishcake-web3-main/src/services/modules/dropList.ts`

---

## 13. Mining Reward System

### How Mining Works

Mining rewards are earned when the event owner calls `activityFinish()`. The reward comes from a fixed FCC mining pool (300M FCC total).

### Mining Tier Table (4-tier halving)

| Total FCC Mined | Mine % (Pro NFT) | Mine % (Basic NFT) | Max Per Event (Merchant) |
|----------------|-------------------|---------------------|--------------------------|
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

- **Pro NFT holder**: Full mine percent → checked via `getMerchantNTFDeadline(address)`
- **Basic NFT holder**: Half mine percent → checked via `getUserNTFDeadline(address)`
- **No NFT**: No mining reward (minePercent = 0)
- **24-hour cooldown**: Each wallet can only mine once per 24 hours

Source: `fishcake-contracts-main/src/contracts/core/FishcakeEventManagerV2.sol` lines 200-310

---

## 14. NFT System (Affects Mining)

### NFT Types

| Type | Purpose | Contract Function | Effect |
|------|---------|-------------------|--------|
| Basic NFT | User membership | `getUserNTFDeadline(address)` | Half mining rate |
| Pro NFT | Merchant membership | `getMerchantNTFDeadline(address)` | Full mining rate |
| Booster NFT | Staking APR boost | `getMinerBoosterNftType(tokenId)` | Extra staking APR |

### Check NFT Status (for CLI display)

```typescript
const proDeadline = await nftManager.getMerchantNTFDeadline(walletAddress);
const basicDeadline = await nftManager.getUserNTFDeadline(walletAddress);
const now = Math.floor(Date.now() / 1000);

if (proDeadline > now) status = "Pro NFT (active)";
else if (basicDeadline > now) status = "Basic NFT (active)";
else status = "No NFT (mining disabled)";
```

Source: `fishcake-contracts-main/src/contracts/core/token/NftManagerV5.sol`

---

## 15. Backend API Endpoints

| Endpoint | Method | Purpose | Key Params |
|----------|--------|---------|------------|
| `/api/activity/list` | GET | List events | `pageNum, pageSize, businessAccount, activityStatus (1/2/3)` |
| `/api/activity/info` | GET | Event detail | `activityId` |
| `/api/drop/list` | GET | Drop history | `pageNum, pageSize, address, dropType (1=recv/2=sent)` |
| `/api/contract/info` | GET | Contract addresses | none |
| `/api/chain_info/balance` | GET | Wallet balance | `address` |
| `/api/nft/detail` | GET | NFT info | `address` |
| `/api/mining/record` | GET | Mining history | `address` |
| `/ping` | GET | Health check | none |

### API Response Format

All responses follow:
```json
{
    "code": 0,
    "msg": "success",
    "obj": { /* actual data */ }
}
```

### Contract Info Response (from `/api/contract/info`)

```json
{
    "FccToken": "0x84eBc138F4Ab844A3050a6059763D269dC9951c6",
    "UsdtToken": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    "FishcakeEventManager": "0x2CAf752814f244b3778e30c27051cc6B45CB1fc9",
    "NFTManager": "0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B",
    "RedemptionPool": "0x953E6DB14753552050B04a6393a827661bB4913a",
    "DirectSalePool": "0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE",
    "InvestorSalePool": "0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B"
}
```

Source: `fishcake-web3-main/src/hooks/useContractInfo.ts`

---

## 16. Complete ABI (Copy-Paste Ready)

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
            { "indexed": false, "name": "_totalDropAmts", "type": "uint256" },
            { "indexed": false, "name": "_businessName", "type": "string" },
            { "indexed": false, "name": "_activityContent", "type": "string" },
            { "indexed": false, "name": "_latitudeLongitude", "type": "string" },
            { "indexed": false, "name": "_activityDeadLine", "type": "uint256" },
            { "indexed": false, "name": "_dropType", "type": "uint8" },
            { "indexed": false, "name": "_dropNumber", "type": "uint256" },
            { "indexed": false, "name": "_minDropAmt", "type": "uint256" },
            { "indexed": false, "name": "_maxDropAmt", "type": "uint256" },
            { "indexed": false, "name": "_tokenContractAddr", "type": "address" }
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

### ERC-20 ABI (for approve + allowance)

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

Source: `fishcake.io-telegram-bot/src/blockchain/abi.ts` and `fishcake-web3-main/src/services/contract/contract.ts`

---

## 17. CLI Menu Structure

See Section 33 for the full interactive walkthrough with all screens. Summary:

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
║  │  15. Browse Events                      │       ║
║  └─────────────────────────────────────────┘       ║
║  0.  Exit                                          ║
╚════════════════════════════════════════════════════╝
```

---

## 18. Recommended File Structure

```
fishcake-cli/
├── package.json
├── tsconfig.json
├── .env                        # RPC_URL, CHAIN_ID, API_BASE_URL, KEYSTORE_PATH
├── .gitignore                  # node_modules, dist, keystore, .env
├── README.md
├── keystore/                   # gitignored — wallet.enc goes here
├── src/
│   ├── index.ts                # Entry point: keystore check → login → menu loop
│   ├── config/
│   │   ├── addresses.ts        # All 9 contract addresses (hardcoded + API fallback)
│   │   └── abis.ts             # All ABIs: EventManager, ERC20, NFTManager, SalePool
│   ├── types/
│   │   └── index.ts            # Activity, DropRecord, NFT, CreateEventParams, etc.
│   ├── wallet/
│   │   ├── keystore.ts         # AES-256-GCM encrypt/decrypt private key
│   │   └── connection.ts       # Ethers.js wallet + provider + getBalances
│   ├── blockchain/
│   │   ├── provider.ts         # JsonRpcProvider(RPC_URL)
│   │   ├── contracts.ts        # Contract instances for all 6 contracts
│   │   └── approval.ts         # checkAllowance + approveIfNeeded
│   ├── api/
│   │   ├── client.ts           # Generic fetch wrapper (GET → parse .obj)
│   │   └── endpoints.ts        # All 14 API functions (activity, drop, nft, mining)
│   ├── utils/
│   │   ├── format.ts           # toWei/fromWei (6 dec), tokenSymbol, formatBalance
│   │   ├── validate.ts         # 9 create-event rules + 6 pre-drop checks
│   │   ├── time.ts             # Unix ↔ date, timeRemaining, isExpired
│   │   └── content.ts          # Build/parse activityContent JSON
│   ├── cli/
│   │   ├── display.ts          # showHeader, showSpinner, showTable, showTxLink
│   │   ├── menu.ts             # Main menu loop (15 options)
│   │   └── prompts.ts          # All inquirer prompts (event form, address, etc.)
│   └── features/
│       ├── createEvent.ts      # 13-field form → validate → approve → activityAdd
│       ├── myEvents.ts         # Fetch + group by status → display table
│       ├── eventDetail.ts      # Read on-chain → parse JSON → display
│       ├── drop.ts             # 6 pre-checks → drop TX
│       ├── batchDrop.ts        # Loop addresses → skip already-dropped → progress
│       ├── claimQR.ts          # Build QR JSON → render in terminal
│       ├── finishEvent.ts      # activityFinish → parse receipt → show refund+mining
│       ├── dropHistory.ts      # Toggle received/sent → color-coded display
│       ├── buyFCC.ts           # Tier routing → approve → buy
│       ├── mintNFT.ts          # Form → approve USDT → createNFT
│       ├── dashboard.ts        # Balances + NFT list + mining status
│       ├── browseEvents.ts     # Filters + search → event list
│       └── redemptionInfo.ts   # Countdown timer + pool info
```

**Total: 27 source files + 4 config files = 31 files**

---

## 19. TypeScript Interfaces (Exact Data Shapes)

These are the exact types from `fishcake-web3-main/src/utils/fishcakeType.ts`:

### Activity (Event) Type

```typescript
interface Activity {
    id: string;                    // UUID from backend
    activityId: number;            // On-chain ID (1-indexed)
    businessAccount: string;       // Owner wallet address
    businessName: string;          // Campaign name
    activityContent: string;       // JSON string (see Section 5)
    latitudeLongitude: string;     // "lat,lng"
    activityCreateTime: number;    // Unix timestamp
    activityDeadline: number;      // Unix timestamp
    dropType: number;              // 1=Even, 2=Random
    dropNumber: number;            // Total drop slots
    minDropAmt: number;            // In 6-decimal wei
    maxDropAmt: number;            // In 6-decimal wei
    tokenContractAddr: string;     // FCC or USDT address
    activityStatus: number;        // 1=ongoing, 2=finished
    alreadyDropNumber: number;     // Drops executed so far
    basicDeadline: number;         // Basic NFT expiry (0 if none)
    proDeadline: number;           // Pro NFT expiry (0 if none)
    returnAmount: number;          // Tokens refunded after finish
    minedAmount: number;           // Mining reward after finish
}
```

### Drop Record Type

```typescript
interface DropRecord {
    id: string;
    activityId: number;
    address: string;               // Recipient address
    dropAmount: number;            // In 6-decimal wei
    dropType: number;              // 1=user drop, 2=system drop
    timestamp: number;             // Unix timestamp
    tokenContractAddr: string;
    businessName: string;          // Event name
    transactionHash: string;       // TX hash on Polygonscan
    eventSignature: string;        // Solidity event signature
    returnAmount: number;          // For activity_finish drops
    minedAmount: number;           // For activity_finish drops
}
```

### NFT Type

```typescript
interface NFT {
    id: string;
    who: string;                   // Owner wallet
    tokenId: number;               // NFT token ID
    businessName: string;
    description: string;
    imgUrl: string;
    businessAddress: string;
    webSite: string;
    social: string;
    contractAddress: string;
    costValue: number;             // Price paid (in wei)
    deadline: number;              // Expiry unix timestamp
    nftType: number;               // 1=Pro, 2=Basic
}
```

---

## 20. Utility Functions (From fishcake.io Source)

### Parse Activity Content (description is JSON)

```typescript
function parseActivityContent(content: string): string {
    try {
        const parsed = JSON.parse(content);
        if (parsed?.activityContentDescription) {
            return parsed.activityContentDescription;
        }
    } catch {}
    return content;  // Fallback: return raw string for old events
}

function parseActivityContentMore(content: string): {
    activityContentDescription?: string;
    activityContentAddress?: string;
    activityContentLink?: string;
} {
    try {
        const parsed = JSON.parse(content);
        return {
            activityContentDescription: parsed.activityContentDescription,
            activityContentAddress: parsed.activityContentAddress,
            activityContentLink: parsed.activityContentLink,
        };
    } catch {}
    return {};
}
```

Source: `fishcake-web3-main/src/utils/fishcake.ts`

### Determine NFT Badge

```typescript
function determinePinSource(activity: Activity): "pro" | "basic" | "activity" {
    if (activity.proDeadline > 0) return "pro";
    if (activity.basicDeadline > 0) return "basic";
    return "activity";  // No NFT
}
```

### NFT Pricing

```typescript
const NFT_COST = {
    basic: { type: 2, amount: 8 },    // 8 USDT for Basic NFT
    pro:   { type: 1, amount: 80 },   // 80 USDT for Pro NFT
};
```

### Activity Status Filters

```typescript
const STATUS_FILTERS = {
    all:      { text: "All",     value: 0 },
    ongoing:  { text: "Ongoing", value: 1 },  // Active events
    ended:    { text: "Ended",   value: 2 },  // Finished events
    // Note: Expired = status 3 in backend (status=1 but deadline passed)
};
```

### Token Filters

```typescript
const TOKEN_FILTERS = {
    all:  { text: "All Token", value: 0 },
    fcc:  { text: "FCC",       value: 1 },
    usdt: { text: "USDT",      value: 2 },
};
```

### Format Balance

```typescript
function formatBalance(balance: string | undefined): string {
    if (!balance) return "0";
    const formatted = parseFloat(balance).toFixed(10);
    const trimmed = formatted.replace(/\.?0+$/, "");
    return trimmed.replace(/(\.\d{2})\d+/, "$1");  // Keep 2 decimal places
}
```

---

## 21. Complete API Endpoints (All Discovered)

From all `fishcake-web3-main/src/services/modules/*.ts` files and `fishcake-service-main/fishcake.go`:

| Endpoint | Method | Purpose | Key Params |
|----------|--------|---------|------------|
| `/api/activity/list` | GET | List events (with filters) | `pageNum, pageSize, businessAccount, activityStatus, tokenContractAddr, activityFilter, businessName, activityId` |
| `/api/activity/info` | GET | Single event detail | `activityId` |
| `/api/drop/list` | GET | Drop history (sent/received) | `pageNum, pageSize, address, dropType` |
| `/api/contract/info` | GET | All contract addresses | — |
| `/api/chain_info/balance` | GET | Wallet balance (POL) | `address` |
| `/api/nft/list` | GET | List NFTs for a wallet | `pageNum, pageSize, contractAddress, address` |
| `/api/nft/detail` | GET | NFT detail for address | `businessAccount, deadline` |
| `/api/nft/nft_count` | GET | Total NFT count | — |
| `/api/nft/transaction_count` | GET | Total TX count | — |
| `/api/mining/record` | GET | Mining history | `address` |
| `/api/mining/rank` | GET | Mining leaderboard | `monthFilter` |
| `/api/mining/user_mined` | GET | User's mined amount | `address, month` |
| `/api/mining/user_info` | GET | User's mining info | `address` |
| `/ping` | GET | Health check | — |

### Activity List Filter Details

```
activityStatus:
  1 = Active (status=1 AND deadline > now)
  2 = Finished (status=2)
  3 = Expired (status=1 AND deadline < now)

activityFilter:
  1 = Pro NFT holders only
  2 = Basic NFT holders only

businessAccount: Filter by owner wallet (case-insensitive)
tokenContractAddr: Filter by FCC or USDT address
businessName: Search by campaign name (partial match)
activityId: Filter by specific event ID
```

### Drop List dropType Parameter

```
dropType:
  1 = Received drops (this address was the recipient)
  2 = Sent drops (this address was the event owner who dropped)
```

---

## 22. Key Constants & Configuration

### From Smart Contract

```
MAX_DEADLINE        = 2,592,000 seconds (30 days)
MIN_TOTAL_DROP      = 1,000,000 (1 FCC/USDT in 6-dec wei)
MAX_DROP_COUNT_CAP  = 100 (if over 100, must satisfy: dropNumber <= totalDrop / 1e6)
MINING_POOL_TOTAL   = 300,000,000 × 1e6 (300M FCC)
MINING_COOLDOWN     = 86,400 seconds (24 hours)
```

### From Backend Config

```yaml
chain_id: 137
rpc_url: "https://polygon-rpc.com"
start_block: 78801000       # Synchronizer start block
event_start_block: 80400000 # Event processor start block
api_port: 8189
```

### From Telegram Bot

```typescript
const config = {
    contractAddress: "0x2CAf752814f244b3778e30c27051cc6B45CB1fc9",
    rpcUrl: "https://polygon-rpc.com",
    chainId: 137,
    explorerUrl: "https://polygonscan.com",
    pollingInterval: 15000,  // 15 seconds between block checks
};
```

Source: `fishcake.io-telegram-bot/src/config/index.ts`

---

## 23. FEATURE: Buy FCC Token (USDT ↔ FCC Swap)

### What This Does

Users can buy FCC using USDT (or sell FCC back). The price follows a **5-tier system** that gives better rates for larger purchases.

### Tier Pricing (USDT → FCC)

| Tier | USDT Range | Rate | Example |
|------|-----------|------|---------|
| Regular | < 1,000 USDT | 1 USDT = 10 FCC | 500 USDT → 5,000 FCC |
| Tier 4 | 1,000 – 4,999 USDT | 1 USDT = 11.11 FCC | 2,000 USDT → 22,220 FCC |
| Tier 3 | 5,000 – 9,999 USDT | 1 USDT = 12.50 FCC | 7,000 USDT → 87,500 FCC |
| Tier 2 | 10,000 – 99,999 USDT | 1 USDT = 14.28 FCC | 50,000 USDT → 714,000 FCC |
| Tier 1 | 100,000+ USDT | 1 USDT = 16.66 FCC | 100,000 USDT → 1,666,000 FCC |

### Tier Pricing (FCC → USDT)

| Tier | FCC Range | Rate |
|------|----------|------|
| Regular | < 16,666 FCC | 1 FCC = 0.10 USDT |
| Tier 4 | 16,666 – 999,999 FCC | 1 FCC = 0.09 USDT |
| Tier 3 | 100,000 – 249,999 FCC | 1 FCC = 0.08 USDT |
| Tier 2 | 250,000 – 4,999,999 FCC | 1 FCC = 0.07 USDT |
| Tier 1 | 5,000,000+ FCC | 1 FCC = 0.06 USDT |

### Contract Routing Logic

The frontend routes to **different contracts** based on amount:

```typescript
// From BuyTokenContainer.tsx lines 76-118
if (isBuyWithUSDT) {
    if (usdtAmount < 1000) {
        // Regular price → DirectSalePool
        contract = DirectSalePool;
        function = "buyFccByUsdtAmount";
        args = [usdtAmount * 1e6];   // 6 decimals
    } else {
        // Tiered price → InvestorSalePool
        contract = InvestorSalePool;
        function = "buyFccByUsdtAmount";
        args = [usdtAmount * 1e6];
    }
} else {
    if (fccAmount < 16666) {
        contract = DirectSalePool;
        function = "buyFccAmount";
        args = [fccAmount * 1e6];
    } else {
        contract = InvestorSalePool;
        function = "buyFccAmount";
        args = [fccAmount * 1e6];
    }
}
```

### Contract Addresses

```
DirectSalePool:     0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE
InvestorSalePool:   0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B
```

### Transaction Flow

```
1. User enters USDT or FCC amount
2. Frontend calculates output via contract view function:
   calculateFccByUsdtExternal(amount) or calculateUsdtByFccExternal(amount)
3. Check USDT allowance for the target pool contract
4. If not approved → approve(poolAddress, amount)
5. Wait for approval TX
6. Call buyFccByUsdtAmount(amount) or buyFccAmount(amount)
7. Wait for TX confirmation
```

Source: `fishcake-web3-main/src/pages/buy-token/components/NftCreateForm.tsx` and `BuyTokenContainer.tsx`

---

## 24. FEATURE: Mint NFT (Basic & Pro)

### NFT Types and Pricing

| Type | Cost | Contract Function | Form Fields |
|------|------|-------------------|-------------|
| **Basic NFT** | 8 USDT | `createNFT(..., type: 2)` | Business Name, Description, Social |
| **Pro NFT** | 80 USDT | `createNFT(..., type: 1)` | Business Name, Description, Business Address, Website, Social |

### Pro NFT Form Fields

```typescript
// From mint-pro-nft/components/NftCreateForm.tsx
const formFields = {
    name: "",          // Business Name (required)
    bio: "",           // Description (required)
    address: "",       // Business Address (required for Pro)
    webSite: "",       // Website (required for Pro)
    social: "",        // Social media (required)
};
```

### Basic NFT Form Fields

```typescript
// From mint-basic-nft: same structure but address + webSite NOT required
const formFields = {
    name: "",          // Business Name (required)
    bio: "",           // Description (required)
    social: "",        // Social media (required)
};
```

### The Contract Call

```typescript
// From MintNFTContainer.tsx
const createNFTConfig = {
    address: NFT_MANAGER_CONTRACT_ADDRESS,
    abi: abiNFTManager,
    functionName: "createNFT",
    args: [
        businessName,        // string
        description,         // string
        imgUrl,              // string (empty string "")
        businessAddress,     // string (empty for Basic)
        webSite,             // string (empty for Basic)
        social,              // string
        type,                // 1 = Pro, 2 = Basic
    ],
};
```

### Transaction Flow

```
1. User fills form (name, description, social, [address, website for Pro])
2. Check USDT allowance for NFTManager contract
3. If not approved → approve(NFTManager, 8/80 USDT in 6-dec wei)
4. Wait for approval TX
5. Call createNFT(name, desc, "", address, website, social, type)
6. Wait for TX confirmation
7. NFT is minted with 1-year validity period
```

### Validation (from MintNFTContainer.tsx)

```typescript
mintNFTDisabled =
    businessName === "" ||
    description === "" ||
    social === "" ||
    (type === 1 && (businessAddress === "" || webSite === ""));
// Pro requires address + website, Basic doesn't
```

Source: `fishcake-web3-main/src/components/global/MintNFTTransaction/MintNFTContainer.tsx`

---

## 25. FEATURE: Profile / Dashboard

### What the Profile Page Shows

The profile page has 3 sections:

#### Section 1: NFT List (horizontal carousel)

```typescript
// API call:
const nftList = await fetch(`/api/nft/list?` + new URLSearchParams({
    pageNum: "1",
    pageSize: "100",
    contractAddress: NFT_MANAGER_CONTRACT_ADDRESS,
    address: walletAddress,
}));
```

Each NFT card displays:
- NFT badge icon (Pro = gold, Basic = silver)
- Business Name
- Type label ("Pro" or "Basic")

Click an NFT to see modal with:
- Business Name, Description
- Business Address (Pro only), Website (Pro only)
- Social
- Valid Until: formatted deadline
- "View in explorer" link → Polygonscan

#### Section 2: Current Balance

```typescript
// API call:
const balances = await fetch(`/api/chain_info/balance?address=${walletAddress}`);
// Returns: { usdt_balance, fcc_balance, pol_balance }
```

Displayed as:
```
┌─ Current Balance ──────────────────┐
│  USDT    125.50                     │
│  FCC     10,234.00                  │
│  POL     3.45                       │
└─────────────────────────────────────┘
```

**Important formatting:**
- USDT: `ethers.formatUnits(usdt_balance, 6)` → 6 decimals
- FCC: `ethers.formatUnits(fcc_balance, 6)` → 6 decimals
- POL: `ethers.formatUnits(pol_balance, 18)` → **18 decimals** (native token!)

#### Section 3: Mining Dashboard

Shows the user's mining stats and participation history.

Source: `fishcake-web3-main/src/pages/profile/components/BalanceTable.tsx` and `NFTList.tsx`

---

## 26. FEATURE: Received / Sent Drops History

### What This Shows

Two separate views:
- **Received**: Drops where the user was the recipient
- **Drop List** (Sent): Drops the user sent as an event owner

### API Call

```typescript
// Received drops:
const received = await fetch(`/api/drop/list?` + new URLSearchParams({
    pageNum: "1",
    pageSize: "50",
    address: walletAddress,
    dropType: "1",        // 1 = received
}));

// Sent drops:
const sent = await fetch(`/api/drop/list?` + new URLSearchParams({
    pageNum: "1",
    pageSize: "50",
    address: walletAddress,
    dropType: "2",        // 2 = sent
}));
```

### Each Drop Record Shows

| Field | Source | Format |
|-------|--------|--------|
| Event Name | `drop.businessName` | Text |
| Amount | `drop.dropAmount` | Formatted with 6 decimals |
| Token | `drop.tokenContractAddr` | "FCC" or "USDT" |
| Recipient | `drop.address` | 0x... |
| Date | `drop.timestamp` | Formatted |
| TX Hash | `drop.transactionHash` | Link to Polygonscan |

Source: `fishcake-web3-main/src/pages/received/` and `src/services/modules/recevied.ts`

---

## 27. FEATURE: Map View (Event Discovery)

### What This Does

Shows all active events on an interactive map. Each event pin is color-coded by NFT type.

### Pin Types

```typescript
function determinePinSource(activity): "pro" | "basic" | "activity" {
    if (activity.proDeadline > 0) return "pro";      // Gold pin
    if (activity.basicDeadline > 0) return "basic";   // Silver pin
    return "activity";                                 // Regular pin
}
```

### Map Data

Each event's location comes from `latitudeLongitude` field (comma-separated string):
```typescript
const [lat, lng] = activity.latitudeLongitude.split(",").map(Number);
// Render pin at { lat, lng }
```

Click a pin → navigate to event detail page.

Source: `fishcake-web3-main/src/pages/map/` and `fishcake-web3-main/src/utils/fishcake.ts`

---

## 28. Complete Fishcake dApp Page Map

Every page/route in the fishcake.io web app and what it maps to in the CLI:

| Web Route | Page | CLI Menu Option | Status in Doc |
|-----------|------|----------------|---------------|
| `/` | Home / Event List | My Events → Event list | ✅ Section 6 |
| `/create-event` | Create Event form | Create Event | ✅ Section 5 |
| `/event/[id]` | Event Detail + Claim/Drop/Finish | Event Detail / Drop / Finish | ✅ Sections 7, 8, 10, 11 |
| `/buy-token` | Buy FCC with USDT | Buy FCC | ✅ Section 23 |
| `/mint-basic-nft` | Mint Basic NFT (8 USDT) | Mint NFT | ✅ Section 24 |
| `/mint-pro-nft` | Mint Pro NFT (80 USDT) | Mint NFT | ✅ Section 24 |
| `/profile` | Balance + NFT list + Mining | Dashboard | ✅ Section 25 |
| `/received` | Drops received by user | Received Drops | ✅ Section 26 |
| `/drop-list` | Drops sent by user | Sent Drops | ✅ Section 26 |
| `/map` | Map view of events | Map View | ✅ Section 27 |
| `/redemption-pool` | FCC redemption/burn | Redemption | ✅ Section 23 (uses same pool) |
| `/download` | Mobile app download links | N/A (CLI only) | — |

### Updated CLI Menu (All Features)

```
┌──────────────────────────────────────────┐
│  🐟 Fishcake CLI Tool v1.0               │
│  ✅ Wallet: 0xABCD...1234                │
│  🔗 Network: Polygon (137)               │
│  💰 FCC: 10,234.00 │ USDT: 125.50        │
├──────────────────────────────────────────┤
│                                          │
│  EVENT MANAGEMENT                        │
│  ─────────────────                       │
│  1.  Create Event                        │
│  2.  My Events (Active/Expired/Finished) │
│  3.  Event Detail (by ID)                │
│  4.  Finish Event                        │
│                                          │
│  DROP & REWARD                           │
│  ─────────────────                       │
│  5.  Drop Reward (to address)            │
│  6.  Batch Drop (multiple addresses)     │
│  7.  Generate Claim QR Code             │
│  8.  Drop History (sent/received)        │
│                                          │
│  TOKEN & NFT                             │
│  ─────────────────                       │
│  9.  Buy FCC (USDT → FCC)               │
│  10. Sell FCC (FCC → USDT)              │
│  11. Mint Basic NFT (8 USDT)            │
│  12. Mint Pro NFT (80 USDT)             │
│                                          │
│  ACCOUNT                                 │
│  ─────────────────                       │
│  13. Dashboard (Balance + NFTs)          │
│  14. Mining Status & History             │
│  15. Map View (Browse Events)            │
│                                          │
│  0.  Exit                                │
│                                          │
└──────────────────────────────────────────┘
```

---

## 29. FEATURE: Redemption Pool (Time-Locked)

The Redemption Pool is **currently time-locked** and will unlock at a future date.

### Unlock Date

```typescript
// From redemption-pool/components/Info.tsx
const unlockTimestamp = 1820399835;  // Unix seconds
// = approximately year 2027
// Shows countdown: "Redemption Pool Unlock on X days Y hours..."
```

### What It Does (when unlocked)

Users will be able to burn FCC tokens and redeem USDT from the pool. The pool address is:

```
RedemptionPool: 0x953E6DB14753552050B04a6393a827661bB4913a
```

### CLI Display

```
⏰ Redemption Pool is LOCKED
   Unlocks on: March 15, 2027 (in 341 days)
   Pool Address: 0x953E...B18cE
```

Source: `fishcake-web3-main/src/pages/redemption-pool/components/Info.tsx`

---

## 30. Drop Record Display Format (Exact)

### Visual Format (from RecordsList.tsx)

```
Received drops (+green):
  ☑ Coffee Shop FCC Drop
    Jan 15, 2026                              +10.00 FCC

  ☑ Birthday Giveaway
    Jan 20, 2026                              +5.50 USDT

Sent drops (-red):
  ☐ Coffee Shop FCC Drop
    Jan 15, 2026                              -10.00 FCC
```

### Color Coding

```typescript
// From RecordsList.tsx line 52-56
isReceived ? "text-[#67a83f]" : "text-[#f44336]"
//           green (received)    red (sent)

// Prefix:
isReceived ? "+" : "-"
```

### Toggle & Sort (from received/index.tsx)

```
[Received | Sent]     ← SwitchButton toggle (sets dropType 1 or 2)
Total: 45             ← from API response data.total
[Newest ↕ Oldest]     ← client-side sort (reverse array)
```

Source: `fishcake-web3-main/src/pages/received/components/RecordsList.tsx`

---

## 31. Map Search & Filter Parameters

### Filters Available

```typescript
// From map/index.tsx lines 44-81
const params = {
    pageNum: 1,
    pageSize: 100,
};

// Activity Status Filter (optional):
if (activityStatus !== 0) params.activityStatus = activityStatus;
// 0=All, 1=Ongoing, 2=Ended

// NFT Type Filter (optional):
if (activityTypeSelect !== 0) params.activityFilter = activityTypeSelect;
// 0=All, 1=Pro, 2=Basic

// Token Filter (optional):
if (tokenSelectStatus !== 0) {
    params.tokenContractAddr = (tokenSelectStatus === 1)
        ? FCC_TOKEN_ADDRESS
        : USDT_TOKEN_ADDRESS;
}

// Search (optional):
if (searchText !== "") {
    if (searchType === "id")    params.activityId = searchText;
    if (searchType === "event") params.businessName = searchText;
}
```

### Search Modes

```
[Event Name ▼] [Search...] 
  - "Event Name" → searches by businessName (partial match)
  - "Event ID"   → searches by activityId (exact match)
```

Source: `fishcake-web3-main/src/pages/map/index.tsx`

---

## 32. Event Detail — Button Logic

The event detail page shows **different buttons** depending on who is viewing and event status.

### Decision Tree (from ClaimButton.tsx)

```
IS EVENT ENDED? (deadline passed OR activityStatus === 2)
├── YES → Show: [Finished] (disabled, gray button)
│
└── NO → IS VIEWER THE OWNER? (wallet === businessAccount)
    ├── YES → Show: [End The Event] → calls activityFinish()
    │
    └── NO → IS VIEWER CONNECTED?
        ├── YES → Show: [Claim Rewards] → opens QR dialog with viewer's address
        │
        └── NO → Show: [Claim Rewards] → opens address input dialog first
                  → user pastes wallet address
                  → then opens QR dialog with entered address
```

### Implementation

```typescript
// From ClaimButton.tsx lines 14-21
const isOwner = address?.toLowerCase() === activity?.businessAccount?.toLowerCase();
const isEventEnded = (
    new Date((activity?.activityDeadline || 0) * 1000) < new Date() ||
    activity?.activityStatus === 2
);

if (isEventEnded) {
    render(<Button disabled>Finished</Button>);
} else if (isOwner) {
    render(<FinishActivityContainer activityId={activity.activityId}>End The Event</FinishActivityContainer>);
} else {
    render(<Button onClick={openClaimDialog}>Claim Rewards</Button>);
}
```

### QR Dialog: Token Type Detection

```typescript
// From ClaimDialog.tsx lines 79-89
if (activity.tokenContractAddr.toUpperCase() === FCC_TOKEN_ADDRESS.toUpperCase()) {
    tokenType = 1;  // FCC
} else {
    tokenType = 2;  // USDT
}
```

Source: `fishcake-web3-main/src/pages/event/components/ClaimButton.tsx` and `ClaimDialog.tsx`

---

## 33. CLI Flow (Full Interactive Walkthrough)

### Screen 1: First Run (No Keystore)

```
╔════════════════════════════════════════════════════╗
║                                                    ║
║   🐟  F I S H C A K E   C L I   T O O L          ║
║         v1.0 — Polygon Mainnet                     ║
║                                                    ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║   No wallet found.                                 ║
║                                                    ║
║   1. Import Private Key                            ║
║   2. Import Mnemonic Phrase                         ║
║   3. Exit                                           ║
║                                                    ║
╚════════════════════════════════════════════════════╝
> 1

Enter your private key: ••••••••••••••••••••••••
Set a passphrase: ••••••••
Confirm passphrase: ••••••••

✅ Wallet encrypted & saved!
   Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18
   Keystore: ./keystore/wallet.enc
```

### Screen 2: Login (Has Keystore)

```
╔════════════════════════════════════════════════════╗
║   🐟  F I S H C A K E   C L I   T O O L          ║
╠════════════════════════════════════════════════════╣
║   Keystore found: ./keystore/wallet.enc            ║
║   Enter passphrase: ••••••••                       ║
╠════════════════════════════════════════════════════╣
║   ✅ Wallet Connected                              ║
║   Address:  0x742d...bD18                          ║
║   Network:  Polygon (137)                          ║
║   FCC:      10,234.00                              ║
║   USDT:     125.50                                 ║
║   POL:      3.45                                   ║
╚════════════════════════════════════════════════════╝
```

### Screen 3: Main Menu

```
╔════════════════════════════════════════════════════╗
║  🐟 Fishcake CLI Tool v1.0                        ║
║  ✅ 0x742d...bD18 │ 🔗 Polygon │ 💰 10,234 FCC   ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  ┌─ EVENT MANAGEMENT ──────────────────────┐       ║
║  │  1.  Create Event                       │       ║
║  │  2.  My Events                          │       ║
║  │  3.  Event Detail (by ID)               │       ║
║  │  4.  Finish Event                       │       ║
║  └─────────────────────────────────────────┘       ║
║                                                    ║
║  ┌─ DROP & REWARD ─────────────────────────┐       ║
║  │  5.  Drop Reward (single address)       │       ║
║  │  6.  Batch Drop (CSV / multi)           │       ║
║  │  7.  Generate Claim QR Code             │       ║
║  │  8.  Drop History                       │       ║
║  └─────────────────────────────────────────┘       ║
║                                                    ║
║  ┌─ TOKEN & NFT ───────────────────────────┐       ║
║  │  9.  Buy FCC (USDT → FCC)              │       ║
║  │  10. Sell FCC (FCC → USDT)              │       ║
║  │  11. Mint Basic NFT (8 USDT)            │       ║
║  │  12. Mint Pro NFT (80 USDT)             │       ║
║  └─────────────────────────────────────────┘       ║
║                                                    ║
║  ┌─ ACCOUNT ───────────────────────────────┐       ║
║  │  13. Dashboard (Balance + NFTs)         │       ║
║  │  14. Mining Status                      │       ║
║  │  15. Browse Events (Map/List)           │       ║
║  └─────────────────────────────────────────┘       ║
║                                                    ║
║  0.  Exit                                          ║
║                                                    ║
╚════════════════════════════════════════════════════╝
> _
```

### Screen 4: Create Event Flow

```
┌─ CREATE EVENT ─────────────────────────────────────┐
│                                                     │
│  Campaign Name: My Coffee Shop FCC Drop             │
│  Description:   Buy any coffee, get FCC rewards!    │
│  Address:       123 Main St, NYC                    │
│  Link:          https://mycoffee.shop               │
│  Latitude:      40.7128                             │
│  Longitude:     -74.0060                            │
│  Start Time:    2026-04-05 09:00                    │
│  End Time:      2026-04-15 09:00                    │
│  Token:         [1] FCC  [2] USDT  > 1              │
│  Drop Type:     [1] Even  [2] Random  > 1           │
│  Max per drop:  10                                  │
│  Total drops:   50                                  │
│                                                     │
│  ─── SUMMARY ───                                    │
│  Total Budget:  500.00 FCC (10 × 50)                │
│  Your Balance:  10,234.00 FCC  ✅ Sufficient         │
│                                                     │
│  Proceed? [Y/n] > Y                                 │
│                                                     │
│  ⏳ Step 1/2: Approving 500 FCC...                  │
│  ✅ Approved! TX: 0xabc...123                       │
│  ⏳ Step 2/2: Creating event...                     │
│  ✅ Event #3350 created!                            │
│  TX: 0xdef...456                                    │
│  🔗 https://polygonscan.com/tx/0xdef...456          │
└─────────────────────────────────────────────────────┘
```

### Screen 5: Drop Reward Flow

```
┌─ DROP REWARD ──────────────────────────────────────┐
│                                                     │
│  Event ID: 3350                                     │
│                                                     │
│  ─── EVENT INFO ───                                 │
│  Name:    My Coffee Shop FCC Drop                   │
│  Token:   FCC │ Type: Even │ Amount: 10.00 each     │
│  Drops:   5/50 remaining                            │
│  Status:  ✅ Active                                 │
│                                                     │
│  Recipient address: 0xUserWallet123...              │
│                                                     │
│  ⏳ Pre-checks...                                   │
│  ├─ ✅ Not already dropped                          │
│  ├─ ✅ Event is active                              │
│  ├─ ✅ Not expired                                  │
│  ├─ ✅ You are the owner                            │
│  ├─ ✅ Drops remaining                              │
│  └─ ✅ Amount: 10.00 FCC                            │
│                                                     │
│  ⏳ Sending drop...                                 │
│  ✅ Drop sent! TX: 0x789...abc                      │
└─────────────────────────────────────────────────────┘
```

### Screen 6: Dashboard

```
┌─ DASHBOARD ────────────────────────────────────────┐
│                                                     │
│  📊 CURRENT BALANCE                                 │
│  ├─ USDT:  125.50                                   │
│  ├─ FCC:   10,234.00                                │
│  └─ POL:   3.45                                     │
│                                                     │
│  🎫 YOUR NFTs                                       │
│  ├─ 🥇 Pro NFT  "My Business"  Valid until 2027-01  │
│  └─ 🥈 Basic NFT "Side Project" Valid until 2027-05 │
│                                                     │
│  ⛏️  MINING STATUS                                  │
│  ├─ NFT Type:        Pro (Full rate)                │
│  ├─ Current Tier:    Tier 1 (50%)                   │
│  ├─ Total Mined:     1,250.00 FCC                   │
│  └─ Cooldown:        Available now                   │
│                                                     │
│  Press any key to return to main menu...            │
└─────────────────────────────────────────────────────┘
```

### Screen 7: Buy FCC

```
┌─ BUY FCC ──────────────────────────────────────────┐
│                                                     │
│  Direction: [1] USDT→FCC  [2] FCC→USDT  > 1        │
│  USDT Amount: 5000                                  │
│                                                     │
│  ─── PRICING ───                                    │
│  Your tier:  Tier 3 (5,000-9,999 USDT)              │
│  Rate:       1 USDT = 12.50 FCC                     │
│  You get:    62,500.00 FCC                           │
│  Pool:       InvestorSalePool                        │
│                                                     │
│  ─── TIER TABLE ───                                 │
│  Regular (<1K)        1 USDT = 10.00 FCC            │
│  Tier 4 (1K-4.9K)    1 USDT = 11.11 FCC            │
│  Tier 3 (5K-9.9K)    1 USDT = 12.50 FCC  ◄ YOU     │
│  Tier 2 (10K-99.9K)  1 USDT = 14.28 FCC            │
│  Tier 1 (100K+)      1 USDT = 16.66 FCC            │
│                                                     │
│  Proceed? [Y/n] > Y                                 │
│                                                     │
│  ⏳ Approving 5000 USDT...                          │
│  ✅ Confirmed! TX: 0x...                            │
│  ⏳ Buying FCC...                                   │
│  ✅ Purchased 62,500.00 FCC! TX: 0x...              │
└─────────────────────────────────────────────────────┘
```



