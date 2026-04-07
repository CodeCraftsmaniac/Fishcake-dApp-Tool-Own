/**
 * Database Adapter - Unified interface for Supabase
 * 
 * This replaces the SQLite database with Supabase for persistence.
 * All operations are now async and use PostgreSQL via Supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization - Supabase client is created on first use
let _supabase: SupabaseClient | null = null;

/**
 * Get the Supabase client (lazy initialization)
 * This ensures dotenv is loaded before we try to read env vars
 */
function db(): SupabaseClient {
  if (!_supabase) {
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://znatmrnkfjptiensiybb.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required but not set!');
    }
    
    console.log('🔗 Initializing Supabase client...');
    console.log(`   URL: ${SUPABASE_URL}`);
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabase;
}

// Export the getter function for external use
export { db as supabase };

/**
 * Type Definitions
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
  created_at: number;
  updated_at: number;
}

export interface MiningConfig {
  id: number;
  recipient_address_1: string;
  recipient_address_2: string;
  fcc_per_recipient: string;
  total_fcc_per_event: string;
  expected_mining_reward: string;
  scheduler_enabled: boolean | number;  // PostgreSQL returns boolean, code expects number
  event_interval_hours: number;
  offset_minutes: number;
  max_concurrent_events: number;
  max_concurrent_wallets: number;
  max_retries: number;
  retry_delay_seconds: number;
  created_at: number;
  updated_at: number;
}

export interface MiningEvent {
  id: number;
  wallet_id: number;
  chain_event_id: number | null;
  status: string;
  drops_checklist: string;
  drop_1_completed: number;
  drop_1_tx_hash: string | null;
  drop_1_amount: string | null;
  drop_2_completed: number;
  drop_2_tx_hash: string | null;
  drop_2_amount: string | null;
  total_dropped: string | null;
  reward_eligible: number;
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
  created_at: number;
  updated_at: number;
}

export interface MiningLog {
  id: number;
  wallet_id: number | null;
  event_id: number | null;
  level: string;
  action: string;
  message: string;
  tx_hash: string | null;
  metadata: string | null;
  created_at: number;
}

export interface SchedulerState {
  id: number;
  is_running: number;
  passphrase_hash: string | null;
  started_at: number | null;
  last_tick_at: number | null;
  processing_wallets: string;
  created_at: number;
  updated_at: number;
}

/**
 * Initialize database (verify Supabase connection and tables)
 */
export async function initializeDatabase(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://znatmrnkfjptiensiybb.supabase.co';
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📦 Initializing Supabase connection...');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${hasKey ? '***set***' : '⚠️ NOT SET'}`);
  
  try {
    // Check if tables exist by querying mining_config
    const { data, error } = await db()
      .from('mining_config')
      .select('id')
      .eq('id', 1)
      .single();
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ Supabase tables not found! Run migration SQL first.');
        throw new Error('Database tables not initialized');
      }
      // If no row found, insert default
      if (error.code === 'PGRST116') {
        console.log('📝 Inserting default config row...');
        await db().from('mining_config').insert({ id: 1 });
      }
    }
    
    // Check scheduler_state table
    const { error: schedError } = await db()
      .from('scheduler_state')
      .select('id')
      .eq('id', 1)
      .single();
    
    if (schedError?.code === 'PGRST116') {
      console.log('📝 Inserting default scheduler state...');
      await db().from('scheduler_state').insert({ id: 1, is_running: false, processing_wallets: '[]' });
    }
    
    console.log('✅ Supabase database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Close database (no-op for Supabase, just for interface compatibility)
 */
export function closeDatabase(): void {
  console.log('✅ Supabase connection cleanup (no-op)');
}

/**
 * Wallet Operations
 */
export const walletOps = {
  async getAll(): Promise<MiningWallet[]> {
    const { data, error } = await db()
      .from('mining_wallets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as MiningWallet[];
  },

  async getActive(): Promise<MiningWallet[]> {
    const { data, error } = await db()
      .from('mining_wallets')
      .select('*')
      .eq('status', 'active');
    
    if (error) throw error;
    return (data || []) as MiningWallet[];
  },

  async getByAddress(address: string): Promise<MiningWallet | null> {
    const { data, error } = await db()
      .from('mining_wallets')
      .select('*')
      .ilike('address', address)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as MiningWallet | null;
  },

  async getReadyForEvent(offsetMinutes: number, limit: number): Promise<MiningWallet[]> {
    const now = Math.floor(Date.now() / 1000);
    const minTime = now - (offsetMinutes * 60);
    
    // Get active wallets that are ready for a new event
    const { data, error } = await db()
      .from('mining_wallets')
      .select('*')
      .eq('status', 'active')
      .or(`next_event_at.is.null,next_event_at.lte.${now}`)
      .limit(limit);
    
    if (error) throw error;
    
    // Filter by NFT expiry
    const filtered = (data || []).filter((w: MiningWallet) => 
      !w.nft_expiry_at || w.nft_expiry_at > now
    );
    
    return filtered as MiningWallet[];
  },

  async insert(wallet: Partial<MiningWallet>): Promise<MiningWallet> {
    const now = Math.floor(Date.now() / 1000);
    const { data, error } = await db()
      .from('mining_wallets')
      .insert({
        address: wallet.address?.toLowerCase(),
        encrypted_key: wallet.encrypted_key,
        salt: wallet.salt,
        iv: wallet.iv,
        auth_tag: wallet.auth_tag,
        nft_type: wallet.nft_type || 'NONE',
        status: 'active',
        failure_count: 0,
        fcc_balance: wallet.fcc_balance || '0',
        usdt_balance: wallet.usdt_balance || '0',
        pol_balance: wallet.pol_balance || '0',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as MiningWallet;
  },

  async updateStatus(id: number, status: string, failureCount: number, lastError: string | null): Promise<void> {
    const { error } = await db()
      .from('mining_wallets')
      .update({
        status,
        failure_count: failureCount,
        last_error: lastError,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateBalances(id: number, fccBalance: string, usdtBalance: string, polBalance: string): Promise<void> {
    const { error } = await db()
      .from('mining_wallets')
      .update({
        fcc_balance: fccBalance,
        usdt_balance: usdtBalance,
        pol_balance: polBalance,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateNFT(id: number, nftType: string, nftExpiryAt: number | null, nftTokenId: number | null): Promise<void> {
    const { error } = await db()
      .from('mining_wallets')
      .update({
        nft_type: nftType,
        nft_expiry_at: nftExpiryAt,
        nft_token_id: nftTokenId,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateLastEvent(id: number, lastEventId: number, nextEventAt: number): Promise<void> {
    const { error } = await db()
      .from('mining_wallets')
      .update({
        last_event_id: lastEventId,
        next_event_at: nextEventAt,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async delete(address: string): Promise<boolean> {
    const { error, count } = await db()
      .from('mining_wallets')
      .delete()
      .ilike('address', address);
    
    if (error) throw error;
    return (count || 0) > 0;
  },
};

/**
 * Config Operations
 */
export const configOps = {
  async get(): Promise<MiningConfig> {
    const { data, error } = await db()
      .from('mining_config')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) throw error;
    return data as MiningConfig;
  },

  async updateRecipients(addr1: string, addr2: string): Promise<void> {
    const { error } = await db()
      .from('mining_config')
      .update({
        recipient_address_1: addr1,
        recipient_address_2: addr2,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },

  async updateAmounts(fccPerRecipient: string, totalFcc: string, reward: string): Promise<void> {
    const { error } = await db()
      .from('mining_config')
      .update({
        fcc_per_recipient: fccPerRecipient,
        total_fcc_per_event: totalFcc,
        expected_mining_reward: reward,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },

  async updateScheduler(enabled: number, intervalHours: number, offsetMinutes: number, maxConcurrent: number): Promise<void> {
    const { error } = await db()
      .from('mining_config')
      .update({
        scheduler_enabled: enabled,
        event_interval_hours: intervalHours,
        offset_minutes: offsetMinutes,
        max_concurrent_events: maxConcurrent,
        max_concurrent_wallets: maxConcurrent,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },
};

/**
 * Scheduler State Operations
 */
export const schedulerOps = {
  async get(): Promise<SchedulerState> {
    const { data, error } = await db()
      .from('scheduler_state')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) throw error;
    return data as SchedulerState;
  },

  async start(passphraseHash: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const { error } = await db()
      .from('scheduler_state')
      .update({
        is_running: true,
        passphrase_hash: passphraseHash,
        started_at: now,
        last_tick_at: now,
        updated_at: now,
      })
      .eq('id', 1);
    
    if (error) throw error;
  },

  async stop(): Promise<void> {
    const { error } = await db()
      .from('scheduler_state')
      .update({
        is_running: false,
        passphrase_hash: null,
        processing_wallets: '[]',
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },

  async updateTick(processingWallets: string): Promise<void> {
    const { error } = await db()
      .from('scheduler_state')
      .update({
        last_tick_at: Math.floor(Date.now() / 1000),
        processing_wallets: processingWallets,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', 1);
    
    if (error) throw error;
  },
};

/**
 * Event Operations
 */
export const eventOps = {
  async insert(walletId: number): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const { data, error } = await db()
      .from('mining_events')
      .insert({
        wallet_id: walletId,
        status: 'PENDING',
        started_at: now,
        drops_checklist: '0/2',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  },

  async getById(id: number): Promise<MiningEvent | null> {
    const { data, error } = await db()
      .from('mining_events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as MiningEvent | null;
  },

  async getByWallet(walletId: number): Promise<MiningEvent[]> {
    const { data, error } = await db()
      .from('mining_events')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as MiningEvent[];
  },

  async getRecent(limit: number): Promise<(MiningEvent & { wallet_address: string })[]> {
    const { data, error } = await db()
      .from('mining_events')
      .select('*, mining_wallets!inner(address)')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    // Transform to match expected format
    return (data || []).map((e: MiningEvent & { mining_wallets: { address: string } }) => ({
      ...e,
      wallet_address: e.mining_wallets?.address || '',
    }));
  },

  async updateStatus(id: number, status: string): Promise<void> {
    const { error } = await db()
      .from('mining_events')
      .update({
        status,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateChainId(id: number, chainEventId: number): Promise<void> {
    const { error } = await db()
      .from('mining_events')
      .update({
        chain_event_id: chainEventId,
        status: 'CREATED',
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateDrop1(id: number, txHash: string, amount: string): Promise<void> {
    const { error } = await db()
      .from('mining_events')
      .update({
        drop_1_completed: 1,
        drop_1_tx_hash: txHash,
        drop_1_amount: amount,
        drops_checklist: '1/2',
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateDrop2(id: number, txHash: string, amount: string, total: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const { error } = await db()
      .from('mining_events')
      .update({
        drop_2_completed: 1,
        drop_2_tx_hash: txHash,
        drop_2_amount: amount,
        drops_checklist: '2/2',
        total_dropped: total,
        status: 'DROPS_COMPLETE',
        drops_completed_at: now,
        updated_at: now,
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateReward(id: number, amount: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const { error } = await db()
      .from('mining_events')
      .update({
        reward_eligible: 1,
        reward_received: amount,
        status: 'MINING_COMPLETE',
        reward_received_at: now,
        updated_at: now,
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async finish(id: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const { error } = await db()
      .from('mining_events')
      .update({
        status: 'FINISHED',
        finished_at: now,
        updated_at: now,
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateError(id: number, errorMessage: string): Promise<void> {
    const { error } = await db()
      .from('mining_events')
      .update({
        status: 'FAILED',
        error_message: errorMessage,
        updated_at: Math.floor(Date.now() / 1000),
      })
      .eq('id', id);
    
    if (error) throw error;
    
    // Increment retry_count via RPC if available
    try {
      const { error: rpcError } = await db().rpc('increment_retry_count', { event_id: id });
      if (rpcError) {
        // RPC might not exist, try alternative or ignore
        console.log('increment_retry_count RPC not available:', rpcError.message);
      }
    } catch {
      // If RPC doesn't exist, that's ok - retry_count will be handled manually
    }
  },
};

/**
 * Log Operations
 */
export const logOps = {
  async insert(log: Partial<MiningLog>): Promise<void> {
    const { error } = await db()
      .from('mining_logs')
      .insert({
        wallet_id: log.wallet_id || null,
        event_id: log.event_id || null,
        level: log.level || 'INFO',
        action: log.action || 'UNKNOWN',
        message: log.message || '',
        tx_hash: log.tx_hash || null,
        metadata: log.metadata || null,
        created_at: Math.floor(Date.now() / 1000),
      });
    
    if (error) {
      console.error('Failed to insert log:', error.message);
      // Don't throw - logging should never crash the app
    }
  },

  async getRecent(limit: number): Promise<MiningLog[]> {
    const { data, error } = await db()
      .from('mining_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []) as MiningLog[];
  },

  async getByWallet(walletId: number, limit: number): Promise<MiningLog[]> {
    const { data, error } = await db()
      .from('mining_logs')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []) as MiningLog[];
  },
};

/**
 * Stats Operations
 */
export const statsOps = {
  async getOverview(): Promise<{
    active_wallets: number;
    total_wallets: number;
    events_today: number;
    events_total: number;
    fcc_distributed: number;
    rewards_collected: number;
    success_rate: number | null;
  }> {
    // Get wallet counts
    const { count: totalWallets } = await db()
      .from('mining_wallets')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeWallets } = await db()
      .from('mining_wallets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    // Get event counts
    const { count: eventsTotal } = await db()
      .from('mining_events')
      .select('*', { count: 'exact', head: true });
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayUnix = Math.floor(todayStart.getTime() / 1000);
    
    const { count: eventsToday } = await db()
      .from('mining_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayUnix);
    
    // Get finished events for totals
    const { data: finishedEvents } = await db()
      .from('mining_events')
      .select('total_dropped, reward_received')
      .eq('status', 'FINISHED');
    
    const { count: finishedCount } = await db()
      .from('mining_events')
      .select('*', { count: 'exact', head: true })
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
    
    const successRate = eventsTotal && eventsTotal > 0
      ? ((finishedCount || 0) / eventsTotal) * 100
      : null;
    
    return {
      active_wallets: activeWallets || 0,
      total_wallets: totalWallets || 0,
      events_today: eventsToday || 0,
      events_total: eventsTotal || 0,
      fcc_distributed: fccDistributed,
      rewards_collected: rewardsCollected,
      success_rate: successRate,
    };
  },
};

export default db;
