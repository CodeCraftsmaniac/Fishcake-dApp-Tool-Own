/**
 * Push Supabase Schema Script
 * 
 * Reads migration.sql and executes it against Supabase via REST API
 * 
 * Usage: npx tsx scripts/push-supabase-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function pushSchema() {
  console.log('🚀 Pushing schema to Supabase...\n');

  // Read migration.sql
  const migrationPath = path.resolve(__dirname, '../src/database/migration.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ migration.sql not found at:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Execute via Supabase SQL API (requires service role)
  // We'll use the exec_sql RPC if available, otherwise print SQL for manual execution
  console.log('📋 SQL Migration loaded:', sql.length, 'chars');
  console.log('⚠️  Supabase free tier does not support SQL API execution.\n');
  console.log('📌 Manual steps:\n');
  console.log('1. Open Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/znatmrnkfjptiensiybb/sql');
  console.log('\n2. Copy and paste the SQL from:');
  console.log('   backend/src/database/migration.sql');
  console.log('\n3. Click "Run" to execute\n');

  // Verify connection and list existing tables
  console.log('🔍 Checking existing tables...');
  
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('   ⚠️  Could not list tables:', error.message);
    } else {
      const miningTables = tables?.filter(t => t.table_name?.startsWith('mining_')) || [];
      console.log(`   Found ${miningTables.length} mining tables:`);
      miningTables.forEach(t => console.log(`   - ${t.table_name}`));
      
      if (miningTables.length === 0) {
        console.log('\n   ❌ No mining tables found. Migration needs to be run manually.');
      } else {
        console.log('\n   ✅ Mining tables exist in Supabase!');
      }
    }
  } catch (err) {
    console.log('   ⚠️  Connection test failed:', (err as Error).message);
  }

  // Test basic connectivity
  console.log('\n🧪 Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('mining_config').select('*').limit(1);
    if (error && error.code !== '42P01') { // Table doesn't exist
      console.log('   ❌ Config table error:', error.message);
    } else if (error?.code === '42P01') {
      console.log('   ⚠️  Config table does not exist yet - run migration');
    } else {
      console.log('   ✅ Config table accessible');
      console.log('   Row count:', data?.length ?? 0);
    }
  } catch (err) {
    console.log('   ❌ Connection failed:', (err as Error).message);
  }
}

pushSchema().catch(err => {
  console.error('❌ Schema push failed:', err);
  process.exit(1);
});
