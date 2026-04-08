-- Add missing column to mining_config
ALTER TABLE mining_config 
ADD COLUMN IF NOT EXISTS max_concurrent_wallets INTEGER DEFAULT 3;
