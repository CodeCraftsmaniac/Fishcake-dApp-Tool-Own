'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore, useUIStore } from '@/lib/stores';
import { useWallet } from '@/lib/providers';
import { CONTRACTS, TOKEN_DECIMALS, POLYGON_RPC } from '@/lib/config';
import { ERC20_ABI, NFT_MANAGER_ABI, EVENT_MANAGER_ABI } from '@/lib/config/abis';
import { fromWei } from '@/lib/utils';
import { EventInfo } from './index';

// Singleton provider to prevent creating multiple instances
let sharedProvider: ethers.JsonRpcProvider | null = null;
function getSharedProvider(): ethers.JsonRpcProvider {
  if (!sharedProvider) {
    sharedProvider = new ethers.JsonRpcProvider(POLYGON_RPC);
  }
  return sharedProvider;
}

// Contract instance cache
const contractCache = new Map<string, ethers.Contract>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCachedContract(address: string, abi: any, signerOrProvider: ethers.Signer | ethers.Provider): ethers.Contract {
  const cacheKey = `${address}-${signerOrProvider instanceof ethers.Wallet ? 'signer' : 'provider'}`;
  if (!contractCache.has(cacheKey)) {
    contractCache.set(cacheKey, new ethers.Contract(address, abi, signerOrProvider));
  }
  return contractCache.get(cacheKey)!;
}

/**
 * Hook to sync wallet data with Zustand store
 * Fetches FCC, USDT balances and NFT pass status
 */
export function useWalletSync() {
  const { address, isConnected, provider } = useWallet();
  const { setConnected, setAddress, setChainId, setBalances, setNFTPass, logout } = useWalletStore();
  const fetchInProgress = useRef(false);

  const fetchBalances = useCallback(async () => {
    if (!address || !provider || fetchInProgress.current) return;
    
    fetchInProgress.current = true;
    
    try {
      const fccContract = getCachedContract(CONTRACTS.FCC_TOKEN, ERC20_ABI, provider);
      const usdtContract = getCachedContract(CONTRACTS.USDT_TOKEN, ERC20_ABI, provider);
      
      const [fccBalance, usdtBalance, polBalance] = await Promise.all([
        fccContract.balanceOf(address),
        usdtContract.balanceOf(address),
        provider.getBalance(address),
      ]);

      setBalances({
        fcc: fromWei(fccBalance, TOKEN_DECIMALS.FCC),
        usdt: fromWei(usdtBalance, TOKEN_DECIMALS.USDT),
        pol: ethers.formatEther(polBalance),
      });
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      fetchInProgress.current = false;
    }
  }, [address, provider, setBalances]);

  const fetchNFTPass = useCallback(async () => {
    if (!address || !provider) return;

    try {
      const nftContract = getCachedContract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, provider);
      const nftData = await nftContract.getMerchantNFT(address);
      
      const [tokenId, nftType, , expirationTime, isValid] = nftData;
      
      let type: 'none' | 'basic' | 'pro' = 'none';
      if (Number(tokenId) > 0) {
        type = Number(nftType) === 1 ? 'pro' : 'basic';
      }

      setNFTPass({
        type,
        expiresAt: Number(expirationTime),
        isValid,
      });
    } catch (error) {
      console.error('Failed to fetch NFT pass:', error);
    }
  }, [address, provider, setNFTPass]);

  // Sync connection state
  useEffect(() => {
    setConnected(isConnected);
    setAddress(address || null);
    setChainId(isConnected ? 137 : null);

    if (!isConnected) {
      logout();
      contractCache.clear(); // Clear cache on disconnect
    }
  }, [isConnected, address, setConnected, setAddress, setChainId, logout]);

  // Fetch data on connect and periodically (30s instead of 15s)
  useEffect(() => {
    if (!isConnected || !address) return;

    fetchBalances();
    fetchNFTPass();

    const interval = setInterval(fetchBalances, 30000); // Increased from 15s to 30s

    return () => clearInterval(interval);
  }, [isConnected, address, fetchBalances, fetchNFTPass]);

  return {
    isConnected,
    address,
    chainId: isConnected ? 137 : null,
    refetch: fetchBalances,
  };
}

/**
 * Hook to fetch gas price - reduced frequency
 */
export function useGasPrice() {
  const { setGasPrice } = useUIStore();
  const [gasData, setGasData] = useState<{ slow: number; standard: number; fast: number } | null>(null);
  const lastFetch = useRef(0);

  useEffect(() => {
    const fetchGasPrice = async () => {
      // Debounce - don't fetch more often than every 30s
      const now = Date.now();
      if (now - lastFetch.current < 30000) return;
      lastFetch.current = now;
      
      try {
        const response = await fetch('https://api.polygonscan.com/api?module=gastracker&action=gasoracle');
        const data = await response.json();
        
        if (data.status === '1' && data.result) {
          const gasInfo = {
            slow: parseInt(data.result.SafeGasPrice) || 30,
            standard: parseInt(data.result.ProposeGasPrice) || 35,
            fast: parseInt(data.result.FastGasPrice) || 50,
          };
          setGasData(gasInfo);
          setGasPrice(gasInfo.standard);
        } else {
          const provider = getSharedProvider();
          const feeData = await provider.getFeeData();
          const gwei = Number(feeData.gasPrice || BigInt(30000000000)) / 1e9;
          setGasPrice(Math.round(gwei));
          setGasData({ slow: Math.round(gwei * 0.8), standard: Math.round(gwei), fast: Math.round(gwei * 1.2) });
        }
      } catch {
        setGasPrice(30);
        setGasData({ slow: 25, standard: 30, fast: 40 });
      }
    };

    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 60000); // Increased from 15s to 60s
    return () => clearInterval(interval);
  }, [setGasPrice]);

  return gasData;
}

/**
 * Hook to fetch user's events from the EventManager contract
 * Optimized to limit scans and use caching
 */
export function useMyEvents() {
  const { address, provider, isConnected } = useWallet();

  return useQuery({
    queryKey: ['myEvents', address],
    queryFn: async (): Promise<EventInfo[]> => {
      if (!address || !provider) return [];

      const eventManager = getCachedContract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, provider);
      
      // Get total event count - use activityIdAcc instead of length
      let totalCount: number;
      try {
        const countResult = await eventManager.activityIdAcc();
        totalCount = Number(countResult);
      } catch {
        totalCount = 3600; // Fallback estimate
      }
      
      if (totalCount === 0) return [];

      const events: EventInfo[] = [];
      const batchSize = 20; // Reduced batch size
      const maxBatches = 5; // Limit total batches to prevent hanging
      
      // Start from most recent
      for (let batch = 0; batch < maxBatches && events.length < 20; batch++) {
        const startIdx = totalCount - 1 - (batch * batchSize);
        if (startIdx < 0) break;
        
        const promises = [];
        const endIdx = Math.max(0, startIdx - batchSize + 1);
        
        for (let j = startIdx; j >= endIdx; j--) {
          promises.push(
            Promise.all([
              eventManager.activityInfoArrs(j),
              eventManager.activityInfoExtArrs(j),
            ]).catch(() => null)
          );
        }
        
        const results = await Promise.all(promises);
        
        for (const result of results) {
          if (!result) continue;
          
          const [info, extInfo] = result;
          
          // Filter for user's events
          if (info.businessAccount.toLowerCase() !== address.toLowerCase()) continue;
          
          const tokenAddr = info.tokenContractAddr.toLowerCase();
          const isFCC = tokenAddr === CONTRACTS.FCC_TOKEN.toLowerCase();
          
          events.push({
            activityId: Number(info.activityId),
            businessName: info.businessName,
            tokenSymbol: isFCC ? 'FCC' : 'USDT',
            tokenDecimals: 6,
            dropNumber: Number(info.dropNumber),
            alreadyDropNumber: Number(extInfo.alreadyDropNumber),
            alreadyDropAmts: extInfo.alreadyDropAmts.toString(),
            maxDropAmt: info.maxDropAmt.toString(),
            activityDeadLine: Number(info.activityDeadline),
            activityStatus: Number(extInfo.activityStatus),
            tokenContractAddr: info.tokenContractAddr,
          });
        }
      }
      
      return events.sort((a, b) => b.activityId - a.activityId);
    },
    enabled: isConnected && !!address,
    staleTime: 60000, // Increased from 30s to 60s
    refetchInterval: 120000, // Increased from 60s to 120s
    refetchOnWindowFocus: false,
  });
}
