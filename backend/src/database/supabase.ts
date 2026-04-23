/**
 * Supabase Database Client
 * 
 * PostgreSQL database hosted on Supabase with Row Level Security (RLS)
 * for secure, production-grade data storage.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

// Environment configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znatmrnkfjptiensiybb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Use service role for backend operations (bypasses RLS)
const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Use anon key for frontend-like operations (respects RLS)
const supabaseClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

/**
 * Database Types (matching Supabase schema)
 */
export interface MiningWallet {
  id: number;
  address: string;
  encrypted_key: string;
  salt: string;
  iv: string;
  auth_tag: string;
  status: 'active' | 'paused' | 'error' | 'nft_expired';
  failure_count: number;
  last_error: string | null;
  nft_type: 'NONE' | 'BASIC' | 'PRO';
  nft_expiry_at: number | null;
  nft_token_id: number | null;
  fcc_balance: string;
  usdt_balance: string;
  pol_balance: string;
  last_event_id: number | null;
  next_event_at: number | null;
  created_at: string;
  updated_at: string;
}

export interface MiningConfig {
  id: number;
  recipient_address_1: string;
  recipient_address_2: string;
  fcc_per_recipient: string;
  total_fcc_per_event: string;
  expected_mining_reward: string;
  scheduler_enabled: boolean;
  event_interval_hours: number;
  offset_minutes: number;
  max_concurrent_events: number;
  max_retries: number;
  retry_delay_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface MiningEvent {
  id: number;
  wallet_id: number;
  chain_event_id: number | null;
  status: string;
  drops_checklist: string;
  drop_1_completed: boolean;
  drop_1_tx_hash: string | null;
  drop_1_amount: string | null;
  drop_2_completed: boolean;
  drop_2_tx_hash: string | null;
  drop_2_amount: string | null;
  total_dropped: string | null;
  reward_eligible: boolean;
  reward_received: string | null;
  reward_tx_hash: string | null;
  total_gas_used: string | null;
  total_gas_cost: string | null;
  started_at: number | null;
  drops_completed_at: number | null;
  reward_received_at: number | null;
  finished_at: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface MiningLog {
  id: number;
  wallet_id: number | null;
  event_id: number | null;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  action: string;
  message: string;
  tx_hash: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SchedulerState {
  id: number;
  is_running: boolean;
  passphrase_hash: string | null;
  started_at: number | null;
  last_tick_at: number | null;
  processing_wallets: number[];
  created_at: string;
  updated_at: string;
}

/**
 * Initialize Supabase schema (run once to set up tables)
 */
export async function initializeSupabaseSchema(): Promise<void> {
  logger.info('📦 Initializing Supabase schema...');
  
  // Tables are created via Supabase dashboard SQL editor
  // This function verifies they exist
  const { error } = await supabaseAdmin
    .from('mining_wallets')
    .select('id')
    .limit(1);
  
  if (error && error.code === '42P01') {
    logger.error('❌ Tables not found. Please run the migration SQL in Supabase dashboard.');
    throw new Error('Supabase tables not initialized');
  }
  
  logger.info('✅ Supabase schema verified');
}

/**
 * Wallet Operations
 */
export const walletOps = {
  async getAll(): Promise<MiningWallet[]> {
    const { data, error } = await supabaseAdmin
      .from('mining_wallets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getActive(): Promise<MiningWallet[]> {
    const { data, error } = await supabaseAdmin
      .from('mining_wallets')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByAddress(address: string): Promise<MiningWallet | null> {
    const { data, error } = await supabaseAdmin
      .from('mining_wallets')
      .select('*')
      .eq('address', address.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async insert(wallet: Partial<MiningWallet>): Promise<MiningWallet> {
    const { data, error } = await supabaseAdmin
      .from('mining_wallets')
      .insert({
        ...wallet,
        address: wallet.address?.toLowerCase(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: number, status: string, error?: string): Promise<void> {
    const { error: dbError } = await supabaseAdmin
      .from('mining_wallets')
      .update({
        status,
        last_error: error || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (dbError) throw dbError;
  },

  async updateBalances(id: number, balances: { fcc: string; usdt: string; pol: string }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('mining_wallets')
      .update({
        fcc_balance: balances.fcc,
        usdt_balance: balances.usdt,
        pol_balance: balances.pol,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateNFT(id: number, nftType: string, expiryAt: number | null, tokenId: number | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('mining_wallets')
      .update({
        nft_type: nftType,
        nft_expiry_at: expiryAt,
        nft_token_id: tokenId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async delete(address: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('mining_wallets')
      .delete()
      .eq('address', address.toLowerCase());
    
    if (error) throw error;
  },
};

/**
 * Config Operations
 */
export const configOps = {
  async get(): Promise<MiningConfig> {
    const { data, error } = await supabaseAdmin
      .from('mining_config')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(config: Partial<MiningConfig>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('mining_config')
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },
};

/**
 * Event Operations
 */
export const eventOps = {
  async create(walletId: number): Promise<MiningEvent> {
    const { data, error } = await supabaseAdmin
      .from('mining_events')
      .insert({
        wallet_id: walletId,
        status: 'PENDING',
        started_at: Math.floor(Date.now() / 1000),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: number, status: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('mining_events')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByWallet(walletId: number, limit = 50): Promise<MiningEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('mining_events')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  async getRecent(limit = 100): Promise<MiningEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('mining_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },
};

/**
 * Log Operations
 */
export const logOps = {
  async insert(log: Partial<MiningLog>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('mining_logs')
      .insert(log);
    
    if (error) {
      logger.error('Failed to insert log:', { error: (error as Error).message });
      // Don't throw - logging failures shouldn't crash the app
    }
  },

  async getRecent(limit = 100): Promise<MiningLog[]> {
    const { data, error } = await supabaseAdmin
      .from('mining_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },
};

/**
 * Scheduler State Operations
 */
export const schedulerOps = {
  async get(): Promise<SchedulerState> {
    const { data, error } = await supabaseAdmin
      .from('scheduler_state')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(state: Partial<SchedulerState>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('scheduler_state')
      .update({
        ...state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },

  async setRunning(isRunning: boolean, passphraseHash?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('scheduler_state')
      .update({
        is_running: isRunning,
        passphrase_hash: passphraseHash || null,
        started_at: isRunning ? Math.floor(Date.now() / 1000) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },
};

/**
 * Stats Operations
 */
export const statsOps = {
  async getMiningStats(): Promise<{
    total_wallets: number;
    active_wallets: number;
    total_events: number;
    events_today: number;
    fcc_distributed: number;
    rewards_collected: number;
  }> {
    // Get wallet counts
    const { count: totalWallets } = await supabaseAdmin
      .from('mining_wallets')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeWallets } = await supabaseAdmin
      .from('mining_wallets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    // Get event counts
    const { count: totalEvents } = await supabaseAdmin
      .from('mining_events')
      .select('*', { count: 'exact', head: true });
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { count: eventsToday } = await supabaseAdmin
      .from('mining_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());
    
    // Get totals from events
    const { data: finishedEvents } = await supabaseAdmin
      .from('mining_events')
      .select('total_dropped, reward_received')
      .eq('status', 'FINISHED');
    
    let fccDistributed = 0;
    let rewardsCollected = 0;
    
    if (finishedEvents) {
      for (const event of finishedEvents) {
        if (event.total_dropped) {
          fccDistributed += parseFloat(event.total_dropped);
        }
        if (event.reward_received) {
          rewardsCollected += parseFloat(event.reward_received);
        }
      }
    }
    
    return {
      total_wallets: totalWallets || 0,
      active_wallets: activeWallets || 0,
      total_events: totalEvents || 0,
      events_today: eventsToday || 0,
      fcc_distributed: fccDistributed,
      rewards_collected: rewardsCollected,
    };
  },
};

// Export clients
export { supabaseAdmin, supabaseClient };
export default supabaseAdmin;
