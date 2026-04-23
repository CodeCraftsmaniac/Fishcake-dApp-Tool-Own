# Contributing to Fishcake dApp Tool

## Branch Naming
- `feat/` - New features (e.g., `feat/wallet-export`)
- `fix/` - Bug fixes (e.g., `fix/sse-connection-leak`)
- `chore/` - Maintenance (e.g., `chore/update-deps`)
- `docs/` - Documentation only

## Pull Request Process
1. Create a branch from `main`
2. Make your changes with clear commit messages
3. Ensure CI passes (lint + build for backend, web-app, and CLI)
4. Open a PR with a description of changes

## Code Style
- **Backend**: TypeScript with ESLint, strict mode
- **Frontend**: Next.js with TypeScript, Tailwind CSS, shadcn/ui
- **CLI**: TypeScript with Inquirer prompts
- Use structured logger (`logger.ts`) instead of `console.log`
- No private keys or secrets in source code

## Testing
- Backend: `cd backend && npm run build`
- Frontend: `cd Web-App && npm run build`
- CLI: `cd CLI-App && npm run build`
- Full: `npm run build:all` from root

## Environment Setup
1. Copy `.env.example` to `.env` in each project
2. Fill in required values (RPC URLs, JWT secret, etc.)
3. Backend runs on port 3001, Web-App on port 3000
