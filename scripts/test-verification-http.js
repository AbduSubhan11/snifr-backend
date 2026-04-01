/**
 * Verification API Test using native Node.js http
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'ranasubhanrajpur6677@gmail.com';
const ADMIN_PASSWORD = '12345678';
const USER_EMAIL = 'subhancontact2@gmail.com';
const USER_PASSWORD = 'abc123';

function makeRequest(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
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
  console.log('🧪 VERIFICATION API TEST\n');
  
  let userToken = '';
  let adminToken = '';
  let petId = '';
  let verificationId = '';

  try {
    // 1. User Login
    console.log('📝 1. User Login...');
    const userLogin = await makeRequest('POST', `${API_URL}/api/auth/login`, 
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD })
    );
    console.log('User Login:', userLogin.data.success ? '✅' : '❌', userLogin.data.message || '');
    userToken = userLogin.data.data?.token;

    // 2. Admin Login
    console.log('\n👑 2. Admin Login...');
    const adminLogin = await makeRequest('POST', `${API_URL}/api/auth/login`,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    );
    console.log('Admin Login:', adminLogin.data.success ? '✅' : '❌', adminLogin.data.message || '');
    adminToken = adminLogin.data.data?.token;

    // 3. Get Pets
    console.log('\n🐾 3. Getting pets...');
    const pets = await makeRequest('GET', `${API_URL}/api/pets`,
      { 'Authorization': `Bearer ${userToken}` }
    );
    console.log('Pets:', pets.data.success ? '✅' : '❌');
    if (pets.data.data?.pets?.length) {
      petId = pets.data.data.pets[0].id;
      console.log('Using Pet:', pets.data.data.pets[0].name, `(${petId})`);
    }

    // 4. Create test image
    console.log('\n📤 4. Creating test image...');
    const testImage = path.join(__dirname, 'test_doc.png');
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(testImage, pngData);

    // 5. Submit verification using multipart
    console.log('\n📤 5. Submitting verification...');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
    const formData = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="petId"',
      '',
      petId,
      `--${boundary}`,
      'Content-Disposition: form-data; name="documentType"',
      '',
      'vaccination_certificate',
      `--${boundary}`,
      'Content-Disposition: form-data; name="notes"',
      '',
      'Test vaccination',
      `--${boundary}`,
      `Content-Disposition: form-data; name="document"; filename="test.png"`,
      'Content-Type: image/png',
      '',
      pngData.toString('base64'),
      `--${boundary}--`,
    ].join('\r\n');

    // Decode base64 back to binary for the image part
    const formDataBuffer = Buffer.from(formData.replace(pngData.toString('base64'), pngData.toString('binary')), 'binary');

    const submit = await makeRequest('POST', `${API_URL}/api/verification/submit`,
      {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      formDataBuffer
    );
    console.log('Submit:', submit.data.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(submit.data, null, 2));
    
    if (submit.data.success) {
      verificationId = submit.data.data.id;
    }

    // 6. Get Status
    console.log('\n📥 6. Getting status...');
    const status = await makeRequest('GET', `${API_URL}/api/verification/pet/${petId}`,
      { 'Authorization': `Bearer ${userToken}` }
    );
    console.log('Status:', status.data.success ? '✅' : '❌');

    // 7. Admin Get Pending
    console.log('\n👑 7. Admin pending requests...');
    const pending = await makeRequest('GET', `${API_URL}/api/verification/pending`,
      { 'Authorization': `Bearer ${adminToken}` }
    );
    console.log('Pending:', pending.data.success ? '✅' : '❌');
    console.log('Count:', pending.data.data?.count || 0);

    // 8. Approve
    console.log('\n✅ 8. Approving verification...');
    const approve = await makeRequest('PATCH', `${API_URL}/api/verification/${verificationId}/approve`,
      { 'Authorization': `Bearer ${adminToken}` }
    );
    console.log('Approve:', approve.data.success ? '✅' : '❌');
    console.log('Response:', JSON.stringify(approve.data, null, 2));

    // 9. Check final status
    console.log('\n✅ 9. Final pet status...');
    const finalPet = await makeRequest('GET', `${API_URL}/api/pets/${petId}`,
      { 'Authorization': `Bearer ${userToken}` }
    );
    console.log('Pet Verified:', finalPet.data.data?.isVerified ? '✅ YES' : '❌ NO');

    // Cleanup
    fs.unlinkSync(testImage);
    console.log('\n✨ TEST COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

test();
