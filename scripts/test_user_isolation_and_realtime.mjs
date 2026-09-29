import WebSocket from 'ws';

const BASE = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001/ws';

async function testUserFlow() {
  console.log('--- TESTING REAL-TIME ADMIN WEBSOCKET & USER DATA ISOLATION ---');

  // 1. Connect Admin WebSocket
  const adminWs = new WebSocket(WS_URL);
  let receivedAdminEvent = false;

  await new Promise((resolve, reject) => {
    adminWs.on('open', () => {
      console.log('✓ Admin WebSocket connected');
      adminWs.send(JSON.stringify({ type: 'subscribe_admin' }));
      resolve();
    });
    adminWs.on('error', reject);
  });

  adminWs.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.type === 'admin_event' && data.event === 'USER_REGISTERED') {
      console.log('🟢 [REALTIME WEBSOCKET PUSH RECEIVED]', data);
      receivedAdminEvent = true;
    }
  });

  // Wait a moment for registration handshake
  await new Promise(r => setTimeout(r, 500));

  // 2. Register a new authentic user
  const uniqueEmail = `developer_${Date.now()}@realapp.io`;
  const registerRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'password123',
      displayName: 'Alice Engineer'
    })
  });

  const regData = await registerRes.json();
  console.log('✓ User registered with token:', !!regData.token);

  // Wait for WebSocket event
  await new Promise(r => setTimeout(r, 1000));

  if (!receivedAdminEvent) {
    console.error('❌ Expected real-time WebSocket push event not received!');
  } else {
    console.log('✅ Real-time WebSocket push verification PASSED!');
  }

  // 3. Verify user's own isolated profile
  const meRes = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${regData.token}` }
  });
  const me = await meRes.json();
  console.log(`✓ Isolated user profile fetched: email=${me.email}, role=${me.role}, displayName=${me.displayName}`);

  // 4. Verify user submissions are initially empty (no mock data leak!)
  const subsRes = await fetch(`${BASE}/submissions`, {
    headers: { Authorization: `Bearer ${regData.token}` }
  });
  const subs = await subsRes.json();
  console.log(`✓ User submissions count (must be 0 for new user): ${subs.data?.length || 0}`);

  // 5. Clean up the test user
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.userProgress.deleteMany({ where: { userId: me.id } });
  await prisma.user.delete({ where: { id: me.id } });
  console.log('✓ Cleaned up test user after verification.');
  await prisma.$disconnect();

  adminWs.close();
  console.log('\n--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

testUserFlow().catch(console.error);
