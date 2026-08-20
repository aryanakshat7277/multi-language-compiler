const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(out) });
        } catch {
          resolve({ status: res.statusCode, raw: out });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('--- TESTING BACKEND ENDPOINTS ---');
  
  // 1. Python Execution
  const py = await post('http://localhost:3001/api/compiler/execute', {
    language: 'python',
    files: [{ name: 'main.py', content: 'print("Python Output: " + str(40 + 2))' }]
  });
  console.log('1. Python Execution:', JSON.stringify(py, null, 2));

  // 2. JavaScript Execution
  const js = await post('http://localhost:3001/api/compiler/execute', {
    language: 'javascript',
    files: [{ name: 'index.js', content: 'console.log("JS Calculation:", 10 * 5);' }]
  });
  console.log('2. JavaScript Execution:', JSON.stringify(js, null, 2));

  // 3. Code Analysis
  const ana = await post('http://localhost:3001/api/code-analysis', {
    languageId: 'javascript',
    sourceCode: 'function calc(n) { if (n <= 1) return 1; return n * calc(n - 1); }'
  });
  console.log('3. Code Analysis:', JSON.stringify(ana, null, 2));

  // 4. Code Similarity
  const sim = await post('http://localhost:3001/api/code-similarity', {
    languageId: 'python',
    sourceCodeA: 'def add(a, b): return a + b',
    sourceCodeB: 'def sum_two(x, y): res = x + y; return res'
  });
  console.log('4. Code Similarity:', JSON.stringify(sim, null, 2));
})();
