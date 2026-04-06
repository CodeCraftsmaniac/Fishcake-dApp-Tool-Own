# 📋 FISHCAKE CLI TOOL — COMPLETE TASK LIST

> **Every single task** to build the tool from zero to production.  
> **Nothing is missing.** This IS the checklist.  
> Spec Reference: `../FISHCAKE_CLI_TOOL_COMPLETE_ANALYSIS.md`

---

## ⚠️ CRITICAL RULES (Read Before ANY Coding)

| # | Rule | If Violated |
|---|------|-------------|
| R1 | FCC and USDT use **6 decimals**. Always `parseUnits(x, 6)` | Fund loss — user sends 10^12x more |
| R2 | Target **proxy** contract addresses only | TX goes to wrong contract |
| R3 | **Pre-check ALL 6 conditions** before `drop()` | Gas wasted on reverted TX |
| R4 | **Approve before** create/mint/buy (2-TX pattern) | TX reverts |
| R5 | Event IDs are **1-indexed**, array access is **0-indexed** | Wrong event data returned |
| R6 | `activityContent` is **JSON** — always try/catch parse | Crash on old events |
| R7 | POL (native) uses **18 decimals**, NOT 6 | Wrong balance display |
| R8 | Token type detection: compare addresses **case-insensitive** | Wrong token label |
| R9 | Buy FCC: USDT<1000 → DirectSalePool, else InvestorSalePool | Wrong pricing |
| R10 | Pro NFT requires 5 fields, Basic 3 fields | TX reverts |
| R11 | `MERCHANT_MANAGER_CONTRACT_ADDRESS` === `FishcakeEventManager` (same contract!) | Confusing code reference |
| R12 | Frontend loads addresses from `/api/contract/info` at boot — CLI should do same with hardcoded fallback | Addresses may change |

---

## 🔧 TECH STACK

| Component | Choice |
|-----------|--------|
| Language | TypeScript 5.x |
| Runtime | Node.js 20+ LTS |
| Package Manager | pnpm |
| Blockchain | ethers.js v6 |
| CLI Framework | inquirer v9 |
| Styling | chalk v5, boxen v7, cli-table3 |
| Spinners | ora v7 |
| QR Code | qrcode + qrcode-terminal |
| Dates | dayjs |
| Env | dotenv |
| Encryption | Node.js built-in crypto (AES-256-GCM) |

---

## PHASE 1: PROJECT SETUP

### Task 1.1 — Initialize Project
- ✅ `mkdir fishcake-cli && cd fishcake-cli`
- ✅ `pnpm init`
- ✅ Set `"type": "module"` in package.json
- ✅ Add scripts: `"dev": "tsx src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`

### Task 1.2 — Install Dependencies
- ✅ `pnpm add ethers@^6 inquirer@^9 chalk@^5 ora@^7 cli-table3 boxen@^7 qrcode qrcode-terminal dotenv dayjs`
- ✅ `pnpm add -D typescript @types/node @types/inquirer tsx`

### Task 1.3 — Configure TypeScript
- ✅ Create `tsconfig.json`:
  - target: ES2022
  - module: ESNext
  - moduleResolution: bundler
  - strict: true
  - outDir: dist
  - rootDir: src
  - esModuleInterop: true
  - resolveJsonModule: true

### Task 1.4 — Create .env File
- ✅ `RPC_URL=https://polygon-rpc.com`
- ✅ `CHAIN_ID=137`
- ✅ `API_BASE_URL=http://localhost:8189`
- ✅ `KEYSTORE_PATH=./keystore/wallet.enc`

### Task 1.5 — Create Folder Structure
- ✅ `src/config/`
- ✅ `src/wallet/`
- ✅ `src/blockchain/`
- ✅ `src/api/`
- ✅ `src/features/`
- ✅ `src/cli/`
- ✅ `src/utils/`
- ✅ `src/types/`
- ✅ `keystore/` (add to .gitignore)

---

## PHASE 2: CONFIG LAYER

### Task 2.1 — `src/config/addresses.ts`
- ✅ Export hardcoded fallback addresses:
  - `FISHCAKE_EVENT_MANAGER = "0x2CAf752814f244b3778e30c27051cc6B45CB1fc9"`
  - `FCC_TOKEN = "0x84eBc138F4Ab844A3050a6059763D269dC9951c6"`
  - `USDT_TOKEN = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"`
  - `NFT_MANAGER = "0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B"`
  - `STAKING_MANAGER = "0x19C6bf3Ae8DFf14967C1639b96887E8778738417"`
  - `DIRECT_SALE_POOL = "0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE"`
  - `INVESTOR_SALE_POOL = "0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B"`
  - `REDEMPTION_POOL = "0x953E6DB14753552050B04a6393a827661bB4913a"`
  - `MATIC_TOKEN = "0x0000000000000000000000000000000000001010"`
- ✅ Export `loadAddressesFromAPI()` function:
  - Fetch `/api/contract/info` → map API field names to local names
  - API fields: `FccToken`, `UsdtToken`, `NFTManager`, `FishcakeEventManager`, `DirectSalePool`, `InvestorSalePool`, `RedemptionPool`
  - If API reachable → use dynamic addresses
  - If API unreachable → use hardcoded fallback
  - ⚠️ NOTE: In the frontend code, `MERCHANT_MANAGER_CONTRACT_ADDRESS` = `FishcakeEventManager` (they're the SAME contract)
- ✅ Ref: Spec Section 1, `reference-repos-for-tool/fishcake-web3-main/src/hooks/useContractInfo.ts`

### Task 2.2 — `src/config/abis.ts`
- ✅ Export `EVENT_MANAGER_ABI` — activityAdd, activityFinish, drop, activityInfoArrs, activityInfoExtArrs, activityDroppedToAccount + events (ActivityAdd, ActivityFinish, Drop)
- ✅ Export `ERC20_ABI` — approve, allowance, balanceOf, decimals, name, symbol, totalSupply, transfer, transferFrom
- ✅ Export `NFT_MANAGER_ABI` — createNFT, getUserNTFDeadline, getMerchantNTFDeadline
- ✅ Export `DIRECT_SALE_ABI` — buyFccByUsdtAmount, buyFccAmount
- ✅ Export `INVESTOR_SALE_ABI` — buyFccByUsdtAmount, buyFccAmount, calculateFccByUsdtExternal, calculateUsdtByFccExternal
- ✅ Copy ALL ABIs from Spec Section 16
- ✅ Ref: Spec Section 16, `reference-repos-for-tool/fishcake.io-telegram-bot/src/blockchain/abi.ts`

### Task 2.3 — `src/types/index.ts`
- ✅ Export `Activity` interface (21 fields from Spec Section 19)
- ✅ Export `DropRecord` interface (12 fields from Spec Section 19)
- ✅ Export `NFT` interface (12 fields from Spec Section 19)
- ✅ Export `DropRequestParams` interface: { activityId, address, rewardAmt, tokenType }
- ✅ Export `MintNftParams` interface: { businessName, description, businessAddress, website, social, type }
- ✅ Export `CreateEventParams` interface: all 10 activityAdd params
- ✅ Ref: Spec Section 19, `reference-repos-for-tool/fishcake-web3-main/src/utils/fishcakeType.ts`

---

## PHASE 3: WALLET LAYER

### Task 3.1 — `src/wallet/keystore.ts`
- ✅ `encryptPrivateKey(privateKey: string, passphrase: string): void`
  - ✅ SHA-256 hash passphrase → 32-byte key
  - ✅ Generate random 12-byte nonce
  - ✅ AES-256-GCM encrypt
  - ✅ Save `{ ciphertext, nonce, tag }` as JSON to KEYSTORE_PATH
- ✅ `decryptPrivateKey(passphrase: string): string`
  - ✅ Read JSON from KEYSTORE_PATH
  - ✅ SHA-256 hash passphrase → key
  - ✅ AES-256-GCM decrypt
  - ✅ Return raw private key
- ✅ `keystoreExists(): boolean`
  - ✅ Check if KEYSTORE_PATH file exists
- ✅ Ref: Spec Section 2, `reference-repos-for-tool/fishcake-service-main/service/reward_service/reward_service.go`

### Task 3.2 — `src/wallet/connection.ts`
- ✅ `connectWallet(passphrase: string): { wallet, address, provider }`
  - ✅ Call decryptPrivateKey
  - ✅ Create ethers.Wallet with JsonRpcProvider
  - ✅ Return wallet + address
- ✅ `getBalances(address: string): { fcc, usdt, pol }`
  - ✅ Read FCC balance: `fccContract.balanceOf(address)` → formatUnits(x, 6)
  - ✅ Read USDT balance: `usdtContract.balanceOf(address)` → formatUnits(x, 6)
  - ✅ Read POL balance: `provider.getBalance(address)` → formatUnits(x, 18) ← NOTE: 18!
- ✅ Ref: Spec Section 2, `reference-repos-for-tool/fishcake-web3-main/src/pages/profile/components/BalanceTable.tsx`

---

## PHASE 4: BLOCKCHAIN LAYER

### Task 4.1 — `src/blockchain/provider.ts`
- ✅ Create and export `provider = new ethers.JsonRpcProvider(RPC_URL)`
- ✅ Export `chainId = 137`

### Task 4.2 — `src/blockchain/contracts.ts`
- ✅ Export `getEventManager(signer)` → Contract instance
- ✅ Export `getFccToken(signer)` → Contract instance
- ✅ Export `getUsdtToken(signer)` → Contract instance
- ✅ Export `getNftManager(signer)` → Contract instance
- ✅ Export `getDirectSalePool(signer)` → Contract instance
- ✅ Export `getInvestorSalePool(signer)` → Contract instance
- ✅ All using ABIs from config/abis.ts

### Task 4.3 — `src/blockchain/approval.ts`
- ✅ `checkAllowance(tokenContract, owner, spender): bigint`
- ✅ `approveIfNeeded(tokenContract, spender, requiredAmount, signer): txHash | null`
  - ✅ Check allowance
  - ✅ If sufficient → return null (skip)
  - ✅ If insufficient → send approve TX → wait → return hash
- ✅ Ref: Spec Section 4, `reference-repos-for-tool/fishcake-web3-main/src/hooks/useIsContractApproved.ts`

---

## PHASE 5: API LAYER

### Task 5.1 — `src/api/client.ts`
- ✅ `apiGet(endpoint, params): any`
  - ✅ Build URL with URLSearchParams
  - ✅ fetch GET
  - ✅ Parse JSON → return `response.obj`
  - ✅ Handle errors
- ✅ Ref: `reference-repos-for-tool/fishcake-web3-main/src/services/modules/*.ts` (all use same pattern)

### Task 5.2 — `src/api/endpoints.ts`
- ✅ `getActivityList(params)` → `GET /api/activity/list` — params: pageNum, pageSize, businessAccount?, activityStatus?, tokenContractAddr?, activityFilter?, businessName?, activityId?
- ✅ `getActivityInfo(activityId)` → `GET /api/activity/info`
- ✅ `getDropList(params)` → `GET /api/drop/list` — params: pageNum, pageSize, address, dropType (1=received, 2=sent)
- ✅ `getContractInfo()` → `GET /api/contract/info` — returns all contract addresses
- ✅ `getWalletBalance(address)` → `GET /api/chain_info/balance`
- ✅ `getNftList(params)` → `GET /api/nft/list` — params: pageNum, pageSize, contractAddress, address
- ✅ `getNftDetail(params)` → `GET /api/nft/detail` — params: businessAccount, deadline
- ✅ `getNftCount()` → `GET /api/nft/nft_count` (NOT /api/kanban/)
- ✅ `getTransactionCount()` → `GET /api/nft/transaction_count` (NOT /api/kanban/)
- ✅ `getMiningRecord(address)` → `GET /api/mining/record`
- ✅ `getMiningRank(monthFilter)` → `GET /api/mining/rank`
- ✅ `getUserMined(address, month)` → `GET /api/mining/user_mined`
- ✅ `getUserMiningInfo(address)` → `GET /api/mining/user_info`
- ✅ `ping()` → `GET /ping`
- ✅ All responses follow: `{ code: 200, msg: "ok", obj: { ... } }` → return `response.obj`
- ✅ Ref: Spec Section 21, `reference-repos-for-tool/fishcake-web3-main/src/services/modules/*.ts`

---

## PHASE 6: UTILITY LAYER

### Task 6.1 — `src/utils/format.ts`
- ✅ `toWei(amount: string, decimals: number = 6): bigint`
- ✅ `fromWei(amount: bigint, decimals: number = 6): string`
- ✅ `formatBalance(balance: string): string` — show 2 decimal places
- ✅ `tokenSymbol(address: string): "FCC" | "USDT"` — case-insensitive compare
- ✅ `tokenDecimals(address: string): 6` — always 6 for both tokens
- ✅ Ref: Spec Section 3 + Section 20

### Task 6.2 — `src/utils/validate.ts`
- ✅ `validateCreateEvent(params): { valid: boolean, errors: string[] }`
  - ✅ Rule 1: dropType must be 1 or 2
  - ✅ Rule 2: maxDropAmt >= minDropAmt
  - ✅ Rule 3: totalDropAmts > 0
  - ✅ Rule 4: deadline > now
  - ✅ Rule 5: deadline < now + 30 days (2,592,000 seconds)
  - ✅ Rule 6: totalDropAmts == maxDropAmt × dropNumber
  - ✅ Rule 7: totalDropAmts >= 1_000_000 (1 token in wei)
  - ✅ Rule 8: dropNumber <= 100 OR dropNumber <= totalDropAmts / 1e6
  - ✅ Rule 9: tokenContractAddr is FCC or USDT address
- ✅ `validatePreDrop(contract, activityId, recipient, wallet): { valid, errors }`
  - ✅ Check 1: activityDroppedToAccount === false
  - ✅ Check 2: activityStatus === 1
  - ✅ Check 3: deadline > now
  - ✅ Check 4: businessAccount === wallet
  - ✅ Check 5: alreadyDropNumber < dropNumber
  - ✅ Check 6: amount within [minDropAmt, maxDropAmt]
- ✅ Ref: Spec Section 5 (rules 1-9), Section 8 (checks 1-6)

### Task 6.3 — `src/utils/time.ts`
- ✅ `unixToDate(timestamp: number): string` — formatted date
- ✅ `dateToUnix(dateStr: string): number` — parse to unix
- ✅ `timeRemaining(deadline: number): string` — "2d 5h" or "Expired"
- ✅ `isExpired(deadline: number): boolean`

### Task 6.4 — `src/utils/content.ts`
- ✅ `buildActivityContent(description, address, link, startTime, endTime): string`
  - ✅ Returns JSON.stringify({ activityContentDescription, activityContentAddress, activityContentLink, eventStartTime, eventEndTime })
- ✅ `parseActivityContent(content: string): { description?, address?, link? }`
  - ✅ Try JSON.parse → extract fields
  - ✅ Fallback: return raw string as description
- ✅ Ref: Spec Section 5 + Section 20, `reference-repos-for-tool/fishcake-web3-main/src/utils/fishcake.ts`

---

## PHASE 7: CLI LAYER

### Task 7.1 — `src/cli/display.ts`
- ✅ `showHeader(address, fccBalance)` — top bar with wallet info
- ✅ `showSpinner(text)` — ora spinner
- ✅ `showSuccess(text)` — green checkmark
- ✅ `showError(text)` — red X
- ✅ `showTable(headers, rows)` — cli-table3 formatted table
- ✅ `showBox(content, title)` — boxen wrapped content
- ✅ `showTxLink(txHash)` — Polygonscan link

### Task 7.2 — `src/cli/menu.ts`
- ✅ Main menu with 15 options + Exit (inquirer list)
- ✅ Categories: Event Management, Drop & Reward, Token & NFT, Account
- ✅ Loop: show menu → execute choice → return to menu
- ✅ Ref: Spec Section 33 (Screen 3)

### Task 7.3 — `src/cli/prompts.ts`
- ✅ `promptPassphrase(): string`
- ✅ `promptPrivateKey(): string`
- ✅ `promptConfirm(message): boolean`
- ✅ `promptEventForm(): CreateEventParams` — all 13 fields with validation
- ✅ `promptActivityId(): number`
- ✅ `promptAddress(): string`
- ✅ `promptAmount(): string`
- ✅ `promptTokenChoice(): "FCC" | "USDT"`
- ✅ `promptDropType(): 1 | 2`
- ✅ `promptNFTForm(type: "basic" | "pro"): MintNftParams`
- ✅ `promptBuyDirection(): "usdt-to-fcc" | "fcc-to-usdt"`
- ✅ `promptBuyAmount(): string`

---

## PHASE 8: FEATURES (One File Per Feature)

### Task 8.1 — `src/features/createEvent.ts`
- ✅ Prompt user for all 13 fields (Spec Section 5)
- ✅ Build activityContent JSON string
- ✅ Build latitudeLongitude string
- ✅ Calculate totalDropAmts = maxDropAmt × dropNumber
- ✅ Validate all 9 rules (Task 6.2)
- ✅ Check FCC/USDT balance >= totalDropAmts
- ✅ Show summary, ask confirm
- ✅ Call approveIfNeeded(token, EventManager, totalDropAmts)
- ✅ Call eventManager.activityAdd(10 params)
- ✅ Wait for TX, parse receipt for activityId
- ✅ Display: "✅ Event #N created! TX: 0x..."
- ✅ Ref: Spec Section 5

### Task 8.2 — `src/features/myEvents.ts`
- ✅ Fetch activity list from API filtered by wallet address
- ✅ Group into 3 categories:
  - Active: activityStatus=1 AND deadline > now
  - Expired: activityStatus=1 AND deadline < now
  - Finished: activityStatus=2
- ✅ Display table with: ID, Name, Token, Drops (done/total), Status, Time left
- ✅ Ref: Spec Section 6

### Task 8.3 — `src/features/eventDetail.ts`
- ✅ Prompt for event ID
- ✅ Read on-chain: activityInfoArrs(id-1) + activityInfoExtArrs(id-1)
- ✅ Parse activityContent JSON (with fallback)
- ✅ Display all fields (Spec Section 7 table)
- ✅ If wallet === businessAccount → show Owner Tracker (deposited, dropped, refund, mined)
- ✅ Ref: Spec Section 7

### Task 8.4 — `src/features/drop.ts`
- ✅ Prompt for event ID + recipient address
- ✅ Run ALL 6 pre-checks (Task 6.2 validatePreDrop)
- ✅ Show pre-check results with ✅/❌
- ✅ If all pass → determine amount:
  - dropType=1 (Even): amount = maxDropAmt
  - dropType=2 (Random): prompt user for amount, validate [min, max]
- ✅ Call eventManager.drop(activityId, recipient, amount)
- ✅ Wait for TX, show result
- ✅ Ref: Spec Section 8

### Task 8.5 — `src/features/batchDrop.ts`
- ✅ Prompt for event ID + list of addresses (comma-separated or file path)
- ✅ For each address:
  - ✅ Run pre-checks
  - ✅ If already dropped → SKIP, don't revert
  - ✅ If passes → call drop()
  - ✅ Track result: SUCCESS/SKIPPED/FAILED
- ✅ Show progress table with per-address status
- ✅ Show summary: N success, N skipped, N failed
- ✅ Ref: Spec Section 9

### Task 8.6 — `src/features/claimQR.ts`
- ✅ Prompt for event ID + recipient address
- ✅ Read event info from chain
- ✅ Detect token type: compare tokenContractAddr with FCC address
- ✅ Build QR JSON:
  - Even: `{ businessAccount, activity, address, rewardAmt: maxDropAmt, tokenType }`
  - Random: `{ activity, address, rewardAmt: random(min, max).toFixed(2), tokenType }`
- ✅ Render QR in terminal using qrcode-terminal
- ✅ Also save QR as PNG file
- ✅ Display reward: Even → "10.0 FCC", Random → "5.0 - 15.0 FCC"
- ✅ Ref: Spec Section 10, `reference-repos-for-tool/fishcake-web3-main/src/pages/event/components/ClaimDialog.tsx`

### Task 8.7 — `src/features/finishEvent.ts`
- ✅ Prompt for event ID
- ✅ Read on-chain: verify caller is owner, event not already finished
- ✅ Call eventManager.activityFinish(activityId)
- ✅ Wait for TX, parse ActivityFinish event from receipt logs
- ✅ Extract: returnAmount, minedAmount
- ✅ Display summary:
  - Total Budget
  - Drops Executed (done/total)
  - Amount Dropped
  - Refunded (+X FCC/USDT)
  - Mining Reward (+X FCC)
  - TX link
- ✅ Ref: Spec Section 11

### Task 8.8 — `src/features/dropHistory.ts`
- ✅ Prompt: [1] Received or [2] Sent
- ✅ Fetch from API: `/api/drop/list` with dropType=1 or 2
- ✅ Prompt: [1] Newest first or [2] Oldest first (client-side sort)
- ✅ Display total count
- ✅ Display each record:
  - Event Name
  - Date (formatted from timestamp)
  - Amount with + (green) or - (red) prefix
  - Token: "FCC" or "USDT" (case-insensitive compare)
- ✅ Ref: Spec Section 26 + Section 30, `reference-repos-for-tool/fishcake-web3-main/src/pages/received/components/RecordsList.tsx`

### Task 8.9 — `src/features/buyFCC.ts`
- ✅ Prompt: [1] USDT→FCC or [2] FCC→USDT
- ✅ Prompt: amount
- ✅ Determine pool (DirectSale or InvestorSale):
  - USDT→FCC: amount < 1000 → DirectSale, else InvestorSale
  - FCC→USDT: amount < 16666 → DirectSale, else InvestorSale
- ✅ If InvestorSale: call calculateFccByUsdtExternal or calculateUsdtByFccExternal → show estimated output
- ✅ If DirectSale (regular): calculate locally (1:10 rate)
- ✅ Show tier table with current tier highlighted
- ✅ Ask confirm
- ✅ Approve USDT → target pool
- ✅ Call buyFccByUsdtAmount or buyFccAmount
- ✅ Wait TX, display result
- ✅ Ref: Spec Section 23, `reference-repos-for-tool/fishcake-web3-main/src/components/global/BuyTokenTransaction/BuyTokenContainer.tsx`

### Task 8.10 — `src/features/mintNFT.ts`
- ✅ Prompt: [1] Basic (8 USDT) or [2] Pro (80 USDT)
- ✅ If Basic: prompt name, description, social (3 fields)
- ✅ If Pro: prompt name, description, businessAddress, website, social (5 fields)
- ✅ Validate: name, description, social cannot be empty; Pro requires address + website
- ✅ Calculate cost: 8 or 80 USDT in 6-dec wei
- ✅ Approve USDT → NFTManager for cost amount
- ✅ Call nftManager.createNFT(name, desc, "", businessAddress, website, social, type)
  - type=2 for Basic, type=1 for Pro
  - imgUrl always empty string ""
- ✅ Wait TX, display result
- ✅ Ref: Spec Section 24, `reference-repos-for-tool/fishcake-web3-main/src/components/global/MintNFTTransaction/MintNFTContainer.tsx`

### Task 8.11 — `src/features/dashboard.ts`
- ✅ Fetch balances: FCC (6 dec), USDT (6 dec), POL (18 dec)
- ✅ Display balance box
- ✅ Fetch NFT list from API
- ✅ Display each NFT: type badge (🥇 Pro / 🥈 Basic), name, valid until date
- ✅ Show mining status:
  - ✅ Check Pro deadline: `nftManager.getMerchantNTFDeadline(address)`
  - ✅ Check Basic deadline: `nftManager.getUserNTFDeadline(address)`
  - ✅ Determine: Pro active / Basic active / No NFT
  - ✅ Display mining tier based on global mined amount
- ✅ Ref: Spec Section 25, `reference-repos-for-tool/fishcake-web3-main/src/pages/profile/components/BalanceTable.tsx`, `NFTList.tsx`

### Task 8.12 — `src/features/browseEvents.ts`
- ✅ Prompt filters:
  - Status: All / Ongoing / Ended
  - Token: All / FCC / USDT
  - NFT Type: All / Pro / Basic
  - Search: by Event Name or Event ID
- ✅ Fetch from API with filter params (Spec Section 31)
- ✅ Display as list/table:
  - ID, Name, Token, Drop Type, Drops remaining, Pin type (pro/basic/activity), Deadline
- ✅ Option to view detail by selecting an event
- ✅ Ref: Spec Section 27 + 31, `reference-repos-for-tool/fishcake-web3-main/src/pages/map/index.tsx`

### Task 8.13 — `src/features/redemptionInfo.ts`
- ✅ Check unlock timestamp: 1820399835
- ✅ If locked: show countdown "Unlocks in X days"
- ✅ If unlocked: show pool info and (future) redemption form
- ✅ Display RedemptionPool address
- ✅ Ref: Spec Section 29, `reference-repos-for-tool/fishcake-web3-main/src/pages/redemption-pool/components/Info.tsx`

---

## PHASE 9: ENTRY POINT

### Task 9.1 — `src/index.ts`
- ✅ Load dotenv
- ✅ Check if keystore exists
  - If NO → show setup screen (import private key / mnemonic) → encrypt → save
  - If YES → prompt passphrase → decrypt → connect
- ✅ Fetch and display balances
- ✅ Enter main menu loop
- ✅ On exit: clean up, show goodbye message
- ✅ Ref: Spec Section 33 (Screens 1-3)

---

## PHASE 10: POLISH & BUILD

### Task 10.1 — Error Handling
- ✅ Wrap all TX calls in try/catch
- ✅ Show user-friendly error messages (not raw stack traces)
- ✅ Handle: network errors, revert reasons, insufficient gas, user rejection
- ✅ Graceful exit on Ctrl+C

### Task 10.2 — .gitignore
- ✅ Add: `node_modules/`, `dist/`, `keystore/`, `.env`

### Task 10.3 — README.md (in fishcake-cli root)
- ✅ Project description
- ✅ Install instructions
- ✅ Usage guide
- ✅ Feature list

### Task 10.4 — Build & Test
- ✅ Run `pnpm build` → verify no TypeScript errors
- ✅ Run `pnpm dev` → verify main menu renders
- ⬜ Test each feature with testnet or read-only calls

---

## TESTING CHECKLIST (Verify After All Tasks Complete)

### Wallet
- ✅ First-run: private key → keystore created
- ✅ Login: passphrase → wallet connected, balances shown
- ✅ Wrong passphrase → error, no crash

### Create Event
- ✅ All 13 fields accepted
- ✅ Rejects invalid deadline (>30 days or in past)
- ✅ Rejects totalDropAmts < 1 token
- ✅ Approval TX → Create TX → event ID returned

### Drop
- ✅ Rejects already-dropped address
- ✅ Rejects finished/expired event
- ✅ Rejects non-owner caller
- ✅ Even: sends maxDropAmt
- ✅ Random: validates [min, max] range

### Batch Drop
- ✅ Skips already-dropped (no revert)
- ✅ Progress tracking per address
- ✅ Continues on individual failures

### Finish Event
- ✅ activityFinish TX succeeds
- ✅ Shows refund + mining amounts from receipt

### Buy FCC
- ✅ USDT < 1000 → DirectSalePool
- ✅ USDT >= 1000 → InvestorSalePool
- ✅ Approval + buy both confirmed

### Mint NFT
- ✅ Basic: 8 USDT, 3 fields, type=2
- ✅ Pro: 80 USDT, 5 fields, type=1
- ✅ Approval + mint confirmed

### QR Code
- ✅ Even: QR contains { businessAccount, activity, address, rewardAmt, tokenType }
- ✅ Random: rewardAmt randomized between min/max

### Dashboard
- ✅ Balances: FCC(6), USDT(6), POL(18) correct
- ✅ NFT list with type label
- ✅ Mining status with NFT type + tier

### Drop History
- ✅ Toggle Received/Sent
- ✅ Green + / Red - color coding
- ✅ Sort newest/oldest

### Browse Events
- ✅ Filters work: Status, Token, NFT Type
- ✅ Search by name or ID

---

## FILE INVENTORY (All Files That Must Exist)

```
fishcake-cli/
├── package.json
├── tsconfig.json
├── .env
├── .gitignore
├── README.md
├── keystore/               (gitignored)
│   └── wallet.enc
├── src/
│   ├── index.ts            ← Task 9.1
│   ├── config/
│   │   ├── addresses.ts    ← Task 2.1
│   │   └── abis.ts         ← Task 2.2
│   ├── types/
│   │   └── index.ts        ← Task 2.3
│   ├── wallet/
│   │   ├── keystore.ts     ← Task 3.1
│   │   └── connection.ts   ← Task 3.2
│   ├── blockchain/
│   │   ├── provider.ts     ← Task 4.1
│   │   ├── contracts.ts    ← Task 4.2
│   │   └── approval.ts     ← Task 4.3
│   ├── api/
│   │   ├── client.ts       ← Task 5.1
│   │   └── endpoints.ts    ← Task 5.2
│   ├── utils/
│   │   ├── format.ts       ← Task 6.1
│   │   ├── validate.ts     ← Task 6.2
│   │   ├── time.ts         ← Task 6.3
│   │   └── content.ts      ← Task 6.4
│   ├── cli/
│   │   ├── display.ts      ← Task 7.1
│   │   ├── menu.ts         ← Task 7.2
│   │   └── prompts.ts      ← Task 7.3
│   └── features/
│       ├── createEvent.ts  ← Task 8.1
│       ├── myEvents.ts     ← Task 8.2
│       ├── eventDetail.ts  ← Task 8.3
│       ├── drop.ts         ← Task 8.4
│       ├── batchDrop.ts    ← Task 8.5
│       ├── claimQR.ts      ← Task 8.6
│       ├── finishEvent.ts  ← Task 8.7
│       ├── dropHistory.ts  ← Task 8.8
│       ├── buyFCC.ts       ← Task 8.9
│       ├── mintNFT.ts      ← Task 8.10
│       ├── dashboard.ts    ← Task 8.11
│       ├── browseEvents.ts ← Task 8.12
│       └── redemptionInfo.ts ← Task 8.13
```

**Total: 27 source files + 4 config files = 31 files**
**Total tasks: 10 phases, 35 tasks, 200+ subtasks**
