/**
 * API Client - Generic fetch wrapper for Fishcake Backend
 */

import type { APIResponse, PaginatedResponse } from "../types/index.js";

const DEFAULT_API_BASE_URL = "https://fishcake.io";

function getApiBaseUrl(): string {
    return process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
}

export class APIError extends Error {
    constructor(
        public statusCode: number,
        public apiCode: number,
        message: string
    ) {
        super(message);
        this.name = "APIError";
    }
}

export async function apiGet<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = new URL(endpoint, baseUrl);
    
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                url.searchParams.append(key, String(value));
            }
        });
    }
    
    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        });
        
        if (!response.ok) {
            throw new APIError(
                response.status,
                -1,
                `HTTP ${response.status}: ${response.statusText}`
            );
        }
        
        const data = await response.json() as APIResponse<T>;
        
        if (data.code !== 200 && data.code !== 0) {
            throw new APIError(200, data.code, data.msg || "API error");
        }
        
        return data.obj;
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        throw new APIError(-1, -1, error instanceof Error ? error.message : "Network error");
    }
}

export async function apiPost<T>(
    endpoint: string,
    body?: Record<string, unknown>
): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = new URL(endpoint, baseUrl);
    
    try {
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        
        if (!response.ok) {
            throw new APIError(
                response.status,
                -1,
                `HTTP ${response.status}: ${response.statusText}`
            );
        }
        
        const data = await response.json() as APIResponse<T>;
        
        if (data.code !== 200 && data.code !== 0) {
            throw new APIError(200, data.code, data.msg || "API error");
        }
        
        return data.obj;
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        throw new APIError(-1, -1, error instanceof Error ? error.message : "Network error");
    }
}

export async function ping(): Promise<boolean> {
    try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/ping`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function isApiAvailable(): Promise<boolean> {
    return ping();
}
