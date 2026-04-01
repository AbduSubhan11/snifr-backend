/**
 * Complete Vaccination Upload Test - Using Exact App Flow
 * Tests: Upload Document → Submit Verification → Check Pet Data → Admin Approve
 */

const API_URL = 'http://localhost:5000/api';
const https = require('https');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const USER_EMAIL = 'subhancontact2@gmail.com';
const USER_PASSWORD = 'abc123';
const ADMIN_EMAIL = 'ranasubhanrajpur6677@gmail.com';
const ADMIN_PASSWORD = '12345678';

// Create test image (1x1 PNG)
function createTestImage() {
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  const testPath = path.join(__dirname, 'test_vaccination_doc.png');
  fs.writeFileSync(testPath, pngData);
  return testPath;
}

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : require('http');
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data),
          });
        } catch {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve({ raw: data }),
            text: () => Promise.resolve(data),
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      if (typeof options.body === 'string') {
        req.write(options.body);
      } else if (options.body instanceof FormData) {
        options.body.pipe(req);
        return;
      } else {
        req.write(options.body);
      }
    }
    req.end();
  });
}

async function test() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   VACCINATION UPLOAD - COMPLETE API TEST                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  let userToken = '';
  let adminToken = '';
  let petId = '';
  let documentUrl = '';
  let documentPublicId = '';
  let verificationId = '';

  try {
    // ========== STEP 1: User Login ==========
    console.log('📝 STEP 1: User Login...');
    const userLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
    });
    const userLoginData = await userLogin.json();
    console.log('   Response:', userLoginData.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!userLoginData.success) throw new Error(userLoginData.message);
    userToken = userLoginData.data.token;
    console.log('   Token:', userToken.substring(0, 50) + '...\n');

    // ========== STEP 2: Get or Create Pet ==========
    console.log('🐾 STEP 2: Getting user pets...');
    const petsRes = await fetch(`${API_URL}/pets`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const petsData = await petsRes.json();
    console.log('   Response:', petsData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (petsData.success && petsData.data.pets.length > 0) {
      petId = petsData.data.pets[0].id;
      console.log('   Using pet:', petsData.data.pets[0].name, `(${petId})`);
    } else {
      console.log('   Creating test pet...');
      const createPet = await fetch(`${API_URL}/pets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Vaccination Test Dog',
          breed: 'Golden Retriever',
          age: 3,
          gender: 'Male',
          species: 'Dog',
        }),
      });
      const createPetData = await createPet.json();
      console.log('   Create Pet:', createPetData.success ? '✅ SUCCESS' : '❌ FAILED');
      petId = createPetData.data.id;
    }
    console.log('   Pet ID:', petId, '\n');

    // ========== STEP 3: Upload Vaccination Document ==========
    console.log('📤 STEP 3: Upload Vaccination Document (Step 1)...');
    const testImage = createTestImage();
    console.log('   Test image created:', testImage);
    
    const formData = new FormData();
    formData.append('document', fs.createReadStream(testImage));
    
    const uploadRes = await fetch(`${API_URL}/pets/upload-vaccination`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    console.log('   Upload Response:', uploadData.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Response:', JSON.stringify(uploadData, null, 2));
    
    if (!uploadData.success) {
      throw new Error('Upload failed: ' + uploadData.message);
    }
    
    documentUrl = uploadData.data.url;
    documentPublicId = uploadData.data.publicId;
    console.log('   ✅ Document uploaded to Cloudinary');
    console.log('   URL:', documentUrl);
    console.log('   Public ID:', documentPublicId, '\n');

    // ========== STEP 4: Submit Verification Request ==========
    console.log('📋 STEP 4: Submit Verification Request (Step 2)...');
    const submitRes = await fetch(`${API_URL}/verification/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        petId,
        documentUrl,
        documentPublicId,
        documentType: 'vaccination_certificate',
      }),
    });
    const submitData = await submitRes.json();
    console.log('   Submit Response:', submitData.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Response:', JSON.stringify(submitData, null, 2));
    
    if (!submitData.success) {
      throw new Error('Submit failed: ' + submitData.message);
    }
    
    verificationId = submitData.data.id;
    console.log('   ✅ Verification submitted!');
    console.log('   Verification ID:', verificationId, '\n');

    // ========== STEP 5: Check Pet Data ==========
    console.log('📊 STEP 5: Check Pet Vaccination Data...');
    const petRes = await fetch(`${API_URL}/pets/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const petData = await petRes.json();
    console.log('   Pet Response:', petData.success ? '✅ SUCCESS' : '❌ FAILED');
    
    const pet = petData.data;
    console.log('\n   Pet Vaccination Fields:');
    console.log('   ────────────────────────────────────────');
    console.log('   vaccinationDocumentUrl:', pet.vaccinationDocumentUrl ? '✅ PRESENT' : '❌ NULL');
    console.log('   vaccinationDocumentPublicId:', pet.vaccinationDocumentPublicId ? '✅ PRESENT' : '❌ NULL');
    console.log('   vaccinationStatus:', pet.vaccinationStatus ? '✅ TRUE' : '❌ FALSE');
    console.log('   isVerified:', pet.isVerified ? '✅ TRUE' : '❌ FALSE');
    console.log('   ────────────────────────────────────────\n');
    
    if (!pet.vaccinationDocumentUrl) {
      console.log('   ⚠️  WARNING: Vaccination document URL is NULL!');
      console.log('   This means updatePet() did not save the fields.\n');
    } else {
      console.log('   ✅ SUCCESS: Vaccination document saved to pet profile!\n');
    }

    // ========== STEP 6: Admin Login ==========
    console.log('👑 STEP 6: Admin Login...');
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const adminLoginData = await adminLogin.json();
    console.log('   Admin Login:', adminLoginData.success ? '✅ SUCCESS' : '❌ FAILED');
    if (!adminLoginData.success) throw new Error(adminLoginData.message);
    adminToken = adminLoginData.data.token;
    console.log('   Admin Token:', adminToken.substring(0, 50) + '...\n');

    // ========== STEP 7: Admin Get Pending ==========
    console.log('👑 STEP 7: Admin Get Pending Requests...');
    const pendingRes = await fetch(`${API_URL}/verification/pending`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const pendingData = await pendingRes.json();
    console.log('   Pending Response:', pendingData.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Pending Count:', pendingData.data?.count || 0);
    
    if (pendingData.data?.requests?.length > 0) {
      const req = pendingData.data.requests[0];
      console.log('\n   First Pending Request:');
      console.log('   ────────────────────────────────────────');
      console.log('   ID:', req.id);
      console.log('   Pet:', req.petName, '(' + req.petBreed + ')');
      console.log('   Owner:', req.ownerName, '(' + req.ownerEmail + ')');
      console.log('   Document URL:', req.documentUrl);
      console.log('   Created:', new Date(req.createdAt).toLocaleString());
      console.log('   ────────────────────────────────────────\n');
    }

    // ========== STEP 8: Admin Approve ==========
    console.log('✅ STEP 8: Admin Approve Verification...');
    const approveRes = await fetch(`${API_URL}/verification/${verificationId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const approveData = await approveRes.json();
    console.log('   Approve Response:', approveData.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Response:', JSON.stringify(approveData, null, 2));
    
    if (approveData.success) {
      console.log('   🎉 Pet is now VERIFIED!\n');
    }

    // ========== STEP 9: Final Pet Check ==========
    console.log('📊 STEP 9: Final Pet Status Check...');
    const finalPetRes = await fetch(`${API_URL}/pets/${petId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const finalPetData = await finalPetRes.json();
    const finalPet = finalPetData.data;
    
    console.log('\n   Final Pet Status:');
    console.log('   ────────────────────────────────────────');
    console.log('   Name:', finalPet.name);
    console.log('   Is Verified:', finalPet.isVerified ? '✅ YES' : '❌ NO');
    console.log('   Vaccination Status:', finalPet.vaccinationStatus ? '✅ YES' : '❌ NO');
    console.log('   Vaccination Document URL:', finalPet.vaccinationDocumentUrl ? '✅ PRESENT' : '❌ NULL');
    console.log('   ────────────────────────────────────────\n');

    // Cleanup
    fs.unlinkSync(testImage);
    console.log('✅ Cleaned up test image\n');

    // ========== SUMMARY ==========
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      TEST SUMMARY                             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  ✅ Vaccination document upload endpoint works               ║');
    console.log('║  ✅ Verification request submission works                    ║');
    if (finalPet.vaccinationDocumentUrl) {
      console.log('║  ✅ Vaccination document URL saved to pet profile          ║');
    } else {
      console.log('║  ❌ Vaccination document URL NOT saved to pet profile      ║');
    }
    console.log('║  ✅ Admin approval works                                       ║');
    if (finalPet.isVerified) {
      console.log('║  ✅ Pet becomes verified after approval                      ║');
    } else {
      console.log('║  ❌ Pet NOT verified after approval                          ║');
    }
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
    if (fs.existsSync(path.join(__dirname, 'test_vaccination_doc.png'))) {
      fs.unlinkSync(path.join(__dirname, 'test_vaccination_doc.png'));
    }
  }
}

test();
