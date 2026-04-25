/**
 * Fishcake Backend API Client
 * 
 * Connects the Web-App (Vercel) to the Backend Server (Oracle VM)
 */

// API Base URL - Use same-origin proxy in production browser to avoid mixed-content
// In dev or server-side rendering, use direct backend URL
const isServer = typeof window === 'undefined';
const isProduction = process.env.NODE_ENV === 'production';
const API_BASE_URL = isProduction && !isServer
  ? '/api/proxy'  // Same-origin proxy route
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

// JWT Token Management
let accessToken: string | null = null;
let refreshToken: string | null = null;

function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('fcc_access_token', access);
    localStorage.setItem('fcc_refresh_token', refresh);
  }
}

function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fcc_access_token');
    localStorage.removeItem('fcc_refresh_token');
  }
}

function loadTokens(): void {
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('fcc_access_token');
    refreshToken = localStorage.getItem('fcc_refresh_token');
  }
}

function getAuthHeaders(): Record<string, string> {
  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` };
  }
  return {};
}

// Load tokens on module init
if (typeof window !== 'undefined') {
  loadTokens();
}

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options?.headers as Record<string, string> || {}),
    };

    let response = await fetch(url, { ...options, headers });

    // Auto-refresh on 401
    if (response.status === 401 && refreshToken) {
      const refreshRes = await fetch(`${API_BASE_URL}/api/mining/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success && refreshData.data) {
          setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
          headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
          response = await fetch(url, { ...options, headers });
        }
      } else {
        clearTokens();
      }
    }

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
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
  // Get automation status (full status with scheduler, config, stats)
  status: () => apiFetch<{ 
    scheduler: { isRunning: boolean; processingCount: number };
    config: Record<string, unknown>;
    stats: Record<string, unknown>;
  }>('/api/mining/status'),

  // Start automation
  start: (passphrase: string, walletAddresses?: string[]) =>
    apiFetch<{ success: boolean; message: string }>(
      '/api/mining/start',
      {
        method: 'POST',
        body: JSON.stringify({ passphrase, walletAddresses }),
      }
    ),

  // Stop automation
  stop: () => 
    apiFetch<{ success: boolean }>(
      '/api/mining/stop',
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
      recipient_address_1: string;
      recipient_address_2: string;
      fcc_per_recipient: string;
      total_fcc_per_event: string;
      expected_mining_reward: string;
      offset_minutes: number;
      scheduler_enabled: number;
      max_concurrent_wallets: number;
    }>('/api/mining/config'),

  // Update config
  update: (config: Partial<{
    recipientAddress1: string;
    recipientAddress2: string;
    fccPerRecipient: string;
    offsetMinutes: number;
  }>) => 
    apiFetch<{ success: boolean }>(
      '/api/mining/config',
      {
        method: 'PUT',
        body: JSON.stringify(config),
      }
    ),
};

/**
 * Auth APIs
 */
export const authApi = {
  // Login with passphrase to get JWT tokens
  login: (passphrase: string) =>
    apiFetch<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>(
      '/api/mining/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ passphrase }),
      }
    ),

  // Refresh tokens
  refresh: (refreshToken: string) =>
    apiFetch<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>(
      '/api/mining/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    ),

  // Logout (clear local tokens)
  logout: () => {
    clearTokens();
  },

  // Check if authenticated
  isAuthenticated: () => !!accessToken,
};

/**
 * Metrics APIs
 */
export const metricsApi = {
  // Get aggregate metrics
  get: () => apiFetch<{
    totalEvents: number;
    totalFCCDistributed: number;
    totalMiningRewards: number;
    activeWallets: number;
    failedEvents: number;
    completedDrops: number;
  }>('/api/mining/metrics'),
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
