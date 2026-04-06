'use client';

import { Bell, Moon, Sun, LogOut, Copy, ExternalLink } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { useUIStore, useWalletStore } from '@/lib/stores';
import { useWallet } from '@/lib/providers';
import { formatNumber, formatAddress } from '@/lib/utils';
import { getExplorerUrl } from '@/lib/config';
import { LiveGasPrice } from '@/components/shared/LiveGasPrice';
import { useState } from 'react';

export function Header() {
  const { theme, setTheme } = useUIStore();
  const { balances } = useWalletStore();
  const { address, isConnected, disconnect } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left side - Live Gas tracker */}
        <div className="flex items-center gap-4">
          <LiveGasPrice />
        </div>

        {/* Right side - Actions & Wallet */}
        <div className="flex items-center gap-4">
          {/* Balances (when connected) */}
          {isConnected && (
            <div className="hidden md:flex items-center gap-3">
              <Badge variant="fcc" className="flex items-center gap-1.5 px-3 py-1.5">
                <span>🍥</span>
                <span>{formatNumber(balances.fcc, 2)} FCC</span>
              </Badge>
              <Badge variant="usdt" className="flex items-center gap-1.5 px-3 py-1.5">
                <span>💲</span>
                <span>{formatNumber(balances.usdt, 2)} USDT</span>
              </Badge>
              <Badge variant="pol" className="flex items-center gap-1.5 px-3 py-1.5">
                <span>⟠</span>
                <span>{formatNumber(balances.pol, 4)} POL</span>
              </Badge>
            </div>
          )}

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

          {/* Wallet info */}
          {isConnected && address && (
            <div className="relative">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>{formatAddress(address)}</span>
              </Button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Connected to Polygon
                  </div>
                  <div className="px-3 py-2 font-mono text-xs break-all border-t border-border">
                    {address}
                  </div>
                  <div className="flex flex-col gap-1 border-t border-border pt-2">
                    <button
                      onClick={copyAddress}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-secondary transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? 'Copied!' : 'Copy Address'}
                    </button>
                    <a
                      href={getExplorerUrl('address', address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-secondary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Polygonscan
                    </a>
                    <button
                      onClick={() => {
                        disconnect();
                        setShowDropdown(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-secondary text-red-500 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
