const fetchModule = require('node-fetch');
global.fetch = fetchModule.default;
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function test() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_a@example.com', password: 'test123456' }),
  });
  
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  
  console.log('Getting pets...\n');
  
  const petsRes = await fetch(`${API_URL}/pets`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const petsData = await petsRes.json();
  console.log('Pets response:', JSON.stringify(petsData, null, 2).substring(0, 600));
}

test().catch(console.error);
