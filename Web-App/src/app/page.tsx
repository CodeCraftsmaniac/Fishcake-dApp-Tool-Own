'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { WalletCard, ActiveEventsCard, QuickActionsCard, StatsCard } from '@/components/dashboard';
import { useWalletStore } from '@/lib/stores';
import { useWallet } from '@/lib/providers';
import { useWalletSync, useGasPrice, useMyEvents } from '@/lib/hooks';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { Wallet, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';

function ConnectWalletPrompt() {
  const { connect } = useWallet();
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setError('');
    
    if (!privateKey.trim()) {
      setError('Please enter your private key');
      return;
    }
    if (!passphrase.trim() || passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    const hasUpper = /[A-Z]/.test(passphrase);
    const hasLower = /[a-z]/.test(passphrase);
    const hasDigit = /[0-9]/.test(passphrase);
    if (!hasUpper || !hasLower || !hasDigit) {
      setError('Passphrase must contain uppercase, lowercase, and a number');
      return;
    }

    setLoading(true);
    try {
      const success = await connect(privateKey.trim(), passphrase);
      if (!success) {
        setError('Invalid private key');
      }
    } catch {
      setError('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-2xl bg-gradient-fishcake flex items-center justify-center shadow-lg">
              <span className="text-4xl">🍥</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold gradient-text text-center mb-2">
            Fishcake
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Polygon Airdrop Platform
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: '🎯', label: 'Create Events' },
              { icon: '💧', label: 'Drop Rewards' },
              { icon: '💱', label: 'Swap Tokens' },
              { icon: '✨', label: 'Mint NFT Pass' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50"
              >
                <span>{feature.icon}</span>
                <span className="text-sm">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Connect Form */}
          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your private key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type="password"
                placeholder="Create a passphrase (min 8 chars, upper/lower/digit)"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="pl-10"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              onClick={handleConnect}
              variant="gradient"
              size="xl"
              className="w-full gap-2"
              disabled={loading}
            >
              <Wallet className="h-5 w-5" />
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
              <div>
                <p className="font-medium text-foreground mb-1">Secure Storage</p>
                <p>Your private key is encrypted with AES-256-GCM using your passphrase. It never leaves your browser.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const { address, balances, nftPass } = useWalletStore();
  const { data: events, isLoading: eventsLoading } = useMyEvents();

  // Calculate stats
  const totalEvents = events?.length || 0;
  const totalDrops = events?.reduce((sum, e) => sum + e.alreadyDropNumber, 0) || 0;
  const totalFCCDistributed = events
    ?.filter((e) => e.tokenSymbol === 'FCC')
    .reduce((sum, e) => sum + parseFloat(e.alreadyDropAmts) / 1e6, 0)
    .toString() || '0';
  const uniqueRecipients = totalDrops;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here&apos;s your Fishcake overview.
            </p>
          </div>
        </div>

        {/* Wallet Card */}
        <WalletCard
          address={address}
          fccBalance={balances.fcc}
          usdtBalance={balances.usdt}
          polBalance={balances.pol}
          nftType={nftPass.type}
          nftExpiresAt={nftPass.expiresAt}
        />

        {/* Quick Actions */}
        <QuickActionsCard />

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Events */}
          <ActiveEventsCard 
            events={events || []} 
            isLoading={eventsLoading} 
          />

          {/* Stats */}
          <StatsCard
            totalEvents={totalEvents}
            totalDrops={totalDrops}
            totalFCCDistributed={totalFCCDistributed}
            totalRecipients={uniqueRecipients}
            isLoading={eventsLoading}
          />
        </div>
      </div>
    </MainLayout>
  );
}

export default function HomePage() {
  const { isConnected, isLoading } = useWallet();
  
  // Sync wallet data
  useWalletSync();
  useGasPrice();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-fishcake flex items-center justify-center animate-pulse">
            <span className="text-3xl">🍥</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectWalletPrompt />;
  }

  return <Dashboard />;
}
