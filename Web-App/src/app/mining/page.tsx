'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, Button, Badge, Input } from '@/components/ui';
import { WorkflowCanvas, WalletManager, ExecutionLogs, MiningStats } from '@/components/mining';
import { useMiningStore, MiningConfig } from '@/lib/stores/miningStore';
import { 
  Play, 
  Pause, 
  Settings2, 
  History, 
  Wallet,
  RefreshCw,
} from 'lucide-react';

type TabType = 'workflow' | 'wallets' | 'logs' | 'settings';

export default function MiningAutomationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('workflow');
  const { 
    isAutomationRunning, 
    startAutomation, 
    stopAutomation,
    currentEvent,
    config,
    updateConfig,
  } = useMiningStore();

  const tabs = [
    { id: 'workflow' as TabType, label: 'Workflow', icon: RefreshCw },
    { id: 'wallets' as TabType, label: 'Wallets', icon: Wallet },
    { id: 'logs' as TabType, label: 'Logs', icon: History },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings2 },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 pb-8">
        {/* Header with animated gradient */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-orange-900/50">
          {/* Animated grid background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-pulse" />
          </div>
          
          {/* Floating orbs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-fishcake-500/30 to-purple-500/30 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-pink-500/30 to-orange-500/30 rounded-full blur-3xl animate-float-delayed" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-fishcake-300 to-purple-300 bg-clip-text text-transparent">
                Mining Automation
              </h1>
              <p className="text-muted-foreground mt-1">
                Fully automated FCC mining with visual workflow
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Status Badge */}
              <Badge 
                variant={isAutomationRunning ? 'default' : 'secondary'}
                className={isAutomationRunning ? 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse' : ''}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${isAutomationRunning ? 'bg-green-400' : 'bg-gray-400'}`} />
                {isAutomationRunning ? 'Running' : 'Stopped'}
              </Badge>
              
              {/* Control Button */}
              <Button
                onClick={isAutomationRunning ? stopAutomation : startAutomation}
                className={isAutomationRunning 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gradient-to-r from-fishcake-500 to-purple-500 hover:from-fishcake-600 hover:to-purple-600'
                }
                size="lg"
              >
                {isAutomationRunning ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Stop Automation
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Automation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <MiningStats />

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-card rounded-xl border border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-fishcake-500 to-purple-500 text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'workflow' && <WorkflowCanvas />}
          {activeTab === 'wallets' && <WalletManager />}
          {activeTab === 'logs' && <ExecutionLogs />}
          {activeTab === 'settings' && <MiningSettings config={config} updateConfig={updateConfig} />}
        </div>
      </div>
    </MainLayout>
  );
}

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
            <div className="p-4 rounded-lg bg-fishcake-500/10 border border-fishcake-500/20">
              <h5 className="font-medium text-fishcake-400 mb-2">Mining Reward Formula</h5>
              <p className="text-sm text-muted-foreground">
                For every <strong>24 FCC</strong> dropped (12 FCC × 2 recipients), 
                you receive a <strong>6 FCC</strong> mining reward (25% of total drops).
              </p>
            </div>

            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-fishcake-500 to-purple-500">
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
