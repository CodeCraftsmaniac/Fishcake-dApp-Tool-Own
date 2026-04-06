'use client';

import { useState, useEffect } from 'react';
import { MiningLayout } from '@/components/layout/MiningLayout';
import { Card, CardContent, Button, Badge, Input } from '@/components/ui';
import { 
  WorkflowCanvas, 
  WalletManager, 
  ExecutionLogs, 
  MiningStats,
  WalletDetailView,
} from '@/components/mining';
import { useMiningStore, MiningConfig } from '@/lib/stores/miningStore';
import { 
  Play, 
  Pause, 
  Settings2, 
  History, 
  Wallet,
  RefreshCw,
  LayoutDashboard,
  BarChart3,
  Plus,
  Upload,
  Sparkles,
  TrendingUp,
  Calendar,
  Coins,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionType = 'overview' | 'wallets' | 'workflow' | 'history' | 'stats' | 'settings';

export default function MiningAutomationPage() {
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const { 
    isAutomationRunning, 
    startAutomation, 
    stopAutomation,
    currentEvent,
    config,
    updateConfig,
    wallets,
    events,
    logs,
    addWallet,
    addLog,
  } = useMiningStore();

  // Calculate stats
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
    <MiningLayout 
      selectedWalletId={selectedWalletId}
      onSelectWallet={setSelectedWalletId}
    >
      <div className="space-y-6 pb-8">
        {/* Tab Navigation - Horizontal tabs below header */}
        <div className="flex gap-1 p-1 bg-card rounded-xl border border-border">
          {[
            { id: 'overview' as SectionType, label: 'Overview', icon: LayoutDashboard },
            { id: 'wallets' as SectionType, label: 'Wallets', icon: Wallet },
            { id: 'workflow' as SectionType, label: 'Workflow', icon: RefreshCw },
            { id: 'history' as SectionType, label: 'History', icon: History },
            { id: 'stats' as SectionType, label: 'Stats', icon: BarChart3 },
            { id: 'settings' as SectionType, label: 'Settings', icon: Settings2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSection(tab.id);
                  if (tab.id !== 'wallets') setSelectedWalletId(null);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all text-sm',
                  activeSection === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section Content */}
        <div className="min-h-[600px]">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <OverviewSection
              wallets={wallets}
              activeWallets={activeWallets}
              totalEvents={totalEvents}
              completedEvents={completedEvents}
              totalDropped={totalDropped}
              totalRewards={totalRewards}
              successRate={successRate}
              isRunning={isAutomationRunning}
              onViewWallets={() => setActiveSection('wallets')}
              onViewWorkflow={() => setActiveSection('workflow')}
            />
          )}

          {/* Wallets Section - with detail view */}
          {activeSection === 'wallets' && (
            <WalletDetailView
              selectedWalletId={selectedWalletId}
              onSelectWallet={setSelectedWalletId}
            />
          )}

          {/* Workflow Section */}
          {activeSection === 'workflow' && <WorkflowCanvas />}

          {/* History Section */}
          {activeSection === 'history' && <ExecutionLogs />}

          {/* Stats Section */}
          {activeSection === 'stats' && <MiningStats />}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <MiningSettings config={config} updateConfig={updateConfig} />
          )}
        </div>
      </div>
    </MiningLayout>
  );
}

// Overview Section Component
function OverviewSection({
  wallets,
  activeWallets,
  totalEvents,
  completedEvents,
  totalDropped,
  totalRewards,
  successRate,
  isRunning,
  onViewWallets,
  onViewWorkflow,
}: {
  wallets: any[];
  activeWallets: number;
  totalEvents: number;
  completedEvents: number;
  totalDropped: number;
  totalRewards: number;
  successRate: number;
  isRunning: boolean;
  onViewWallets: () => void;
  onViewWorkflow: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className={cn(
        'border-2',
        isRunning 
          ? 'border-green-500/30 bg-gradient-to-r from-green-900/20 to-emerald-900/20' 
          : 'border-yellow-500/30 bg-gradient-to-r from-yellow-900/20 to-orange-900/20'
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isRunning ? 'bg-green-500/20' : 'bg-yellow-500/20'
              )}>
                {isRunning ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {isRunning ? 'Mining Automation is Running' : 'Mining Automation is Stopped'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isRunning 
                    ? `Processing ${activeWallets} active wallets automatically`
                    : 'Click "Start Automation" in the header to begin mining'
                  }
                </p>
              </div>
            </div>
            {isRunning && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm text-green-400">Live</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Wallet}
          iconColor="text-blue-400"
          bgColor="bg-blue-500/20"
          label="Active Wallets"
          value={`${activeWallets}/${wallets.length}`}
        />
        <StatCard
          icon={Calendar}
          iconColor="text-purple-400"
          bgColor="bg-purple-500/20"
          label="Events Today"
          value={totalEvents.toString()}
        />
        <StatCard
          icon={Coins}
          iconColor="text-fishcake-400"
          bgColor="bg-fishcake-500/20"
          label="FCC Distributed"
          value={totalDropped.toFixed(0)}
        />
        <StatCard
          icon={Sparkles}
          iconColor="text-green-400"
          bgColor="bg-green-500/20"
          label="Mining Rewards"
          value={`${totalRewards.toFixed(0)} FCC`}
        />
        <StatCard
          icon={TrendingUp}
          iconColor="text-yellow-400"
          bgColor="bg-yellow-500/20"
          label="Success Rate"
          value={`${successRate}%`}
        />
        <StatCard
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          bgColor="bg-emerald-500/20"
          label="Completed"
          value={completedEvents.toString()}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          onClick={onViewWallets}
          className="cursor-pointer hover:border-purple-500/50 transition-colors"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Manage Wallets</h3>
                <p className="text-sm text-muted-foreground">
                  {wallets.length === 0 
                    ? 'Import wallets to start mining'
                    : `${wallets.length} wallets configured`
                  }
                </p>
              </div>
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card 
          onClick={onViewWorkflow}
          className="cursor-pointer hover:border-purple-500/50 transition-colors"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fishcake-500/30 to-orange-500/30 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-fishcake-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">View Workflow</h3>
                <p className="text-sm text-muted-foreground">
                  Watch real-time automation progress
                </p>
              </div>
              <Play className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Wallets Preview */}
      {wallets.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Wallets</h3>
              <Button variant="ghost" size="sm" onClick={onViewWallets}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {wallets.slice(0, 5).map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      wallet.status === 'active' ? 'bg-green-500' :
                      wallet.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                    )} />
                    <span className="font-mono text-sm">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      wallet.nftType === 'PRO' ? 'pro' :
                      wallet.nftType === 'BASIC' ? 'basic' : 'secondary'
                    }>
                      {wallet.nftType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {parseFloat(wallet.balances.fcc).toFixed(2)} FCC
                    </span>
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

// Stat Card Component
function StatCard({
  icon: Icon,
  iconColor,
  bgColor,
  label,
  value,
}: {
  icon: any;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', bgColor)}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Settings Component
function MiningSettings({ 
  config, 
  updateConfig 
}: { 
  config: MiningConfig;
  updateConfig: (updates: Partial<MiningConfig>) => void;
}) {
  const [recipient1, setRecipient1] = useState(config.recipientAddress1 || '');
  const [recipient2, setRecipient2] = useState(config.recipientAddress2 || '');
  const [fccPerDrop, setFccPerDrop] = useState(config.fccPerRecipient || '12');
  const [offsetMinutes, setOffsetMinutes] = useState(config.offsetMinutes?.toString() || '5');

  const handleSave = () => {
    updateConfig({
      recipientAddress1: recipient1,
      recipientAddress2: recipient2,
      fccPerRecipient: fccPerDrop,
      offsetMinutes: parseInt(offsetMinutes),
      totalFccPerEvent: (parseFloat(fccPerDrop) * 2).toString(),
    });
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Automation Settings</h3>
          
          <div className="grid gap-6">
            {/* Drop Recipients */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Drop Recipients</h4>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Address 1</label>
                <Input
                  value={recipient1}
                  onChange={(e) => setRecipient1(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Address 2</label>
                <Input
                  value={recipient2}
                  onChange={(e) => setRecipient2(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
              </div>
            </div>

            {/* Drop Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">FCC per Recipient</label>
                <Input
                  type="number"
                  value={fccPerDrop}
                  onChange={(e) => setFccPerDrop(e.target.value)}
                  placeholder="12"
                />
                <p className="text-xs text-muted-foreground mt-1">Total: {parseFloat(fccPerDrop) * 2} FCC per event</p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Cycle Offset (minutes)</label>
                <Input
                  type="number"
                  value={offsetMinutes}
                  onChange={(e) => setOffsetMinutes(e.target.value)}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground mt-1">Delay before next daily cycle</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h5 className="font-medium text-purple-400 mb-2">Mining Reward Formula</h5>
              <p className="text-sm text-muted-foreground">
                For every <strong>24 FCC</strong> dropped (12 FCC × 2 recipients), 
                you receive a <strong>6 FCC</strong> mining reward (25% of total drops).
              </p>
            </div>

            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
