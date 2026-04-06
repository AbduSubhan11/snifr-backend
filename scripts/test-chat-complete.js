const fetchModule = require('node-fetch');
const io = require('socket.io-client');
global.fetch = fetchModule.default;
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let userAToken, userBToken, userAId, userBId, matchId;

console.log('🧪 COMPLETE CHAT FEATURE TEST\n');
console.log('='.repeat(60));

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

(async () => {
  const results = [];
  
  // Step 1: Login as both users
  console.log('📝 STEP 1: Logging in as test users...\n');
  
  results.push(await test('Login as User A', async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_a@example.com', password: 'test123456' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    userAToken = data.data.token;
    userAId = data.data.user.id;
    console.log(`   User A logged in: ${userAId}`);
  }));
  
  results.push(await test('Login as User B', async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_b@example.com', password: 'test123456' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    userBToken = data.data.token;
    userBId = data.data.user.id;
    console.log(`   User B logged in: ${userBId}`);
  }));
  
  // Step 2: Get their pets
  console.log('🐕 STEP 2: Getting pet IDs...\n');
  
  let petAId, petBId;
  
  results.push(await test('Get User A pets', async () => {
    const res = await fetch(`${API_URL}/pets`, {
      headers: { 'Authorization': `Bearer ${userAToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    if (!data.data.pets || data.data.pets.length === 0) throw new Error('No pets found for User A');
    petAId = data.data.pets[0].id;
    console.log(`   Pet A: ${data.data.pets[0].name} (${petAId})`);
  }));
  
  results.push(await test('Get User B pets', async () => {
    const res = await fetch(`${API_URL}/pets`, {
      headers: { 'Authorization': `Bearer ${userBToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    if (!data.data.pets || data.data.pets.length === 0) throw new Error('No pets found for User B');
    petBId = data.data.pets[0].id;
    console.log(`   Pet B: ${data.data.pets[0].name} (${petBId})`);
  }));
  
  // Step 3: Get or create match
  console.log('❤️  STEP 3: Getting match...\n');
  
  results.push(await test('Get match from database', async () => {
    const matchResult = await pool.query(`
      SELECT id FROM matches
      WHERE (pet_1_id = $1 AND pet_2_id = $2)
         OR (pet_1_id = $2 AND pet_2_id = $1)
      ORDER BY created_at DESC
      LIMIT 1
    `, [petAId, petBId]);
    
    if (matchResult.rows.length === 0) {
      throw new Error('No match found between test users');
    }
    
    matchId = matchResult.rows[0].id;
    console.log(`   Match ID: ${matchId}`);
    
    // Update to matched status if not already
    await pool.query(`
      UPDATE matches
      SET status = 'matched', matched_at = NOW()
      WHERE id = $1
    `, [matchId]);
    
    console.log(`   Match status set to 'matched'`);
  }));
  
  // Step 4: Test REST API - Get empty messages
  console.log('💬 STEP 4: Testing REST API - Get messages...\n');
  
  results.push(await test('GET /api/messages/:matchId (empty)', async () => {
    const res = await fetch(`${API_URL}/messages/${matchId}`, {
      headers: { 'Authorization': `Bearer ${userAToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    console.log(`   Messages count: ${data.data.messages.length}`);
    console.log(`   Other user: ${data.data.otherUser.name}`);
  }));
  
  // Step 5: Test Socket.io connection
  console.log('🔌 STEP 5: Testing Socket.io real-time messaging...\n');
  
  results.push(await test('Real-time message flow (User A → User B)', async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (socketA) socketA.disconnect();
        if (socketB) socketB.disconnect();
        reject(new Error('Test timeout - message not received'));
      }, 15000);
      
      let socketA, socketB;
      
      try {
        // Connect User A
        socketA = io('http://localhost:5000', {
          auth: { token: userAToken },
          transports: ['polling'],
        });
        
        // Connect User B
        socketB = io('http://localhost:5000', {
          auth: { token: userBToken },
          transports: ['polling'],
        });
        
        socketA.on('connect', () => {
          console.log('   Socket A connected');
          socketA.emit('join_match', matchId);
        });
        
        socketB.on('connect', () => {
          console.log('   Socket B connected');
          socketB.emit('join_match', matchId);
        });
        
        // User B listens for message
        socketB.on('receive_message', async (message) => {
          try {
            clearTimeout(timeout);
            console.log(`   ✅ User B received: "${message.messageText}"`);
            console.log(`   Message ID: ${message.id}`);
            console.log(`   Sender: ${message.senderName}`);
            
            // Verify message in database
            const dbResult = await pool.query(
              'SELECT * FROM messages WHERE id = $1',
              [message.id]
            );
            
            if (dbResult.rows.length === 0) {
              throw new Error('Message not found in database');
            }
            
            console.log(`   ✅ Message verified in database`);
            
            socketA.disconnect();
            socketB.disconnect();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        
        // After both connected, User A sends message
        setTimeout(() => {
          console.log('\n   User A sending message...');
          socketA.emit('send_message', {
            matchId,
            messageText: 'Hey! Your dog is really friendly! 🐕',
          });
        }, 2000);
        
      } catch (error) {
        clearTimeout(timeout);
        if (socketA) socketA.disconnect();
        if (socketB) socketB.disconnect();
        reject(error);
      }
    });
  }));
  
  // Step 6: Test bidirectional messaging
  results.push(await test('Real-time message flow (User B → User A)', async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (socketA) socketA.disconnect();
        if (socketB) socketB.disconnect();
        reject(new Error('Test timeout - message not received'));
      }, 15000);
      
      let socketA, socketB;
      
      try {
        socketA = io('http://localhost:5000', {
          auth: { token: userAToken },
          transports: ['polling'],
        });
        
        socketB = io('http://localhost:5000', {
          auth: { token: userBToken },
          transports: ['polling'],
        });
        
        socketA.on('connect', () => {
          socketA.emit('join_match', matchId);
        });
        
        socketB.on('connect', () => {
          socketB.emit('join_match', matchId);
        });
        
        // User A listens for message
        socketA.on('receive_message', async (message) => {
          try {
            clearTimeout(timeout);
            console.log(`   ✅ User A received: "${message.messageText}"`);
            
            socketA.disconnect();
            socketB.disconnect();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        
        // User B sends message
        setTimeout(() => {
          console.log('   User B sending reply...');
          socketB.emit('send_message', {
            matchId,
            messageText: 'Thanks! They love playing together! 😊',
          });
        }, 2000);
        
      } catch (error) {
        clearTimeout(timeout);
        if (socketA) socketA.disconnect();
        if (socketB) socketB.disconnect();
        reject(error);
      }
    });
  }));
  
  // Step 7: Verify all messages in database
  results.push(await test('Verify all messages in database', async () => {
    const res = await fetch(`${API_URL}/messages/${matchId}`, {
      headers: { 'Authorization': `Bearer ${userAToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    console.log(`   Total messages: ${data.data.messages.length}`);
    data.data.messages.forEach((msg, i) => {
      console.log(`   ${i + 1}. "${msg.message_text}" by ${msg.sender_name}`);
    });
    
    if (data.data.messages.length < 2) {
      throw new Error('Expected at least 2 messages');
    }
  }));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const failed = total - passed;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Chat feature is working perfectly!');
    console.log('\nYou can now test in the mobile app:');
    console.log(`   Match ID: ${matchId}`);
    console.log('   Open the app and navigate to Matches tab');
    console.log('   Click "Chat" button to start messaging');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check errors above.`);
  }
  
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
})();
