'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { useMiningStore } from '@/lib/stores/miningStore';
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
                {isAutomationRunning && (
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
                    isAutomationRunning ? 'text-green-400' : 'text-muted-foreground'
                  )}>
                    {isAutomationRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  isAutomationRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
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
                variant={isAutomationRunning ? 'default' : 'secondary'}
                className={cn(
                  'px-3 py-1.5',
                  isAutomationRunning 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-secondary'
                )}
              >
                <div className={cn(
                  'w-2 h-2 rounded-full mr-2',
                  isAutomationRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                )} />
                {isAutomationRunning ? 'Running' : 'Stopped'}
              </Badge>

              {/* Start/Stop Button */}
              <Button
                onClick={isAutomationRunning ? stopAutomation : startAutomation}
                size="sm"
                className={cn(
                  'min-w-[150px]',
                  isAutomationRunning 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                )}
              >
                {isAutomationRunning ? (
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
    </div>
  );
}

// Export the active section state management
export function useMiningSection() {
  const [activeSection, setActiveSection] = useState('overview');
  return { activeSection, setActiveSection };
}
