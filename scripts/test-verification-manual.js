/**
 * Manual Verification API Testing Guide
 * Run these commands in terminal or Postman
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     PET VERIFICATION API - MANUAL TESTING GUIDE              ║
╚═══════════════════════════════════════════════════════════════╝

📋 STEP 1: LOGIN TO GET TOKEN
───────────────────────────────────────────────────────────────
Run this in your terminal (update email/password):

curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"ranasubhanrajput6677@gmail.com\",\"password\":\"YOUR_PASSWORD\"}"

Copy the token from response: data.token


📋 STEP 2: GET YOUR PETS
───────────────────────────────────────────────────────────────
curl -X GET http://localhost:5000/api/pets ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

Copy a pet ID from the response


📋 STEP 3: SUBMIT VERIFICATION (with image file)
───────────────────────────────────────────────────────────────
curl -X POST http://localhost:5000/api/verification/submit ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE" ^
  -F "petId=YOUR_PET_ID" ^
  -F "documentType=vaccination_certificate" ^
  -F "notes=Annual vaccination 2026" ^
  -F "document=@C:/path/to/your/vaccination_image.jpg"

Note: Replace C:/path/to/your/vaccination_image.jpg with actual image path
Or use Postman for easier file upload!


📋 STEP 4: CHECK VERIFICATION STATUS
───────────────────────────────────────────────────────────────
curl -X GET http://localhost:5000/api/verification/pet/YOUR_PET_ID ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

Expected response shows: status: "pending"


📋 STEP 5: ADMIN - GET PENDING REQUESTS
───────────────────────────────────────────────────────────────
(Only works if your account has is_admin = TRUE)

curl -X GET http://localhost:5000/api/verification/pending ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

Expected: List of pending verification requests


📋 STEP 6a: ADMIN APPROVE
───────────────────────────────────────────────────────────────
curl -X PATCH http://localhost:5000/api/verification/REQUEST_ID/approve ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

Expected: Pet is now verified!


📋 STEP 6b: ADMIN REJECT
───────────────────────────────────────────────────────────────
curl -X PATCH http://localhost:5000/api/verification/REQUEST_ID/reject ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"reason\":\"Document is unclear. Please upload better quality image.\"}"

Expected: Request rejected with reason


📋 STEP 7: VERIFY PET IS VERIFIED
───────────────────────────────────────────────────────────────
curl -X GET http://localhost:5000/api/pets/YOUR_PET_ID ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

Check: data.isVerified should be TRUE after approval


═══════════════════════════════════════════════════════════════
🔧 QUICK POSTMAN COLLECTION
═══════════════════════════════════════════════════════════════

1. POST {{API_URL}}/auth/login
   Body (JSON): { "email": "...", "password": "..." }
   → Save token from response

2. GET {{API_URL}}/pets
   Header: Authorization: Bearer {{TOKEN}}
   → Get pet ID

3. POST {{API_URL}}/verification/submit
   Header: Authorization: Bearer {{TOKEN}}
   Body (form-data):
     - petId: (text)
     - documentType: vaccination_certificate (text)
     - notes: (text)
     - document: (file) ← Select image file
   → Submit for verification

4. GET {{API_URL}}/verification/pet/:petId
   Header: Authorization: Bearer {{TOKEN}}
   → Check status

5. GET {{API_URL}}/verification/pending
   Header: Authorization: Bearer {{ADMIN_TOKEN}}
   → View all pending (admin only)

6. PATCH {{API_URL}}/verification/:id/approve
   Header: Authorization: Bearer {{ADMIN_TOKEN}}
   → Approve request

7. PATCH {{API_URL}}/verification/:id/reject
   Header: Authorization: Bearer {{ADMIN_TOKEN}}
   Body (JSON): { "reason": "..." }
   → Reject request


═══════════════════════════════════════════════════════════════
✅ TESTING CHECKLIST
═══════════════════════════════════════════════════════════════

□ Backend server running (http://localhost:5000/health)
□ User account created and logged in
□ Pet profile created
□ Verification submitted with document image
□ Status shows "pending" after submission
□ Admin can view pending requests
□ Admin can approve → pet becomes verified
□ Admin can reject → pet stays unverified
□ Verified badge shows in pet profile


═══════════════════════════════════════════════════════════════
🐛 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

"Invalid credentials" → Create account first via app or:
  POST /api/auth/register with email, password, fullName, phone

"Pet not found" → Create a pet first via app or:
  POST /api/pets with name, breed, age, gender, species

"Admin access required" → Run this SQL:
  UPDATE users SET is_admin = TRUE WHERE email = 'your@email.com';

"Document image required" → Ensure FormData has 'document' field
"File too large" → Image must be < 5MB
"Invalid file type" → Only jpeg, jpg, png, gif, webp allowed

`);
