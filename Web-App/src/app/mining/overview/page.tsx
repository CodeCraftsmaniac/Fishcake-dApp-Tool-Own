'use client';

import { Card, CardContent, Button, Badge } from '@/components/ui';
import { useMiningStore } from '@/lib/stores/miningStore';
import { 
  Wallet,
  Calendar,
  Coins,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Plus,
  RefreshCw,
  Play,
  AlertCircle,
  ArrowRight,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function MiningOverviewPage() {
  const { 
    isAutomationRunning, 
    wallets,
    events,
  } = useMiningStore();

  const activeWallets = wallets.filter(w => w.status === 'active').length;
  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.status === 'finished').length;
  const totalDropped = events
    .filter(e => e.status === 'finished')
    .reduce((sum, e) => sum + parseFloat(e.totalDropped || '0'), 0);
  const totalRewards = events
    .filter(e => e.status === 'finished')
    .reduce((sum, e) => sum + parseFloat(e.rewardReceived || '0'), 0);
  const successRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <Card className={cn(
        'border overflow-hidden relative',
        isAutomationRunning 
          ? 'border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50' 
          : 'border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50'
      )}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        
        <CardContent className="p-5 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center relative',
                isAutomationRunning ? 'bg-green-100' : 'bg-yellow-100'
              )}>
                {isAutomationRunning ? (
                  <>
                    <Activity className="w-5 h-5 text-green-600 animate-pulse" />
                    <div className="absolute inset-0 rounded-lg bg-green-200/50 animate-ping" />
                  </>
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold mb-0.5 text-gray-900 tracking-tight">
                  {isAutomationRunning ? 'Mining Automation Active' : 'Mining Automation Paused'}
                </h2>
                <p className="text-xs text-gray-700 font-semibold">
                  {isAutomationRunning 
                    ? `Actively processing ${activeWallets} wallet${activeWallets !== 1 ? 's' : ''} across multiple events`
                    : 'Start automation from the header to begin automated mining operations'
                  }
                </p>
              </div>
            </div>
            {isAutomationRunning && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 border border-green-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                </span>
                <span className="text-xs font-medium text-green-700">Live</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Wallet}
          iconColor="text-blue-400"
          bgGradient="from-blue-500/20 to-blue-600/20"
          label="Active Wallets"
          value={`${activeWallets}/${wallets.length}`}
          trend="+2 today"
        />
        <StatCard
          icon={Calendar}
          iconColor="text-purple-400"
          bgGradient="from-purple-500/20 to-purple-600/20"
          label="Events Today"
          value={totalEvents.toString()}
          trend="Last 24h"
        />
        <StatCard
          icon={Coins}
          iconColor="text-fishcake-400"
          bgGradient="from-fishcake-500/20 to-orange-500/20"
          label="FCC Distributed"
          value={totalDropped.toFixed(0)}
          trend="Total drops"
        />
        <StatCard
          icon={Sparkles}
          iconColor="text-green-400"
          bgGradient="from-green-500/20 to-emerald-500/20"
          label="Mining Rewards"
          value={`${totalRewards.toFixed(0)}`}
          trend="FCC earned"
        />
        <StatCard
          icon={TrendingUp}
          iconColor="text-yellow-400"
          bgGradient="from-yellow-500/20 to-amber-500/20"
          label="Success Rate"
          value={`${successRate}%`}
          trend="All time"
        />
        <StatCard
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          bgGradient="from-emerald-500/20 to-teal-500/20"
          label="Completed"
          value={completedEvents.toString()}
          trend="Events"
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          href="/mining/wallets"
          icon={Wallet}
          iconBg="from-purple-500/30 to-pink-500/30"
          iconColor="text-purple-400"
          title="Manage Wallets"
          description={wallets.length === 0 
            ? 'Import wallets to start mining'
            : `${wallets.length} wallet${wallets.length !== 1 ? 's' : ''} configured and ready`
          }
          actionIcon={wallets.length === 0 ? Plus : ArrowRight}
        />

        <ActionCard
          href="/mining/workflow"
          icon={RefreshCw}
          iconBg="from-fishcake-500/30 to-orange-500/30"
          iconColor="text-fishcake-400"
          title="View Workflow"
          description="Watch real-time automation progress and execution flow"
          actionIcon={Play}
        />

        <ActionCard
          href="/mining/stats"
          icon={Activity}
          iconBg="from-blue-500/30 to-cyan-500/30"
          iconColor="text-blue-400"
          title="Analytics & Stats"
          description="Detailed performance metrics and mining insights"
          actionIcon={ArrowRight}
        />

        <ActionCard
          href="/mining/settings"
          icon={Zap}
          iconBg="from-green-500/30 to-emerald-500/30"
          iconColor="text-green-400"
          title="Automation Settings"
          description="Configure drop amounts, recipients, and timing"
          actionIcon={ArrowRight}
        />
      </div>

      {/* Recent Wallets Preview */}
      {wallets.length > 0 && (
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Active Wallets</h3>
                <p className="text-xs text-gray-700 font-semibold">Recently active mining wallets</p>
              </div>
              <Link href="/mining/wallets">
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs border-gray-200 hover:bg-gray-50">
                  View All
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {wallets.slice(0, 5).map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all border border-gray-100 hover:border-gray-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      wallet.status === 'active' ? 'bg-green-500 animate-pulse' :
                      wallet.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                    )} />
                    <span className="font-mono text-xs font-medium text-gray-700">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      wallet.nftType === 'PRO' ? 'pro' :
                      wallet.nftType === 'BASIC' ? 'basic' : 'secondary'
                    } className="text-xs font-semibold">
                      {wallet.nftType}
                    </Badge>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">
                        {parseFloat(wallet.balances.fcc).toFixed(2)} FCC
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {parseFloat(wallet.balances.pol).toFixed(4)} POL
                      </p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-900 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  bgGradient,
  label,
  value,
  trend,
}: {
  icon: any;
  iconColor: string;
  bgGradient: string;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <Card className="bg-white border-gray-200 hover:border-gray-300 transition-all group hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className={cn('p-2 rounded-lg bg-gradient-to-br', bgGradient)}>
              <Icon className={cn('w-4 h-4', iconColor)} />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-600 mb-1 font-bold uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <p className="text-[10px] text-gray-600 mt-1 font-semibold">{trend}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  actionIcon: ActionIcon,
}: {
  href: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  actionIcon: any;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:border-purple-300 transition-all group h-full border border-gray-200 bg-white hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform',
              iconBg
            )}>
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm mb-0.5 group-hover:text-purple-600 transition-colors text-gray-900 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed font-semibold">
                {description}
              </p>
            </div>
            <ActionIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
