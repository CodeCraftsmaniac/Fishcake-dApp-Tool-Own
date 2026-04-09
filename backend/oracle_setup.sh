#!/bin/bash
# Fishcake Backend Setup Script for Oracle VM
# Run this script as: bash setup_fishcake.sh

set -e

echo "=== Installing Git ==="
sudo dnf install -y git

echo "=== Installing Node.js via NodeSource ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

echo "=== Installing PM2 ==="
sudo npm install -g pm2

echo "=== Cloning Repository ==="
cd ~
git clone https://github.com/CodeCraftsmaniac/Fishcake-dApp-Tool-Own.git fishcake-backend || true
cd fishcake-backend/backend

echo "=== Installing Dependencies ==="
npm ci

echo "=== Building Backend ==="
npm run build

echo "=== Creating Environment File ==="
cat > .env << 'EOF'
PORT=3001
NODE_ENV=production
FRONTEND_URLS=https://fishcake-dapp.vercel.app,http://localhost:3000
SUPABASE_URL=https://znatmrnkfjptiensiybb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYXRtcm5rZmpwdGllbnNpeWJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU0NTIyOCwiZXhwIjoyMDkxMTIxMjI4fQ.1oTu1CHLdYwUFtLAlO7IEkqwrqgIFQQFGMPYdXDnNFA
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYXRtcm5rZmpwdGllbnNpeWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDUyMjgsImV4cCI6MjA5MTEyMTIyOH0.dRdIWV2Ps9eMuWMhoQKFczJUMXFkZo9ahyNo7qOmWw8
EOF

echo "=== Starting Backend with PM2 ==="
pm2 start dist/serverSupabase.js --name fishcake-backend
pm2 save
pm2 startup | tail -1 | bash

echo "=== Setup Complete! ==="
echo "Check status: pm2 status"
echo "View logs: pm2 logs fishcake-backend"
curl http://localhost:3001/health