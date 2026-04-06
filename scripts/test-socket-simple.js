const io = require('socket.io-client');
const fetchModule = require('node-fetch');
global.fetch = fetchModule.default;
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function test() {
  console.log('🔌 Testing Socket.io connection...\n');
  
  // Login to get token
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_a@example.com', password: 'test123456' }),
  });
  
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  
  console.log('Token obtained');
  console.log('Connecting to Socket.io at http://localhost:5000\n');
  
  const socket = io('http://localhost:5000', {
    auth: { token },
    transports: ['polling', 'websocket'],
  });
  
  socket.on('connect', () => {
    console.log('✅ Socket connected!');
    console.log('Socket ID:', socket.id);
    
    setTimeout(() => {
      console.log('\nDisconnecting...');
      socket.disconnect();
      process.exit(0);
    }, 3000);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    console.error('Error type:', error.type);
    console.error('Description:', error.description);
    process.exit(1);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    process.exit(0);
  });
  
  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('❌ Timeout - could not connect');
    socket.disconnect();
    process.exit(1);
  }, 10000);
}

test().catch(console.error);
