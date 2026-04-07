# Supabase Database Setup Guide

## Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/znatmrnkfjptiensiybb
2. Click "SQL Editor" in the left sidebar

## Step 2: Run Migration SQL

1. Open `backend/src/database/migration.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" to execute

## Step 3: Verify Tables

After running the migration, you should see these tables:
- `mining_wallets`
- `mining_config`
- `scheduler_state`
- `mining_events`
- `mining_drops`
- `mining_rewards`
- `mining_logs`

And this view:
- `mining_statistics`

## Step 4: Configure Environment Variables

Add these to Railway environment variables:

```env
# Supabase Configuration
SUPABASE_URL=https://znatmrnkfjptiensiybb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYXRtcm5rZmpwdGllbnNpeWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NDUyMjgsImV4cCI6MjA5MTEyMTIyOH0.dRdIWV2Ps9eMuWMhoQKFczJUMXFkZo9ahyNo7qOmWw8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYXRtcm5rZmpwdGllbnNpeWJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU0NTIyOCwiZXhwIjoyMDkxMTIxMjI4fQ.1oTu1CHLdYwUFtLAlO7IEkqwrqgIFQQFGMPYdXDnNFA

# Set this to use Supabase instead of SQLite
DATABASE_TYPE=supabase
```

## Step 5: Security Notes

### Row Level Security (RLS)
- RLS is enabled on all tables
- Service role key bypasses RLS (use for backend only!)
- Anon key respects RLS (safe for frontend)

### Key Security
- **NEVER** expose the Service Role Key in frontend code
- Only use the Anon Key in client-side applications
- Store keys in environment variables, never in code

## Connection Details

- **Project URL**: https://znatmrnkfjptiensiybb.supabase.co
- **PostgreSQL Connection**: 
  ```
  Host: db.znatmrnkfjptiensiybb.supabase.co
  Port: 5432
  Database: postgres
  User: postgres
  Password: HP2K9IFrOajXveGU
  ```

## Features

### Automatic Timestamps
- `created_at`: Set automatically on insert
- `updated_at`: Updated automatically via triggers

### Indexes
- Optimized for common query patterns
- Status-based lookups
- Wallet address lookups
- Time-based sorting

### Statistics View
Query the `mining_statistics` view for aggregated stats:
```sql
SELECT * FROM mining_statistics;
```
