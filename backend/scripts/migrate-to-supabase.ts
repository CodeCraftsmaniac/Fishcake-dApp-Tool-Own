/**
 * SQLite → Supabase Migration Script
 * 
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 * 
 * Prerequisites:
 * - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * - Ensure SQLite database exists at data/mining.db
 * - Backup SQLite database before running
 */

import * as Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/mining.db');
const BATCH_SIZE = 100;

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

async function migrate() {
  console.log('🔄 SQLite → Supabase Migration Script');
  console.log('=====================================\n');

  // Step 0: Backup SQLite
  const backupPath = DB_PATH.replace('.db', `.backup-${Date.now()}.db`);
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ SQLite backup created: ${backupPath}`);
  } else {
    console.error('❌ SQLite database not found at:', DB_PATH);
    process.exit(1);
  }

  // Step 1: Connect to SQLite
  const db = new Database(DB_PATH, { readonly: true });
  console.log('✅ Connected to SQLite database\n');

  // Step 2: Connect to Supabase
  const supabase = createClient(getEnvVar('SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));
  console.log('✅ Connected to Supabase\n');

  // Step 3: Migrate wallets
  console.log('📦 Migrating wallets...');
  const wallets = db.prepare('SELECT * FROM mining_wallets').all() as any[];
  let walletSuccess = 0;
  for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
    const batch = wallets.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('mining_wallets').upsert(
      batch.map(w => ({
        id: w.id,
        address: w.address,
        encrypted_key: w.encrypted_key,
        status: w.status,
        nft_type: w.nft_type,
        nft_expiry_at: w.nft_expiry_at,
        nft_token_id: w.nft_token_id,
        created_at: w.created_at ? new Date(w.created_at * 1000).toISOString() : null,
        updated_at: w.updated_at ? new Date(w.updated_at * 1000).toISOString() : null,
      })),
      { onConflict: 'id' }
    );
    if (error) {
      console.error(`  ❌ Wallet batch ${i / BATCH_SIZE + 1} error:`, error.message);
    } else {
      walletSuccess += batch.length;
    }
  }
  console.log(`  ✅ Migrated ${walletSuccess}/${wallets.length} wallets\n`);

  // Step 4: Migrate events
  console.log('📦 Migrating events...');
  const events = db.prepare('SELECT * FROM mining_events').all() as any[];
  let eventSuccess = 0;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('mining_events').upsert(
      batch.map(e => ({
        id: e.id,
        wallet_id: e.wallet_id,
        chain_event_id: e.chain_event_id,
        status: e.status,
        drops_checklist: e.drops_checklist,
        drop_1_completed: e.drop_1_completed,
        drop_1_tx_hash: e.drop_1_tx_hash,
        drop_2_completed: e.drop_2_completed,
        drop_2_tx_hash: e.drop_2_tx_hash,
        total_dropped: e.total_dropped,
        reward_eligible: e.reward_eligible,
        reward_received: e.reward_received,
        started_at: e.started_at ? new Date(e.started_at * 1000).toISOString() : null,
        finished_at: e.finished_at ? new Date(e.finished_at * 1000).toISOString() : null,
      })),
      { onConflict: 'id' }
    );
    if (error) {
      console.error(`  ❌ Event batch ${i / BATCH_SIZE + 1} error:`, error.message);
    } else {
      eventSuccess += batch.length;
    }
  }
  console.log(`  ✅ Migrated ${eventSuccess}/${events.length} events\n`);

  // Step 5: Migrate logs
  console.log('📦 Migrating logs...');
  const logs = db.prepare('SELECT * FROM mining_logs').all() as any[];
  let logSuccess = 0;
  for (let i = 0; i < logs.length; i += BATCH_SIZE) {
    const batch = logs.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('mining_logs').upsert(
      batch.map(l => ({
        id: l.id,
        wallet_id: l.wallet_id,
        event_id: l.event_id,
        level: l.level,
        action: l.action,
        message: l.message,
        tx_hash: l.tx_hash,
        metadata: l.metadata,
        created_at: l.created_at ? new Date(l.created_at * 1000).toISOString() : null,
      })),
      { onConflict: 'id' }
    );
    if (error) {
      console.error(`  ❌ Log batch ${i / BATCH_SIZE + 1} error:`, error.message);
    } else {
      logSuccess += batch.length;
    }
  }
  console.log(`  ✅ Migrated ${logSuccess}/${logs.length} logs\n`);

  // Step 6: Migrate config
  console.log('📦 Migrating config...');
  const config = db.prepare('SELECT * FROM mining_config WHERE id = 1').get() as any;
  if (config) {
    const { error } = await supabase.from('mining_config').upsert({
      id: 1,
      recipient_address_1: config.recipient_address_1,
      recipient_address_2: config.recipient_address_2,
      fcc_per_recipient: config.fcc_per_recipient,
      total_fcc_per_event: config.total_fcc_per_event,
      expected_mining_reward: config.expected_mining_reward,
      offset_minutes: config.offset_minutes,
      max_retries: config.max_retries,
      scheduler_enabled: config.scheduler_enabled,
      max_concurrent_wallets: config.max_concurrent_wallets,
    }, { onConflict: 'id' });
    if (error) {
      console.error('  ❌ Config migration error:', error.message);
    } else {
      console.log('  ✅ Migrated config\n');
    }
  }

  // Step 7: Verify data integrity
  console.log('🔍 Verifying data integrity...');
  const tables = ['mining_wallets', 'mining_events', 'mining_logs'];
  for (const table of tables) {
    const sqliteCount = (db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any).count;
    const { count: supabaseCount } = await supabase.from(table).select('*', { count: 'exact', head: true });
    const match = sqliteCount === supabaseCount;
    console.log(`  ${match ? '✅' : '❌'} ${table}: SQLite=${sqliteCount}, Supabase=${supabaseCount}`);
  }

  db.close();
  console.log('\n✅ Migration complete!');
  console.log(`📁 SQLite backup retained at: ${backupPath}`);
  console.log('⚠️  Keep SQLite backup for at least 7 days before removing.');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
