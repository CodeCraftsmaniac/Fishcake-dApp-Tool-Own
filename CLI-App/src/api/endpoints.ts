/**
 * API Endpoints - All Fishcake Backend API Functions
 * 
 * API Base: https://fishcake.io
 * Endpoints follow the fishcake-service structure
 */

import { apiGet } from "./client.js";
import type {
    Activity,
    DropRecord,
    NFT,
    ContractInfoResponse,
    BalanceResponse,
    PaginatedResponse,
} from "../types/index.js";

export async function getContractInfo(): Promise<ContractInfoResponse> {
    return apiGet<ContractInfoResponse>("/v1/contract/info");
}

export async function getActivityList(params: {
    pageNum?: number;
    pageSize?: number;
    businessAccount?: string;
    activityStatus?: string;  // "1"=active, "2"=finished, "3"=expired
    tokenContractAddr?: string;
    activityFilter?: string;
    businessName?: string;
    activityId?: number;
}): Promise<PaginatedResponse<Activity>> {
    return apiGet<PaginatedResponse<Activity>>("/v1/activity/list", {
        pageNum: params.pageNum || 1,
        pageSize: params.pageSize || 50,
        businessAccount: params.businessAccount,
        activityStatus: params.activityStatus,
        tokenContractAddr: params.tokenContractAddr,
        activityFilter: params.activityFilter,
        businessName: params.businessName,
        activityId: params.activityId,
    });
}

export async function getActivityInfo(activityId: number): Promise<Activity> {
    return apiGet<Activity>("/v1/activity/info", { activityId });
}

export async function getDropList(params: {
    pageNum?: number;
    pageSize?: number;
    address: string;
    dropType: string;  // "1"=user received, "2"=merchant dropped
}): Promise<PaginatedResponse<DropRecord>> {
    return apiGet<PaginatedResponse<DropRecord>>("/v1/drop/list", {
        pageNum: params.pageNum || 1,
        pageSize: params.pageSize || 100,
        address: params.address,
        dropType: params.dropType,
    });
}

export async function getChainBalance(address: string): Promise<BalanceResponse> {
    return apiGet<BalanceResponse>("/v1/chain_info/balance", { address });
}

export async function getNFTList(params: {
    pageNum?: number;
    pageSize?: number;
    contractAddress?: string;
    address?: string;
}): Promise<PaginatedResponse<NFT>> {
    return apiGet<PaginatedResponse<NFT>>("/v1/nft/list", {
        pageNum: params.pageNum || 1,
        pageSize: params.pageSize || 50,
        contractAddress: params.contractAddress,
        address: params.address,
    });
}

export async function getNFTDetail(params: {
    businessAccount: string;
    deadline: number;
}): Promise<NFT> {
    return apiGet<NFT>("/v1/nft/detail", params);
}

export async function getNFTCount(): Promise<{ count: number }> {
    return apiGet<{ count: number }>("/v1/nft/nft_count");
}

export async function getTransactionCount(): Promise<{ count: number }> {
    return apiGet<{ count: number }>("/v1/nft/transaction_count");
}

export async function getMiningRecord(address: string): Promise<unknown[]> {
    return apiGet<unknown[]>("/v1/mining_record/list", { address });
}

export async function getMiningRank(month?: number): Promise<unknown[]> {
    return apiGet<unknown[]>("/v1/activity/miningRank", { month });
}

export async function getUserMinedAmount(address: string, month?: number): Promise<unknown> {
    return apiGet<unknown>("/v1/activity/minedAmount", { address, month });
}

export async function getUserMiningInfo(address: string): Promise<unknown> {
    return apiGet<unknown>("/v1/activity/miningInfo", { address });
}

export async function loadDynamicAddresses(): Promise<ContractInfoResponse | null> {
    try {
        return await getContractInfo();
    } catch {
        return null;
    }
}
