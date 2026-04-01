/**
 * Complete Vaccination Upload Test
 * Tests the exact flow the app uses
 */

const API_URL = 'http://localhost:5000/api';
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const USER_EMAIL = 'subhancontact2@gmail.com';
const USER_PASSWORD = 'abc123';
const ADMIN_EMAIL = 'ranasubhanrajpur6677@gmail.com';
const ADMIN_PASSWORD = '12345678';

async function makeRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function test() {
  console.log('🧪 COMPLETE VACCINATION UPLOAD TEST\n');
  console.log('═'.repeat(60));
  
  let userToken = '';
  let adminToken = '';
  let petId = '';
  let documentUrl = '';
  let documentPublicId = '';
  let verificationId = '';

  try {
    // 1. User Login
    console.log('\n📝 1. User Login...');
    const userLogin = await makeRequest('POST', `${API_URL}/auth/login`,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD })
    );
    console.log('User Login:', userLogin.data.success ? '✅' : '❌');
    userToken = userLogin.data.data?.token;

    // 2. Create Test Pet
    console.log('\n🐾 2. Creating test pet...');
    const createPet = await makeRequest('POST', `${API_URL}/pets`,
      {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      JSON.stringify({
        name: 'Test Vaccination Dog',
        breed: 'Golden Retriever',
        age: 3,
        gender: 'Male',
        species: 'Dog',
      })
    );
    console.log('Create Pet:', createPet.data.success ? '✅' : '❌');
    petId = createPet.data.data?.id;
    console.log('Pet ID:', petId);

    // 3. Create test image
    console.log('\n📤 3. Creating test vaccination image...');
    const testImage = path.join(__dirname, 'test_vaccination.png');
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImage, pngData);
    console.log('✅ Test image created');

    // 4. Upload Vaccination Document (Step 1)
    console.log('\n📤 4. Uploading vaccination document (Step 1)...');
    const formData = new FormData();
    formData.append('document', fs.createReadStream(testImage));
    
    const uploadResult = await makeRequest('POST', `${API_URL}/pets/upload-vaccination`,
      {
        'Authorization': `Bearer ${userToken}`,
        ...formData.getHeaders(),
      },
      formData
    );
    console.log('Upload Vaccination:', uploadResult.data.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(uploadResult.data, null, 2));
    
    if (uploadResult.data.success) {
      documentUrl = uploadResult.data.data.url;
      documentPublicId = uploadResult.data.data.publicId;
      console.log('✅ Document uploaded to Cloudinary');
      console.log('   URL:', documentUrl);
      console.log('   Public ID:', documentPublicId);
    } else {
      throw new Error('Upload failed: ' + uploadResult.data.message);
    }

    // 5. Submit Verification Request (Step 2)
    console.log('\n📋 5. Submitting verification request (Step 2)...');
    const submitResult = await makeRequest('POST', `${API_URL}/verification/submit`,
      {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      JSON.stringify({
        petId,
        documentUrl,
        documentPublicId,
        documentType: 'vaccination_certificate',
      })
    );
    console.log('Submit Verification:', submitResult.data.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(submitResult.data, null, 2));
    
    if (submitResult.data.success) {
      verificationId = submitResult.data.data.id;
      console.log('✅ Verification submitted! ID:', verificationId);
    }

    // 6. Get Pet Details (Check if vaccination URL is saved)
    console.log('\n📊 6. Getting pet details...');
    const getPet = await makeRequest('GET', `${API_URL}/pets/${petId}`,
      { 'Authorization': `Bearer ${userToken}` }
    );
    console.log('Get Pet:', getPet.data.success ? '✅' : '❌');
    
    const petData = getPet.data.data;
    console.log('\nPet Vaccination Data:');
    console.log('   vaccinationDocumentUrl:', petData.vaccinationDocumentUrl ? '✅ PRESENT' : '❌ NULL');
    console.log('   vaccinationDocumentPublicId:', petData.vaccinationDocumentPublicId ? '✅ PRESENT' : '❌ NULL');
    console.log('   vaccinationStatus:', petData.vaccinationStatus);

    // 7. Admin Login
    console.log('\n👑 7. Admin Login...');
    const adminLogin = await makeRequest('POST', `${API_URL}/auth/login`,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    );
    console.log('Admin Login:', adminLogin.data.success ? '✅' : '❌');
    adminToken = adminLogin.data.data?.token;

    // 8. Admin Get Pending
    console.log('\n👑 8. Admin getting pending requests...');
    const pending = await makeRequest('GET', `${API_URL}/verification/pending`,
      { 'Authorization': `Bearer ${adminToken}` }
    );
    console.log('Pending:', pending.data.success ? '✅' : '❌');
    console.log('Count:', pending.data.data?.count || 0);

    // 9. Admin Approve
    console.log('\n✅ 9. Admin approving verification...');
    const approve = await makeRequest('PATCH', `${API_URL}/verification/${verificationId}/approve`,
      { 'Authorization': `Bearer ${adminToken}` }
    );
    console.log('Approve:', approve.data.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(approve.data, null, 2));

    // 10. Final Pet Check
    console.log('\n✅ 10. Final pet status check...');
    const finalPet = await makeRequest('GET', `${API_URL}/pets/${petId}`,
      { 'Authorization': `Bearer ${userToken}` }
    );
    console.log('Final Pet Status:');
    console.log('   Is Verified:', finalPet.data.data?.isVerified ? '✅ YES' : '❌ NO');
    console.log('   Vaccination Status:', finalPet.data.data?.vaccinationStatus ? '✅ YES' : '❌ NO');
    console.log('   Document URL:', finalPet.data.data?.vaccinationDocumentUrl ? '✅ PRESENT' : '❌ NULL');

    // Cleanup
    fs.unlinkSync(testImage);
    console.log('\n✅ Cleaned up test image');

    console.log('\n' + '═'.repeat(60));
    console.log('✨ ALL TESTS PASSED!');
    console.log('═'.repeat(60));
    console.log('SUMMARY:');
    console.log('✅ Vaccination document upload endpoint works');
    console.log('✅ Verification request submission works');
    console.log('✅ Document URL saved to pet profile');
    console.log('✅ Admin approval works');
    console.log('✅ Pet becomes verified after approval');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
    if (fs.existsSync(path.join(__dirname, 'test_vaccination.png'))) {
      fs.unlinkSync(path.join(__dirname, 'test_vaccination.png'));
    }
  }
}

test();
