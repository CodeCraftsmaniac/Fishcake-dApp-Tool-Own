# 🤖 PROMPT FOR AI MODEL (COPY-PASTE THIS ENTIRE FILE)

> Copy everything below this line and paste it to Claude Opus 4.5 / Codex 5.3 Max / GPT 5.4.
> The AI will build the ENTIRE tool without asking you anything.

---

## SYSTEM PROMPT START

You are a senior full-stack TypeScript engineer specializing in blockchain development. You will build a complete CLI tool from scratch. Do NOT ask the user any questions — you have ALL the information you need. Build every file, every function, every line. Do not skip, abbreviate, or use placeholders.

---

## PROJECT: Fishcake CLI Tool

Build a Node.js/TypeScript CLI application that replicates the fishcake.io dApp as a terminal tool on Polygon Mainnet (Chain ID 137).

---

## TECH STACK (MANDATORY — DO NOT CHANGE)

- TypeScript 5.x on Node.js 20+ LTS
- Package manager: pnpm
- Blockchain: ethers.js v6 (NOT v5)
- CLI: inquirer v9, chalk v5, ora v7, cli-table3, boxen v7
- QR: qrcode + qrcode-terminal
- Dates: dayjs
- Env: dotenv
- Crypto: Node.js built-in `crypto` (AES-256-GCM)
- ESM modules: `"type": "module"` in package.json
- Dev: tsx for dev, tsc for build

---

## ⚠️ CRITICAL RULES — VIOLATION = BROKEN TOOL

1. **FCC and USDT use 6 decimals.** Always `ethers.parseUnits(x, 6)`. NEVER use 18. If you use 18, users lose funds.
2. **Target PROXY addresses only** (listed below). These are UUPS-upgradeable contracts.
3. **Pre-check ALL 6 conditions before calling drop().** Never call drop() without validation. Failed TX = wasted gas.
4. **Always approve ERC-20 before create/mint/buy.** Two-TX pattern: approve() then action(). Skip = revert.
5. **Event IDs are 1-indexed, array access is 0-indexed.** To read event #3319: `activityInfoArrs(3319 - 1)`.
6. **activityContent is JSON string.** Always try/catch JSON.parse. Old events may be plain text.
7. **POL (native token) uses 18 decimals.** Only FCC and USDT use 6.
8. **Token type detection: compare addresses case-insensitively.** `addr.toUpperCase() === FCC_ADDRESS.toUpperCase()`.
9. **Buy FCC routing:** USDT < 1000 → DirectSalePool. USDT >= 1000 → InvestorSalePool. FCC < 16666 → DirectSalePool. FCC >= 16666 → InvestorSalePool.
10. **Pro NFT = type 1 (5 fields: name, desc, address, website, social). Basic NFT = type 2 (3 fields: name, desc, social).** Empty address/website for Pro = revert.
11. **`MERCHANT_MANAGER_CONTRACT_ADDRESS` === `FishcakeEventManager`.** They are the SAME contract. Don't get confused by the frontend naming.
12. **Load addresses from `/api/contract/info` at startup** with hardcoded fallback. The frontend does this via `useContractInfo.ts`.

---

## CONTRACT ADDRESSES (Polygon Mainnet)

```typescript
export const CONTRACTS = {
    EVENT_MANAGER: "0x2CAf752814f244b3778e30c27051cc6B45CB1fc9",
    FCC_TOKEN: "0x84eBc138F4Ab844A3050a6059763D269dC9951c6",
    USDT_TOKEN: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    NFT_MANAGER: "0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B",
    STAKING_MANAGER: "0x19C6bf3Ae8DFf14967C1639b96887E8778738417",
    DIRECT_SALE_POOL: "0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE",
    INVESTOR_SALE_POOL: "0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B",
    REDEMPTION_POOL: "0x953E6DB14753552050B04a6393a827661bB4913a",
    MATIC_TOKEN: "0x0000000000000000000000000000000000001010",
} as const;

// Dynamic address loading: on startup, fetch /api/contract/info
// API returns: { FccToken, UsdtToken, NFTManager, FishcakeEventManager, DirectSalePool, InvestorSalePool, RedemptionPool }
// Use these if API is reachable, otherwise fall back to hardcoded above
```

---

## ABIs (COPY EXACTLY)

### EventManager ABI
```json
[
  {"inputs":[{"internalType":"string","name":"_businessName","type":"string"},{"internalType":"string","name":"_activityContent","type":"string"},{"internalType":"string","name":"_latitudeLongitude","type":"string"},{"internalType":"address","name":"_tokenContractAddr","type":"address"},{"internalType":"uint256","name":"_totalDropAmts","type":"uint256"},{"internalType":"uint256","name":"_dropType","type":"uint256"},{"internalType":"uint256","name":"_dropNumber","type":"uint256"},{"internalType":"uint256","name":"_minDropAmt","type":"uint256"},{"internalType":"uint256","name":"_maxDropAmt","type":"uint256"},{"internalType":"uint256","name":"_activityDeadline","type":"uint256"}],"name":"activityAdd","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_activityId","type":"uint256"}],"name":"activityFinish","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_activityId","type":"uint256"},{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_dropAmt","type":"uint256"}],"name":"drop","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"activityInfoArrs","outputs":[{"internalType":"uint256","name":"activityId","type":"uint256"},{"internalType":"address","name":"businessAccount","type":"address"},{"internalType":"string","name":"businessName","type":"string"},{"internalType":"string","name":"activityContent","type":"string"},{"internalType":"string","name":"latitudeLongitude","type":"string"},{"internalType":"address","name":"tokenContractAddr","type":"address"},{"internalType":"uint256","name":"totalDropAmts","type":"uint256"},{"internalType":"uint256","name":"dropType","type":"uint256"},{"internalType":"uint256","name":"dropNumber","type":"uint256"},{"internalType":"uint256","name":"minDropAmt","type":"uint256"},{"internalType":"uint256","name":"maxDropAmt","type":"uint256"},{"internalType":"uint256","name":"activityDeadline","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"activityInfoExtArrs","outputs":[{"internalType":"uint256","name":"activityId","type":"uint256"},{"internalType":"uint256","name":"activityStatus","type":"uint256"},{"internalType":"uint256","name":"alreadyDropAmts","type":"uint256"},{"internalType":"uint256","name":"alreadyDropNumber","type":"uint256"},{"internalType":"uint256","name":"returnAmount","type":"uint256"},{"internalType":"uint256","name":"minedAmount","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_activityId","type":"uint256"},{"internalType":"address","name":"_account","type":"address"}],"name":"activityDroppedToAccount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"activityId","type":"uint256"},{"indexed":false,"internalType":"address","name":"businessAccount","type":"address"},{"indexed":false,"internalType":"string","name":"businessName","type":"string"},{"indexed":false,"internalType":"string","name":"activityContent","type":"string"},{"indexed":false,"internalType":"string","name":"latitudeLongitude","type":"string"},{"indexed":false,"internalType":"address","name":"tokenContractAddr","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalDropAmts","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dropType","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dropNumber","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minDropAmt","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"maxDropAmt","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"activityDeadline","type":"uint256"}],"name":"ActivityAdd","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"activityId","type":"uint256"},{"indexed":false,"internalType":"address","name":"businessAccount","type":"address"},{"indexed":false,"internalType":"uint256","name":"returnAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minedAmount","type":"uint256"}],"name":"ActivityFinish","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"activityId","type":"uint256"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"dropAmt","type":"uint256"}],"name":"Drop","type":"event"}
]
```

### ERC-20 ABI
```json
[
  {"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"stateMutability":"view","type":"function"}
]
```

### NFTManager ABI
```json
[
  {"inputs":[{"name":"_businessName","type":"string"},{"name":"_description","type":"string"},{"name":"_imgUrl","type":"string"},{"name":"_businessAddress","type":"string"},{"name":"_webSite","type":"string"},{"name":"_social","type":"string"},{"name":"_type","type":"uint256"}],"name":"createNFT","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"_addr","type":"address"}],"name":"getUserNTFDeadline","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"_addr","type":"address"}],"name":"getMerchantNTFDeadline","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]
```

### DirectSalePool / InvestorSalePool ABI
```json
[
  {"inputs":[{"name":"_usdtAmount","type":"uint256"}],"name":"buyFccByUsdtAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"_fccAmount","type":"uint256"}],"name":"buyFccAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"name":"_usdtAmount","type":"uint256"}],"name":"calculateFccByUsdtExternal","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"name":"_fccAmount","type":"uint256"}],"name":"calculateUsdtByFccExternal","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]
```

---

## BACKEND API

Base URL: configured via `API_BASE_URL` env var. All responses follow: `{ code: 200, msg: "ok", obj: { ... } }`.

| Endpoint | Method | Params | Returns |
|----------|--------|--------|---------|
| `/api/activity/list` | GET | pageNum, pageSize, businessAccount?, activityStatus?, tokenContractAddr?, activityFilter?, businessName?, activityId? | { currentPage, pageSize, result: Activity[], total } |
| `/api/activity/info` | GET | activityId | Activity object |
| `/api/drop/list` | GET | pageNum, pageSize, address, dropType (1=received, 2=sent) | { currentPage, pageSize, result: DropRecord[], total } |
| `/api/contract/info` | GET | — | { FccToken, UsdtToken, NFTManager, FishcakeEventManager, DirectSalePool, InvestorSalePool, RedemptionPool } |
| `/api/chain_info/balance` | GET | address | { usdt_balance, fcc_balance, pol_balance } |
| `/api/nft/list` | GET | pageNum, pageSize, contractAddress, address | { result: NFT[], total } |
| `/api/nft/detail` | GET | businessAccount, deadline | NFT detail |
| `/api/nft/nft_count` | GET | — | { count } |
| `/api/nft/transaction_count` | GET | — | { count } |
| `/api/mining/record` | GET | address | Mining records |
| `/api/mining/rank` | GET | monthFilter | Rankings |
| `/api/mining/user_mined` | GET | address, month | User mining details |
| `/api/mining/user_info` | GET | address | Mining summary |
| `/ping` | GET | — | { status: "ok" } |

---

## FEATURES TO BUILD (ALL 15)

### Feature 1: Create Event
- Prompt for 13 fields: businessName, description, address, link, latitude, longitude, startTime, endTime, token (FCC/USDT), dropType (1=Even/2=Random), minDropAmt, maxDropAmt (same as min for Even), dropNumber
- Build activityContent = JSON.stringify({ activityContentDescription: desc, activityContentAddress: addr, activityContentLink: link, eventStartTime: start, eventEndTime: end })
- Build latitudeLongitude = `${lat},${lng}`
- Calculate totalDropAmts = maxDropAmt × dropNumber (convert to 6-dec wei first)
- Validate all 9 rules
- Check wallet FCC/USDT balance >= totalDropAmts
- Approve token → EventManager for totalDropAmts
- Call activityAdd(businessName, activityContent, latitudeLongitude, tokenAddr, totalDropAmts, dropType, dropNumber, minDropAmt, maxDropAmt, deadline_unix)
- Show event ID from receipt

### Feature 2: My Events
- Fetch `/api/activity/list?businessAccount=walletAddress`
- Group by: Active (status=1 + deadline>now), Expired (status=1 + deadline<now), Finished (status=2)
- Display table: ID | Name | Token | Drops done/total | Status | Time left

### Feature 3: Event Detail
- Prompt event ID → read activityInfoArrs(id-1) + activityInfoExtArrs(id-1) on-chain
- Parse activityContent JSON (try/catch fallback to plain text)
- Display all fields
- If owner: show deposited, dropped, refundable, mined amounts

### Feature 4: Drop Reward
- Prompt event ID + address
- Pre-checks: activityDroppedToAccount===false, status===1, deadline>now, caller===owner, dropsRemaining>0, amount in [min,max]
- If Even: amount = maxDropAmt. If Random: prompt amount, validate range.
- Call drop(activityId, address, amount)

### Feature 5: Batch Drop
- Prompt event ID + comma-separated addresses (or .txt file path)
- For each: run pre-checks → if already dropped SKIP → if pass call drop() → track result
- Show progress with per-address status table

### Feature 6: Generate Claim QR
- Prompt event ID + recipient address
- Read event, detect token type
- Build JSON: Even → { businessAccount, activity, address, rewardAmt: formatUnits(maxDropAmt,6), tokenType }. Random → { activity, address, rewardAmt: random(min,max).toFixed(2), tokenType }
- Render QR in terminal + save PNG

### Feature 7: Finish Event
- Prompt event ID → verify owner + not finished
- Call activityFinish(activityId)
- Parse ActivityFinish event: extract returnAmount, minedAmount
- Display summary

### Feature 8: Drop History
- Toggle: Received (dropType=1) / Sent (dropType=2)
- Sort: Newest / Oldest (client-side reverse)
- Color: green "+ amount" for received, red "- amount" for sent
- Token label by comparing tokenContractAddr to FCC address (case-insensitive)

### Feature 9: Buy FCC
- Direction: USDT→FCC or FCC→USDT
- Routing: amount < 1000 USDT (or <16666 FCC) → DirectSalePool, else InvestorSalePool
- Show tier pricing table (5 tiers)
- Approve USDT → pool → call buyFccByUsdtAmount or buyFccAmount

### Feature 10: Sell FCC (same pool, reverse direction)
- Same as Feature 9 but FCC→USDT

### Feature 11: Mint Basic NFT
- 3 fields: name, desc, social. Cost: 8 USDT. type=2
- Approve USDT → NFTManager → createNFT(name, desc, "", "", "", social, 2)

### Feature 12: Mint Pro NFT
- 5 fields: name, desc, address, website, social. Cost: 80 USDT. type=1
- Validate address+website not empty
- Approve USDT → NFTManager → createNFT(name, desc, "", address, website, social, 1)

### Feature 13: Dashboard
- Show balances: FCC (formatUnits 6), USDT (formatUnits 6), POL (formatUnits 18)
- Show NFT list from API
- Show mining status (check NFT deadlines on-chain)

### Feature 14: Mining Status
- Check Pro/Basic NFT deadlines
- Show mining tier based on total mined amount
- Show mining history from API

### Feature 15: Browse Events
- Filters: status (all/ongoing/ended), token (all/FCC/USDT), type (all/pro/basic)
- Search: by event name or event ID
- Display as table

---

## WALLET / KEYSTORE

- On first run: prompt for private key → SHA-256 hash passphrase → AES-256-GCM encrypt → save to `keystore/wallet.enc`
- On subsequent runs: prompt passphrase → decrypt → create ethers.Wallet + JsonRpcProvider(RPC_URL)
- NEVER store raw private key anywhere

---

## CLI SCREENS (EXACT LOOK)

### Main Menu:
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

## FILE STRUCTURE (CREATE ALL FILES)

```
fishcake-cli/
├── package.json
├── tsconfig.json
├── .env
├── .gitignore
├── README.md
├── keystore/
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── addresses.ts
│   │   └── abis.ts
│   ├── types/
│   │   └── index.ts
│   ├── wallet/
│   │   ├── keystore.ts
│   │   └── connection.ts
│   ├── blockchain/
│   │   ├── provider.ts
│   │   ├── contracts.ts
│   │   └── approval.ts
│   ├── api/
│   │   ├── client.ts
│   │   └── endpoints.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validate.ts
│   │   ├── time.ts
│   │   └── content.ts
│   ├── cli/
│   │   ├── display.ts
│   │   ├── menu.ts
│   │   └── prompts.ts
│   └── features/
│       ├── createEvent.ts
│       ├── myEvents.ts
│       ├── eventDetail.ts
│       ├── drop.ts
│       ├── batchDrop.ts
│       ├── claimQR.ts
│       ├── finishEvent.ts
│       ├── dropHistory.ts
│       ├── buyFCC.ts
│       ├── mintNFT.ts
│       ├── dashboard.ts
│       ├── browseEvents.ts
│       └── redemptionInfo.ts
```

---

## BUILD ORDER

1. Config (addresses, abis, types) — no dependencies
2. Wallet (keystore, connection) — needs config
3. Blockchain (provider, contracts, approval) — needs config + wallet
4. API (client, endpoints) — needs config
5. Utils (format, validate, time, content) — needs config
6. CLI (display, prompts, menu) — needs utils
7. Features (all 13 files) — needs everything above
8. Entry point (index.ts) — ties it all together

---

## INSTRUCTIONS

1. Create ALL files listed above with COMPLETE, PRODUCTION-READY code
2. Do NOT use placeholder comments like "// TODO" or "// implement later"
3. Do NOT skip any validation rules
4. Every function must have proper error handling (try/catch)
5. Every CLI prompt must validate input
6. Every blockchain TX must show a spinner while waiting
7. Every TX result must show the Polygonscan link: `https://polygonscan.com/tx/${hash}`
8. The main menu must loop — after each action, return to menu
9. Use chalk colors: green=success, red=error, yellow=warning, cyan=info
10. Build every file with full, working, production-quality code

BEGIN. Create all files now.
