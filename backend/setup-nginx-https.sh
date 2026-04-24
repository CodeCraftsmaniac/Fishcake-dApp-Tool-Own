#!/bin/bash
# Nginx + Let's Encrypt HTTPS Setup for Oracle VM
# Run as: sudo bash setup-nginx-https.sh
# Prerequisites: Domain name pointing to this VM's IP (129.80.144.145)

set -e

# ============================================
# CONFIGURATION - Update these before running
# ============================================
DOMAIN="api.fishcake.io"  # Change to your actual domain
EMAIL="your-email@example.com"  # Change to your email for Let's Encrypt
BACKEND_PORT=3001

echo "=== Nginx + HTTPS Setup for Fishcake Backend ==="
echo "Domain: $DOMAIN"
echo "Backend port: $BACKEND_PORT"
echo ""

# Check if domain is set
if [ "$DOMAIN" = "api.fishcake.io" ]; then
  echo "⚠️  WARNING: You are using the default domain placeholder."
  echo "   Press Ctrl+C and update DOMAIN variable in this script if needed."
  echo "   Continuing in 5 seconds..."
  sleep 5
fi

# ============================================
# Step 1: Install Nginx
# ============================================
echo "=== Installing Nginx ==="
sudo dnf install -y nginx

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo "Nginx installed and started."

# ============================================
# Step 2: Configure Nginx as reverse proxy
# ============================================
echo "=== Configuring Nginx reverse proxy ==="

sudo tee /etc/nginx/conf.d/fishcake-backend.conf > /dev/null << EOF
# Fishcake Backend - HTTP (will be upgraded to HTTPS by certbot)
server {
    listen 80;
    server_name ${DOMAIN};

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }

    # Reverse proxy to Node.js backend
    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

echo "Nginx reverse proxy configured."

# ============================================
# Step 3: Install Certbot + Get SSL certificate
# ============================================
echo "=== Installing Certbot ==="
sudo dnf install -y certbot python3-certbot-nginx

echo "=== Getting SSL certificate ==="
echo "This will ask you to agree to Let's Encrypt terms of service."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

echo "SSL certificate installed!"

# ============================================
# Step 4: Configure auto-renewal
# ============================================
echo "=== Setting up auto-renewal ==="
# Certbot installs a systemd timer by default, but let's verify
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

# Test renewal
sudo certbot renew --dry-run

echo "Auto-renewal configured."

# ============================================
# Step 5: Update firewall
# ============================================
echo "=== Updating firewall ==="
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

echo "Firewall updated (HTTP + HTTPS allowed)."

# ============================================
# Step 6: Verify
# ============================================
echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Your backend is now available at:"
echo "  HTTPS: https://${DOMAIN}"
echo "  HTTP:  Redirects to HTTPS automatically"
echo ""
echo "Verify with:"
echo "  curl https://${DOMAIN}/health"
echo ""
echo "Important: Update your frontend .env.production:"
echo "  NEXT_PUBLIC_API_URL=https://${DOMAIN}"
echo ""
echo "And update backend .env FRONTEND_URLS to include:"
echo "  FRONTEND_URLS=https://fishcake-dapp.vercel.app,https://${DOMAIN}"
