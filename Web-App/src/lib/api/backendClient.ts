/**
 * Fishcake Backend API Client
 * 
 * Connects the Web-App (Vercel) to the Backend Server (VM)
 */

// API Base URL - uses environment variable or defaults to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface WalletData {
  id: number;
  address: string;
  status: string;
  nft_type: string;
  nft_expiry_at?: number;
  pol_balance: string;
  fcc_balance: string;
  usdt_balance: string;
  created_at: number;
  updated_at: number;
}

interface WorkflowData {
  walletAddress: string;
  steps: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    txHash?: string;
    timestamp?: string;
    error?: string;
  }[];
}

interface MiningStats {
  totalWallets: number;
  activeWallets: number;
  totalEvents: number;
  ongoingEvents: number;
  finishedEvents: number;
  totalFccMined: string;
}

interface RpcStatus {
  current: string;
  currentLatency: number;
  healthy: number;
  total: number;
  endpoints: {
    name: string;
    url: string;
    latency: number;
    isHealthy: boolean;
    successRate: number;
  }[];
}

interface HealthStatus {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  rpc: RpcStatus;
  scheduler: {
    running: boolean;
    processingWallets: number;
    activeWallets: number;
  };
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Health & Status APIs
 */
export const healthApi = {
  check: () => apiFetch<HealthStatus>('/health'),
  version: () => apiFetch<{ version: string; nodeVersion: string }>('/version'),
};

/**
 * Wallet APIs
 */
export const walletApi = {
  // Import wallets
  import: (privateKeys: string[], passphrase: string) => 
    apiFetch<{ results: { success: boolean; address?: string; error?: string }[]; summary: { total: number; success: number; failed: number } }>(
      '/api/mining/wallets/import',
      {
        method: 'POST',
        body: JSON.stringify({ privateKeys, passphrase }),
      }
    ),

  // Get all wallets
  list: () => apiFetch<WalletData[]>('/api/mining/wallets'),

  // Get single wallet
  get: (address: string) => apiFetch<WalletData>(`/api/mining/wallets/${address}`),

  // Delete wallet
  delete: (address: string, passphrase: string) => 
    apiFetch<{ success: boolean }>(
      `/api/mining/wallets/${address}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ passphrase }),
      }
    ),

  // Get wallet balances
  balances: (address: string) => 
    apiFetch<{ pol: string; fcc: string; usdt: string }>(`/api/mining/wallets/${address}/balances`),
};

/**
 * Mining Automation APIs
 */
export const miningApi = {
  // Get automation status
  status: () => apiFetch<{ running: boolean; wallets: string[] }>('/api/mining/automation/status'),

  // Start automation
  start: (passphrase: string, walletAddresses?: string[]) => 
    apiFetch<{ success: boolean; message: string }>(
      '/api/mining/automation/start',
      {
        method: 'POST',
        body: JSON.stringify({ passphrase, walletAddresses }),
      }
    ),

  // Stop automation
  stop: () => 
    apiFetch<{ success: boolean }>(
      '/api/mining/automation/stop',
      { method: 'POST' }
    ),

  // Get stats
  stats: () => apiFetch<MiningStats>('/api/mining/stats'),

  // Get wallet stats
  walletStats: (address: string) => 
    apiFetch<{
      totalEvents: number;
      ongoingEvents: number;
      finishedEvents: number;
      totalFccMined: string;
      miningDays: number;
      passExpiry?: string;
    }>(`/api/mining/stats/${address}`),
};

/**
 * Workflow APIs
 */
export const workflowApi = {
  // Get all workflows
  list: () => apiFetch<WorkflowData[]>('/api/mining/workflows'),

  // Get workflow for wallet
  get: (address: string) => apiFetch<WorkflowData>(`/api/mining/workflows/${address}`),

  // Get workflow logs
  logs: (address?: string) => 
    apiFetch<{
      id: number;
      wallet_address: string;
      event_id?: number;
      step: string;
      status: string;
      tx_hash?: string;
      error_message?: string;
      created_at: number;
    }[]>(`/api/mining/logs${address ? `?wallet=${address}` : ''}`),
};

/**
 * RPC APIs
 */
export const rpcApi = {
  // Get RPC status
  status: () => apiFetch<RpcStatus>('/api/mining/rpc/status'),

  // Switch RPC
  switch: (rpcUrl: string) => 
    apiFetch<{ success: boolean; currentRpc: string }>(
      '/api/mining/rpc/switch',
      {
        method: 'POST',
        body: JSON.stringify({ rpcUrl }),
      }
    ),
};

/**
 * Events APIs
 */
export const eventApi = {
  // Get all events
  list: (status?: string) => 
    apiFetch<{
      id: number;
      wallet_address: string;
      event_id_onchain?: number;
      status: string;
      created_at: number;
      started_at?: number;
      finished_at?: number;
    }[]>(`/api/mining/events${status ? `?status=${status}` : ''}`),

  // Get events for wallet
  forWallet: (address: string) => 
    apiFetch<{
      id: number;
      event_id_onchain?: number;
      status: string;
      drops_completed: number;
      drops_total: number;
      created_at: number;
    }[]>(`/api/mining/events/wallet/${address}`),
};

/**
 * Configuration APIs
 */
export const configApi = {
  // Get config
  get: () => 
    apiFetch<{
      autoStart: boolean;
      dailyDelay: number;
      fccPerDrop: number;
      dropsPerAddress: number;
    }>('/api/mining/config'),

  // Update config
  update: (config: Partial<{
    autoStart: boolean;
    dailyDelay: number;
    fccPerDrop: number;
    dropsPerAddress: number;
  }>) => 
    apiFetch<{ success: boolean }>(
      '/api/mining/config',
      {
        method: 'PUT',
        body: JSON.stringify(config),
      }
    ),
};

// Export API base URL for debugging
export const getApiBaseUrl = () => API_BASE_URL;

// Check if backend is reachable
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await healthApi.check();
    return response.success && response.data?.status === 'healthy';
  } catch {
    return false;
  }
}
