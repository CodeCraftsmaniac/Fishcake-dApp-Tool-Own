'use client';

import { useMiningStore } from '@/lib/stores/miningStore';
import { Card, CardContent } from '@/components/ui';
import { 
  Wallet, 
  Calendar, 
  Droplets, 
  Gift,
  TrendingUp,
  Clock
} from 'lucide-react';

export function MiningStats() {
  const { stats, wallets, events, isAutomationRunning } = useMiningStore();

  // Calculate real-time stats
  const activeWallets = wallets.filter(w => w.status === 'active').length;
  const todayEvents = events.filter(e => {
    const today = new Date();
    const eventDate = new Date(e.startedAt);
    return eventDate.toDateString() === today.toDateString();
  }).length;
  const completedEvents = events.filter(e => e.status === 'finished').length;
  const totalDropped = events
    .filter(e => e.totalDropped)
    .reduce((sum, e) => sum + parseFloat(e.totalDropped || '0'), 0);
  const totalRewards = events
    .filter(e => e.rewardReceived)
    .reduce((sum, e) => sum + parseFloat(e.rewardReceived || '0'), 0);
  const successRate = events.length > 0 
    ? Math.round((completedEvents / events.length) * 100) 
    : 0;

  const statCards = [
    {
      label: 'Active Wallets',
      value: `${activeWallets}/${wallets.length}`,
      icon: Wallet,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Events Today',
      value: todayEvents.toString(),
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'FCC Distributed',
      value: totalDropped.toFixed(0),
      icon: Droplets,
      color: 'from-fishcake-500 to-orange-500',
      bgColor: 'bg-fishcake-500/10',
    },
    {
      label: 'Mining Rewards',
      value: `${totalRewards.toFixed(0)} FCC`,
      icon: Gift,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Events',
      value: events.length.toString(),
      icon: Clock,
      color: 'from-indigo-500 to-violet-500',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={`${stat.bgColor} border-0 overflow-hidden relative`}>
            <CardContent className="p-4">
              {/* Glow effect when running */}
              {isAutomationRunning && index < 4 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              )}
              
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
