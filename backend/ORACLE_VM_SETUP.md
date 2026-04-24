# Oracle VM Backend Deployment Guide

## Overview

This guide covers deploying the Fishcake Backend to an Oracle Cloud VM.

## Prerequisites

- Oracle VM running Ubuntu 20.04+ (from VM_CREATED_AND_ACCESS.md)
- SSH access configured
- Domain/IP ready for backend API

## VM Details

- **IP**: 129.80.144.145
- **User**: ubuntu (or opc)
- **SSH Key**: Located in `C:\Users\rhran\.oci\` (Windows) or `~/.oci/` (Linux)

## Step 1: Initial VM Setup

SSH into the VM:
```bash
ssh -i ~/.ssh/your_private_key ubuntu@129.80.144.145
```

Update system and install prerequisites:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

## Step 2: Clone Repository

```bash
# Create app directory
mkdir -p ~/apps
cd ~/apps

# Clone repository (or pull if exists)
git clone https://github.com/CodeCraftsmaniac/Fishcake-dApp-Tool-Own.git fishcake-backend
cd fishcake-backend/backend
```

## Step 3: Configure Environment

Create production environment file:
```bash
cd ~/apps/fishcake-backend/backend
nano .env
```

Add these variables (copy from your local backend/.env):
```env
# Server
NODE_ENV=production
PORT=3001

# Frontend URLs (CORS whitelist)
FRONTEND_URLS=https://fishcake-dapp.vercel.app,http://localhost:3000

# Database Paths (SQLite)
DATABASE_PATH=/app/data/fishcake.db
MINING_DB_PATH=/app/data/mining.db

# Supabase (get from Supabase Dashboard > Settings > API)
SUPABASE_URL=https://znatmrnkfjptiensiybb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# RPC URLs (Polygon Mainnet)
RPC_PUBLICNODE=https://polygon-bor-rpc.publicnode.com
RPC_ANKR=https://rpc.ankr.com/polygon
RPC_LLAMARPC=https://polygon.llamarpc.com
RPC_BLOCKPI=https://polygon.blockpi.network/v1/rpc/public

# Optional: Private RPC keys for better reliability
# RPC_ALCHEMY=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
# RPC_DRPC=https://lb.drpc.org/ogrpc?network=polygon&dkey=YOUR_KEY

# JWT Secret (generate: openssl rand -base64 64)
JWT_SECRET=your-secure-jwt-secret-here

# Scheduler
SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL_MS=300000

# Logging
LOG_LEVEL=info
```

## Step 4: Build and Start

```bash
cd ~/apps/fishcake-backend/backend

# Install dependencies
npm ci --omit=dev

# Build TypeScript
npm run build

# Start with PM2 (load env from file)
pm2 start dist/server.js --name fishcake-backend --env-file .env

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Step 5: Configure Firewall

Open required ports:
```bash
# Allow HTTP/HTTPS and API port
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT

# Save iptables rules
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

Also ensure Oracle Cloud Security List allows:
- Ingress: TCP 8080 (API)
- Ingress: TCP 22 (SSH)
- Ingress: TCP 80/443 (optional, for reverse proxy)

## Step 6: Setup Nginx (Optional - Recommended)

Install and configure Nginx as reverse proxy:
```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/fishcake
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or use IP

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/fishcake /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Auto-Deploy Setup

Create deployment script:
```bash
nano ~/deploy-fishcake.sh
```

```bash
#!/bin/bash
set -e

cd ~/apps/fishcake-backend

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
cd backend
npm ci --omit=dev

echo "🔨 Building..."
npm run build

echo "🔄 Restarting PM2..."
pm2 restart fishcake-backend

echo "✅ Deployment complete!"
pm2 status
```

Make executable:
```bash
chmod +x ~/deploy-fishcake.sh
```

## Step 8: Verify Deployment

Check service status:
```bash
pm2 status
pm2 logs fishcake-backend --lines 50
```

Test health endpoint:
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0-supabase",
  "database": "supabase",
  ...
}
```

## Monitoring Commands

```bash
# View logs
pm2 logs fishcake-backend

# Monitor in real-time
pm2 monit

# Restart service
pm2 restart fishcake-backend

# Stop service
pm2 stop fishcake-backend

# Check memory/CPU
pm2 info fishcake-backend
```

## GitHub Actions Auto-Deploy

The CI/CD workflow (`.github/workflows/ci.yml`) auto-deploys on push to main.

Required GitHub Secrets:
- `ORACLE_VM_HOST`: 129.213.138.245
- `ORACLE_VM_USER`: ubuntu
- `ORACLE_VM_SSH_KEY`: Contents of your private SSH key

## Nginx Reverse Proxy (Recommended)

```bash
# Install Nginx
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Create config
sudo tee /etc/nginx/conf.d/fishcake.conf << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# HTTPS with Let's Encrypt (optional)
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

## Troubleshooting

### Connection refused
- Check PM2 is running: `pm2 status`
- Check port is open: `sudo netstat -tlnp | grep 8080`
- Check firewall: `sudo iptables -L INPUT -n`

### Supabase errors
- Verify env vars: `pm2 env fishcake-backend`
- Check Supabase dashboard for connection issues

### Out of memory
- Check memory: `free -h`
- Consider adding swap or upgrading VM
