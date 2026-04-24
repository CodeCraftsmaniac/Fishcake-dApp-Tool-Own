#!/bin/bash
set -e

# Open firewall
sudo iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 3001 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables.rules
sudo sh -c 'echo "#!/bin/sh" > /etc/rc.local'
sudo sh -c 'echo "iptables-restore < /etc/iptables.rules" >> /etc/rc.local'
sudo chmod +x /etc/rc.local

# Install Node.js 20
cd ~
curl -fsSL https://nodejs.org/dist/v20.12.2/node-v20.12.2-linux-x64.tar.xz | tar -xJf -
sudo mv node-v20.12.2-linux-x64 /usr/local/node
sudo ln -sf /usr/local/node/bin/node /usr/bin/node
sudo ln -sf /usr/local/node/bin/npm /usr/bin/npm

# Install PM2 globally
sudo npm install -g pm2
sudo ln -sf /usr/local/node/bin/pm2 /usr/bin/pm2

# Create app directories
mkdir -p ~/fishcake-backend/backend/dist
mkdir -p ~/fishcake-backend/backend/node_modules
mkdir -p ~/fishcake-backend/logs

# Setup PM2 startup
pm2 startup systemd --user opc 2>/dev/null || true

echo "Node: $(node --version)"
echo "PM2: $(pm2 --version)"
echo "VM_SETUP_COMPLETE"
