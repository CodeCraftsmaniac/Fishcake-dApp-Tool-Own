/**
 * Supabase Database Test Script
 * 
 * Tests all CRUD operations against Supabase tables
 * 
 * Usage: npx tsx scripts/test-supabase-db.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Set these in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<boolean | string>) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    if (result === true) {
      results.push({ name, passed: true, duration });
      console.log(`  ✅ ${name} (${duration}ms)`);
    } else {
      results.push({ name, passed: false, error: result as string, duration });
      console.log(`  ❌ ${name}: ${result}`);
    }
  } catch (err) {
    const duration = Date.now() - start;
    const msg = (err as Error).message;
    results.push({ name, passed: false, error: msg, duration });
    console.log(`  ❌ ${name}: ${msg}`);
  }
}

async function runTests() {
  console.log(`\n🧪 Supabase Database Test Suite`);
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log('='.repeat(60));

  // Test 1: Connection
  console.log('\n📡 Connection');
  await test('Connect to Supabase', async () => {
    const { data, error } = await supabase.from('mining_config').select('count').limit(1);
    if (error?.code === '42P01') return 'Tables not created yet - run migration.sql in Supabase SQL Editor';
    return error ? error.message : true;
  });

  // Test 2: Config CRUD
  console.log('\n⚙️ Mining Config');
  await test('READ config', async () => {
    const { data, error } = await supabase.from('mining_config').select('*').eq('id', 1).single();
    if (error) return error.message;
    return data?.id === 1 ? true : 'Config row not found';
  });

  await test('UPDATE config', async () => {
    const { error } = await supabase.from('mining_config')
      .update({ offset_minutes: 10 })
      .eq('id', 1);
    if (error) return error.message;
    
    // Verify
    const { data } = await supabase.from('mining_config').select('offset_minutes').eq('id', 1).single();
    return data?.offset_minutes === 10 ? true : `Expected 10, got ${data?.offset_minutes}`;
  });

  // Reset
  await supabase.from('mining_config').update({ offset_minutes: 5 }).eq('id', 1);

  // Test 3: Wallet CRUD
  console.log('\n💰 Wallet Operations');
  let walletId: number;
  
  await test('CREATE wallet', async () => {
    const { data, error } = await supabase.from('mining_wallets')
      .insert({
        address: '0x1234567890123456789012345678901234567890',
        encrypted_key: 'test-enc-key',
        salt: 'test-salt',
        iv: 'test-iv',
        auth_tag: 'test-auth-tag',
      })
      .select()
      .single();
    
    if (error) return error.message;
    walletId = data?.id;
    return data?.address === '0x1234567890123456789012345678901234567890' ? true : 'Address mismatch';
  });

  await test('READ wallet', async () => {
    if (!walletId) return 'No wallet created';
    const { data, error } = await supabase.from('mining_wallets').select('*').eq('id', walletId).single();
    if (error) return error.message;
    return data?.id === walletId ? true : 'Wallet not found';
  });

  await test('UPDATE wallet status', async () => {
    if (!walletId) return 'No wallet created';
    const { error } = await supabase.from('mining_wallets')
      .update({ status: 'paused' })
      .eq('id', walletId);
    if (error) return error.message;
    
    const { data } = await supabase.from('mining_wallets').select('status').eq('id', walletId).single();
    return data?.status === 'paused' ? true : `Expected paused, got ${data?.status}`;
  });

  // Test 4: Event CRUD
  console.log('\n📅 Event Operations');
  let eventId: number;
  
  await test('CREATE event', async () => {
    if (!walletId) return 'No wallet created';
    const { data, error } = await supabase.from('mining_events')
      .insert({
        wallet_id: walletId,
        status: 'PENDING',
        drops_checklist: '0/2',
      })
      .select()
      .single();
    
    if (error) return error.message;
    eventId = data?.id;
    return data?.status === 'PENDING' ? true : 'Status mismatch';
  });

  await test('READ event', async () => {
    if (!eventId) return 'No event created';
    const { data, error } = await supabase.from('mining_events').select('*').eq('id', eventId).single();
    if (error) return error.message;
    return data?.id === eventId ? true : 'Event not found';
  });

  await test('UPDATE event status', async () => {
    if (!eventId) return 'No event created';
    const { error } = await supabase.from('mining_events')
      .update({ status: 'FINISHED' })
      .eq('id', eventId);
    if (error) return error.message;
    
    const { data } = await supabase.from('mining_events').select('status').eq('id', eventId).single();
    return data?.status === 'FINISHED' ? true : `Expected FINISHED, got ${data?.status}`;
  });

  // Test 5: Drop CRUD
  console.log('\n💧 Drop Operations');
  let dropId: number;
  
  await test('CREATE drop', async () => {
    if (!eventId) return 'No event created';
    const { data, error } = await supabase.from('mining_drops')
      .insert({
        event_id: eventId,
        recipient_address: '0x1111111111111111111111111111111111111111',
        amount: '12000000',
        drop_number: 1,
      })
      .select()
      .single();
    
    if (error) return error.message;
    dropId = data?.id;
    return data?.drop_number === 1 ? true : 'Drop number mismatch';
  });

  await test('READ drops by event', async () => {
    if (!eventId) return 'No event created';
    const { data, error } = await supabase.from('mining_drops').select('*').eq('event_id', eventId);
    if (error) return error.message;
    return data?.length === 1 ? true : `Expected 1 drop, got ${data?.length}`;
  });

  // Test 6: Log CRUD
  console.log('\n📝 Log Operations');
  let logId: number;
  
  await test('CREATE log', async () => {
    if (!walletId) return 'No wallet created';
    const { data, error } = await supabase.from('mining_logs')
      .insert({
        wallet_id: walletId,
        level: 'INFO',
        action: 'TEST',
        message: 'Test log entry',
      })
      .select()
      .single();
    
    if (error) return error.message;
    logId = data?.id;
    return data?.action === 'TEST' ? true : 'Action mismatch';
  });

  await test('READ logs by wallet', async () => {
    if (!walletId) return 'No wallet created';
    const { data, error } = await supabase.from('mining_logs').select('*').eq('wallet_id', walletId);
    if (error) return error.message;
    return data?.length >= 1 ? true : `Expected logs, got ${data?.length}`;
  });

  // Test 7: Statistics view
  console.log('\n📊 Statistics View');
  await test('READ statistics', async () => {
    const { data, error } = await supabase.from('mining_statistics').select('*').single();
    if (error) return error.message;
    return data && typeof data.total_wallets === 'number' ? true : 'Invalid statistics data';
  });

  // Cleanup
  console.log('\n🧹 Cleanup');
  await test('DELETE test data', async () => {
    try { if (logId) await supabase.from('mining_logs').delete().eq('id', logId); } catch {}
    try { if (dropId) await supabase.from('mining_drops').delete().eq('id', dropId); } catch {}
    try { if (eventId) await supabase.from('mining_events').delete().eq('id', eventId); } catch {}
    try { if (walletId) await supabase.from('mining_wallets').delete().eq('id', walletId); } catch {}
    return true;
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${results.length} total`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  console.log(`⏱️  Total duration: ${totalDuration}ms`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
