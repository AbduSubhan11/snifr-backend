const fetchModule = require('node-fetch');
global.fetch = fetchModule.default;
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function test() {
  console.log('🧪 Testing pet creation...\n');
  
  // Login as user A
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_a@example.com', password: 'test123456' }),
  });
  
  const loginData = await loginRes.json();
  console.log('Login response:', JSON.stringify(loginData, null, 2).substring(0, 300));
  
  const token = loginData.data?.token || loginData.token;
  console.log('\nToken:', token ? token.substring(0, 50) + '...' : 'NOT FOUND');
  
  // Create pet
  const petRes = await fetch(`${API_URL}/pets`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Max',
      breed: 'German Shepherd',
      age: 3,
      gender: 'Male',
      species: 'Dog',
      energyLevel: 'High',
      weight: 35,
    }),
  });
  
  const petData = await petRes.json();
  console.log('\nCreate pet response:', JSON.stringify(petData, null, 2).substring(0, 500));
  
  if (petData.data) {
    console.log('\nPet data keys:', Object.keys(petData.data));
    if (petData.data.pet) {
      console.log('Pet keys:', Object.keys(petData.data.pet));
      console.log('Pet ID:', petData.data.pet.id);
    }
  }
}

test().catch(console.error);
