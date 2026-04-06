const fetchModule = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

// Polyfill fetch for Node.js
global.fetch = fetchModule.default;

const API_URL = 'http://localhost:5000/api';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let userAToken, userBToken, userAId, userBId, petAId, petBId, matchId;

console.log('🧪 CHAT FEATURE API TEST SUITE\n');
console.log('=' .repeat(60));

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function apiCall(method, endpoint, data, token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  // Only add body for non-GET/HEAD requests
  if (data && method !== 'GET' && method !== 'HEAD') {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || result.error || `HTTP ${response.status}`);
  }
  
  return result;
}

(async () => {
  const results = [];
  
  // TEST 1: Create test users
  console.log('\n📝 STEP 1: Creating test users...');
  
  results.push(await test('Create User A (test_a@example.com)', async () => {
    const result = await apiCall('POST', '/auth/register', {
      email: 'test_a@example.com',
      password: 'test123456',
      fullName: 'Test User A',
      phone: '+1234567890',
    });
    
    userAToken = result.data.token;
    userAId = result.data.user.id;
    console.log(`   User A ID: ${userAId}`);
  }));
  
  results.push(await test('Create User B (test_b@example.com)', async () => {
    const result = await apiCall('POST', '/auth/register', {
      email: 'test_b@example.com',
      password: 'test123456',
      fullName: 'Test User B',
      phone: '+0987654321',
    });
    
    userBToken = result.data.token;
    userBId = result.data.user.id;
    console.log(`   User B ID: ${userBId}`);
  }));
  
  // TEST 2: Create pet profiles
  console.log('\n🐕 STEP 2: Creating pet profiles...');
  
  results.push(await test('Create Pet A (Max - German Shepherd)', async () => {
    const result = await apiCall('POST', '/pets', {
      name: 'Max',
      breed: 'German Shepherd',
      age: 3,
      gender: 'Male',
      species: 'Dog',
      energyLevel: 'High',
      weight: 35,
    }, userAToken);
    
    petAId = result.data.id;
    console.log(`   Pet A ID: ${petAId}`);
  }));
  
  results.push(await test('Create Pet B (Bella - Labrador)', async () => {
    const result = await apiCall('POST', '/pets', {
      name: 'Bella',
      breed: 'Labrador',
      age: 2,
      gender: 'Female',
      species: 'Dog',
      energyLevel: 'Medium',
      weight: 28,
    }, userBToken);
    
    petBId = result.data.id;
    console.log(`   Pet B ID: ${petBId}`);
  }));
  
  // TEST 3: Create a match (both users like each other)
  console.log('\n❤️ STEP 3: Creating match...');
  
  results.push(await test('User A likes User B\'s pet', async () => {
    const result = await apiCall('POST', '/matches/swipe', {
      targetPetId: petBId,
      liked: true,
    }, userAToken);
    
    console.log(`   Swipe result: ${result.data.liked ? 'Liked' : 'Not liked'}`);
  }));
  
  results.push(await test('User B likes User A\'s pet (creates match)', async () => {
    const result = await apiCall('POST', '/matches/swipe', {
      targetPetId: petAId,
      liked: true,
    }, userBToken);
    
    if (result.data.isMatch) {
      matchId = result.data.match.id;
      console.log(`   🎉 MATCH CREATED! Match ID: ${matchId}`);
    } else {
      console.log('   No match yet (need to check matches)');
    }
  }));
  
  // If match wasn't created in swipe, get it from matches list
  if (!matchId) {
    console.log('\n   Looking for match in matches list...');
    try {
      const matchesA = await apiCall('GET', '/matches', {}, userAToken);
      if (matchesA.data.matches && matchesA.data.matches.length > 0) {
        matchId = matchesA.data.matches[0].id;
        console.log(`   Found match: ${matchId}`);
      }
    } catch (error) {
      console.log(`   Could not find match: ${error.message}`);
    }
  }
  
  // TEST 4: Test REST API endpoints
  console.log('\n🔌 STEP 4: Testing REST API endpoints...');
  
  results.push(await test('GET /api/messages/:matchId (empty messages)', async () => {
    if (!matchId) {
      throw new Error('No matchId available - skipping message test');
    }
    
    const result = await apiCall('GET', `/messages/${matchId}`, {}, userAToken);
    console.log(`   Messages: ${result.data.messages ? result.data.messages.length : 0}`);
    console.log(`   Other user: ${result.data.otherUser ? result.data.otherUser.name : 'N/A'}`);
  }));
  
  // TEST 5: Test Socket.io connection
  console.log('\n🔌 STEP 5: Testing Socket.io...');
  
  results.push(await test('Socket.io server is listening', async () => {
    const io = require('socket.io-client');
    
    const socket = io('http://localhost:5000', {
      auth: { token: userAToken },
      transports: ['websocket', 'polling'],
    });
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket connection timeout'));
      }, 5000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('   Socket connected successfully!');
        socket.disconnect();
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Socket connection failed: ${error.message}`));
      });
    });
  }));
  
  // TEST 6: Full message flow test with Socket.io
  if (matchId) {
    console.log('\n💬 STEP 6: Testing real-time message flow...');
    
    results.push(await test('Send message from User A to User B', async () => {
      const io = require('socket.io-client');
      
      // Connect both users
      const socketA = io('http://localhost:5000', {
        auth: { token: userAToken },
        transports: ['websocket', 'polling'],
      });
      
      const socketB = io('http://localhost:5000', {
        auth: { token: userBToken },
        transports: ['websocket', 'polling'],
      });
      
      // Join match room
      socketA.emit('join_match', matchId);
      socketB.emit('join_match', matchId);
      
      // Wait for User B to receive message
      const receivedMessage = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socketA.disconnect();
          socketB.disconnect();
          reject(new Error('Message not received within timeout'));
        }, 10000);
        
        socketB.on('receive_message', (message) => {
          clearTimeout(timeout);
          resolve(message);
        });
        
        // User A sends message
        socketA.emit('send_message', {
          matchId,
          messageText: 'Hey! Your dog is really friendly! 🐕',
        });
      });
      
      console.log(`   Message sent: "${receivedMessage.messageText}"`);
      console.log(`   Message ID: ${receivedMessage.id}`);
      console.log(`   Sender: ${receivedMessage.senderId}`);
      
      socketA.disconnect();
      socketB.disconnect();
    }));
    
    results.push(await test('Retrieve messages from REST API', async () => {
      const result = await apiCall('GET', `/messages/${matchId}`, {}, userAToken);
      console.log(`   Total messages in DB: ${result.data.messages.length}`);
      if (result.data.messages.length > 0) {
        const msg = result.data.messages[0];
        console.log(`   Latest: "${msg.message_text}" by ${msg.sender_name}`);
      }
    }));
  }
  
  // SUMMARY
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
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check errors above.`);
  }
  
  if (matchId) {
    console.log(`\n🔗 Match ID for manual testing: ${matchId}`);
    console.log(`   User A Token: ${userAToken.substring(0, 50)}...`);
    console.log(`   User B Token: ${userBToken.substring(0, 50)}...`);
  }
  
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
})();
