'use client';

/**
 * LiveGasPrice Component
 * 
 * Real-time gas price tracker for Polygon network
 * - Updates every 15 seconds automatically
 * - Shows trend indicators (up/down/stable)
 * - Color-coded based on gas price levels
 * - Hover tooltip with detailed gas tiers (slow/standard/fast)
 * - No page refresh needed - updates live like Bitcoin ticker
 */

import { useEffect, useState, useRef } from 'react';
import { Fuel, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

interface GasData {
  slow: number;
  standard: number;
  fast: number;
}

export function LiveGasPrice() {
  const { gasPrice, setGasPrice } = useUIStore();
  const [gasData, setGasData] = useState<GasData | null>(null);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [isLoading, setIsLoading] = useState(true);
  const previousGasPrice = useRef<number | null>(null);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        // Debounce - don't fetch more often than every 10 seconds
        const now = Date.now();
        if (now - lastFetchTime.current < 10000) {
          return;
        }
        lastFetchTime.current = now;

        // Try Polygonscan Gas Tracker API first
        const response = await fetch(
          'https://api.polygonscan.com/api?module=gastracker&action=gasoracle'
        );
        const data = await response.json();

        if (data.status === '1' && data.result) {
          const newGasData: GasData = {
            slow: parseInt(data.result.SafeGasPrice) || 30,
            standard: parseInt(data.result.ProposeGasPrice) || 35,
            fast: parseInt(data.result.FastGasPrice) || 50,
          };

          setGasData(newGasData);
          
          // Determine trend
          if (previousGasPrice.current !== null) {
            const diff = newGasData.standard - previousGasPrice.current;
            if (diff > 2) {
              setTrend('up');
            } else if (diff < -2) {
              setTrend('down');
            } else {
              setTrend('stable');
            }
          }

          previousGasPrice.current = newGasData.standard;
          setGasPrice(newGasData.standard);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch gas price:', error);
        // Fallback to default values
        if (!gasData) {
          const fallbackData: GasData = { slow: 25, standard: 30, fast: 40 };
          setGasData(fallbackData);
          setGasPrice(fallbackData.standard);
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchGasPrice();

    // Update every 15 seconds for live updates
    const interval = setInterval(fetchGasPrice, 15000);

    return () => clearInterval(interval);
  }, [setGasPrice, gasData]);

  if (isLoading || !gasData) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 animate-pulse">
        <Fuel className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      default:
        return <Minus className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getGasColor = (price: number) => {
    if (price < 30) return 'text-green-500';
    if (price < 50) return 'text-yellow-500';
    if (price < 100) return 'text-orange-500';
    return 'text-red-500';
  };

  const getGasBgColor = (price: number) => {
    if (price < 30) return 'bg-green-500/10 border-green-500/20';
    if (price < 50) return 'bg-yellow-500/10 border-yellow-500/20';
    if (price < 100) return 'bg-orange-500/10 border-orange-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="group relative">
      {/* Main Display */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300',
          getGasBgColor(gasData.standard),
          'hover:scale-105 cursor-pointer'
        )}
      >
        <Fuel className={cn('h-4 w-4', getGasColor(gasData.standard))} />
        <div className="flex items-center gap-1.5">
          <span className={cn('text-sm font-semibold', getGasColor(gasData.standard))}>
            {gasData.standard}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">Gwei</span>
          <span className="text-xs text-muted-foreground sm:hidden">G</span>
          {getTrendIcon()}
        </div>
      </div>

      {/* Tooltip with detailed gas prices */}
      <div className="absolute top-full left-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Gas Price Tiers
          </div>
          
          {/* Slow */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Slow</span>
            </div>
            <span className="text-sm font-semibold text-green-500">
              {gasData.slow} Gwei
            </span>
          </div>

          {/* Standard */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm">Standard</span>
            </div>
            <span className="text-sm font-semibold text-yellow-500">
              {gasData.standard} Gwei
            </span>
          </div>

          {/* Fast */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-sm">Fast</span>
            </div>
            <span className="text-sm font-semibold text-orange-500">
              {gasData.fast} Gwei
            </span>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Updates every 15s • Live
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
