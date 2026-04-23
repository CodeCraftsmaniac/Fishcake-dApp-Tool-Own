# Fishcake CLI-App

Command-line interface for the Fishcake dApp on Polygon Mainnet.

## Overview

The CLI provides:
- Wallet setup (import/generate/mnemonic)
- Secure keystore with AES-256-GCM encryption
- Event creation and management
- Drop rewards (single and batch)
- QR code generation
- Token swap (buy/sell FCC)
- NFT minting (Basic/Pro)
- Dashboard with balances
- Address book with groups
- Event caching with TTL

## Quick Start

```bash
cd CLI-App
npm install
npm run build
npm run start
```

## Features

1. **Wallet Setup** - Import private key, import mnemonic (12/15/18/21/24 words, 8 languages), or generate new wallet
2. **Create Event** - Create mining events on-chain
3. **My Events** - View and manage your events
4. **Event Detail** - Detailed event information
5. **Finish Event** - Complete event lifecycle
6. **Drop Reward** - Single recipient drop
7. **Batch Drop** - CSV import for multiple drops
8. **Generate QR** - Create claim QR codes
9. **Drop History** - Historical drop records
10. **Buy FCC** - Swap USDT for FCC
11. **Sell FCC** - Swap FCC for USDT
12. **Mint Basic NFT** - Mint merchant NFT (type 2)
13. **Mint Pro NFT** - Mint merchant NFT (type 1)
14. **Dashboard** - View balances and stats
15. **Mining Status** - Check mining automation status
16. **Browse Events** - Paginated event browser

## Architecture

- `src/index.ts` - Entry point and wallet unlock flow
- `src/wallet/keystore.ts` - Keystore operations and encryption
- `src/services/` - Business logic services
- `src/features/` - User-facing feature implementations
- `src/frontend/` - Terminal UI and menu system
- `src/cache/eventCache.ts` - Event caching with TTL
- `src/blockchain/provider.ts` - Blockchain provider setup
- `src/api/client.ts` - API client for fishcake.io
