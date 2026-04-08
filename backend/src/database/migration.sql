-- Supabase Database Migration for Fishcake Mining System
-- Run this in the Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MINING WALLETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mining_wallets (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL,
  salt TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'error', 'nft_expired')),
  failure_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  nft_type TEXT DEFAULT 'NONE' CHECK(nft_type IN ('NONE', 'BASIC', 'PRO')),
  nft_expiry_at BIGINT,
  nft_token_id BIGINT,
  
  fcc_balance TEXT DEFAULT '0',
  usdt_balance TEXT DEFAULT '0',
  pol_balance TEXT DEFAULT '0',
  
  last_event_id INTEGER,
  next_event_at BIGINT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MINING CONFIG TABLE (single row)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mining_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  
  recipient_address_1 TEXT NOT NULL DEFAULT '',
  recipient_address_2 TEXT NOT NULL DEFAULT '',
  
  fcc_per_recipient TEXT DEFAULT '12',
  total_fcc_per_event TEXT DEFAULT '24',
  expected_mining_reward TEXT DEFAULT '6',
  
  scheduler_enabled BOOLEAN DEFAULT FALSE,
  event_interval_hours INTEGER DEFAULT 24,
  offset_minutes INTEGER DEFAULT 5,
  max_concurrent_events INTEGER DEFAULT 3,
  max_concurrent_wallets INTEGER DEFAULT 3,
  
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add max_concurrent_wallets if it doesn't exist (for existing installations)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mining_config' AND column_name = 'max_concurrent_wallets') THEN
    ALTER TABLE mining_config ADD COLUMN max_concurrent_wallets INTEGER DEFAULT 3;
  END IF;
END $$;

-- Insert default config row
INSERT INTO mining_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SCHEDULER STATE TABLE (for persistence across restarts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduler_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  is_running BOOLEAN DEFAULT FALSE,
  passphrase_hash TEXT,
  started_at BIGINT,
  last_tick_at BIGINT,
  processing_wallets JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scheduler state row
INSERT INTO scheduler_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MINING EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mining_events (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER NOT NULL REFERENCES mining_wallets(id) ON DELETE CASCADE,
  
  chain_event_id BIGINT,
  
  status TEXT DEFAULT 'PENDING' CHECK(status IN (
    'PENDING', 'CREATED', 'DROPPING', 'DROPS_COMPLETE', 
    'MONITORING', 'MINING_COMPLETE', 'FINISHING', 'FINISHED',
    'FAILED', 'TIMEOUT'
  )),
  
  drops_checklist TEXT DEFAULT '0/2',
  drop_1_completed BOOLEAN DEFAULT FALSE,
  drop_1_tx_hash TEXT,
  drop_1_amount TEXT,
  drop_2_completed BOOLEAN DEFAULT FALSE,
  drop_2_tx_hash TEXT,
  drop_2_amount TEXT,
  total_dropped TEXT,
  
  reward_eligible BOOLEAN DEFAULT FALSE,
  reward_received TEXT,
  reward_tx_hash TEXT,
  
  total_gas_used TEXT,
  total_gas_cost TEXT,
  
  started_at BIGINT,
  drops_completed_at BIGINT,
  reward_received_at BIGINT,
  finished_at BIGINT,
  
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MINING DROPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mining_drops (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES mining_events(id) ON DELETE CASCADE,
  
  recipient_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  drop_number INTEGER NOT NULL CHECK(drop_number IN (1, 2)),
  
  tx_hash TEXT,
  block_number BIGINT,
  gas_used TEXT,
  
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- ============================================================================
-- MINING REWARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mining_rewards (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES mining_events(id) ON DELETE CASCADE,
  wallet_id INTEGER NOT NULL REFERENCES mining_wallets(id) ON DELETE CASCADE,
  
  expected_amount TEXT DEFAULT '6',
  actual_amount TEXT,
  
  balance_before TEXT,
  balance_after TEXT,
  detected_at BIGINT,
  
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'DETECTED', 'CONFIRMED', 'FAILED')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MINING LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mining_logs (
  id SERIAL PRIMARY KEY,
  
  wallet_id INTEGER REFERENCES mining_wallets(id) ON DELETE SET NULL,
  event_id INTEGER REFERENCES mining_events(id) ON DELETE SET NULL,
  
  level TEXT DEFAULT 'INFO' CHECK(level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS')),
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  
  tx_hash TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Wallet indexes
CREATE INDEX IF NOT EXISTS idx_wallets_status ON mining_wallets(status);
CREATE INDEX IF NOT EXISTS idx_wallets_next_event ON mining_wallets(next_event_at);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON mining_wallets(address);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON mining_events(status);
CREATE INDEX IF NOT EXISTS idx_events_wallet ON mining_events(wallet_id);
CREATE INDEX IF NOT EXISTS idx_events_wallet_status ON mining_events(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_events_created_status ON mining_events(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_events_chain_id ON mining_events(chain_event_id);

-- Drop indexes
CREATE INDEX IF NOT EXISTS idx_drops_event ON mining_drops(event_id);
CREATE INDEX IF NOT EXISTS idx_drops_status ON mining_drops(status);

-- Log indexes
CREATE INDEX IF NOT EXISTS idx_logs_wallet ON mining_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_logs_event ON mining_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON mining_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created ON mining_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON mining_logs(level);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE mining_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies (for backend)
-- The service role key bypasses RLS by default, so these are for documentation

-- Anon role read-only policies (for public stats if needed)
CREATE POLICY "Allow public read for config" ON mining_config
  FOR SELECT USING (true);

CREATE POLICY "Allow public read for scheduler_state" ON scheduler_state
  FOR SELECT USING (true);

-- Block all anonymous writes
CREATE POLICY "Block anonymous inserts on wallets" ON mining_wallets
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "Block anonymous updates on wallets" ON mining_wallets
  FOR UPDATE TO anon USING (false);

CREATE POLICY "Block anonymous deletes on wallets" ON mining_wallets
  FOR DELETE TO anon USING (false);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON mining_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_config_updated_at
  BEFORE UPDATE ON mining_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scheduler_updated_at
  BEFORE UPDATE ON scheduler_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON mining_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STATISTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW mining_statistics AS
SELECT
  (SELECT COUNT(*) FROM mining_wallets) as total_wallets,
  (SELECT COUNT(*) FROM mining_wallets WHERE status = 'active') as active_wallets,
  (SELECT COUNT(*) FROM mining_events) as total_events,
  (SELECT COUNT(*) FROM mining_events WHERE created_at >= CURRENT_DATE) as events_today,
  (SELECT COALESCE(SUM(CAST(total_dropped AS DECIMAL)), 0) FROM mining_events WHERE status = 'FINISHED') as fcc_distributed,
  (SELECT COALESCE(SUM(CAST(reward_received AS DECIMAL)), 0) FROM mining_events WHERE status = 'FINISHED') as rewards_collected,
  (SELECT COUNT(*) FROM mining_events WHERE status IN ('PENDING', 'CREATED', 'DROPPING', 'MONITORING')) as active_events,
  (SELECT COUNT(*) FROM mining_events WHERE status = 'FAILED') as failed_events;

-- Grant access to the view
GRANT SELECT ON mining_statistics TO anon, authenticated, service_role;

-- ============================================================================
-- INCREMENTAL MIGRATIONS (for existing databases)
-- ============================================================================

-- Add max_concurrent_wallets column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mining_config' AND column_name = 'max_concurrent_wallets'
  ) THEN
    ALTER TABLE mining_config ADD COLUMN max_concurrent_wallets INTEGER DEFAULT 3;
  END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
SELECT 'Migration completed successfully!' as status;
