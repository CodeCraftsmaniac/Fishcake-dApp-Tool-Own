'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, Button, Input, Badge } from '@/components/ui';
import { useWallet } from '@/lib/providers';
import { useWalletStore } from '@/lib/stores';
import { useSwapContract, useTokenContract } from '@/lib/hooks';
import { CONTRACTS, TOKEN_DECIMALS, POOL_THRESHOLDS } from '@/lib/config';
import { formatNumber } from '@/lib/utils';
import { ArrowDownUp, Loader2, Check, Info } from 'lucide-react';

export default function SwapPage() {
  const { address, isConnected } = useWallet();
  const { balances } = useWalletStore();
  const { getPoolPrices, buyFCC, sellFCC, isLoading: isSwapping } = useSwapContract();
  const { approve, isLoading: isApproving } = useTokenContract();
  
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [prices, setPrices] = useState({
    directPrice: 0.06,
    investorPrice: 0.06,
    redemptionPrice: 0.06,
  });

  // Fetch pool prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const poolPrices = await getPoolPrices();
        setPrices(poolPrices);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [getPoolPrices]);

  // Calculate pool and output
  const calculateSwap = () => {
    const inputAmount = parseFloat(amount) || 0;
    
    if (mode === 'buy') {
      // Buy FCC with USDT
      const useInvestorPool = inputAmount >= POOL_THRESHOLDS.USDT_INVESTOR_MIN;
      const price = useInvestorPool ? prices.investorPrice : prices.directPrice;
      const fccOutput = inputAmount / price;
      
      return {
        pool: useInvestorPool ? 'Investor Pool' : 'Direct Pool',
        poolAddress: useInvestorPool ? CONTRACTS.INVESTOR_SALE_POOL : CONTRACTS.DIRECT_SALE_POOL,
        price,
        output: fccOutput,
        inputToken: 'USDT',
        outputToken: 'FCC',
        useInvestorPool,
      };
    } else {
      // Sell FCC for USDT
      const price = prices.redemptionPrice;
      const usdtOutput = inputAmount * price;
      
      return {
        pool: 'Redemption Pool',
        poolAddress: CONTRACTS.REDEMPTION_POOL,
        price,
        output: usdtOutput,
        inputToken: 'FCC',
        outputToken: 'USDT',
        useInvestorPool: false,
      };
    }
  };

  const swapInfo = calculateSwap();
  const inputAmount = parseFloat(amount) || 0;
  const hasEnoughBalance = mode === 'buy' 
    ? parseFloat(balances.usdt) >= inputAmount
    : parseFloat(balances.fcc) >= inputAmount;

  // Handle approve
  const handleApprove = async () => {
    const tokenAddress = mode === 'buy' ? CONTRACTS.USDT_TOKEN : CONTRACTS.FCC_TOKEN;
    const decimals = mode === 'buy' ? TOKEN_DECIMALS.USDT : TOKEN_DECIMALS.FCC;

    try {
      await approve(tokenAddress, swapInfo.poolAddress, amount, decimals);
      setIsApproved(true);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  // Handle swap
  const handleSwap = async () => {
    try {
      if (mode === 'buy') {
        await buyFCC(amount, swapInfo.useInvestorPool);
      } else {
        await sellFCC(amount);
      }
      setIsSwapped(true);
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  // Reset state
  const handleReset = () => {
    setAmount('');
    setIsApproved(false);
    setIsSwapped(false);
  };

  // Handle success
  if (isSwapped) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto py-12">
          <Card className="text-center">
            <CardContent className="py-12">
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Swap Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Successfully swapped {formatNumber(inputAmount, 2)} {swapInfo.inputToken} for ~{formatNumber(swapInfo.output, 2)} {swapInfo.outputToken}
              </p>
              <Button onClick={handleReset}>
                Swap Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Swap</h1>
          <p className="text-muted-foreground">
            Exchange FCC and USDT
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <Button
            variant={mode === 'buy' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => {
              setMode('buy');
              handleReset();
            }}
          >
            Buy FCC
          </Button>
          <Button
            variant={mode === 'sell' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => {
              setMode('sell');
              handleReset();
            }}
          >
            Sell FCC
          </Button>
        </div>

        {/* Swap Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Input */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You pay</span>
                <span className="text-muted-foreground">
                  Balance: {formatNumber(mode === 'buy' ? balances.usdt : balances.fcc, 2)} {swapInfo.inputToken}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl h-16 pr-24"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Badge variant={mode === 'buy' ? 'usdt' : 'fcc'} className="text-lg px-3 py-1.5">
                    {mode === 'buy' ? '💲 USDT' : '🍥 FCC'}
                  </Badge>
                </div>
              </div>
              {!hasEnoughBalance && inputAmount > 0 && (
                <p className="text-sm text-red-500">Insufficient balance</p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <ArrowDownUp className="h-5 w-5" />
              </div>
            </div>

            {/* Output */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">You receive</span>
              <div className="p-4 rounded-xl bg-secondary/50">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    ~{formatNumber(swapInfo.output, 2)}
                  </span>
                  <Badge variant={mode === 'buy' ? 'fcc' : 'usdt'} className="text-lg px-3 py-1.5">
                    {mode === 'buy' ? '🍥 FCC' : '💲 USDT'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Pool Info */}
            {inputAmount > 0 && (
              <div className="p-3 rounded-lg bg-secondary/30 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Using <span className="text-foreground font-medium">{swapInfo.pool}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Rate: 1 FCC = {formatNumber(swapInfo.price, 4)} USDT
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isApproved ? (
              <Button
                onClick={handleApprove}
                disabled={!hasEnoughBalance || inputAmount === 0 || isApproving || !isConnected}
                className="w-full h-12"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Approving...
                  </>
                ) : (
                  `Approve ${swapInfo.inputToken}`
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSwap}
                disabled={!hasEnoughBalance || inputAmount === 0 || isSwapping}
                className="w-full h-12"
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Swapping...
                  </>
                ) : (
                  `Swap ${swapInfo.inputToken} for ${swapInfo.outputToken}`
                )}
              </Button>
            )}

            {isApproved && !isSwapped && (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <Check className="h-4 w-4" />
                {swapInfo.inputToken} approved
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
