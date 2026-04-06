'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/lib/providers';
import { CONTRACTS, TOKEN_DECIMALS, POLYGON_RPC } from '@/lib/config';
import { ERC20_ABI, EVENT_MANAGER_ABI, NFT_MANAGER_ABI, DIRECT_SALE_POOL_ABI, INVESTOR_SALE_POOL_ABI, REDEMPTION_POOL_ABI } from '@/lib/config/abis';
import { toWei, fromWei } from '@/lib/utils';

/**
 * Hook for ERC20 token operations (approve, transfer, etc.)
 */
export function useTokenContract() {
  const { signer, provider } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = useCallback(async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    decimals: number = 6
  ): Promise<{ hash: string; success: boolean }> => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const amountWei = toWei(amount, decimals);
      const tx = await contract.approve(spenderAddress, amountWei);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: receipt.status === 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  const getAllowance = useCallback(async (
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<bigint> => {
    const rpcProvider = provider || new ethers.JsonRpcProvider(POLYGON_RPC);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, rpcProvider);
    return await contract.allowance(ownerAddress, spenderAddress);
  }, [provider]);

  const getBalance = useCallback(async (
    tokenAddress: string,
    ownerAddress: string
  ): Promise<bigint> => {
    const rpcProvider = provider || new ethers.JsonRpcProvider(POLYGON_RPC);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, rpcProvider);
    return await contract.balanceOf(ownerAddress);
  }, [provider]);

  return { approve, getAllowance, getBalance, isLoading, error };
}

/**
 * Hook for Event Manager contract operations
 */
export function useEventManagerContract() {
  const { signer, provider, address } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCallback(async (params: {
    businessName: string;
    activityContent: string;
    latitudeLongitude: string;
    deadline: number;
    totalDropAmts: bigint;
    dropType: number;
    dropNumber: number;
    minDropAmt: bigint;
    maxDropAmt: bigint;
    tokenAddress: string;
  }): Promise<{ hash: string; success: boolean }> => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);
      
      const tx = await contract.activityAdd(
        params.businessName,
        params.activityContent,
        params.latitudeLongitude,
        params.deadline,
        params.totalDropAmts,
        params.dropType,
        params.dropNumber,
        params.minDropAmt,
        params.maxDropAmt,
        params.tokenAddress
      );
      
      const receipt = await tx.wait();
      return { hash: receipt.hash, success: receipt.status === 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Event creation failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  const drop = useCallback(async (
    activityId: number,
    toAddress: string,
    dropAmount: bigint
  ): Promise<{ hash: string; success: boolean }> => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);
      const tx = await contract.drop(activityId, toAddress, dropAmount);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: receipt.status === 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Drop failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  const finishEvent = useCallback(async (activityId: number): Promise<{ hash: string; success: boolean }> => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, signer);
      const tx = await contract.activityFinish(activityId);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: receipt.status === 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Finish event failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  const getEvent = useCallback(async (eventId: number) => {
    const rpcProvider = provider || new ethers.JsonRpcProvider(POLYGON_RPC);
    const contract = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, rpcProvider);
    
    const arrayIndex = eventId - 1;
    const [base, ext] = await Promise.all([
      contract.activityInfoArrs(arrayIndex),
      contract.activityInfoExtArrs(arrayIndex),
    ]);
    
    return { base, ext };
  }, [provider]);

  const getMyEvents = useCallback(async (): Promise<Array<{
    activityId: number;
    businessName: string;
    tokenSymbol: 'FCC' | 'USDT';
    tokenDecimals: number;
    dropNumber: number;
    alreadyDropNumber: number;
    alreadyDropAmts: string;
    maxDropAmt: string;
    activityDeadLine: number;
    activityStatus: number;
    tokenContractAddr: string;
  }>> => {
    if (!address) return [];
    
    const rpcProvider = provider || new ethers.JsonRpcProvider(POLYGON_RPC);
    const contract = new ethers.Contract(CONTRACTS.EVENT_MANAGER, EVENT_MANAGER_ABI, rpcProvider);
    
    const events: Array<{
      activityId: number;
      businessName: string;
      tokenSymbol: 'FCC' | 'USDT';
      tokenDecimals: number;
      dropNumber: number;
      alreadyDropNumber: number;
      alreadyDropAmts: string;
      maxDropAmt: string;
      activityDeadLine: number;
      activityStatus: number;
      tokenContractAddr: string;
    }> = [];
    
    // Scan from recent events
    const startIndex = 3500;
    const batchSize = 50;
    
    for (let batch = 0; batch < 10; batch++) {
      const promises = [];
      
      for (let i = 0; i < batchSize; i++) {
        const eventId = startIndex - (batch * batchSize) - i;
        if (eventId <= 0) break;
        
        promises.push(
          (async () => {
            try {
              const [base, ext] = await Promise.all([
                contract.activityInfoArrs(eventId - 1),
                contract.activityInfoExtArrs(eventId - 1),
              ]);
              return { eventId, base, ext };
            } catch {
              return null;
            }
          })()
        );
      }
      
      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (!result || Number(result.base.activityId) === 0) continue;
        if (result.base.businessAccount.toLowerCase() !== address.toLowerCase()) continue;
        
        const tokenAddr = result.base.tokenContractAddr.toLowerCase();
        const isFCC = tokenAddr === CONTRACTS.FCC_TOKEN.toLowerCase();
        
        events.push({
          activityId: Number(result.base.activityId),
          businessName: result.base.businessName,
          tokenSymbol: isFCC ? 'FCC' : 'USDT',
          tokenDecimals: isFCC ? TOKEN_DECIMALS.FCC : TOKEN_DECIMALS.USDT,
          dropNumber: Number(result.base.dropNumber),
          alreadyDropNumber: Number(result.ext.alreadyDropNumber),
          alreadyDropAmts: result.ext.alreadyDropAmts.toString(),
          maxDropAmt: result.base.maxDropAmt.toString(),
          activityDeadLine: Number(result.base.activityDeadline),
          activityStatus: Number(result.ext.activityStatus),
          tokenContractAddr: result.base.tokenContractAddr,
        });
      }
      
      if (events.length > 0 && results.filter(r => r !== null).length < batchSize / 2) {
        break;
      }
    }
    
    events.sort((a, b) => b.activityId - a.activityId);
    return events;
  }, [address, provider]);

  return { createEvent, drop, finishEvent, getEvent, getMyEvents, isLoading, error };
}

/**
 * Hook for NFT Manager contract operations
 */
export function useNFTManagerContract() {
  const { signer, provider, address } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mintNFT = useCallback(async (params: {
    name: string;
    description: string;
    imgUrl: string;
    nftAddress: string;
    website: string;
    social: string;
    nftType: number; // 1 = Pro, 2 = Basic
  }): Promise<{ hash: string; success: boolean }> => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, signer);
      
      const tx = await contract.mintMerchantNFT(
        params.name,
        params.description,
        params.imgUrl,
        params.nftAddress,
        params.website,
        params.social,
        params.nftType
      );
      
      const receipt = await tx.wait();
      return { hash: receipt.hash, success: receipt.status === 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'NFT mint failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  const getNFTStatus = useCallback(async (ownerAddress?: string) => {
    const rpcProvider = provider || new ethers.JsonRpcProvider(POLYGON_RPC);
    const contract = new ethers.Contract(CONTRACTS.NFT_MANAGER, NFT_MANAGER_ABI, rpcProvider);
    
    const addr = ownerAddress || address;
    if (!addr) return null;
    
    try {
      const result = await contract.getMerchantNFT(addr);
      const [tokenId, nftType, , expirationTime, isValid] = result;
      
      return {
        tokenId: Number(tokenId),
        nftType: Number(nftType),
        expirationTime: Number(expirationTime),
        isValid: Boolean(isValid),
      };
    } catch {
      return null;
    }
  }, [provider, address]);

  return { mintNFT, getNFTStatus, isLoading, error };
}

/**
 * Hook for swap pool operations
 */
export function useSwapContract() {
  const { signer, provider } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPoolPrices = useCallback(async () => {
    const rpcProvider = provider || new ethers.JsonRpcProvider(POLYGON_RPC);
    
    const directContract = new ethers.Contract(CONTRACTS.DIRECT_SALE_POOL, DIRECT_SALE_POOL_ABI, rpcProvider);
    const investorContract = new ethers.Contract(CONTRACTS.INVESTOR_SALE_POOL, INVESTOR_SALE_POOL_ABI, rpcProvider);
    const redemptionContract = new ethers.Contract(CONTRACTS.REDEMPTION_POOL, REDEMPTION_POOL_ABI, rpcProvider);
    
    const [directPrice, investorPrice, redemptionPrice] = await Promise.all([
      directContract.getPrice().catch(() => BigInt(60000)),
      investorContract.getPrice().catch(() => BigInt(60000)),
      redemptionContract.getPrice().catch(() => BigInt(60000)),
    ]);
    
    return {
      directPrice: Number(fromWei(directPrice, 6)),
      investorPrice: Number(fromWei(investorPrice, 6)),
      redemptionPrice: Number(fromWei(redemptionPrice, 6)),
    };
  }, [provider]);

  const buyFCC = useCallback(async (
    usdtAmount: string,
    useInvestorPool: boolean
  ): Promise<{ hash: string; success: boolean }> => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const poolAddress = useInvestorPool ? CONTRACTS.INVESTOR_SALE_POOL : CONTRACTS.DIRECT_SALE_POOL;
      const abi = useInvestorPool ? INVESTOR_SALE_POOL_ABI : DIRECT_SALE_POOL_ABI;
      
      const contract = new ethers.Contract(poolAddress, abi, signer);
      const amountWei = toWei(usdtAmount, TOKEN_DECIMALS.USDT);
      
      const tx = await contract.buyToken(amountWei);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: receipt.status === 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Buy FCC failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  const sellFCC = useCallback(async (fccAmount: string): Promise<{ hash: string; success: boolean }> => {
    if (!signer) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = new ethers.Contract(CONTRACTS.REDEMPTION_POOL, REDEMPTION_POOL_ABI, signer);
      const amountWei = toWei(fccAmount, TOKEN_DECIMALS.FCC);
      
      const tx = await contract.sellToken(amountWei);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: receipt.status === 1 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sell FCC failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  return { getPoolPrices, buyFCC, sellFCC, isLoading, error };
}
