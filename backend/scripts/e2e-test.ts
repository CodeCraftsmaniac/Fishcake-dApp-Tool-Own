/**
 * E2E Test Script - Verifies all backend API endpoints
 * 
 * Usage: npx tsx scripts/e2e-test.ts [BASE_URL]
 * Default: http://localhost:3001
 * 
 * Prerequisites:
 * - Backend server running (npm run dev:sqlite or npm start)
 * - At least one wallet imported for full testing
 */

const BASE_URL = process.argv[2] || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<boolean | string>) {
  try {
    const result = await fn();
    if (result === true) {
      results.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    } else {
      results.push({ name, passed: false, detail: result as string });
      console.log(`  ❌ ${name}: ${result}`);
    }
  } catch (error) {
    const msg = (error as Error).message;
    results.push({ name, passed: false, detail: msg });
    console.log(`  ❌ ${name}: ${msg}`);
  }
}

async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return { status: response.status, data: await response.json() };
}

async function runTests() {
  console.log(`\n🧪 E2E Test Suite - ${BASE_URL}`);
  console.log('='.repeat(50));

  // Health
  console.log('\n📋 Health & Version');
  await test('GET /health returns 200', async () => {
    const { status, data } = await apiFetch('/health');
    return status === 200 && data.status === 'healthy' ? true : `status=${status}, data=${JSON.stringify(data)}`;
  });
  await test('GET /version returns version', async () => {
    const { data } = await apiFetch('/version');
    return data.version ? true : `No version in response`;
  });

  // Auth
  console.log('\n🔐 Authentication');
  let accessToken = '';
  await test('POST /api/mining/auth/login returns tokens', async () => {
    const { status, data } = await apiFetch('/api/mining/auth/login', {
      method: 'POST',
      body: JSON.stringify({ passphrase: 'test-passphrase' }),
    });
    if (data.success && data.data?.accessToken) {
      accessToken = data.data.accessToken;
      return true;
    }
    return `status=${status}, success=${data.success}`;
  });

  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  // Mining Status
  console.log('\n⛏️ Mining Status');
  await test('GET /api/mining/status returns scheduler info', async () => {
    const { data } = await apiFetch('/api/mining/status');
    return data.success && data.data?.scheduler ? true : `Missing scheduler data`;
  });

  // Wallets
  console.log('\n💰 Wallets');
  await test('GET /api/mining/wallets returns list', async () => {
    const { data } = await apiFetch('/api/mining/wallets');
    return data.success && Array.isArray(data.data) ? true : `Not an array`;
  });

  // Config
  console.log('\n⚙️ Configuration');
  await test('GET /api/mining/config returns config', async () => {
    const { data } = await apiFetch('/api/mining/config');
    return data.success && data.data?.fcc_per_recipient ? true : `Missing config fields`;
  });

  // RPC Status
  console.log('\n🌐 RPC Status');
  await test('GET /api/mining/rpc/status returns RPC info', async () => {
    const { data } = await apiFetch('/api/mining/rpc/status');
    return data.success ? true : `Failed to get RPC status`;
  });

  // Events
  console.log('\n📅 Events');
  await test('GET /api/mining/events returns list', async () => {
    const { data } = await apiFetch('/api/mining/events');
    return data.success && Array.isArray(data.data) ? true : `Not an array`;
  });

  // Logs
  console.log('\n📝 Logs');
  await test('GET /api/mining/logs returns entries', async () => {
    const { data } = await apiFetch('/api/mining/logs');
    return data.success && Array.isArray(data.data) ? true : `Not an array`;
  });

  // Metrics
  console.log('\n📊 Metrics');
  await test('GET /api/mining/metrics returns stats', async () => {
    const { data } = await apiFetch('/api/mining/metrics');
    return data.success ? true : `Failed to get metrics`;
  });

  // Stats endpoints
  console.log('\n📈 Stats');
  await test('GET /api/mining/stats returns aggregate stats', async () => {
    const { data } = await apiFetch('/api/mining/stats');
    return data.success ? true : `Failed to get stats`;
  });

  // Workflows
  console.log('\n🔄 Workflows');
  await test('GET /api/mining/workflows returns list', async () => {
    const { data } = await apiFetch('/api/mining/workflows');
    return data.success && Array.isArray(data.data) ? true : `Not an array`;
  });

  // Auth-protected endpoints
  console.log('\n🔒 Protected Endpoints');
  await test('POST /api/mining/start requires auth', async () => {
    const { status } = await apiFetch('/api/mining/start', { method: 'POST' });
    return status === 401 ? true : `Expected 401, got ${status}`;
  });
  await test('POST /api/mining/stop requires auth', async () => {
    const { status } = await apiFetch('/api/mining/stop', { method: 'POST' });
    return status === 401 ? true : `Expected 401, got ${status}`;
  });

  // SSE
  console.log('\n📡 Server-Sent Events');
  await test('GET /api/mining/stream is SSE endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/mining/stream`);
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('text/event-stream') ? true : `Content-Type: ${contentType}`;
  });

  // Rate Limiting
  console.log('\n🚦 Rate Limiting');
  await test('Rate limiting active on sensitive endpoints', async () => {
    // Rapid-fire requests to auth endpoint
    const promises = Array(10).fill(null).map(() =>
      apiFetch('/api/mining/auth/login', {
        method: 'POST',
        body: JSON.stringify({ passphrase: 'wrong' }),
      })
    );
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    return rateLimited ? true : 'Rate limiting may not be active (no 429 received)';
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${results.length} total`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.detail}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
