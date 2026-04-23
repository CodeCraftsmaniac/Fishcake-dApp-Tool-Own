# Fishcake Backend

Express.js backend for the Fishcake dApp mining automation system.

## Overview

The backend provides:
- REST API for wallet management and mining automation
- AES-256-GCM encryption for private keys (PBKDF2, 100k iterations)
- JWT authentication with access/refresh tokens
- Rate limiting per endpoint
- RPC endpoint pool with failover
- Mining scheduler with cron-like ticks
- SSE real-time event streaming
- SQLite database with WAL mode

## Quick Start

```bash
cd backend
npm install
npm run build
npm run start
```

## API Endpoints

- `GET /health` - Health check
- `GET /version` - Version info
- `GET /api/mining/status` - Mining status
- `POST /api/mining/start` - Start mining scheduler
- `POST /api/mining/stop` - Stop mining scheduler
- `GET /api/mining/config` - Get mining config
- `PUT /api/mining/config` - Update mining config
- `GET /api/mining/wallets` - List wallets
- `POST /api/mining/wallets/import` - Import wallet
- `DELETE /api/mining/wallets/:address` - Delete wallet
- `GET /api/mining/events` - List events
- `GET /api/mining/stats` - Mining statistics
- `GET /api/mining/stream` - SSE real-time stream
- `GET /api/rpc/status` - RPC pool status

## Environment Variables

See `.env.example` for all required variables.

## Architecture

- `src/server.ts` - Express server with middleware
- `src/mining/scheduler.ts` - Mining automation scheduler
- `src/mining/eventProcessor.ts` - Blockchain event processing
- `src/mining/encryption.ts` - AES-256-GCM encryption
- `src/mining/database.ts` - SQLite database operations
- `src/mining/rpcPool.ts` - RPC endpoint pool
- `src/mining/jwtAuth.ts` - JWT authentication
- `src/mining/rateLimiter.ts` - Rate limiting
- `src/mining/nonceManager.ts` - Transaction nonce management
- `src/mining/nftService.ts` - NFT minting service
