export { useWalletSync, useGasPrice, useMyEvents } from './useWallet';
export { useTokenContract, useEventManagerContract, useNFTManagerContract, useSwapContract } from './useContracts';
export { useAddressBookStore } from '../stores';

// Re-export EventInfo type for compatibility
export interface EventInfo {
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
}
