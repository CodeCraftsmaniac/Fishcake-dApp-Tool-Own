# 🐟 Fishcake Platform

A complete platform for the [fishcake.io](https://fishcake.io) dApp on Polygon Mainnet, featuring both CLI and Web interfaces with a shared backend.

## 🏗️ Architecture

This is a **monorepo** with three packages:

```
fishcake-platform/
├── backend/      # @fishcake/backend - Shared business logic & blockchain services
├── CLI-App/      # @fishcake/cli-app - Terminal interface
├── Web-App/      # @fishcake/web-app - Next.js web application
└── keystore/     # Encrypted wallet files (git-ignored)
```

## ✨ Features

- **Event Management**: Create, view, and manage reward events
- **Drop Rewards**: Send rewards to single or multiple addresses
- **Quick Airdrop**: One-click event creation + instant drops
- **QR Code Generation**: Generate claim QR codes for events
- **Token Operations**: Buy/sell FCC tokens with USDT
- **NFT Minting**: Mint Basic (8 USDT) or Pro (80 USDT) NFTs
- **Dashboard**: View balances, NFTs, and mining status
- **Secure Wallet**: AES-256-GCM encrypted private key storage
- **Real-time Gas**: Live Polygon gas tracker

## 📋 Prerequisites

- Node.js 20+ LTS
- npm (or pnpm/yarn)

## 🚀 Quick Start

### 1. Install All Dependencies

```bash
# From root directory - installs all packages
npm install

# Or install each package individually
cd backend && npm install
cd ../CLI-App && npm install
cd ../Web-App && npm install
```

### 2. Build Backend (Required First)

```bash
cd backend
npm run build
```

### 3. Run CLI Application

```bash
cd CLI-App
npm run dev      # Development mode
npm run build    # Build for production
npm start        # Run production build
```

### 4. Run Web Application

```bash
cd Web-App
npm run dev      # Development mode (localhost:3000)
npm run build    # Build for production
npm start        # Run production build
```

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=137
API_BASE_URL=https://fishcake.io
KEYSTORE_PATH=./keystore/wallet.enc
```

### Supported RPC Endpoints

The platform supports multiple RPC endpoints with automatic fallback:

| Provider | URL |
|----------|-----|
| Alchemy (Recommended) | `https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| dRPC | `https://lb.drpc.live/polygon/YOUR_KEY` |
| Polygon Public | `https://polygon-rpc.com` |

## 🔐 Security

- Private keys are encrypted with **AES-256-GCM**
- Passphrase is hashed with SHA-256 before use as encryption key
- Keystore files are excluded from git via .gitignore
- All blockchain transactions require explicit confirmation
- Never stores private keys in plain text

## ⚠️ Token Decimals

**Critical**: Both FCC and USDT use **6 decimals** (not 18). POL uses 18 decimals.

## 📍 Contract Addresses (Polygon Mainnet)

| Contract | Address |
|----------|---------|
| Event Manager | `0x2CAf752814f244b3778e30c27051cc6B45CB1fc9` |
| FCC Token | `0x84eBc138F4Ab844A3050a6059763D269dC9951c6` |
| USDT Token | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| NFT Manager | `0x2F2Cb24BaB1b6E2353EF6246a2Ea4ce50487008B` |
| Direct Sale Pool | `0xff99312c30466740bDA94b3Ff9E8FC1071BF18cE` |
| Investor Sale Pool | `0xBBFa44467E12e6141B2961EE13705B9b6e3Ebe8B` |
| Redemption Pool | `0x953E6DB14753552050B04a6393a827661bB4913a` |

## 🎮 CLI Menu

```
EVENT MANAGEMENT
  1.  Create Event
  2.  My Events
  3.  Event Detail (by ID)
  4.  Finish Event

DROP & REWARD
  5.  Drop Reward (single address)
  6.  Batch Drop (CSV / multi)
  7.  Generate Claim QR Code
  8.  Drop History

TOKEN & NFT
  9.  Buy FCC (USDT → FCC)
  10. Sell FCC (FCC → USDT)
  11. Mint Basic NFT (8 USDT)
  12. Mint Pro NFT (80 USDT)

ACCOUNT
  13. Dashboard (Balance + NFTs)
  14. Mining Status
  15. Browse Events

QUICK ACTIONS
  Q - Quick Airdrop
  A - Address Book
  W - Wallet Management

0. Exit
```

## 🌐 Web App Pages

- **Dashboard** (`/`) - Overview with balances and gas tracker
- **Events** (`/events`) - Create and manage events
- **Drops** (`/drops`) - Execute drops and view history
- **Swap** (`/swap`) - Buy/sell FCC tokens
- **NFT** (`/nft`) - Mint business NFTs
- **Wallet** (`/wallet`) - Wallet management
- **Settings** (`/settings`) - Address book and configuration

## 📦 Package Details

### @fishcake/backend

Shared business logic including:
- Blockchain contract interactions
- Wallet encryption/decryption
- Event caching
- API client
- Configuration management

### @fishcake/cli-app

Terminal interface with:
- Interactive menus (inquirer)
- Colored output (chalk)
- Progress spinners (ora)
- Tables and boxes (cli-table3, boxen)
- QR code generation

### @fishcake/web-app

Next.js 14 web application with:
- App Router architecture
- Tailwind CSS + Shadcn/UI
- wagmi v2 for Web3
- Real-time updates
- Responsive design

## 🔧 Development

```bash
# Build all packages
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## 📄 License

MIT
