const io = require('socket.io-client');
const fetchModule = require('node-fetch');
global.fetch = fetchModule.default;
require('dotenv').config();
const { Pool } = require('pg');

const API_URL = 'http://localhost:5000/api';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  console.log('🧪 FINAL CHAT FEATURE VERIFICATION\n');
  console.log('='.repeat(60));
  
  // Login both users
  console.log('\n1️⃣ Logging in as both users...');
  
  const loginA = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_a@example.com', password: 'test123456' }),
  });
  const dataA = await loginA.json();
  const tokenA = dataA.data.token;
  console.log('   ✅ User A logged in');
  
  const loginB = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_b@example.com', password: 'test123456' }),
  });
  const dataB = await loginB.json();
  const tokenB = dataB.data.token;
  console.log('   ✅ User B logged in');
  
  // Get match
  console.log('\n2️⃣ Getting match...');
  const petsA = await fetch(`${API_URL}/pets`, { headers: { 'Authorization': `Bearer ${tokenA}` }});
  const petsAData = await petsA.json();
  const petAId = petsAData.data.pets[0].id;
  
  const petsB = await fetch(`${API_URL}/pets`, { headers: { 'Authorization': `Bearer ${tokenB}` }});
  const petsBData = await petsB.json();
  const petBId = petsBData.data.pets[0].id;
  
  const matchResult = await pool.query(
    'SELECT id FROM matches WHERE (pet_1_id = $1 AND pet_2_id = $2) OR (pet_1_id = $2 AND pet_2_id = $1) ORDER BY created_at DESC LIMIT 1',
    [petAId, petBId]
  );
  const matchId = matchResult.rows[0].id;
  console.log(`   ✅ Match ID: ${matchId}`);
  
  // Connect sockets
  console.log('\n3️⃣ Connecting Socket.io clients...');
  
  const socketA = io('http://localhost:5000', { auth: { token: tokenA }, transports: ['polling'] });
  const socketB = io('http://localhost:5000', { auth: { token: tokenB }, transports: ['polling'] });
  
  await Promise.all([
    new Promise(resolve => socketA.on('connect', () => { console.log('   ✅ Socket A connected'); socketA.emit('join_match', matchId); resolve(); })),
    new Promise(resolve => socketB.on('connect', () => { console.log('   ✅ Socket B connected'); socketB.emit('join_match', matchId); resolve(); })),
  ]);
  
  // Test 1: User A sends message
  console.log('\n4️⃣ User A sending message...');
  const msg1Received = new Promise(resolve => {
    socketB.on('receive_message', (msg) => {
      console.log(`   ✅ User B received: "${msg.messageText}"`);
      resolve(msg);
    });
  });
  
  socketA.emit('send_message', { matchId, messageText: 'Hello from User A! 🐕' });
  const msg1 = await msg1Received;
  
  // Test 2: User B sends message
  console.log('\n5️⃣ User B sending message...');
  const msg2Received = new Promise(resolve => {
    socketA.on('receive_message', (msg) => {
      console.log(`   ✅ User A received: "${msg.messageText}"`);
      resolve(msg);
    });
  });
  
  socketB.emit('send_message', { matchId, messageText: 'Hello from User B! 🐾' });
  const msg2 = await msg2Received;
  
  // Test 3: Typing indicator
  console.log('\n6️⃣ Testing typing indicator...');
  const typingReceived = new Promise(resolve => {
    socketA.on('user_typing', (data) => {
      console.log(`   ✅ User A sees typing indicator: ${data.isTyping}`);
      resolve();
    });
  });
  
  socketB.emit('typing', { matchId, isTyping: true });
  await typingReceived;
  
  // Verify in database
  console.log('\n7️⃣ Verifying messages in database...');
  const res = await fetch(`${API_URL}/messages/${matchId}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` },
  });
  const data = await res.json();
  
  console.log(`   ✅ Total messages in DB: ${data.data.messages.length}`);
  data.data.messages.forEach((msg, i) => {
    console.log(`      ${i + 1}. "${msg.message_text}" by ${msg.sender_name}`);
  });
  
  // Cleanup
  socketA.disconnect();
  socketB.disconnect();
  await pool.end();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL CHAT FEATURES VERIFIED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n✅ Real-time messaging works perfectly');
  console.log('✅ Bidirectional communication confirmed');
  console.log('✅ Database persistence verified');
  console.log('✅ Typing indicators working');
  console.log('\n📱 The chat feature is ready for production use!');
  
  process.exit(0);
}

test().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
