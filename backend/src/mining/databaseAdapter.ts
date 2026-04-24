/**
 * Database Adapter - Unified interface for Supabase
 * 
 * This replaces the SQLite database with Supabase for persistence.
 * All operations are now async and use PostgreSQL via Supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

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
    
    logger.info('🔗 Initializing Supabase client...');
    logger.info(`   URL: ${SUPABASE_URL}`);
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
  max_concurrent_wallets?: number;  // Optional - may not exist in DB
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
  
  logger.info('📦 Initializing Supabase connection...');
  logger.info(`   URL: ${supabaseUrl}`);
  logger.info(`   Key: ${hasKey ? '***set***' : '⚠️ NOT SET'}`);
  
  try {
    // Check if tables exist by querying mining_config
    const { data, error } = await db()
      .from('mining_config')
      .select('id')
      .eq('id', 1)
      .single();
    
    if (error) {
      if (error.code === '42P01') {
        logger.error('❌ Supabase tables not found! Run migration SQL first.');
        throw new Error('Database tables not initialized');
      }
      // If no row found, insert default
      if (error.code === 'PGRST116') {
        logger.info('📝 Inserting default config row...');
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
      logger.info('📝 Inserting default scheduler state...');
      await db().from('scheduler_state').insert({ id: 1, is_running: false, processing_wallets: '[]' });
    }
    
    logger.info('✅ Supabase database initialized');
  } catch (error) {
    logger.error('Failed to initialize database:', { error: (error as Error).message });
    throw error;
  }
}

/**
 * Close database (no-op for Supabase, just for interface compatibility)
 */
export function closeDatabase(): void {
  logger.info('✅ Supabase connection cleanup (no-op)');
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
    const now = new Date().toISOString();
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
        // Let Supabase handle timestamps with DEFAULT NOW()
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
    const nowUnix = Math.floor(Date.now() / 1000);
    const nowISO = new Date().toISOString();
    const { error } = await db()
      .from('scheduler_state')
      .update({
        is_running: true,
        passphrase_hash: passphraseHash,
        started_at: nowUnix,
        last_tick_at: nowUnix,
        updated_at: nowISO,
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
        })
      .eq('id', 1);
    
    if (error) throw error;
  },

  async updatePassphraseHash(passphraseHash: string): Promise<void> {
    const { error } = await db()
      .from('scheduler_state')
      .update({
        passphrase_hash: passphraseHash,
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
  async insert(walletId: number): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const nowISO = new Date().toISOString();
    const { data, error } = await db()
      .from('mining_events')
      .insert({
        wallet_id: walletId,
        status: 'PENDING',
        started_at: now,
        drops_checklist: '0/2',
        created_at: nowISO,
        updated_at: nowISO,
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
        })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateDrop2(id: number, txHash: string, amount: string, total: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const nowISO = new Date().toISOString();
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
        updated_at: nowISO,
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateReward(id: number, amount: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const nowISO = new Date().toISOString();
    const { error } = await db()
      .from('mining_events')
      .update({
        reward_eligible: 1,
        reward_received: amount,
        status: 'MINING_COMPLETE',
        reward_received_at: now,
        updated_at: nowISO,
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async finish(id: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const nowISO = new Date().toISOString();
    const { error } = await db()
      .from('mining_events')
      .update({
        status: 'FINISHED',
        finished_at: now,
        updated_at: nowISO,
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
        })
      .eq('id', id);
    
    if (error) throw error;
    
    // Increment retry_count via RPC if available
    try {
      const { error: rpcError } = await db().rpc('increment_retry_count', { event_id: id });
      if (rpcError) {
        // RPC might not exist, try alternative or ignore
        logger.info('increment_retry_count RPC not available:', { error: rpcError.message });
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
        // created_at: handled by Supabase DEFAULT
      });
    
    if (error) {
      logger.error('Failed to insert log:', { error: error.message });
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
    const todayISO = todayStart.toISOString();
    
    const { count: eventsToday } = await db()
      .from('mining_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO);
    
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

  async getForWallet(walletId: number): Promise<{
    totalEvents: number;
    ongoingEvents: number;
    finishedEvents: number;
    totalFccMined: string;
    miningDays: number;
  }> {
    const { count: totalEvents } = await db()
      .from('mining_events')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', walletId);

    const { count: finishedEvents } = await db()
      .from('mining_events')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', walletId)
      .eq('status', 'FINISHED');

    const { count: ongoingEvents } = await db()
      .from('mining_events')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', walletId)
      .neq('status', 'FINISHED');

    const { data: finishedData } = await db()
      .from('mining_events')
      .select('total_dropped, reward_received')
      .eq('wallet_id', walletId)
      .eq('status', 'FINISHED');

    let totalFccMined = 0;
    if (finishedData) {
      for (const e of finishedData) {
        if (e.reward_received) totalFccMined += parseFloat(e.reward_received);
      }
    }

    // Calculate mining days from first event
    const { data: firstEvent } = await db()
      .from('mining_events')
      .select('created_at')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: true })
      .limit(1);

    const miningDays = firstEvent && firstEvent.length > 0
      ? Math.max(1, Math.floor((Date.now() - new Date(firstEvent[0].created_at).getTime()) / 86400000))
      : 0;

    return {
      totalEvents: totalEvents || 0,
      ongoingEvents: ongoingEvents || 0,
      finishedEvents: finishedEvents || 0,
      totalFccMined: totalFccMined.toString(),
      miningDays,
    };
  },
};

/**
 * Drop Operations
 */
export interface MiningDrop {
  id: number;
  event_id: number;
  recipient_address: string;
  amount: string;
  drop_number: number;
  tx_hash: string | null;
  block_number: number | null;
  gas_used: string | null;
  status: string;
  error_message: string | null;
  created_at: number;
  confirmed_at: number | null;
}

export const dropOps = {
  async insert(eventId: number, recipientAddress: string, amount: string, dropNumber: number): Promise<MiningDrop> {
    const { data, error } = await db()
      .from('mining_drops')
      .insert({
        event_id: eventId,
        recipient_address: recipientAddress,
        amount,
        drop_number: dropNumber,
        status: 'PENDING',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as MiningDrop;
  },

  async getByEvent(eventId: number): Promise<MiningDrop[]> {
    const { data, error } = await db()
      .from('mining_drops')
      .select('*')
      .eq('event_id', eventId)
      .order('drop_number');
    
    if (error) throw error;
    return (data || []) as MiningDrop[];
  },

  async updateStatus(id: number, status: string, txHash?: string, blockNumber?: number, gasUsed?: string): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (txHash) update.tx_hash = txHash;
    if (blockNumber) update.block_number = blockNumber;
    if (gasUsed) update.gas_used = gasUsed;
    if (status === 'CONFIRMED') update.confirmed_at = Math.floor(Date.now() / 1000);
    
    const { error } = await db()
      .from('mining_drops')
      .update(update)
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateError(id: number, errorMessage: string): Promise<void> {
    const { error } = await db()
      .from('mining_drops')
      .update({ status: 'FAILED', error_message: errorMessage })
      .eq('id', id);
    
    if (error) throw error;
  },
};

/**
 * Refresh Token Operations (for JWT persistence)
 */
export const refreshTokenOps = {
  async store(tokenHash: string, userId: string, sessionId: string, expiresAt: number): Promise<void> {
    const { error } = await db()
      .from('refresh_tokens')
      .insert({
        token_hash: tokenHash,
        user_id: userId,
        session_id: sessionId,
        expires_at: expiresAt,
      });
    
    if (error) throw error;
  },

  async getByHash(tokenHash: string): Promise<{ token_hash: string; user_id: string; session_id: string; expires_at: number } | null> {
    const { data, error } = await db()
      .from('refresh_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as { token_hash: string; user_id: string; session_id: string; expires_at: number } | null;
  },

  async deleteByHash(tokenHash: string): Promise<void> {
    const { error } = await db()
      .from('refresh_tokens')
      .delete()
      .eq('token_hash', tokenHash);
    
    if (error) throw error;
  },

  async deleteByUserId(userId: string): Promise<void> {
    const { error } = await db()
      .from('refresh_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
  },

  async cleanupExpired(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const { error, count } = await db()
      .from('refresh_tokens')
      .delete({ count: 'exact' })
      .lt('expires_at', now);
    
    if (error) throw error;
    return count || 0;
  },
};

/**
 * Nonce Operations (for nonce persistence across restarts)
 */
export const nonceOps = {
  async get(address: string): Promise<{ address: string; nonce: number; pending_count: number; last_updated: number } | null> {
    const { data, error } = await db()
      .from('pending_nonces')
      .select('*')
      .eq('address', address)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as { address: string; nonce: number; pending_count: number; last_updated: number } | null;
  },

  async upsert(address: string, nonce: number, pendingCount: number, lastUpdated: number): Promise<void> {
    const { error } = await db()
      .from('pending_nonces')
      .upsert({
        address,
        nonce,
        pending_count: pendingCount,
        last_updated: lastUpdated,
      }, { onConflict: 'address' });
    
    if (error) throw error;
  },

  async delete(address: string): Promise<void> {
    const { error } = await db()
      .from('pending_nonces')
      .delete()
      .eq('address', address);
    
    if (error) throw error;
  },

  async clearAll(): Promise<void> {
    const { error } = await db()
      .from('pending_nonces')
      .delete()
      .neq('address', '');
    
    if (error) throw error;
  },

  async loadAll(): Promise<Array<{ address: string; nonce: number; pending_count: number; last_updated: number }>> {
    const { data, error } = await db()
      .from('pending_nonces')
      .select('*');
    
    if (error) throw error;
    return (data || []) as Array<{ address: string; nonce: number; pending_count: number; last_updated: number }>;
  },
};

export default db;
