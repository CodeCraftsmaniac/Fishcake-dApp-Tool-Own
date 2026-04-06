/**
 * Contract ABIs for Fishcake CLI
 * All ABIs are minimal (only includes functions we use)
 */

export const EVENT_MANAGER_ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "_businessName", "type": "string" },
            { "internalType": "string", "name": "_activityContent", "type": "string" },
            { "internalType": "string", "name": "_latitudeLongitude", "type": "string" },
            { "internalType": "uint256", "name": "_activityDeadLine", "type": "uint256" },
            { "internalType": "uint256", "name": "_totalDropAmts", "type": "uint256" },
            { "internalType": "uint8", "name": "_dropType", "type": "uint8" },
            { "internalType": "uint256", "name": "_dropNumber", "type": "uint256" },
            { "internalType": "uint256", "name": "_minDropAmt", "type": "uint256" },
            { "internalType": "uint256", "name": "_maxDropAmt", "type": "uint256" },
            { "internalType": "address", "name": "_tokenContractAddr", "type": "address" }
        ],
        "name": "activityAdd",
        "outputs": [
            { "internalType": "bool", "name": "_ret", "type": "bool" },
            { "internalType": "uint256", "name": "_activityId", "type": "uint256" }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_activityId", "type": "uint256" }],
        "name": "activityFinish",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_activityId", "type": "uint256" },
            { "internalType": "address", "name": "_to", "type": "address" },
            { "internalType": "uint256", "name": "_dropAmt", "type": "uint256" }
        ],
        "name": "drop",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "activityInfoArrs",
        "outputs": [
            { "internalType": "uint256", "name": "activityId", "type": "uint256" },
            { "internalType": "address", "name": "businessAccount", "type": "address" },
            { "internalType": "string", "name": "businessName", "type": "string" },
            { "internalType": "string", "name": "activityContent", "type": "string" },
            { "internalType": "string", "name": "latitudeLongitude", "type": "string" },
            { "internalType": "uint256", "name": "activityCreateTime", "type": "uint256" },
            { "internalType": "uint256", "name": "activityDeadLine", "type": "uint256" },
            { "internalType": "uint8", "name": "dropType", "type": "uint8" },
            { "internalType": "uint256", "name": "dropNumber", "type": "uint256" },
            { "internalType": "uint256", "name": "minDropAmt", "type": "uint256" },
            { "internalType": "uint256", "name": "maxDropAmt", "type": "uint256" },
            { "internalType": "address", "name": "tokenContractAddr", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "activityInfoExtArrs",
        "outputs": [
            { "internalType": "uint256", "name": "activityId", "type": "uint256" },
            { "internalType": "uint256", "name": "alreadyDropAmts", "type": "uint256" },
            { "internalType": "uint256", "name": "alreadyDropNumber", "type": "uint256" },
            { "internalType": "uint256", "name": "businessMinedAmt", "type": "uint256" },
            { "internalType": "uint256", "name": "businessMinedWithdrawedAmt", "type": "uint256" },
            { "internalType": "uint8", "name": "activityStatus", "type": "uint8" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_activityId", "type": "uint256" },
            { "internalType": "address", "name": "_account", "type": "address" }
        ],
        "name": "activityDroppedToAccount",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "who", "type": "address" },
            { "indexed": true, "internalType": "uint256", "name": "_activityId", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "_totalDropAmts", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "_businessName", "type": "string" },
            { "indexed": false, "internalType": "string", "name": "_activityContent", "type": "string" },
            { "indexed": false, "internalType": "string", "name": "_latitudeLongitude", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "_activityDeadLine", "type": "uint256" },
            { "indexed": false, "internalType": "uint8", "name": "_dropType", "type": "uint8" },
            { "indexed": false, "internalType": "uint256", "name": "_dropNumber", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "_minDropAmt", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "_maxDropAmt", "type": "uint256" },
            { "indexed": false, "internalType": "address", "name": "_tokenContractAddr", "type": "address" }
        ],
        "name": "ActivityAdd",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "uint256", "name": "_activityId", "type": "uint256" },
            { "indexed": false, "internalType": "address", "name": "_tokenContractAddr", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "_returnAmount", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "_minedAmount", "type": "uint256" }
        ],
        "name": "ActivityFinish",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "who", "type": "address" },
            { "indexed": true, "internalType": "uint256", "name": "_activityId", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "_dropAmt", "type": "uint256" }
        ],
        "name": "Drop",
        "type": "event"
    }
] as const;

export const ERC20_ABI = [
    {
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "to", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export const NFT_MANAGER_ABI = [
    {
        "inputs": [
            { "name": "_businessName", "type": "string" },
            { "name": "_description", "type": "string" },
            { "name": "_imgUrl", "type": "string" },
            { "name": "_businessAddress", "type": "string" },
            { "name": "_webSite", "type": "string" },
            { "name": "_social", "type": "string" },
            { "name": "_type", "type": "uint256" }
        ],
        "name": "createNFT",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_addr", "type": "address" }],
        "name": "getUserNTFDeadline",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_addr", "type": "address" }],
        "name": "getMerchantNTFDeadline",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const SALE_POOL_ABI = [
    {
        "inputs": [{ "name": "_usdtAmount", "type": "uint256" }],
        "name": "buyFccByUsdtAmount",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_fccAmount", "type": "uint256" }],
        "name": "buyFccAmount",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_usdtAmount", "type": "uint256" }],
        "name": "calculateFccByUsdtExternal",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_fccAmount", "type": "uint256" }],
        "name": "calculateUsdtByFccExternal",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const REDEMPTION_POOL_ABI = [
    {
        "inputs": [],
        "name": "getPoolInfo",
        "outputs": [
            { "name": "totalFccBurned", "type": "uint256" },
            { "name": "totalUsdtRedeemed", "type": "uint256" },
            { "name": "currentFccBalance", "type": "uint256" },
            { "name": "currentUsdtBalance", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "redemptionStartTime",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_fccAmount", "type": "uint256" }],
        "name": "redeem",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export const STAKING_MANAGER_ABI = [
    {
        "inputs": [
            { "name": "_amount", "type": "uint256" },
            { "name": "_lockPeriod", "type": "uint256" }
        ],
        "name": "stake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_stakeId", "type": "uint256" }],
        "name": "unstake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_addr", "type": "address" }],
        "name": "getUserStakes",
        "outputs": [
            {
                "components": [
                    { "name": "stakeId", "type": "uint256" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "startTime", "type": "uint256" },
                    { "name": "lockPeriod", "type": "uint256" },
                    { "name": "apr", "type": "uint256" }
                ],
                "name": "stakes",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;
