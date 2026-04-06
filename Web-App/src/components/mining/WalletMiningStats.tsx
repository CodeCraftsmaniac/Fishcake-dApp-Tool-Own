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
  TrendingUp
} from 'lucide-react';

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

interface WalletStatCardProps {
  wallet: MiningWallet;
  isSelected: boolean;
  onSelect: (walletId: string) => void;
}

function WalletStatCard({ wallet, isSelected, onSelect }: WalletStatCardProps) {
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
  const passExpiry = wallet.nftExpiry ? formatDate(wallet.nftExpiry) : 'No NFT';
  const isPassExpired = wallet.nftExpiry ? wallet.nftExpiry < Date.now() : true;

  const stats = [
    {
      label: 'POL',
      value: parseFloat(wallet.balances.pol || '0').toFixed(4),
      icon: Coins,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'FCC Mined',
      value: totalMined.toFixed(2),
      icon: TrendingUp,
      color: 'from-fishcake-500 to-orange-500',
      bgColor: 'bg-fishcake-500/10',
    },
    {
      label: 'Mining Days',
      value: miningDays.toString(),
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Events',
      value: walletEvents.length.toString(),
      icon: Activity,
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      label: 'Ongoing',
      value: ongoingEvents.toString(),
      icon: Clock,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Finished',
      value: finishedEvents.toString(),
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Pass Expiry',
      value: passExpiry,
      icon: isPassExpired ? AlertCircle : CheckCircle2,
      color: isPassExpired ? 'from-red-500 to-rose-500' : 'from-green-500 to-emerald-500',
      bgColor: isPassExpired ? 'bg-red-500/10' : 'bg-green-500/10',
    },
  ];

  return (
    <div 
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-fishcake-500 bg-fishcake-50/50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onSelect(wallet.id)}
    >
      {/* Wallet Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            wallet.status === 'active' ? 'bg-green-100' :
            wallet.status === 'paused' ? 'bg-yellow-100' :
            'bg-red-100'
          }`}>
            <Wallet className={`w-5 h-5 ${
              wallet.status === 'active' ? 'text-green-600' :
              wallet.status === 'paused' ? 'text-yellow-600' :
              'text-red-600'
            }`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 font-mono">
              {formatAddress(wallet.address)}
            </h4>
            <p className={`text-xs font-semibold capitalize ${
              wallet.status === 'active' ? 'text-green-600' :
              wallet.status === 'paused' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {wallet.status}
            </p>
          </div>
        </div>
        
        {/* NFT Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
          wallet.nftType === 'PRO' ? 'bg-gradient-to-r from-fishcake-500 to-orange-500 text-white' :
          wallet.nftType === 'BASIC' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {wallet.nftType || 'No NFT'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`p-2 rounded-lg ${stat.bgColor}`}>
              <div className="flex items-center gap-1 mb-1">
                <Icon className={`w-3 h-3 bg-gradient-to-r ${stat.color} bg-clip-text`} style={{ color: 'transparent' }} />
              </div>
              <p className={`text-sm font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WalletMiningStats() {
  const { wallets, selectedWorkflowWalletId, selectWorkflowWallet } = useMiningStore();

  if (wallets.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="p-8 text-center">
          <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Wallets Imported</h3>
          <p className="text-sm text-gray-600">
            Import wallets in the Settings tab to start tracking mining stats
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Mining Stats by Wallet</h3>
          <p className="text-xs text-gray-600 font-semibold">
            Click on a wallet to view its detailed workflow
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500">
          {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} imported
        </div>
      </div>

      <div className="space-y-3">
        {wallets.map((wallet) => (
          <WalletStatCard
            key={wallet.id}
            wallet={wallet}
            isSelected={wallet.id === selectedWorkflowWalletId}
            onSelect={selectWorkflowWallet}
          />
        ))}
      </div>
    </div>
  );
}
