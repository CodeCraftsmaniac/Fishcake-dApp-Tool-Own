# Fishcake Web-App

Next.js frontend for the Fishcake dApp mining automation system.

## Overview

The Web-App provides:
- Wallet connection and management
- Mining automation dashboard
- Real-time SSE updates
- NFT management
- Token swap interface
- Event management
- Dark/light mode
- Mobile responsive design

## Quick Start

```bash
cd Web-App
npm install
npm run dev      # Development
npm run build    # Production build
npm run start    # Production server
```

## Pages

- `/` - Dashboard (wallet connect)
- `/events` - Event list
- `/events/create` - Create event
- `/drops` - Drop management
- `/swap` - Token swap
- `/nft` - NFT management
- `/wallet` - Wallet details
- `/settings` - Settings
- `/settings/addresses` - Address book
- `/mining` - Mining dashboard
- `/mining/overview` - Mining overview
- `/mining/wallets` - Wallet manager
- `/mining/settings` - Mining settings
- `/mining/stats` - Mining statistics
- `/mining/workflow` - Workflow visualization
- `/mining/history` - Execution logs

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://129.213.138.245:3001
NEXT_PUBLIC_SUPABASE_URL=https://znatmrnkfjptiensiybb.supabase.co
```

## Architecture

- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/api/backendClient.ts` - Backend API client
- `src/lib/stores.ts` - Zustand state stores
- `src/lib/stores/miningStore.ts` - Mining automation store
- `src/lib/hooks/` - Custom React hooks
