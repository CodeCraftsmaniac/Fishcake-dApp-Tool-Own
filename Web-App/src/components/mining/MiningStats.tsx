'use client';

import { useMiningStore, MiningWallet } from '@/lib/stores/miningStore';
import { Card, CardContent } from '@/components/ui';
import { 
  Wallet, 
  Coins, 
  Calendar, 
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Droplets
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Format address for display
const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format timestamp to readable date
const formatDate = (timestamp: number | null) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Calculate countdown
const getCountdown = (timestamp: number | null) => {
  if (!timestamp) return null;
  const now = Date.now();
  const diff = timestamp - now;
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

// Individual wallet stats card
function WalletStatsCard({ wallet }: { wallet: MiningWallet }) {
  const { events } = useMiningStore();
  
  // Calculate wallet-specific stats
  const walletEvents = events.filter(e => e.walletId === wallet.id);
  const finishedEvents = walletEvents.filter(e => e.status === 'finished').length;
  const ongoingEvents = walletEvents.filter(e => !['finished', 'failed', 'timeout'].includes(e.status)).length;
  const totalMined = walletEvents
    .filter(e => e.rewardReceived)
    .reduce((sum, e) => sum + parseFloat(e.rewardReceived || '0'), 0);
  
  // Calculate mining days
  const miningDays = new Set(
    walletEvents
      .filter(e => e.status === 'finished' && e.finishedAt)
      .map(e => new Date(e.finishedAt!).toDateString())
  ).size;

  // Get pass expiry
  const passExpiry = wallet.nftExpiry ? formatDate(wallet.nftExpiry) : 'No Pass';
  const isPassExpired = wallet.nftExpiry ? wallet.nftExpiry < Date.now() : true;
  const countdown = getCountdown(wallet.nftExpiry);

  const stats = [
    {
      label: 'POL',
      value: parseFloat(wallet.balances?.pol || '0').toFixed(4),
      icon: Coins,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'FCC Mined',
      value: totalMined.toFixed(2),
      icon: TrendingUp,
      color: 'from-fishcake-500 to-orange-500',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Mining Days',
      value: miningDays.toString(),
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Total Events',
      value: walletEvents.length.toString(),
      icon: Activity,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-100',
    },
    {
      label: 'Ongoing',
      value: ongoingEvents.toString(),
      icon: Clock,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'Finished',
      value: finishedEvents.toString(),
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Pass Expiry',
      value: countdown || passExpiry,
      icon: isPassExpired ? AlertCircle : CheckCircle2,
      color: isPassExpired ? 'from-red-500 to-rose-500' : 'from-green-500 to-emerald-500',
      bgColor: isPassExpired ? 'bg-red-100' : 'bg-green-100',
    },
  ];

  return (
    <Card className="bg-white border-gray-200 overflow-hidden">
      <CardContent className="p-4">
        {/* Wallet Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
          <div className={cn(
            'p-2.5 rounded-xl',
            wallet.status === 'active' ? 'bg-green-100' :
            wallet.status === 'paused' ? 'bg-yellow-100' : 'bg-red-100'
          )}>
            <Wallet className={cn(
              'w-5 h-5',
              wallet.status === 'active' ? 'text-green-600' :
              wallet.status === 'paused' ? 'text-yellow-600' : 'text-red-600'
            )} />
          </div>
          <div className="flex-1">
            <p className="font-mono text-sm font-bold text-gray-900">
              {formatAddress(wallet.address)}
            </p>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-semibold capitalize',
                wallet.status === 'active' ? 'text-green-600' :
                wallet.status === 'paused' ? 'text-yellow-600' : 'text-red-600'
              )}>
                {wallet.status}
              </span>
              {wallet.nftType && wallet.nftType !== 'NONE' && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold',
                  wallet.nftType === 'PRO' 
                    ? 'bg-gradient-to-r from-fishcake-500 to-orange-500 text-white' 
                    : 'bg-blue-100 text-blue-700'
                )}>
                  {wallet.nftType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className={cn('p-2.5 rounded-lg', stat.bgColor)}>
                <Icon className={cn('w-4 h-4 mb-1 bg-gradient-to-r bg-clip-text', stat.color)} style={{ color: stat.color.includes('red') ? '#ef4444' : stat.color.includes('green') ? '#22c55e' : '#f97316' }} />
                <p className={cn('text-sm font-bold bg-gradient-to-r bg-clip-text text-transparent truncate', stat.color)}>
                  {stat.value}
                </p>
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider truncate">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function MiningStats() {
  const { wallets } = useMiningStore();

  // If no wallets, show nothing (as per requirement)
  if (wallets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">Mining Stats</h3>
          <p className="text-xs text-gray-600 font-semibold">
            Per-wallet mining statistics
          </p>
        </div>
      </div>

      {/* Per-Wallet Stats */}
      <div className="space-y-4">
        {wallets.map((wallet) => (
          <WalletStatsCard key={wallet.id} wallet={wallet} />
        ))}
      </div>
    </div>
  );
}
