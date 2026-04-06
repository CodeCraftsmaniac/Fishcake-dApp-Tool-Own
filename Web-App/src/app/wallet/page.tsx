'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { useWallet } from '@/lib/providers';
import { useWalletStore } from '@/lib/stores';
import { POLYGON_RPC, getExplorerUrl } from '@/lib/config';
import { formatNumber, formatAddress, copyToClipboard } from '@/lib/utils';
import { Wallet, Copy, Check, ExternalLink, LogOut, Key, Lock } from 'lucide-react';

export default function WalletPage() {
  const { address, isConnected, disconnect, isLoading } = useWallet();
  const { balances, nftPass } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [polBalance, setPolBalance] = useState<string>('0');

  // Fetch POL balance
  useEffect(() => {
    if (!address) return;

    const fetchBalance = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const balance = await provider.getBalance(address);
        setPolBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error('Failed to fetch POL balance:', error);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [address]);

  const handleCopy = async () => {
    if (address) {
      await copyToClipboard(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto py-12">
          <Card className="text-center">
            <CardContent className="py-12">
              <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-secondary animate-pulse" />
              <p className="text-muted-foreground">Loading wallet...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!isConnected) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto py-12">
          <Card className="text-center">
            <CardContent className="py-12">
              <Wallet className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Import your private key to access all features
              </p>
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Key className="h-4 w-4" />
                  <span>Private key + Passphrase</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>AES-256-GCM encrypted</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your connected wallet
          </p>
        </div>

        {/* Wallet Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-fishcake flex items-center justify-center">
                <Wallet className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-lg font-medium">
                    {formatAddress(address!, 8)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <a
                    href={getExplorerUrl('address', address!)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    Polygon Mainnet
                  </Badge>
                  {nftPass.type !== 'none' && (
                    <Badge variant={nftPass.type === 'pro' ? 'pro' : 'basic'}>
                      {nftPass.type.toUpperCase()} Pass
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-fishcake-500/10 border border-fishcake-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🍥</span>
                  <span className="text-sm text-muted-foreground">FCC</span>
                </div>
                <p className="text-2xl font-bold text-fishcake-500">
                  {formatNumber(balances.fcc, 2)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💲</span>
                  <span className="text-sm text-muted-foreground">USDT</span>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {formatNumber(balances.usdt, 2)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⟠</span>
                  <span className="text-sm text-muted-foreground">POL</span>
                </div>
                <p className="text-2xl font-bold text-purple-500">
                  {formatNumber(polBalance || '0', 4)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NFT Pass Status */}
        {nftPass.type !== 'none' && (
          <Card>
            <CardHeader>
              <CardTitle>NFT Pass Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    nftPass.type === 'pro' 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  }`}>
                    <span className="text-2xl">✨</span>
                  </div>
                  <div>
                    <p className="font-medium">{nftPass.type.toUpperCase()} Merchant Pass</p>
                    <p className="text-sm text-muted-foreground">
                      {nftPass.isValid ? 'Active' : 'Expired'}
                    </p>
                  </div>
                </div>
                <Badge variant={nftPass.isValid ? 'active' : 'finished'}>
                  {nftPass.isValid ? 'Valid' : 'Expired'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => disconnect()}
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              >
                <span className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <p className="font-medium">Disconnect Wallet</p>
                  <p className="text-xs text-muted-foreground">
                    Sign out and clear session
                  </p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
