'use client';

import { useState } from 'react';
import { useMiningStore, MiningWallet, MiningEvent } from '@/lib/stores/miningStore';
import { Card, CardContent, Button, Badge, Input } from '@/components/ui';
import { 
  ChevronDown,
  ChevronUp,
  Wallet,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Copy,
  ExternalLink,
  History,
  Coins,
  Calendar,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatAddress, cn } from '@/lib/utils';

interface WalletDetailViewProps {
  selectedWalletId: string | null;
  onSelectWallet: (id: string | null) => void;
}

export function WalletDetailView({ selectedWalletId, onSelectWallet }: WalletDetailViewProps) {
  const { wallets, events, updateWallet, removeWallet, addLog } = useMiningStore();
  const [expandedWalletId, setExpandedWalletId] = useState<string | null>(selectedWalletId);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const selectedWallet = selectedWalletId ? wallets.find(w => w.id === selectedWalletId) : null;

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
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

  const getWalletEvents = (walletId: string): MiningEvent[] => {
    return events.filter(e => e.walletId === walletId);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string; icon: typeof CheckCircle2 }> = {
      active: { color: 'text-green-400', bgColor: 'bg-green-500', label: 'Active', icon: CheckCircle2 },
      paused: { color: 'text-yellow-400', bgColor: 'bg-yellow-500', label: 'Paused', icon: Pause },
      error: { color: 'text-red-400', bgColor: 'bg-red-500', label: 'Error', icon: XCircle },
      nft_expired: { color: 'text-orange-400', bgColor: 'bg-orange-500', label: 'NFT Expired', icon: AlertCircle },
    };
    return configs[status] || configs.paused;
  };

  const getNftBadgeConfig = (nftType: string) => {
    const configs: Record<string, { variant: 'secondary' | 'basic' | 'pro'; label: string; color: string }> = {
      NONE: { variant: 'secondary', label: 'No NFT', color: 'text-muted-foreground' },
      BASIC: { variant: 'basic', label: 'BASIC', color: 'text-blue-400' },
      PRO: { variant: 'pro', label: 'PRO', color: 'text-purple-400' },
    };
    return configs[nftType] || configs.NONE;
  };

  // If a specific wallet is selected, show detailed view
  if (selectedWallet) {
    const walletEvents = getWalletEvents(selectedWallet.id);
    const statusConfig = getStatusConfig(selectedWallet.status);
    const nftConfig = getNftBadgeConfig(selectedWallet.nftType);
    const StatusIcon = statusConfig.icon;

    const completedEvents = walletEvents.filter(e => e.status === 'finished').length;
    const totalFccDropped = walletEvents
      .filter(e => e.status === 'finished')
      .reduce((sum, e) => sum + parseFloat(e.totalDropped || '0'), 0);
    const totalRewards = walletEvents
      .filter(e => e.status === 'finished')
      .reduce((sum, e) => sum + parseFloat(e.rewardReceived || '0'), 0);

    return (
      <div className="space-y-6">
        {/* Wallet Header Card */}
        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Large Wallet Icon */}
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center',
                  'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30'
                )}>
                  <Wallet className="w-8 h-8 text-purple-400" />
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold font-mono">
                      {selectedWallet.address.slice(0, 10)}...{selectedWallet.address.slice(-8)}
                    </h2>
                    <button
                      onClick={() => copyAddress(selectedWallet.address)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className={cn(
                        'w-4 h-4',
                        copiedAddress === selectedWallet.address ? 'text-green-400' : 'text-muted-foreground'
                      )} />
                    </button>
                    <a
                      href={`https://polygonscan.com/address/${selectedWallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={cn(
                        'flex items-center gap-1.5',
                        statusConfig.color
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </Badge>
                    <Badge variant={nftConfig.variant} className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      {nftConfig.label}
                    </Badge>
                    {selectedWallet.nftExpiry && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires: {new Date(selectedWallet.nftExpiry).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(selectedWallet)}
                >
                  {selectedWallet.status === 'active' ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Activate
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSelectWallet(null);
                    removeWallet(selectedWallet.id);
                  }}
                  className="text-red-400 hover:text-red-300 border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectWallet(null)}
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  Close Detail
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Coins className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">FCC Balance</p>
                  <p className="text-lg font-bold">{parseFloat(selectedWallet.balances.fcc).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Dropped</p>
                  <p className="text-lg font-bold">{totalFccDropped.toFixed(2)} FCC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mining Rewards</p>
                  <p className="text-lg font-bold">{totalRewards.toFixed(2)} FCC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-fishcake-500/20">
                  <Calendar className="w-5 h-5 text-fishcake-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed Events</p>
                  <p className="text-lg font-bold">{completedEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Coins className="w-4 h-4 text-fishcake-400" />
              Token Balances
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">FCC (Fishcake)</p>
                <p className="text-xl font-bold">{parseFloat(selectedWallet.balances.fcc).toFixed(4)}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">USDT (Tether)</p>
                <p className="text-xl font-bold">{parseFloat(selectedWallet.balances.usdt).toFixed(4)}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">POL (Polygon)</p>
                <p className="text-xl font-bold">{parseFloat(selectedWallet.balances.pol).toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event History for this Wallet */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Event History ({walletEvents.length})
            </h3>
            
            {walletEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No events yet for this wallet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {walletEvents.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        event.status === 'finished' ? 'bg-green-500' :
                        event.status === 'failed' ? 'bg-red-500' :
                        event.status === 'dropping' ? 'bg-blue-500 animate-pulse' :
                        'bg-yellow-500'
                      )} />
                      <div>
                        <p className="text-sm font-medium">Event #{event.chainEventId || 'Pending'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {event.dropsChecklist === '2/2' ? '2/2' : event.dropsChecklist} Drops
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.totalDropped || '0'} FCC
                        </p>
                      </div>
                      
                      {event.rewardReceived && parseFloat(event.rewardReceived) > 0 && (
                        <Badge variant="default" className="bg-green-500/20 text-green-400">
                          +{event.rewardReceived} FCC
                        </Badge>
                      )}
                      
                      <Badge variant={
                        event.status === 'finished' ? 'default' :
                        event.status === 'failed' ? 'secondary' :
                        'outline'
                      } className={
                        event.status === 'finished' ? 'bg-green-500/20 text-green-400' :
                        event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        ''
                      }>
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Event Info */}
        {selectedWallet.nextEventAt && (
          <Card className="border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium">Next Scheduled Event</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedWallet.nextEventAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Default: Show all wallets grid/list
  return (
    <div className="space-y-6">
      {/* Wallets Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">All Wallets</h2>
          <p className="text-sm text-muted-foreground">
            Click on a wallet to see detailed information
          </p>
        </div>
        <Badge variant="secondary">
          {wallets.filter(w => w.status === 'active').length} Active / {wallets.length} Total
        </Badge>
      </div>

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No Wallets Added</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Import wallets to start automated mining
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => {
            const statusConfig = getStatusConfig(wallet.status);
            const nftConfig = getNftBadgeConfig(wallet.nftType);
            const walletEvents = getWalletEvents(wallet.id);
            const completedEvents = walletEvents.filter(e => e.status === 'finished').length;
            const StatusIcon = statusConfig.icon;

            return (
              <Card
                key={wallet.id}
                onClick={() => onSelectWallet(wallet.id)}
                className={cn(
                  'cursor-pointer transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10',
                  selectedWalletId === wallet.id && 'border-purple-500/50 ring-2 ring-purple-500/20'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', statusConfig.bgColor)} />
                      <span className="font-mono text-sm">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </span>
                    </div>
                    <Badge variant={nftConfig.variant} className="text-xs">
                      {nftConfig.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="p-2 rounded bg-secondary/50 text-center">
                      <p className="text-muted-foreground">FCC</p>
                      <p className="font-medium">{parseFloat(wallet.balances.fcc).toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded bg-secondary/50 text-center">
                      <p className="text-muted-foreground">USDT</p>
                      <p className="font-medium">{parseFloat(wallet.balances.usdt).toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded bg-secondary/50 text-center">
                      <p className="text-muted-foreground">POL</p>
                      <p className="font-medium">{parseFloat(wallet.balances.pol).toFixed(4)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {completedEvents} events
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
