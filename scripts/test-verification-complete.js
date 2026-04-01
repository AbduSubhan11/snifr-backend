/**
 * Complete Verification API Test Script
 * Tests: Submit → Get Status → Admin Approve/Reject
 */

const API_URL = 'http://localhost:5000/api';

// Test configuration - UPDATE THESE WITH YOUR ACTUAL VALUES
const TEST_EMAIL = 'ranasubhanrajput6677@gmail.com';
const TEST_PASSWORD = 'test123'; // Update with your password

// Create a simple test image (1x1 pixel PNG base64)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testVerificationFlow() {
  console.log('🧪 Starting Verification API Test Flow\n');
  console.log('═'.repeat(60));

  let userToken = '';
  let petId = '';
  let verificationId = '';

  try {
    // ========== STEP 1: Login ==========
    console.log('\n📝 STEP 1: Logging in...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const loginResult = await loginResponse.json();
    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.message}`);
    }

    userToken = loginResult.data.token;
    console.log('✅ Login successful!');
    console.log(`   Token: ${userToken.substring(0, 50)}...`);
    console.log(`   User: ${loginResult.data.user.fullName}`);

    // ========== STEP 2: Get User's Pets ==========
    console.log('\n🐾 STEP 2: Getting user pets...');
    const petsResponse = await fetch(`${API_URL}/pets`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const petsResult = await petsResponse.json();
    if (!petsResult.success || !petsResult.data.pets.length) {
      console.log('⚠️  No pets found. Creating a test pet...');
      // Create a test pet
      const createPetResponse = await fetch(`${API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Pet',
          breed: 'Golden Retriever',
          age: 2,
          gender: 'Male',
          species: 'Dog',
        }),
      });
      const createPetResult = await createPetResponse.json();
      petId = createPetResult.data.id;
      console.log(`✅ Created test pet: ${petId}`);
    } else {
      petId = petsResult.data.pets[0].id;
      console.log(`✅ Found pet: ${petsResult.data.pets[0].name} (${petId})`);
    }

    // ========== STEP 3: Submit Verification Request ==========
    console.log('\n📤 STEP 3: Submitting verification request...');
    
    // Create FormData with test image
    const formData = new FormData();
    formData.append('petId', petId);
    formData.append('documentType', 'vaccination_certificate');
    formData.append('notes', 'Test vaccination document');
    
    // Convert base64 to blob
    const byteCharacters = atob(TEST_IMAGE_BASE64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    formData.append('document', blob, 'test_vaccination.png');

    const submitResponse = await fetch(`${API_URL}/verification/submit`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` },
      body: formData,
    });

    const submitResult = await submitResponse.json();
    console.log('Response status:', submitResponse.status);
    console.log('Response:', JSON.stringify(submitResult, null, 2));

    if (submitResult.success) {
      verificationId = submitResult.data.id;
      console.log(`✅ Verification submitted! ID: ${verificationId}`);
      console.log(`   Status: ${submitResult.data.status}`);
    } else {
      console.log(`⚠️  Submission result: ${submitResult.message}`);
    }

    // ========== STEP 4: Get Verification Status ==========
    console.log('\n📥 STEP 4: Getting verification status...');
    const statusResponse = await fetch(`${API_URL}/verification/pet/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const statusResult = await statusResponse.json();
    console.log('Status Response:', JSON.stringify(statusResult, null, 2));

    if (statusResult.success && statusResult.data.requests.length > 0) {
      const latest = statusResult.data.requests[0];
      console.log(`✅ Latest verification status: ${latest.status}`);
      if (latest.rejectionReason) {
        console.log(`   Rejection reason: ${latest.rejectionReason}`);
      }
    }

    // ========== STEP 5: Admin - Get Pending Requests ==========
    console.log('\n👑 STEP 5: Getting pending requests (as admin)...');
    const pendingResponse = await fetch(`${API_URL}/verification/pending`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const pendingResult = await pendingResponse.json();
    console.log('Pending Response:', JSON.stringify(pendingResult, null, 2));

    if (pendingResult.success && pendingResult.data.requests.length > 0) {
      console.log(`✅ Found ${pendingResult.data.requests.length} pending request(s)`);
      
      // ========== STEP 6a: Approve Verification ==========
      console.log('\n✅ STEP 6a: Approving verification...');
      const approveResponse = await fetch(
        `${API_URL}/verification/${verificationId}/approve`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${userToken}` },
        }
      );

      const approveResult = await approveResponse.json();
      console.log('Approve Response:', JSON.stringify(approveResult, null, 2));

      if (approveResult.success) {
        console.log('✅ Verification APPROVED! Pet is now verified.');
      } else {
        console.log(`⚠️  Approve result: ${approveResult.message}`);
        
        // If approve failed, try reject
        console.log('\n❌ STEP 6b: Trying to reject instead...');
        const rejectResponse = await fetch(
          `${API_URL}/verification/${verificationId}/reject`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reason: 'Test rejection - document quality check',
            }),
          }
        );

        const rejectResult = await rejectResponse.json();
        console.log('Reject Response:', JSON.stringify(rejectResult, null, 2));

        if (rejectResult.success) {
          console.log('✅ Verification REJECTED (as test).');
        }
      }
    } else {
      console.log('ℹ️  No pending requests found');
    }

    // ========== STEP 7: Verify Final Status ==========
    console.log('\n📊 STEP 7: Checking final pet status...');
    const finalPetResponse = await fetch(`${API_URL}/pets/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const finalPetResult = await finalPetResponse.json();
    if (finalPetResult.success) {
      console.log('Final Pet Status:');
      console.log(`   Name: ${finalPetResult.data.name}`);
      console.log(`   Is Verified: ${finalPetResult.data.isVerified}`);
      console.log(`   Vaccination Status: ${finalPetResult.data.vaccinationStatus}`);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✨ Verification API Test Complete!\n');
}

// Run the test
testVerificationFlow().catch(console.error);
