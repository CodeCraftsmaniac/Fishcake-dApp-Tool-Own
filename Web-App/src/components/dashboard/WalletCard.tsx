'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, Badge, Skeleton } from '@/components/ui';
import { formatNumber, formatCountdown } from '@/lib/utils';
import { Wallet, Sparkles, Timer } from 'lucide-react';

interface WalletCardProps {
  address: string | null;
  fccBalance: string;
  usdtBalance: string;
  polBalance: string;
  nftType: 'none' | 'basic' | 'pro';
  nftExpiresAt: number | null;
  isLoading?: boolean;
}

export function WalletCard({
  address,
  fccBalance,
  usdtBalance,
  polBalance,
  nftType,
  nftExpiresAt,
  isLoading,
}: WalletCardProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // Only run timer if we have an NFT with expiration
  useEffect(() => {
    if (!nftExpiresAt || nftType === 'none') return;
    
    // Update every 60 seconds instead of every 1 second (for day/hour countdown)
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [nftExpiresAt, nftType]);

  const countdown = useMemo(() => {
    if (!nftExpiresAt) return '';
    const remaining = nftExpiresAt - now;
    return remaining > 0 ? formatCountdown(remaining) : 'Expired';
  }, [nftExpiresAt, now]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden relative">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-fishcake-500/5 via-transparent to-purple-500/5" />
      
      <CardContent className="p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-fishcake flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Wallet</h3>
              <p className="text-sm text-muted-foreground font-mono">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
              </p>
            </div>
          </div>
          
          {/* NFT Pass Badge */}
          {nftType !== 'none' && (
            <div className="flex items-center gap-2">
              <Badge variant={nftType === 'pro' ? 'pro' : 'basic'} className="gap-1.5">
                <Sparkles className="h-3 w-3" />
                {nftType.toUpperCase()} Pass
              </Badge>
              {countdown && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  {countdown}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Balances */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-fishcake-500/10 border border-fishcake-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🍥</span>
              <span className="text-sm text-muted-foreground">FCC</span>
            </div>
            <p className="text-2xl font-bold text-fishcake-500">
              {formatNumber(fccBalance, 2)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💲</span>
              <span className="text-sm text-muted-foreground">USDT</span>
            </div>
            <p className="text-2xl font-bold text-green-500">
              {formatNumber(usdtBalance, 2)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⟠</span>
              <span className="text-sm text-muted-foreground">POL</span>
            </div>
            <p className="text-2xl font-bold text-purple-500">
              {formatNumber(polBalance, 4)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
