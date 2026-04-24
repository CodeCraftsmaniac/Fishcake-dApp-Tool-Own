# Operational Procedures

## Secret Rotation

### JWT Secret Rotation
1. Generate new secret: `openssl rand -hex 32`
2. Update `JWT_SECRET` in Oracle VM `.env.fishcake`
3. Update `JWT_SECRET` in Vercel environment variables
4. Restart backend: `pm2 restart fishcake-backend`
5. All existing tokens will be invalidated; users must re-authenticate

### RPC Key Rotation
1. Generate new API key from Alchemy/Infura dashboard
2. Update `RPC_ALCHEMY` in Oracle VM `.env.fishcake`
3. Restart backend: `pm2 restart fishcake-backend`
4. Verify RPC health: `curl http://localhost:3001/api/mining/rpc/status`

### Supabase Key Rotation
1. Generate new keys from Supabase Dashboard > Settings > API
2. Update `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` in `.env.fishcake`
3. Restart backend: `pm2 restart fishcake-backend`

### Wallet Passphrase Rotation
1. Login with current passphrase via `/api/mining/auth/login`
2. All encrypted keys use the old passphrase
3. To rotate: re-import wallets with new passphrase
4. Old wallets must be deleted and re-imported

## Production Monitoring

### Health Check (Automated)
- Endpoint: `GET /health`
- Expected: `{ "status": "healthy" }`
- Setup UptimeRobot or similar to poll every 60s

### Key Metrics to Monitor
- `GET /api/mining/metrics` - Event counts, wallet counts, failure rates
- `GET /api/mining/rpc/status` - RPC endpoint health and latency
- `GET /health` - Memory usage (heapUsed/heapTotal)

### Alert Thresholds
- Memory: Alert if heapUsed > 80% of heapTotal
- RPC: Alert if 0 healthy endpoints
- Events: Alert if failedEvents > 10% of totalEvents
- SSE: Alert if connections > 40 (of 50 max)

### Log Monitoring
```bash
# PM2 logs
pm2 logs fishcake-backend --lines 100

# Application logs (SQLite)
npx tsx scripts/query-logs.ts --level ERROR --last 24h
```

## Backup & Restore

### SQLite Backup
```bash
# Manual backup
npx tsx scripts/backup-sqlite.ts

# List backups
npx tsx scripts/backup-sqlite.ts --list

# Restore from backup
npx tsx scripts/backup-sqlite.ts --restore mining-2024-01-01T00-00-00.db
```

### Automated Backup (Cron)
```bash
# Add to crontab (every 6 hours)
crontab -e
0 */6 * * * cd ~/fishcake-backend && npx tsx scripts/backup-sqlite.ts >> ~/backup.log 2>&1
```

### Supabase Migration
```bash
# Migrate all data from SQLite to Supabase
npx tsx scripts/migrate-to-supabase.ts
```

## Deployment Checklist

### First Deployment
1. [ ] SSH into VM: `ssh -i ~/.ssh/oracle_fcc_bot_v3 opc@129.80.144.145`
2. [ ] Clone repo: `git clone https://github.com/CodeCraftsmaniac/Fishcake-dApp-Tool-Own.git ~/fishcake-backend`
3. [ ] Install dependencies: `cd ~/fishcake-backend/backend && npm install`
4. [ ] Configure env: `cp .env.example .env && nano .env`
5. [ ] Build: `npm run build`
6. [ ] Start: `pm2 start ecosystem.config.js`
7. [ ] Configure Nginx (see ORACLE_VM_SETUP.md)
8. [ ] Setup Vercel for Web-App (connect GitHub repo)
9. [ ] Set NEXT_PUBLIC_API_URL in Vercel env vars
10. [ ] Run E2E tests: `npx tsx scripts/e2e-test.ts http://localhost:3001`

### Subsequent Deployments
1. [ ] CI/CD auto-deploys on push to `main`
2. [ ] Verify health: `curl https://your-domain/health`
3. [ ] Check PM2: `pm2 status`
4. [ ] Review logs: `pm2 logs fishcake-backend --lines 50`

## Incident Response

### Backend Down
1. SSH into VM
2. `pm2 status` - check if process is running
3. `pm2 logs fishcake-backend --lines 100` - check for errors
4. `pm2 restart fishcake-backend` - restart if needed
5. If persistent: `pm2 delete fishcake-backend && pm2 start ecosystem.config.js`

### Database Corrupted
1. Stop backend: `pm2 stop fishcake-backend`
2. List backups: `npx tsx scripts/backup-sqlite.ts --list`
3. Restore: `npx tsx scripts/backup-sqlite.ts --restore <backup-file>`
4. Start backend: `pm2 start fishcake-backend`

### All RPC Endpoints Down
1. Check status: `curl http://localhost:3001/api/mining/rpc/status`
2. The system auto-pauses mining when RPC is unhealthy
3. Add new RPC URL via API: `curl -X POST http://localhost:3001/api/mining/rpc/switch -H "Authorization: Bearer $TOKEN" -d '{"rpcUrl":"https://new-rpc-url"}'`
4. Or update `RPC_ALCHEMY` env var and restart

### Memory Leak
1. Check memory: `curl http://localhost:3001/health | jq .data.memory`
2. If heapUsed > 400MB: `pm2 restart fishcake-backend`
3. Review SSE connections: `curl http://localhost:3001/api/mining/status`
