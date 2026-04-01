@echo off
echo =====================================================
echo  VERIFICATION API TEST - CURL COMMANDS
echo =====================================================
echo.

REM Set variables
set API_URL=http://localhost:5000/api
set USER_EMAIL=subhancontact2@gmail.com
set USER_PASSWORD=abc123
set ADMIN_EMAIL=ranasubhanrajpur6677@gmail.com
set ADMIN_PASSWORD=12345678

echo Step 1: User Login...
curl -X POST %API_URL%/auth/login -H "Content-Type: application/json" -d "{\"email\":\"%USER_EMAIL%\",\"password\":\"%USER_PASSWORD%\"}" > %TEMP%\user_login.json
type %TEMP%\user_login.json
echo.

REM Extract token (you'll need to copy it manually)
echo ^>^>^> Copy the token from "data.token" field above
echo.

pause

echo Step 2: Admin Login...
curl -X POST %API_URL%/auth/login -H "Content-Type: application/json" -d "{\"email\":\"%ADMIN_EMAIL%\",\"password\":\"%ADMIN_PASSWORD%\"}" > %TEMP%\admin_login.json
type %TEMP%\admin_login.json
echo.

echo ^>^>^> Copy the admin token from "data.token" field above
echo.

pause

echo Step 3: Get User Pets...
set /p USER_TOKEN="Enter User Token: "
curl -X GET %API_URL%/pets -H "Authorization: Bearer %USER_TOKEN%"
echo.

echo ^>^>^> Copy a pet ID from the response
echo.

pause

echo Step 4: Submit Verification...
set /p PET_ID="Enter Pet ID: "
curl -X POST %API_URL%/verification/submit -H "Authorization: Bearer %USER_TOKEN%" -F "petId=%PET_ID%" -F "documentType=vaccination_certificate" -F "notes=Test vaccination 2026" -F "document=@%TEMP%\test_vaccination.png"
echo.

echo Step 5: Check Status...
curl -X GET %API_URL%/verification/pet/%PET_ID% -H "Authorization: Bearer %USER_TOKEN%"
echo.

echo Step 6: Admin Get Pending...
set /p ADMIN_TOKEN="Enter Admin Token: "
curl -X GET %API_URL%/verification/pending -H "Authorization: Bearer %ADMIN_TOKEN%"
echo.

echo Step 7: Approve Verification...
set /p VERIFICATION_ID="Enter Verification ID: "
curl -X PATCH %API_URL%/verification/%VERIFICATION_ID%/approve -H "Authorization: Bearer %ADMIN_TOKEN%"
echo.

echo Step 8: Reject Verification (test)...
curl -X POST %API_URL%/verification/submit -H "Authorization: Bearer %USER_TOKEN%" -F "petId=%PET_ID%" -F "documentType=vet_certificate" -F "notes=Test for rejection" -F "document=@%TEMP%\test_vaccination.png"
echo.

set /p VERIFICATION_ID_2="Enter New Verification ID: "
curl -X PATCH %API_URL%/verification/%VERIFICATION_ID_2%/reject -H "Authorization: Bearer %ADMIN_TOKEN%" -H "Content-Type: application/json" -d "{\"reason\":\"Test rejection - quality check\"}"
echo.

echo =====================================================
echo  TEST COMPLETE!
echo =====================================================
pause
