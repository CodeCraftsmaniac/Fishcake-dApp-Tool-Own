/**
 * Contract ABIs for Fishcake Web App
 * Matching the CLI tool ABIs exactly
 */

// ERC20 ABI (minimal for balances and approvals)
export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Event Manager ABI
export const EVENT_MANAGER_ABI = [
  {
    inputs: [
      { name: '_businessName', type: 'string' },
      { name: '_activityContent', type: 'string' },
      { name: '_latitudeLongitude', type: 'string' },
      { name: '_activityDeadLine', type: 'uint256' },
      { name: '_totalDropAmts', type: 'uint256' },
      { name: '_dropType', type: 'uint256' },
      { name: '_dropNumber', type: 'uint256' },
      { name: '_minDropAmt', type: 'uint256' },
      { name: '_maxDropAmt', type: 'uint256' },
      { name: '_tokenContractAddr', type: 'address' },
    ],
    name: 'activityAdd',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_activityId', type: 'uint256' }],
    name: 'activityFinish',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_activityId', type: 'uint256' },
      { name: '_to', type: 'address' },
      { name: '_dropAmt', type: 'uint256' },
    ],
    name: 'drop',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'activityInfoArrs',
    outputs: [
      { name: 'activityId', type: 'uint256' },
      { name: 'businessAccount', type: 'address' },
      { name: 'businessName', type: 'string' },
      { name: 'activityContent', type: 'string' },
      { name: 'latitudeLongitude', type: 'string' },
      { name: 'activityCreateTime', type: 'uint256' },
      { name: 'activityDeadLine', type: 'uint256' },
      { name: 'dropType', type: 'uint8' },
      { name: 'dropNumber', type: 'uint256' },
      { name: 'minDropAmt', type: 'uint256' },
      { name: 'maxDropAmt', type: 'uint256' },
      { name: 'tokenContractAddr', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'activityInfoExtArrs',
    outputs: [
      { name: 'activityId', type: 'uint256' },
      { name: 'alreadyDropAmts', type: 'uint256' },
      { name: 'alreadyDropNumber', type: 'uint256' },
      { name: 'businessMinedAmt', type: 'uint256' },
      { name: 'businessMinedWithdrawedAmt', type: 'uint256' },
      { name: 'activityStatus', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'activityIdAcc',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'activityInfoArrsLength',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// NFT Manager ABI
export const NFT_MANAGER_ABI = [
  {
    inputs: [
      { name: '_businessName', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_imgUrl', type: 'string' },
      { name: '_businessAddress', type: 'string' },
      { name: '_website', type: 'string' },
      { name: '_social', type: 'string' },
      { name: '_type', type: 'uint8' },
    ],
    name: 'mintMerchantNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getMerchantNFT',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'nftType', type: 'uint8' },
      { name: 'mintTime', type: 'uint256' },
      { name: 'expirationTime', type: 'uint256' },
      { name: 'isValid', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Direct Sale Pool ABI
export const DIRECT_SALE_POOL_ABI = [
  {
    inputs: [{ name: '_usdtAmount', type: 'uint256' }],
    name: 'buyToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_fccAmount', type: 'uint256' }],
    name: 'sellToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Investor Sale Pool ABI
export const INVESTOR_SALE_POOL_ABI = [
  {
    inputs: [{ name: '_usdtAmount', type: 'uint256' }],
    name: 'buyToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Redemption Pool ABI
export const REDEMPTION_POOL_ABI = [
  {
    inputs: [{ name: '_fccAmount', type: 'uint256' }],
    name: 'sellToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
