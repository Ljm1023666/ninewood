@echo off
cd /d E:\Ninewood

echo Starting Ninewood Server...
start "Ninewood-Server" cmd /c "npm run dev -w server"

echo Starting Ninewood Client...
start "Ninewood-Client" cmd /c "npm run dev -w client-react"

echo Waiting for services to start...
timeout /t 8 /nobreak >nul

echo Starting Electron...
start "Ninewood-Electron" cmd /c "node scripts/electron-dev.mjs"

echo.
echo Ninewood running:
echo   Server : http://localhost:3001
echo   Client : http://localhost:5174
echo.
echo Close this window when done.
pause
