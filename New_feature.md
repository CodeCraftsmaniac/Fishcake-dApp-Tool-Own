Here’s your **fully reorganized, structured, and deeply clarified version** of the Mining Event logic. I kept it clean, logical, and implementation-ready so you (or an AI agent) can execute it without confusion.

---

# 🔷 Mining Event – Full System Flow (Rewritten & Structured)

## **Phase 1: Wallet Import**

### 1. Input Wallet Count

* User provides the number of wallets to import → **X wallets**

---

### 2. Private Key Input

* System prompts user to input private keys:

  * Supports:

    * ✅ Bulk paste (multiple keys together)
    * ✅ CSV file upload
* CSV file must be located at:

  ```
  /wallet_private_keys
  ```

---

### 3. Wallet Import Execution

* CLI begins importing wallets one by one
* For each wallet, display:

```
Wallet Address | POL Balance | USDT Balance | FCC Balance | PASS Type (PRO/BASIC/NONE)
```

* Show **real-time progress logs**, e.g.:

  * Importing wallet 1...
  * Success ✅
  * Importing wallet 2...
  * Failed ❌ (if error)

---

## **Phase 2: NFT Minting (PASS Allocation)**

### 4. Mint Selection

* After all wallets are imported:

  * Prompt user:

    ```
    Select PASS Type to mint:
    [1] BASIC
    [2] PRO
    ```

---

### 5. Cost Preview Table (Before Confirmation)

* Display estimated deduction:

```
Wallet | USDT Deducted | Remaining USDT | PASS Type
```

---

### 6. Confirmation → Execute Mint

* After user confirmation:

  * Execute NFT minting per wallet

---

### 7. Post-Mint Result Table (Blockchain Verified)

* Replace preview table with actual results:

```
Wallet | FCC Received (Exact On-chain) | Transaction Link | PASS Type | Expiry Date & Time
```

* Important:

  * FCC received must be fetched directly from blockchain
  * Transaction link must be clickable/trackable

---

## **Phase 3: Event Creation & Drop Setup**

### 8. Drop Address Configuration

* Ask user to input:

  * **2 drop wallet addresses**
* Save these addresses globally for all imported wallets

---

### 9. Event Creation Logic

* For each wallet:

  * Create **1 mining event per day**
  * Automatically distribute (drop) FCC rewards to the 2 saved addresses

---

## **Phase 4: Automated Mining & Event Lifecycle**

### 10. Event Execution Flow

For each wallet:

1. Event is created
2. FCC is distributed to 2 drop addresses
3. System continuously monitors:

   * Total FCC dropped
   * Mining reward received

---

### 11. Auto Termination Condition

* Event ends automatically when:

```
IF:
Total FCC dropped = 24 FCC (to 2 wallets)
AND
Mining reward received = 6 FCC

→ THEN:
End Event Automatically ✅
```

---

## **Phase 5: Fully Automated Daily Cycle**

### 12. Automation Behavior (No Manual Intervention)

* Step 5 (**Create event & drop**) becomes **fully automated**

---

### 13. Daily Scheduling Logic

* Example:

```
Day 1:
Event Created → 4:10 UTC
Drop Completed → 4:15 UTC
Mining Completed → Event Ends

Day 2:
Next Event Start Time =
Previous Day Completion Time + 5 minutes
→ 4:20 UTC
```

---

### 14. Condition for Next Event

* Next event is created ONLY IF:

  * Mining reward was successfully received in previous event

---

# 🔷 Key System Characteristics

### ✅ Fully Automated After Setup

* No repeated manual input required after initial configuration

### ✅ Blockchain-Accurate Data

* FCC rewards and transactions must be:

  * Pulled directly from blockchain
  * Not estimated or cached

### ✅ Multi-Wallet Parallel Handling

* All imported wallets follow identical logic independently

### ✅ Persistent Configuration

* Drop addresses remain saved and reused daily

---

# 🔷 Optional Improvements (Important)

You didn’t ask, but these will make your system **much stronger**:

### 1. Fail-Safe System

* Retry failed transactions automatically
* Mark wallet as “inactive” after multiple failures

### 2. Logging System

* Maintain logs:

  * Event start/end
  * Rewards
  * Errors

### 3. Rate Limiting / Gas Optimization

* Batch transactions if possible
* Avoid unnecessary RPC calls