@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev-sidecar.ps1"
set "CODE=%errorlevel%"

if not "%CODE%"=="0" (
  echo.
  echo [WARN] Launcher exited with code %CODE%.
  pause
)

exit /b %CODE%
