# Recovery Procedure

## Database Recovery

### Backup
```bash
# Automated backup (runs daily via cron)
./scripts/backup-database.sh

# Manual backup
sqlite3 data/mining.db ".backup data/backups/mining_$(date +%Y%m%d_%H%M%S).db"
```

### Restore from Backup
```bash
# 1. Stop the backend
pm2 stop fishcake-backend

# 2. Copy backup over current database
cp data/backups/mining_YYYYMMDD_HHMMSS.db data/mining.db

# 3. Restart the backend
pm2 start fishcake-backend

# 4. Verify data integrity
curl http://localhost:3001/health
curl http://localhost:3001/api/mining/metrics
```

### Supabase Recovery
```bash
# 1. Export data from Supabase dashboard (SQL editor)
# 2. Re-run migration.sql if schema is corrupted
# 3. Import data from backup CSV
```

## VM Recovery

### VM Unresponsive
```bash
# 1. Reboot via OCI CLI
oci compute instance action --action RESET --instance-id <OCID>

# 2. Wait 60s, then SSH
ssh -i ~/.ssh/oracle_fcc_bot_v3 opc@129.80.144.145

# 3. Restart backend
cd ~/fishcake-backend
pm2 restart fishcake-backend
```

### Full VM Rebuild
```bash
# 1. Push to main branch - GitHub Actions will auto-deploy
git push origin main

# 2. Or manually:
rsync -az backend/dist/ opc@129.80.144.145:~/fishcake-backend/backend/dist/
rsync -az backend/node_modules/ opc@129.80.144.145:~/fishcake-backend/backend/node_modules/
ssh opc@129.80.144.145 "cd ~/fishcake-backend && pm2 restart fishcake-backend"
```

## Key Rotation

### JWT Secret
1. Generate new secret: `openssl rand -hex 64`
2. Update GitHub Secret: `gh secret set JWT_SECRET --body "<new_secret>"`
3. Update VM .env: `ssh opc@VM "vi ~/fishcake-backend/backend/.env"`
4. Restart: `pm2 restart fishcake-backend`

### Supabase Keys
1. Rotate in Supabase Dashboard → Settings → API
2. Update GitHub Secrets: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Update VM .env and restart

### RPC Endpoints
1. Update GitHub Secrets: `RPC_ALCHEMY`, etc.
2. Update VM .env and restart
