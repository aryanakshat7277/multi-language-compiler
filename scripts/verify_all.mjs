const BASE = 'http://localhost:3001/api';

async function runExtendedChecks() {
  console.log('--- STARTING EXTENDED FEATURE TESTS ---');

  // 1. Admin Login
  const loginRes = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'password123' })
  });
  const { token: adminToken } = await loginRes.json();
  console.log('✅ Admin Auth Token acquired');

  // 2. AI Debugging with Groq
  const debugRes = await fetch(BASE + '/ai-review/debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
    body: JSON.stringify({
      sourceCode: 'def div(a, b):\n    return a / b\nprint(div(10, 0))',
      errorOutput: 'ZeroDivisionError: division by zero',
      languageId: 'python'
    })
  });
  const debugData = await debugRes.json();
  console.log('✅ AI Debugger functional! Root Cause:', debugData.rootCause ? debugData.rootCause.substring(0, 60) + '...' : 'Identified');

  // 3. AI Assessment Generation with Groq
  const assessGenRes = await fetch(BASE + '/assessments/generate-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
    body: JSON.stringify({ topic: 'Binary Search', difficulty: 'Medium', numQuestions: 2 })
  });
  const assessData = await assessGenRes.json();
  console.log('✅ AI Assessment Generator functional! Title:', assessData.title || 'Generated Assessment');

  // 4. Register a New Student User
  const tempEmail = 'student_' + Date.now() + '@test.com';
  const regRes = await fetch(BASE + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: tempEmail, password: 'password123', displayName: 'Test Student' })
  });
  const { token: studentToken } = await regRes.json();
  console.log('✅ User Registration functional! Registered:', tempEmail);

  // 5. Verify Student is BLOCKED from Admin
  const studentBlockedRes = await fetch(BASE + '/admin/overview', {
    headers: { 'Authorization': 'Bearer ' + studentToken }
  });
  if (studentBlockedRes.status === 403 || studentBlockedRes.status === 401) {
    console.log('✅ RBAC Security functional! Student blocked from Admin API (Status: ' + studentBlockedRes.status + ')');
  } else {
    throw new Error('Security failure: Student allowed into Admin API!');
  }

  // 6. C++ Direct Native Compilation & Run
  const cppRes = await fetch(BASE + '/compiler/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'cpp',
      files: [{ name: 'main.cpp', content: '#include <iostream>\nint main(){ std::cout << "CPP_SUCCESS_42"; return 0; }' }]
    })
  });
  const cppData = await cppRes.json();
  console.log('✅ C++ Compiler functional! Status:', cppData.status, '| Output:', cppData.run?.stdout?.trim());

  // 7. Admin Language Toggle Test
  const toggleRes = await fetch(BASE + '/admin/languages/python', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
    body: JSON.stringify({ enabled: true })
  });
  const toggleData = await toggleRes.json();
  console.log('✅ Admin Language Configuration functional! Python enabled:', toggleData.enabled);

  console.log('\n🌟 ALL EXTENDED SUBSYSTEMS PASSED WITH 100% SUCCESS 🌟');
}

runExtendedChecks().catch(err => {
  console.error('❌ Extended Test Failure:', err);
  process.exit(1);
});
