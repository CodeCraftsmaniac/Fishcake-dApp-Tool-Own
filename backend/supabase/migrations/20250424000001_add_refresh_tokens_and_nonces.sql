-- Add refresh_tokens and pending_nonces tables

-- ============================================================================
-- REFRESH TOKENS TABLE (for JWT persistence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PENDING NONCES TABLE (for nonce persistence across restarts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_nonces (
  address TEXT PRIMARY KEY,
  nonce INTEGER NOT NULL,
  pending_count INTEGER NOT NULL DEFAULT 1,
  last_updated BIGINT NOT NULL
);

ALTER TABLE pending_nonces ENABLE ROW LEVEL SECURITY;
