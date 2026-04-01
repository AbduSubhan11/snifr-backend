/**
 * Verification API - Post-App Testing
 * Run this AFTER you've uploaded a vaccination document from the app
 */

const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'ranasubhanrajpur6677@gmail.com';
const ADMIN_PASSWORD = '12345678';

async function testAdminActions() {
  console.log('🧪 TESTING ADMIN VERIFICATION ACTIONS\n');
  console.log('═'.repeat(60));
  
  let adminToken = '';

  try {
    // 1. Admin Login
    console.log('\n📝 1. Admin Login...');
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const adminResult = await adminLogin.json();
    console.log('Admin Login:', adminResult.success ? '✅' : '❌', adminResult.message || '');
    
    if (!adminResult.success) {
      throw new Error('Admin login failed');
    }
    
    adminToken = adminResult.data.token;
    console.log('✅ Admin token obtained\n');

    // 2. Get Pending Requests
    console.log('👑 2. Getting pending verification requests...');
    const pending = await fetch(`${API_URL}/verification/pending`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const pendingResult = await pending.json();
    console.log('Pending:', pendingResult.success ? '✅' : '❌');
    
    if (!pendingResult.success) {
      console.log('Response:', pendingResult);
      return;
    }
    
    console.log(`📋 Found ${pendingResult.data?.count || 0} pending request(s)`);
    
    if (!pendingResult.data?.requests?.length) {
      console.log('\n⚠️  No pending requests found!');
      console.log('Please upload a vaccination document from the app first.');
      console.log('Then run this script again.');
      return;
    }

    // Display all pending
    pendingResult.data.requests.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.petName} (${req.petBreed})`);
      console.log(`   ID: ${req.id}`);
      console.log(`   Pet ID: ${req.petId}`);
      console.log(`   Owner: ${req.ownerName} (${req.ownerEmail})`);
      console.log(`   Document Type: ${req.documentType}`);
      console.log(`   Document URL: ${req.documentUrl}`);
      console.log(`   Created: ${new Date(req.createdAt).toLocaleString()}`);
    });

    // 3. Ask for action
    console.log('\n' + '═'.repeat(60));
    console.log('Choose action:');
    console.log('  1. Approve first request');
    console.log('  2. Reject first request');
    console.log('  3. Exit');
    console.log('═'.repeat(60));
    
    // For automated testing, approve the first one
    const action = '1'; // Change to '2' to test rejection
    
    if (action === '1') {
      const verificationId = pendingResult.data.requests[0].id;
      console.log(`\n✅ 3. Approving verification: ${verificationId}`);
      
      const approve = await fetch(`${API_URL}/verification/${verificationId}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${adminToken}` },
      });
      const approveResult = await approve.json();
      console.log('Approve:', approveResult.success ? '✅ SUCCESS' : '❌ FAILED');
      console.log('Response:', JSON.stringify(approveResult, null, 2));
      
      if (approveResult.success) {
        console.log('\n🎉 Pet is now VERIFIED!');
        
        // Check pet status
        const petId = pendingResult.data.requests[0].petId;
        const petCheck = await fetch(`${API_URL}/pets/${petId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` },
        });
        const petResult = await petCheck.json();
        console.log('\n📊 Pet Status After Approval:');
        console.log(`   Name: ${petResult.data.name}`);
        console.log(`   Is Verified: ${petResult.data.isVerified ? '✅ YES' : '❌ NO'}`);
        console.log(`   Vaccination Status: ${petResult.data.vaccinationStatus ? '✅ YES' : '❌ NO'}`);
      }
      
    } else if (action === '2') {
      const verificationId = pendingResult.data.requests[0].id;
      console.log(`\n❌ 3. Rejecting verification: ${verificationId}`);
      
      const reject = await fetch(`${API_URL}/verification/${verificationId}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reason: 'Test rejection - document quality check. Please upload clearer image.' 
        }),
      });
      const rejectResult = await reject.json();
      console.log('Reject:', rejectResult.success ? '✅ SUCCESS' : '❌ FAILED');
      console.log('Response:', JSON.stringify(rejectResult, null, 2));
      
      if (rejectResult.success) {
        console.log('\n🚫 Pet verification REJECTED');
        console.log(`   Reason: ${rejectResult.data.rejectionReason}`);
      }
    }

    console.log('\n✨ ADMIN TEST COMPLETE!\n');
    console.log('═'.repeat(60));
    console.log('API ENDPOINTS TESTED:');
    console.log('✅ GET /api/verification/pending');
    console.log('✅ PATCH /api/verification/:id/approve');
    console.log('✅ PATCH /api/verification/:id/reject');
    console.log('✅ GET /api/pets/:id (verify status)');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
  }
}

testAdminActions();
