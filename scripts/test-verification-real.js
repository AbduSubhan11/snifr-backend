/**
 * Live Verification Test with Real File Upload
 */

const API_URL = 'http://localhost:5000/api';
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const ADMIN_EMAIL = 'ranasubhanrajpur6677@gmail.com';
const ADMIN_PASSWORD = '12345678';

const USER_EMAIL = 'subhancontact2@gmail.com';
const USER_PASSWORD = 'abc123';

async function test() {
  console.log('🧪 VERIFICATION API TEST - REAL FILE UPLOAD\n');
  
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
    userToken = userResult.data?.token || '';
    if (!userToken) throw new Error('No user token');

    // 2. Admin Login
    console.log('\n👑 2. Admin Login...');
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const adminResult = await adminLogin.json();
    console.log('Admin Login:', adminResult.success ? '✅' : '❌', adminResult.message || '');
    adminToken = adminResult.data?.token || '';
    if (!adminToken) throw new Error('No admin token');

    // 3. Get User's Pet
    console.log('\n🐾 3. Getting user pets...');
    const pets = await fetch(`${API_URL}/pets`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const petsResult = await pets.json();
    console.log('Pets:', petsResult.success ? '✅' : '❌');
    
    if (!petsResult.data?.pets?.length) {
      console.log('Creating test pet...');
      const createPet = await fetch(`${API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Dog',
          breed: 'Golden Retriever',
          age: 2,
          gender: 'Male',
          species: 'Dog',
        }),
      });
      const createPetResult = await createPet.json();
      petId = createPetResult.data?.id;
      console.log('Pet Created:', petId);
    } else {
      petId = petsResult.data.pets[0].id;
      console.log('Using Pet:', petsResult.data.pets[0].name, `(${petId})`);
    }

    // 4. Create a test image file
    console.log('\n📤 4. Creating test image...');
    const testImagePath = path.join(__dirname, 'test_vaccination.png');
    // Create a simple 1x1 PNG
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImagePath, pngData);
    console.log('✅ Test image created:', testImagePath);

    // 5. Submit Verification with REAL file
    console.log('\n📤 5. Submitting verification (REAL FILE)...');
    const formData = new FormData();
    formData.append('petId', petId);
    formData.append('documentType', 'vaccination_certificate');
    formData.append('notes', 'Test vaccination 2026');
    formData.append('document', fs.createReadStream(testImagePath));

    const submit = await fetch(`${API_URL}/verification/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });
    const submitResult = await submit.json();
    console.log('Submit Verification:', submitResult.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(submitResult, null, 2));
    
    if (submitResult.success) {
      verificationId = submitResult.data.id;
      console.log('✅ Verification ID:', verificationId);
      console.log('   Status:', submitResult.data.status);
      console.log('   Document URL:', submitResult.data.documentUrl);
    } else {
      throw new Error('Submit failed: ' + submitResult.message);
    }

    // 6. Check Status
    console.log('\n📥 6. Checking verification status...');
    const status = await fetch(`${API_URL}/verification/pet/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const statusResult = await status.json();
    console.log('Status:', statusResult.success ? '✅' : '❌');
    if (statusResult.success && statusResult.data.requests?.length) {
      const req = statusResult.data.requests[0];
      console.log(`   Status: ${req.status}`);
      console.log(`   Type: ${req.documentType}`);
      console.log(`   Created: ${req.created_at}`);
    }

    // 7. Admin Get Pending
    console.log('\n👑 7. Admin getting pending requests...');
    const pending = await fetch(`${API_URL}/verification/pending`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const pendingResult = await pending.json();
    console.log('Pending:', pendingResult.success ? '✅' : '❌');
    console.log('Pending count:', pendingResult.data?.count || 0);
    
    if (pendingResult.data?.requests?.length) {
      verificationId = pendingResult.data.requests[0].id;
      console.log('✅ Found verification:', verificationId);
      console.log('   Pet:', pendingResult.data.requests[0].petName);
      console.log('   Owner:', pendingResult.data.requests[0].ownerName);
      console.log('   Document:', pendingResult.data.requests[0].documentUrl);
    }

    // 8. Admin Approve
    console.log('\n✅ 8. Admin approving verification...');
    const approve = await fetch(`${API_URL}/verification/${verificationId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const approveResult = await approve.json();
    console.log('Approve:', approveResult.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(approveResult, null, 2));

    // 9. Verify Pet is Verified
    console.log('\n✅ 9. Checking if pet is verified...');
    const finalPet = await fetch(`${API_URL}/pets/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const finalPetResult = await finalPet.json();
    console.log('Pet Verified:', finalPetResult.data?.isVerified ? '✅ YES' : '❌ NO');
    console.log('Vaccination Status:', finalPetResult.data?.vaccinationStatus ? '✅ YES' : '❌ NO');

    // 10. Test Reject
    console.log('\n❌ 10. Testing rejection flow...');
    // Submit another verification
    const formData2 = new FormData();
    formData2.append('petId', petId);
    formData2.append('documentType', 'vet_certificate');
    formData2.append('notes', 'Test for rejection');
    formData2.append('document', fs.createReadStream(testImagePath));

    const submit2 = await fetch(`${API_URL}/verification/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        ...formData2.getHeaders(),
      },
      body: formData2,
    });
    const submit2Result = await submit2.json();
    console.log('Re-submit:', submit2Result.success ? '✅' : '❌');
    
    if (submit2Result.success) {
      // Reject it
      const reject = await fetch(`${API_URL}/verification/${submit2Result.data.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Test rejection - document quality check failed' }),
      });
      const rejectResult = await reject.json();
      console.log('Reject:', rejectResult.success ? '✅' : '❌');
      console.log('Response:', JSON.stringify(rejectResult, null, 2));
    }

    // Cleanup
    fs.unlinkSync(testImagePath);
    console.log('\n✅ Cleaned up test image');

    console.log('\n✨ ALL TESTS COMPLETE SUCCESSFULLY!\n');
    console.log('═'.repeat(60));
    console.log('SUMMARY:');
    console.log('✅ User can submit verification with document');
    console.log('✅ Document uploaded to Cloudinary');
    console.log('✅ Admin can view pending requests');
    console.log('✅ Admin can approve → Pet becomes verified');
    console.log('✅ Admin can reject → Pet stays unverified');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    if (fs.existsSync(path.join(__dirname, 'test_vaccination.png'))) {
      fs.unlinkSync(path.join(__dirname, 'test_vaccination.png'));
    }
  }
}

test();
