@echo off
echo ====================================
echo Creating Messages Table in Database
echo ====================================
echo.

cd /d "%~dp0.."

echo Running database migration...
echo.

node scripts/create-messages-table.js

echo.
echo ====================================
echo Migration Complete!
echo ====================================
pause
