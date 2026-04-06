'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import {
  LayoutDashboard,
  Calendar,
  Droplets,
  ArrowLeftRight,
  Sparkles,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  BookUser,
  Cpu,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/drops', label: 'Drops', icon: Droplets },
  { href: '/swap', label: 'Swap', icon: ArrowLeftRight },
  { href: '/nft', label: 'NFT Pass', icon: Sparkles },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const quickActions = [
  { href: '/events/create?quick=true', label: 'Quick Airdrop', icon: Zap },
  { href: '/settings/addresses', label: 'Address Book', icon: BookUser },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const isMiningActive = pathname === '/mining';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-200',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-fishcake flex-shrink-0">
              <span className="text-xl">🍥</span>
            </div>
            {sidebarOpen && (
              <span className="text-xl font-bold gradient-text whitespace-nowrap">
                Fishcake
              </span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Mining Automation - Featured */}
          <div className="mb-6">
            {sidebarOpen && (
              <p className="px-3 mb-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                ⚡ Automation
              </p>
            )}
            <Link
              href="/mining"
              prefetch={true}
              className={cn(
                'relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all overflow-hidden group',
                isMiningActive
                  ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10'
              )}
            >
              {/* Animated gradient border */}
              {!isMiningActive && (
                <div className="absolute inset-0 rounded-xl p-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-[2px] rounded-[10px] bg-card" />
                </div>
              )}
              
              {/* Animated grid overlay */}
              <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:8px_8px] animate-grid-flow" />
              </div>
              
              {/* Glow effect */}
              <div className={cn(
                'absolute -inset-1 rounded-xl blur-xl transition-opacity',
                isMiningActive ? 'opacity-30' : 'opacity-0 group-hover:opacity-20',
                'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
              )} />
              
              {/* Content */}
              <div className={cn(
                'relative z-10 p-2 rounded-lg',
                isMiningActive 
                  ? 'bg-white/20' 
                  : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
              )}>
                <Cpu className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isMiningActive ? 'text-white' : 'text-purple-400'
                )} />
              </div>
              {sidebarOpen && (
                <div className="relative z-10">
                  <span className={cn(
                    'text-sm font-semibold whitespace-nowrap',
                    isMiningActive ? 'text-white' : 'text-purple-400'
                  )}>
                    Mining Automation
                  </span>
                  <span className={cn(
                    'block text-[10px] uppercase tracking-wider',
                    isMiningActive ? 'text-white/70' : 'text-purple-400/60'
                  )}>
                    Visual Workflow
                  </span>
                </div>
              )}
              
              {/* Pulse indicator */}
              <div className="absolute top-2 right-2 z-10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            {sidebarOpen && (
              <p className="px-3 mb-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Quick Actions
              </p>
            )}
            <div className="space-y-2">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                      'bg-gradient-to-r from-fishcake-500/10 to-fishcake-600/10 hover:from-fishcake-500/20 hover:to-fishcake-600/20',
                      'border border-fishcake-500/20'
                    )}
                  >
                    <Icon className="h-5 w-5 text-fishcake-500 flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="text-sm font-medium text-fishcake-500 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Main Navigation */}
          <div>
            {sidebarOpen && (
              <p className="px-3 mb-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Navigation
              </p>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="text-sm font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {sidebarOpen ? (
            <div className="text-xs text-muted-foreground text-center">
              <p>Fishcake v1.0</p>
              <p className="mt-1">Polygon Mainnet</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
