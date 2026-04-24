#!/bin/bash
# Fishcake Backend - Deploy to Oracle VM
# Run on the VM: bash deploy.sh
# Or from local: ssh -i ~/.ssh/oracle_fcc_bot_v3 opc@129.80.144.145 "cd ~/apps/fishcake-backend && bash backend/deploy.sh"

set -e

APP_DIR="${HOME}/apps/fishcake-backend"
BACKEND_DIR="${APP_DIR}/backend"

echo "=== Fishcake Backend Deployment ==="
echo "Time: $(date)"
echo ""

# Check if repo exists
if [ ! -d "${BACKEND_DIR}" ]; then
  echo "❌ Backend directory not found at ${BACKEND_DIR}"
  echo "   Run oracle_setup.sh first to clone and set up the repo."
  exit 1
fi

cd "${BACKEND_DIR}"

# ============================================
# Step 1: Pull latest code
# ============================================
echo "=== Pulling latest code ==="
git fetch origin main
git reset --hard origin/main
echo "Code updated."

# ============================================
# Step 2: Install dependencies
# ============================================
echo "=== Installing dependencies ==="
npm ci --omit=dev
echo "Dependencies installed."

# ============================================
# Step 3: Build TypeScript
# ============================================
echo "=== Building TypeScript ==="
npm run build
echo "Build complete."

# ============================================
# Step 4: Verify .env exists
# ============================================
if [ ! -f ".env" ]; then
  echo "❌ .env file not found! Create it first:"
  echo "   cp .env.example .env"
  echo "   nano .env"
  exit 1
fi

# ============================================
# Step 5: Restart PM2
# ============================================
echo "=== Restarting backend ==="
if pm2 describe fishcake-backend > /dev/null 2>&1; then
  pm2 restart fishcake-backend
  echo "PM2 process restarted."
else
  pm2 start dist/server.js --name fishcake-backend
  pm2 save
  echo "PM2 process started (new)."
fi

# ============================================
# Step 6: Wait and verify
# ============================================
echo ""
echo "Waiting for health check..."
sleep 3

HEALTH=$(curl -s http://localhost:3001/health 2>&1 || echo "FAILED")

if echo "$HEALTH" | grep -q "healthy"; then
  echo "✅ Backend is HEALTHY"
  echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
else
  echo "⚠️  Backend may not be healthy. Check logs:"
  echo "   pm2 logs fishcake-backend"
  echo ""
  echo "Health response: $HEALTH"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Time: $(date)"
echo ""
echo "Useful commands:"
echo "  pm2 status                    # Check process status"
echo "  pm2 logs fishcake-backend     # View logs"
echo "  pm2 restart fishcake-backend  # Restart"
echo "  curl http://localhost:3001/health  # Health check"
