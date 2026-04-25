#!/bin/bash
set -e

# Fix firewall
sudo iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 3001 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables.rules

# Persist firewall
sudo sh -c 'echo "#!/bin/sh" > /etc/rc.local'
sudo sh -c 'echo "iptables-restore < /etc/iptables.rules" >> /etc/rc.local'
sudo chmod +x /etc/rc.local

# Show versions
echo "Node: $(node --version)"
echo "PM2: $(pm2 --version)"

# Check app directory
ls -la ~/fishcake-backend/ 2>/dev/null || echo "App directory not created yet"

echo "VM_FIX_COMPLETE"
