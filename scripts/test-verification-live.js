/**
 * Complete Verification API Test
 * Using provided credentials
 */

const API_URL = 'http://localhost:5000/api';

const ADMIN_EMAIL = 'ranasubhanrajpur6677@gmail.com';
const ADMIN_PASSWORD = '12345678';

const USER_EMAIL = 'subhancontact2@gmail.com';
const USER_PASSWORD = 'abc123';

// Test image (1x1 PNG)
const TEST_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function test() {
  console.log('🧪 VERIFICATION API TEST\n');
  
  let userToken = '';
  let adminToken = '';
  let petId = '';
  let verificationId = '';

  try {
    // 1. User Login
    console.log('📝 1. User Login...');
    const userLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
    });
    const userResult = await userLogin.json();
    console.log('User Login:', userResult.success ? '✅' : '❌', userResult.message || '');
    
    if (!userResult.success) {
      console.log('Creating user account...');
      const register = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: USER_EMAIL,
          password: USER_PASSWORD,
          fullName: 'Test User',
          phone: '+1234567890',
        }),
      });
      const registerResult = await register.json();
      console.log('Register:', registerResult.success ? '✅' : '❌', registerResult.message);
      userToken = registerResult.data?.token || '';
    } else {
      userToken = userResult.data.token;
    }
    console.log('User Token:', userToken.substring(0, 40) + '...\n');

    // 2. Admin Login
    console.log('👑 2. Admin Login...');
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const adminResult = await adminLogin.json();
    console.log('Admin Login:', adminResult.success ? '✅' : '❌', adminResult.message || '');
    
    if (!adminResult.success) {
      console.log('⚠️  Creating admin account and setting admin flag...');
      const register = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          fullName: 'Admin User',
          phone: '+1234567890',
        }),
      });
      const registerResult = await register.json();
      console.log('Register:', registerResult.success ? '✅' : '❌', registerResult.message);
      
      // Set as admin in database
      const { Pool } = require('pg');
      require('dotenv').config();
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await pool.query(`UPDATE users SET is_admin = TRUE WHERE email = $1`, [ADMIN_EMAIL]);
      await pool.end();
      console.log('✅ Admin flag set!\n');
      
      // Login again
      const adminLogin2 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      const adminResult2 = await adminLogin2.json();
      adminToken = adminResult2.data.token;
    } else {
      adminToken = adminResult.data.token;
    }
    console.log('Admin Token:', adminToken.substring(0, 40) + '...\n');

    // 3. User Get/Create Pet
    console.log('🐾 3. Getting user pets...');
    const pets = await fetch(`${API_URL}/pets`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const petsResult = await pets.json();
    console.log('Pets Response:', petsResult.success ? '✅' : '❌');
    
    if (!petsResult.data?.pets?.length) {
      console.log('Creating test pet...');
      const createPet = await fetch(`${API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Buddy',
          breed: 'Golden Retriever',
          age: 3,
          gender: 'Male',
          species: 'Dog',
        }),
      });
      const createPetResult = await createPet.json();
      petId = createPetResult.data?.id;
      console.log('Pet Created:', petId);
    } else {
      petId = petsResult.data.pets[0].id;
      console.log('Using Pet:', petsResult.data.pets[0].name, petId);
    }

    // 4. Submit Verification
    console.log('\n📤 4. Submitting verification...');
    const byteCharacters = atob(TEST_IMAGE);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    const formData = new FormData();
    formData.append('petId', petId);
    formData.append('documentType', 'vaccination_certificate');
    formData.append('notes', 'Test vaccination 2026');
    formData.append('document', blob, 'test_vaccination.png');

    const submit = await fetch(`${API_URL}/verification/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` },
      body: formData,
    });
    const submitResult = await submit.json();
    console.log('Submit Verification:', submitResult.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(submitResult, null, 2));
    
    if (submitResult.success) {
      verificationId = submitResult.data.id;
      console.log('Verification ID:', verificationId);
    }

    // 5. Check Status
    console.log('\n📥 5. Checking verification status...');
    const status = await fetch(`${API_URL}/verification/pet/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const statusResult = await status.json();
    console.log('Status:', statusResult.success ? '✅' : '❌');
    if (statusResult.success && statusResult.data.requests?.length) {
      const req = statusResult.data.requests[0];
      console.log(`Status: ${req.status}, Created: ${req.created_at}`);
    }

    // 6. Admin Get Pending
    console.log('\n👑 6. Admin getting pending requests...');
    const pending = await fetch(`${API_URL}/verification/pending`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const pendingResult = await pending.json();
    console.log('Pending:', pendingResult.success ? '✅' : '❌');
    console.log('Pending count:', pendingResult.data?.count || 0);
    
    if (pendingResult.data?.requests?.length) {
      verificationId = pendingResult.data.requests[0].id;
      console.log('Found verification:', verificationId);
    }

    // 7. Admin Approve
    console.log('\n✅ 7. Admin approving verification...');
    const approve = await fetch(`${API_URL}/verification/${verificationId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const approveResult = await approve.json();
    console.log('Approve:', approveResult.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(approveResult, null, 2));

    // 8. Verify Pet is Verified
    console.log('\n✅ 8. Checking if pet is verified...');
    const finalPet = await fetch(`${API_URL}/pets/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const finalPetResult = await finalPet.json();
    console.log('Pet Verified:', finalPetResult.data?.isVerified ? '✅ YES' : '❌ NO');
    console.log('Vaccination Status:', finalPetResult.data?.vaccinationStatus ? '✅ YES' : '❌ NO');
    console.log('\nPet Details:', JSON.stringify({
      name: finalPetResult.data?.name,
      isVerified: finalPetResult.data?.isVerified,
      vaccinationStatus: finalPetResult.data?.vaccinationStatus,
    }, null, 2));

    // 9. Test Reject (create new and reject)
    console.log('\n❌ 9. Testing rejection flow...');
    const submit2 = await fetch(`${API_URL}/verification/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` },
      body: formData,
    });
    const submit2Result = await submit2.json();
    console.log('Re-submit:', submit2Result.success ? '✅' : '❌');
    
    if (submit2Result.success) {
      const reject = await fetch(`${API_URL}/verification/${submit2Result.data.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Test rejection - document quality check' }),
      });
      const rejectResult = await reject.json();
      console.log('Reject:', rejectResult.success ? '✅' : '❌');
      console.log('Response:', JSON.stringify(rejectResult, null, 2));
    }

    console.log('\n✨ ALL TESTS COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  }
}

test();
