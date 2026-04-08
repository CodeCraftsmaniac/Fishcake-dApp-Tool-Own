'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { useMiningStore } from '@/lib/stores/miningStore';
import { Button, Badge } from '@/components/ui';
import StatusSidebar from '@/components/mining/StatusSidebar';
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
  ArrowLeft,
  Moon,
  Sun,
  Bell,
  Fuel,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
} from 'lucide-react';

interface MiningLayoutProps {
  children: React.ReactNode;
}

const miningSidebarItems = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, href: '/mining/overview' },
  { id: 'wallets', label: 'Wallet Manager', icon: Wallet, href: '/mining/wallets' },
  { id: 'workflow', label: 'Workflow Visual', icon: RefreshCw, href: '/mining/workflow' },
  { id: 'history', label: 'Execution Logs', icon: History, href: '/mining/history' },
  { id: 'stats', label: 'Mining Stats', icon: BarChart3, href: '/mining/stats' },
  { id: 'settings', label: 'Configuration', icon: Settings, href: '/mining/settings' },
];

export default function MiningLayout({ children }: MiningLayoutProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, theme, setTheme, gasPrice } = useUIStore();
  const { 
    isAutomationRunning, 
    startAutomation, 
    stopAutomation, 
    wallets 
  } = useMiningStore();

  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const currentSection = miningSidebarItems.find(item => pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop + Mobile Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen border-r border-gray-200 bg-white transition-all duration-300',
          // Desktop
          !isMobile && (sidebarOpen ? 'w-64' : 'w-20'),
          // Mobile
          isMobile && (mobileMenuOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full')
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex-shrink-0">
                <Cpu className="h-4 w-4 text-white" />
                {isAutomationRunning && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                )}
              </div>
              {sidebarOpen && (
                <div>
                  <span className="text-sm font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent whitespace-nowrap tracking-tight">
                    Mining
                  </span>
                  <span className="block text-[10px] text-gray-600 font-bold uppercase tracking-wider">Automation</span>
                </div>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              {sidebarOpen ? <ChevronLeft size={16} className="text-gray-600" /> : <ChevronRight size={16} className="text-gray-600" />}
            </button>
          </div>

          {/* Back to Dashboard */}
          <div className="px-3 py-2.5 border-b border-gray-200">
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors',
                'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
              {sidebarOpen && <span className="text-xs font-bold">Back to Dashboard</span>}
            </Link>
          </div>

          {/* Mining Navigation */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            <div className="space-y-1">
              {miningSidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 border border-purple-200 shadow-sm'
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-purple-600')} />
                    {sidebarOpen && (
                      <span className="text-xs font-bold whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Wallet List Preview */}
            {wallets.length > 0 && sidebarOpen && (
              <div className="mt-5">
                <p className="px-2.5 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">
                  Wallets ({wallets.length})
                </p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {wallets.slice(0, 10).map((wallet) => (
                    <div
                      key={wallet.id}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px]',
                        'bg-gray-50 hover:bg-gray-100 transition-colors'
                      )}
                    >
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        wallet.status === 'active' ? 'bg-green-500 animate-pulse' :
                        wallet.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                      )} />
                      <span className="font-mono truncate text-gray-700 font-semibold">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </span>
                    </div>
                  ))}
                  {wallets.length > 10 && (
                    <p className="px-2.5 text-[10px] text-gray-500">
                      +{wallets.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </nav>

          {/* Footer - Stats Summary */}
          <div className="p-3 border-t border-gray-200">
            {sidebarOpen ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600 font-bold">Active Wallets</span>
                  <span className="font-bold text-green-600">
                    {wallets.filter(w => w.status === 'active').length}/{wallets.length}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600 font-bold">Status</span>
                  <span className={cn(
                    'font-bold',
                    isAutomationRunning ? 'text-green-600' : 'text-gray-600'
                  )}>
                    {isAutomationRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  isAutomationRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                )} />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-all duration-300 min-h-screen',
          // Desktop
          !isMobile && (sidebarOpen ? 'ml-64' : 'ml-20'),
          // Mobile - no margin, full width
          isMobile && 'ml-0'
        )}
      >
        {/* Header with Status Controls */}
        <header className="sticky top-0 z-30 h-14 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-3 sm:px-5">
            {/* Left side - Mobile Menu + Gas + Section Title */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile menu toggle */}
              {isMobile && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Menu className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              )}
              {gasPrice !== null && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100">
                  <Fuel className="h-3 w-3 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {gasPrice} Gwei
                  </span>
                </div>
              )}
              <div className="hidden sm:block h-5 w-px bg-gray-200" />
              <h1 className="text-sm font-bold text-gray-900 tracking-tight truncate max-w-[150px] sm:max-w-none">
                {currentSection?.label || 'Mining Automation'}
              </h1>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Premium Automation Status Badge */}
              <div className="relative group">
                {isAutomationRunning && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                )}
                <Badge 
                  className={cn(
                    'relative px-3 sm:px-4 py-2 text-xs font-bold border-2 shadow-lg transition-all duration-300',
                    isAutomationRunning 
                      ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 text-green-700 border-green-300 shadow-green-500/30 hover:shadow-green-500/50' 
                      : 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 text-red-700 border-red-300 shadow-red-500/20 hover:shadow-red-500/40'
                  )}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full mr-2',
                    isAutomationRunning ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-md shadow-red-500/50'
                  )} />
                  {isAutomationRunning ? 'Running' : 'Paused'}
                </Badge>
              </div>

              {/* Premium Start/Stop Button */}
              <div className="relative group">
                {/* Glow effect */}
                <div className={cn(
                  "absolute inset-0 rounded-xl blur-md opacity-50 group-hover:opacity-70 transition-opacity",
                  isAutomationRunning 
                    ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
                )} />
                
                <Button
                  onClick={isAutomationRunning ? stopAutomation : startAutomation}
                  size="sm"
                  className={cn(
                    'relative min-w-[90px] sm:min-w-[140px] h-9 text-xs font-bold shadow-xl transition-all duration-300 border-2',
                    isAutomationRunning 
                      ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 hover:from-red-600 hover:via-rose-600 hover:to-red-700 text-white border-red-400 shadow-red-500/40 hover:shadow-red-500/60 hover:scale-105' 
                      : 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white border-purple-400 shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105'
                  )}
                >
                  {isAutomationRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5 mr-1.5 drop-shadow" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1.5 drop-shadow" />
                      <span className="hidden sm:inline">Start </span>Automation
                    </>
                  )}
                </Button>
              </div>

              <div className="hidden sm:block h-5 w-px bg-gray-200" />

              {/* Notifications Dropdown */}
              <NotificationDropdown />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-5">
          {children}
        </main>
      </div>

      {/* System Status Sidebar */}
      <StatusSidebar />
    </div>
  );
}


// Notification Dropdown Component
function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { events, logs, wallets, isAutomationRunning } = useMiningStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('[data-notification-dropdown]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Generate notifications from recent events and logs
  const notifications = [
    // Recent events
    ...events.slice(0, 3).map(event => ({
      id: `event-${event.id}`,
      type: event.status === 'finished' ? 'success' : event.status === 'failed' ? 'error' : 'info',
      title: `Event #${event.chainEventId || 'Pending'}`,
      message: event.status === 'finished' 
        ? `Completed with ${event.rewardReceived || '0'} FCC reward`
        : event.status === 'failed'
        ? 'Event failed'
        : 'Event in progress',
      time: new Date(event.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    })),
    // Recent logs (errors and warnings)
    ...logs.filter(log => log.level === 'error' || log.level === 'warn').slice(0, 2).map(log => ({
      id: `log-${log.id}`,
      type: log.level === 'error' ? 'error' : 'warning',
      title: log.action,
      message: log.message,
      time: new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    })),
    // Wallet status notifications
    ...wallets.filter(w => w.status === 'error' || w.status === 'nft_expired').slice(0, 2).map(wallet => ({
      id: `wallet-${wallet.id}`,
      type: 'warning',
      title: 'Wallet Issue',
      message: `${wallet.address.slice(0, 10)}... - ${wallet.status === 'nft_expired' ? 'NFT Expired' : 'Error'}`,
      time: 'Now',
    })),
  ].slice(0, 5); // Limit to 5 notifications

  const unreadCount = notifications.length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="relative" data-notification-dropdown>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)}
        className="hidden sm:flex rounded-full relative h-8 w-8 hover:bg-gray-100"
      >
        <Bell className="h-4 w-4 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-orange-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs font-bold">
                {unreadCount} New
              </Badge>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-600">No notifications</p>
                <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={cn(
                      'p-3 hover:bg-gray-50 transition-colors cursor-pointer border-l-4',
                      getBgColor(notif.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-700 mt-0.5 font-semibold">{notif.message}</p>
                        <p className="text-[10px] text-gray-500 mt-1 font-semibold">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Link 
                href="/mining/history"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 block text-center"
              >
                View All Logs →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
