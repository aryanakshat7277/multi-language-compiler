// Automated end-to-end test script for all CodeForge PRO sections & APIs
const BASE_URL = 'http://localhost:3001/api';

const results = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    const res = await fn();
    const duration = Date.now() - start;
    results.push({ name, status: 'PASS', duration: `${duration}ms`, details: res });
    console.log(`[PASS] ${name} (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    results.push({ name, status: 'FAIL', duration: `${duration}ms`, error: err.message });
    console.error(`[FAIL] ${name} (${duration}ms):`, err.message);
  }
}

async function run() {
  console.log('====================================================');
  console.log('--- STARTING COMPLETE CODEFORGE PRO SYSTEM AUDIT ---');
  console.log('====================================================\n');

  // 1. Compiler Health Check
  await test('Compiler - Health Check (/compiler/health)', async () => {
    const res = await fetch(`${BASE_URL}/compiler/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  });

  // 2. Compiler Languages
  await test('Compiler - Supported Languages (/compiler/languages)', async () => {
    const res = await fetch(`${BASE_URL}/compiler/languages`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No languages returned');
    return `${data.length} execution languages available`;
  });

  // 3. Languages Catalog
  let languagesList = [];
  await test('Catalog - System Languages (/languages)', async () => {
    const res = await fetch(`${BASE_URL}/languages`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    languagesList = await res.json();
    if (!Array.isArray(languagesList) || languagesList.length === 0) throw new Error('No catalog languages found');
    return `${languagesList.length} catalog languages`;
  });

  // 4. Auth - Login Admin
  let adminToken = '';
  await test('Auth - Login Admin (/auth/login)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'password123' })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    adminToken = data.token;
    if (!adminToken) throw new Error('No token returned');
    return `Logged in as ${data.user?.displayName} (${data.user?.role})`;
  });

  // 5. Auth - Me Profile
  await test('Auth - Profile Verification (/auth/me)', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `User: ${data.displayName} | Role: ${data.role} | Email: ${data.email}`;
  });

  // 6. Problems Archive
  let problemsList = [];
  await test('Practice - Problem Archive (/problems)', async () => {
    const res = await fetch(`${BASE_URL}/problems`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    problemsList = Array.isArray(raw) ? raw : (raw.data || []);
    if (!Array.isArray(problemsList) || problemsList.length === 0) throw new Error('No problems returned');
    return `${problemsList.length} problems loaded: ${problemsList.map(p => p.title).join(', ')}`;
  });

  // 7. Problem Detail & Test Cases
  if (problemsList.length > 0) {
    const p = problemsList[0];
    await test(`Practice - Problem Details (/problems/${p.id})`, async () => {
      const res = await fetch(`${BASE_URL}/problems/${p.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `Loaded "${data.title}" with ${data.testCases?.length || 0} test cases`;
    });

    await test(`Practice - Submit Solution to Problem (${p.title})`, async () => {
      const res = await fetch(`${BASE_URL}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          problemId: p.id,
          languageId: 'python',
          files: [{ filename: 'solution.py', content: 'print("0 1")' }]
        })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HTTP ${res.status}: ${err}`);
      }
      const data = await res.json();
      return `Submission ID: ${data.id} | Status: ${data.status}`;
    });
  }

  // 8. Compiler - Execute Python
  await test('Compiler - Python 3 Direct Execution', async () => {
    const res = await fetch(`${BASE_URL}/compiler/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        files: [{ name: 'main.py', content: 'print("Hello from CodeForge Python Test!")\nx = 10 + 20\nprint("Result:", x)' }],
        stdin: ''
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    const stdout = data.run?.stdout || data.stdout || '';
    if (!stdout.includes('Result: 30')) throw new Error(`Unexpected output: ${stdout}`);
    return `Status: ${data.status} | Output: ${stdout.trim()}`;
  });

  // 9. Compiler - Execute JavaScript
  await test('Compiler - JavaScript (Node) Direct Execution', async () => {
    const res = await fetch(`${BASE_URL}/compiler/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'javascript',
        files: [{ name: 'index.js', content: 'const a = [1, 2, 3, 4]; console.log("Sum:", a.reduce((s, v) => s + v, 0));' }],
        stdin: ''
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    const stdout = data.run?.stdout || data.stdout || '';
    if (!stdout.includes('Sum: 10')) throw new Error(`Unexpected output: ${stdout}`);
    return `Status: ${data.status} | Output: ${stdout.trim()}`;
  });

  // 10. Code Intelligence - Code Metrics & Analysis
  await test('Intelligence - Code Metrics & Complexity (/code-analysis)', async () => {
    const res = await fetch(`${BASE_URL}/code-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageId: 'python',
        sourceCode: `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n\nprint(fib(8))`
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    return `Cyclomatic Complexity: ${data.complexityData?.cyclomaticComplexity}, Total Tokens: ${data.tokenData?.totalTokens}`;
  });

  // 11. Code Intelligence - AST Explorer
  await test('Intelligence - AST Explorer (/ast/parse)', async () => {
    const res = await fetch(`${BASE_URL}/ast/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'javascript',
        code: 'function calculateTotal(items) { return items.reduce((acc, i) => acc + i.price, 0); }'
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.ast) throw new Error('No AST node returned');
    return `Parsed AST Root: ${data.ast.type || data.ast.name}`;
  });

  // 12. Code Intelligence - Code DNA Similarity
  await test('Intelligence - Code DNA Similarity (/code-similarity)', async () => {
    const res = await fetch(`${BASE_URL}/code-similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageId: 'python',
        sourceCodeA: 'def add(a, b):\n    return a + b',
        sourceCodeB: 'def sum_two(x, y):\n    return x + y'
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    return `Overall Similarity: ${(data.overallScore * 100).toFixed(1)}% | Lexical: ${(data.lexicalScore * 100).toFixed(1)}%`;
  });

  // 13. Code Intelligence - AI Code Review / Mentor
  await test('Intelligence - AI Code Review & Mentor (/ai/review)', async () => {
    const res = await fetch(`${BASE_URL}/ai/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageId: 'python',
        sourceCode: 'def process_data(d):\n    return [x*2 for x in d if x > 0]'
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    return `Quality Score: ${data.overallQuality ?? 'N/A'} | Suggestions: ${data.suggestions?.length ?? 0}`;
  });

  // 14. Code Intelligence - AI Explainer
  await test('Intelligence - AI Explainer (/ai/explain)', async () => {
    const res = await fetch(`${BASE_URL}/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageId: 'python',
        sourceCode: 'numbers = [1, 2, 3]\nsquared = list(map(lambda x: x**2, numbers))',
        level: 'intermediate'
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    return `Explanation: ${JSON.stringify(data).substring(0, 100)}...`;
  });

  // 15. Code Intelligence - Shortest Code AI
  await test('Intelligence - Shortest Code AI (/ai/shortest-code)', async () => {
    const res = await fetch(`${BASE_URL}/ai/shortest-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageId: 'python',
        sourceCode: 'total = 0\nfor i in range(1, 11):\n    total += i\nprint(total)'
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    return `Techniques: ${data.techniquesUsed?.join(', ') || 'Optimized'}`;
  });

  // 16. Practice - Leaderboard
  await test('Practice - Leaderboard (/leaderboard)', async () => {
    const res = await fetch(`${BASE_URL}/leaderboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Leaderboard empty');
    return `Top Rank #1: ${data[0].name} (${data[0].score} pts) | ${data.length} total users`;
  });

  // 17. Learning - Assessments
  await test('Learning - Assessments (/assessments)', async () => {
    const res = await fetch(`${BASE_URL}/assessments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `${Array.isArray(data) ? data.length : 0} active assessments`;
  });

  // 18. Admin - System Stats (Protected by ADMIN role)
  await test('Administration - System Stats (/admin/stats)', async () => {
    // Check that unauthenticated access is rejected with 401
    const unauthRes = await fetch(`${BASE_URL}/admin/stats`);
    if (unauthRes.status !== 401 && unauthRes.status !== 403) {
      throw new Error(`Expected 401/403 for unauthenticated access, got ${unauthRes.status}`);
    }

    // Now test with verified ADMIN token
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `RBAC Enforced (401 on guest) | Authenticated Admin: ${data.users} users, ${data.languages} langs`;
  });

  // 19. Admin - System Health
  await test('Administration - System Health (/admin/health)', async () => {
    const res = await fetch(`${BASE_URL}/admin/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `Status: ${data.status} | DB: ${data.services?.database ? 'Healthy' : 'Error'}`;
  });

  // 20. Admin - Users List
  await test('Administration - Users List (/users)', async () => {
    const res = await fetch(`${BASE_URL}/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const count = data.total ?? data.data?.length ?? data.length;
    return `${count} registered users loaded`;
  });

  console.log('\n====================================================');
  console.log('                  FINAL TEST AUDIT                  ');
  console.log('====================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL AUDITED SECTIONS: ${results.length}`);
  console.log(`PASSED: ${passed} / ${results.length} (${Math.round((passed / results.length) * 100)}%)`);
  console.log(`FAILED: ${failed} / ${results.length}`);
  console.log('====================================================\n');
}

run();
