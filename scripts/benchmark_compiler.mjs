// Compiler execution concurrency benchmark
const BASE_URL = 'http://localhost:3001/api';

async function testCompilerConcurrency(concurrency) {
  console.log(`\nTesting ${concurrency} simultaneous compiler executions...`);
  const start = Date.now();
  
  const requests = Array.from({ length: concurrency }, (_, i) => {
    return fetch(`${BASE_URL}/compiler/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        files: [{ name: 'bench.py', content: `import time; x = sum(i*i for i in range(1000)); print("OK", x, ${i})` }],
        stdin: ''
      })
    }).then(async res => {
      const data = await res.json();
      return { ok: res.ok, status: data.status, time: Date.now() - start };
    }).catch(err => ({ ok: false, error: err.message, time: Date.now() - start }));
  });

  const results = await Promise.all(requests);
  const totalDuration = Date.now() - start;
  const passed = results.filter(r => r.ok).length;
  const avgTime = Math.round(results.reduce((a, b) => a + b.time, 0) / results.length);

  console.log({
    concurrency,
    totalDurationMs: totalDuration,
    successfulRuns: `${passed}/${concurrency}`,
    avgResponseTimeMs: avgTime,
    throughputExecutionsPerSec: Math.round((passed / (totalDuration / 1000)) * 10) / 10
  });

  return { concurrency, totalDuration, passed, avgTime };
}

async function run() {
  await testCompilerConcurrency(5);
  await testCompilerConcurrency(10);
}

run();
