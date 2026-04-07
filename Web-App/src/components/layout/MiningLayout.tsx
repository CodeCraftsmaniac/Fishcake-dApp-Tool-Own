'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { useMiningStore } from '@/lib/stores/miningStore';
import { miningApi } from '@/lib/api/backendClient';
import { Button, Badge } from '@/components/ui';
import { LiveGasPrice } from '@/components/shared/LiveGasPrice';
import {
  LayoutDashboard,
  Wallet,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Play,
  Pause,
  RefreshCw,
  BarChart3,
  Zap,
  ArrowLeft,
  Moon,
  Sun,
  Bell,
  Loader2,
} from 'lucide-react';

interface MiningLayoutProps {
  children: React.ReactNode;
  selectedWalletId?: string | null;
  onSelectWallet?: (id: string | null) => void;
}

const miningSidebarItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'workflow', label: 'Workflow', icon: RefreshCw },
  { id: 'history', label: 'Event History', icon: History },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MiningLayout({ children, selectedWalletId, onSelectWallet }: MiningLayoutProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, theme, setTheme } = useUIStore();
  const { 
    isAutomationRunning, 
    startAutomation, 
    stopAutomation, 
    wallets 
  } = useMiningStore();

  const [activeSection, setActiveSection] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [backendRunning, setBackendRunning] = useState(false);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [showPassphrasePrompt, setShowPassphrasePrompt] = useState(false);

  // Sync with backend status on mount and periodically
  const syncBackendStatus = useCallback(async () => {
    try {
      const response = await miningApi.status();
      if (response.success && response.data) {
        const isRunning = response.data.scheduler.isRunning;
        setBackendRunning(isRunning);
        // Sync local store with backend state
        if (isRunning !== isAutomationRunning) {
          if (isRunning) {
            startAutomation();
          } else {
            stopAutomation();
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync backend status:', error);
    }
  }, [isAutomationRunning, startAutomation, stopAutomation]);

  // Sync on mount and every 10 seconds
  useEffect(() => {
    syncBackendStatus();
    const interval = setInterval(syncBackendStatus, 10000);
    return () => clearInterval(interval);
  }, [syncBackendStatus]);

  // Handle start automation - needs passphrase
  const handleStartAutomation = async () => {
    // Get passphrase from session or prompt
    const storedPassphrase = sessionStorage.getItem('mining_passphrase');
    if (storedPassphrase) {
      await startBackendAutomation(storedPassphrase);
    } else {
      setShowPassphrasePrompt(true);
    }
  };

  const startBackendAutomation = async (pass: string) => {
    setIsLoading(true);
    try {
      const response = await miningApi.start(pass);
      if (response.success) {
        setBackendRunning(true);
        startAutomation();
        sessionStorage.setItem('mining_passphrase', pass);
        setPassphrase(pass);
      } else {
        console.error('Failed to start automation:', response.error);
        alert(`Failed to start: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error starting automation:', error);
      alert('Failed to connect to backend');
    } finally {
      setIsLoading(false);
      setShowPassphrasePrompt(false);
    }
  };

  // Handle stop automation
  const handleStopAutomation = async () => {
    setIsLoading(true);
    try {
      const response = await miningApi.stop();
      if (response.success) {
        setBackendRunning(false);
        stopAutomation();
      } else {
        console.error('Failed to stop automation:', response.error);
      }
    } catch (error) {
      console.error('Error stopping automation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Use backend state as source of truth
  const isRunning = backendRunning;

  return (
    <div className="min-h-screen bg-background">
      {/* Mining-Specific Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-200',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo + Back */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-3">
              {/* Mining Icon with gradient */}
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex-shrink-0">
                <Cpu className="h-5 w-5 text-white" />
                {/* Pulse indicator */}
                {isRunning && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                )}
              </div>
              {sidebarOpen && (
                <div>
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent whitespace-nowrap">
                    Mining
                  </span>
                  <span className="block text-[10px] text-muted-foreground">Automation</span>
                </div>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* Back to Dashboard */}
          <div className="px-3 py-3 border-b border-border">
            <Link
              href="/"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">Back to Dashboard</span>}
            </Link>
          </div>

          {/* Mining Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1">
              {miningSidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-purple-400')} />
                    {sidebarOpen && (
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Wallet List (when wallets section is not active) */}
            {wallets.length > 0 && sidebarOpen && (
              <div className="mt-6">
                <p className="px-3 mb-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Wallets ({wallets.length})
                </p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {wallets.slice(0, 10).map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => onSelectWallet?.(selectedWalletId === wallet.id ? null : wallet.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs',
                        selectedWalletId === wallet.id
                          ? 'bg-fishcake-500/20 text-fishcake-400 border border-fishcake-500/30'
                          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        wallet.status === 'active' ? 'bg-green-500' :
                        wallet.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                      )} />
                      <span className="font-mono truncate">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </span>
                    </button>
                  ))}
                  {wallets.length > 10 && (
                    <p className="px-3 text-xs text-muted-foreground">
                      +{wallets.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </nav>

          {/* Footer - Stats Summary */}
          <div className="p-4 border-t border-border">
            {sidebarOpen ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Active Wallets</span>
                  <span className="font-medium text-green-400">
                    {wallets.filter(w => w.status === 'active').length}/{wallets.length}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn(
                    'font-medium',
                    isRunning ? 'text-green-400' : 'text-muted-foreground'
                  )}>
                    {isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                )} />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-all duration-200',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        {/* Header with Status Controls */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-6">
            {/* Left side - Live Gas + Section Title */}
            <div className="flex items-center gap-4">
              <LiveGasPrice />
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold">
                {miningSidebarItems.find(i => i.id === activeSection)?.label || 'Mining Automation'}
              </h1>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-4">
              {/* Automation Status Badge */}
              <Badge 
                variant={isRunning ? 'default' : 'secondary'}
                className={cn(
                  'px-3 py-1.5',
                  isRunning 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-secondary'
                )}
              >
                <div className={cn(
                  'w-2 h-2 rounded-full mr-2',
                  isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                )} />
                {isRunning ? 'Running' : 'Stopped'}
              </Badge>

              {/* Start/Stop Button */}
              <Button
                onClick={isRunning ? handleStopAutomation : handleStartAutomation}
                disabled={isLoading}
                size="sm"
                className={cn(
                  'min-w-[150px]',
                  isRunning 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isRunning ? 'Stopping...' : 'Starting...'}
                  </>
                ) : isRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Automation
                  </>
                )}
              </Button>

              <div className="h-6 w-px bg-border" />

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-fishcake-500 rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Passphrase Prompt Dialog */}
      {showPassphrasePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Enter Passphrase</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the passphrase used to encrypt your wallets to start automation.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const pass = formData.get('passphrase') as string;
                if (pass) {
                  startBackendAutomation(pass);
                }
              }}
            >
              <input
                type="password"
                name="passphrase"
                placeholder="Enter passphrase..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPassphrasePrompt(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Automation'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the active section state management
export function useMiningSection() {
  const [activeSection, setActiveSection] = useState('overview');
  return { activeSection, setActiveSection };
}
