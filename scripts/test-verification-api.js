/**
 * Test script for Verification API
 * Run after logging in to get a token
 */

const API_URL = 'http://localhost:5000/api';

// Replace with your actual token after login
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE';
const PET_ID = 'YOUR_PET_ID_HERE';

async function testVerificationAPI() {
  console.log('🧪 Testing Verification API...\n');

  // Test 1: Submit verification request
  console.log('📤 Test 1: Submitting verification request...');
  
  // You would need to create a real FormData request with an actual image file
  // This is a placeholder for manual testing
  
  console.log('To test manually:');
  console.log(`1. POST ${API_URL}/verification/submit`);
  console.log('   Headers: Authorization: Bearer <token>');
  console.log('   Body: FormData with petId, documentType, document (image file)');
  console.log('');

  // Test 2: Get verification requests
  console.log('📥 Test 2: Get pet verification requests...');
  try {
    const response = await fetch(`${API_URL}/verification/pet/${PET_ID}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    });
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');

  // Test 3: Get pending requests (Admin only)
  console.log('👑 Test 3: Get pending verification requests (Admin)...');
  try {
    const response = await fetch(`${API_URL}/verification/pending`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    });
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('');

  // Test 4: Approve verification (Admin only)
  console.log('✅ Test 4: Approve verification request (Admin)...');
  console.log(`PATCH ${API_URL}/verification/:id/approve`);
  console.log('Headers: Authorization: Bearer <admin-token>');
  console.log('');

  // Test 5: Reject verification (Admin only)
  console.log('❌ Test 5: Reject verification request (Admin)...');
  console.log(`PATCH ${API_URL}/verification/:id/reject`);
  console.log('Headers: Authorization: Bearer <admin-token>');
  console.log('Body: { reason: "Document unclear" }');
  console.log('');

  console.log('✨ Manual testing required for file upload!');
}

testVerificationAPI();
