@echo off
cd /d "%~dp0refrigerator"
echo MONO 120 - http://localhost:3000/
call npm run dev -- --host 127.0.0.1
pause
