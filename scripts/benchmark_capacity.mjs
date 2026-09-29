// High-concurrency capacity benchmark script
const BASE_URL = 'http://localhost:3001/api';

async function measureEndpoint(name, url, totalRequests, concurrency) {
  let completed = 0;
  let success = 0;
  let failed = 0;
  const latencies = [];
  const startTime = Date.now();

  const queue = Array.from({ length: totalRequests }, (_, i) => i);

  async function worker() {
    while (queue.length > 0) {
      queue.pop();
      const reqStart = Date.now();
      try {
        const res = await fetch(url);
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      } finally {
        completed++;
      }
    }
  }

  // Launch workers
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const rps = Math.round((success / (totalTimeMs / 1000)) * 10) / 10;
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1));
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  return {
    endpoint: name,
    totalRequests,
    concurrency,
    durationMs: totalTimeMs,
    throughputRps: rps,
    successRate: `${Math.round((success / totalRequests) * 100)}%`,
    avgLatencyMs: avgLatency,
    p50Ms: p50,
    p95Ms: p95,
    p99Ms: p99
  };
}

async function run() {
  console.log('=== RUNNING CAPACITY BENCHMARK ===');

  // Test 1: Language Catalog (Static read) - 100 concurrent requests, 500 total
  console.log('\nTesting /api/languages (100 concurrency)...');
  const bench1 = await measureEndpoint('Languages Catalog', `${BASE_URL}/languages`, 300, 50);
  console.log(bench1);

  // Test 2: Leaderboard (Aggregated query) - 50 concurrency, 200 total
  console.log('\nTesting /api/leaderboard (50 concurrency)...');
  const bench2 = await measureEndpoint('Global Leaderboard', `${BASE_URL}/leaderboard`, 200, 50);
  console.log(bench2);

  // Test 3: Problem Archive (Database findMany) - 50 concurrency, 200 total
  console.log('\nTesting /api/problems (50 concurrency)...');
  const bench3 = await measureEndpoint('Problem Archive', `${BASE_URL}/problems`, 200, 50);
  console.log(bench3);

  // Test 4: Admin Telemetry (Full cluster health check) - 20 concurrency, 50 total
  console.log('\nTesting /api/admin/overview (20 concurrency)...');
  const bench4 = await measureEndpoint('Admin Overview', `${BASE_URL}/admin/overview`, 50, 20);
  console.log(bench4);

  console.log('\n=== CAPACITY BENCHMARK COMPLETE ===');
  console.log(JSON.stringify([bench1, bench2, bench3, bench4], null, 2));
}

run();
