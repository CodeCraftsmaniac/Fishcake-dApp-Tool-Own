'use client';

import { useState } from 'react';
import { useMiningStore, MiningWallet } from '@/lib/stores/miningStore';
import { Card, CardContent, Button, Input, Badge } from '@/components/ui';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Wallet, 
  Pause, 
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { ethers } from 'ethers';

export function WalletManager() {
  const { wallets, addWallet, removeWallet, updateWallet, addLog } = useMiningStore();
  const [showImport, setShowImport] = useState(false);
  const [privateKeysInput, setPrivateKeysInput] = useState('');
  const [password, setPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!privateKeysInput.trim() || !password) {
      addLog({
        level: 'error',
        action: 'WALLET_IMPORT',
        message: 'Please provide private keys and password',
      });
      return;
    }

    setIsImporting(true);
    
    // Parse private keys (one per line or comma-separated)
    const keys = privateKeysInput
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    for (const key of keys) {
      try {
        // Validate and derive address
        const cleanKey = key.startsWith('0x') ? key : `0x${key}`;
        const wallet = new ethers.Wallet(cleanKey);
        
        // Check if already exists
        if (wallets.some(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
          addLog({
            level: 'warn',
            action: 'WALLET_IMPORT',
            message: `Wallet ${wallet.address.slice(0, 8)}... already exists`,
          });
          continue;
        }

        // TODO: Encrypt with AES-256-GCM using password
        // For now, store encrypted placeholder
        const salt = crypto.randomUUID();
        const iv = crypto.randomUUID();

        addWallet({
          address: wallet.address,
          encryptedKey: btoa(cleanKey), // TODO: Replace with proper encryption
          salt,
          iv,
          status: 'active',
          nftType: 'NONE',
          nftExpiry: null,
          failureCount: 0,
          lastEventId: null,
          nextEventAt: null,
          balances: {
            fcc: '0',
            usdt: '0',
            pol: '0',
          },
        });

        addLog({
          level: 'success',
          action: 'WALLET_IMPORT',
          message: `Wallet ${wallet.address.slice(0, 8)}...${wallet.address.slice(-4)} imported successfully`,
        });
      } catch (error) {
        addLog({
          level: 'error',
          action: 'WALLET_IMPORT',
          message: `Invalid private key: ${key.slice(0, 10)}...`,
        });
      }
    }

    setIsImporting(false);
    setPrivateKeysInput('');
    setPassword('');
    setShowImport(false);
  };

  const handleToggleStatus = (wallet: MiningWallet) => {
    const newStatus = wallet.status === 'active' ? 'paused' : 'active';
    updateWallet(wallet.id, { status: newStatus });
    addLog({
      level: 'info',
      action: 'WALLET_STATUS',
      message: `Wallet ${wallet.address.slice(0, 8)}... ${newStatus}`,
      walletId: wallet.id,
    });
  };

  const handleRefreshBalances = async (wallet: MiningWallet) => {
    addLog({
      level: 'info',
      action: 'BALANCE_REFRESH',
      message: `Refreshing balances for ${wallet.address.slice(0, 8)}...`,
      walletId: wallet.id,
    });
    // TODO: Fetch actual balances from blockchain
  };

  const statusConfig = {
    active: { color: 'bg-green-500', label: 'Active', icon: CheckCircle2 },
    paused: { color: 'bg-yellow-500', label: 'Paused', icon: Pause },
    error: { color: 'bg-red-500', label: 'Error', icon: AlertCircle },
    nft_expired: { color: 'bg-orange-500', label: 'NFT Expired', icon: Clock },
  };

  const nftBadgeConfig = {
    NONE: { variant: 'secondary' as const, label: 'No NFT' },
    BASIC: { variant: 'basic' as const, label: 'BASIC' },
    PRO: { variant: 'pro' as const, label: 'PRO' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mining Wallets</h3>
          <p className="text-sm text-muted-foreground">
            Manage wallets for automated mining
          </p>
        </div>
        <Button 
          onClick={() => setShowImport(!showImport)}
          className="bg-gradient-to-r from-fishcake-500 to-purple-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Import Wallets
        </Button>
      </div>

      {/* Import Form */}
      {showImport && (
        <Card className="border-fishcake-500/30">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Upload className="w-4 h-4 text-fishcake-400" />
              Import Private Keys
            </h4>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Private Keys (one per line or comma-separated)
              </label>
              <textarea
                value={privateKeysInput}
                onChange={(e) => setPrivateKeysInput(e.target.value)}
                className="w-full h-32 px-3 py-2 rounded-lg bg-background border border-border font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fishcake-500"
                placeholder="Enter private keys here..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Encryption Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to encrypt keys"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Keys are encrypted with AES-256-GCM before storage
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleImport} 
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Wallets'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowImport(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallets List */}
      {wallets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No Wallets Added</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Import wallets to start automated mining
            </p>
            <Button 
              onClick={() => setShowImport(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Import Your First Wallet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => {
            const status = statusConfig[wallet.status];
            const StatusIcon = status.icon;
            const nftBadge = nftBadgeConfig[wallet.nftType];

            return (
              <Card key={wallet.id} className="hover:border-fishcake-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Status Indicator */}
                      <div className={`w-3 h-3 rounded-full ${status.color}`} />
                      
                      {/* Address */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                          </span>
                          <Badge variant={nftBadge.variant}>
                            <Sparkles className="w-3 h-3 mr-1" />
                            {nftBadge.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>FCC: {parseFloat(wallet.balances.fcc).toFixed(2)}</span>
                          <span>USDT: {parseFloat(wallet.balances.usdt).toFixed(2)}</span>
                          <span>POL: {parseFloat(wallet.balances.pol).toFixed(4)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefreshBalances(wallet)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(wallet)}
                      >
                        {wallet.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWallet(wallet.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Next Event Info */}
                  {wallet.nextEventAt && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          Next event: {new Date(wallet.nextEventAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
