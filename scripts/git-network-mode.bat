@echo off
setlocal

set "PS_SCRIPT=%~dp0git-network-mode.ps1"

if not exist "%PS_SCRIPT%" (
  echo [ERROR] Missing script: %PS_SCRIPT%
  exit /b 1
)

if /I "%~1"=="dev" goto run_dev
if /I "%~1"=="backup" goto run_backup
if /I "%~1"=="direct" goto run_direct
if /I "%~1"=="status" goto run_status
if /I "%~1"=="test" goto run_test

:menu
cls
echo ==============================
echo Git Network Menu
echo ==============================
echo 1. DevSidecar mode (proxy)
echo 2. Backup proxy mode (custom port)
echo 3. Direct mode (clear proxy)
echo 4. Show current status
echo 5. Test GitHub connectivity
echo 0. Exit
echo.
set /p choice=Select [0-5]: 

if "%choice%"=="1" goto run_dev_pause
if "%choice%"=="2" goto run_backup_prompt
if "%choice%"=="3" goto run_direct_pause
if "%choice%"=="4" goto run_status_pause
if "%choice%"=="5" goto run_test_pause
if "%choice%"=="0" exit /b 0

echo.
echo [WARN] Invalid input.
timeout /t 1 >nul
goto menu

:run_dev
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -Mode dev
exit /b %errorlevel%

:run_backup
if "%~2"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -Mode backup -Port 7890
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -Mode backup -Port %~2
)
exit /b %errorlevel%

:run_direct
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -Mode direct
exit /b %errorlevel%

:run_status
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -Mode status
exit /b %errorlevel%

:run_test
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -Mode test
exit /b %errorlevel%

:run_dev_pause
call :run_dev
goto done

:run_backup_prompt
set "backup_port="
set /p backup_port=Backup proxy port [default 7890]: 
if "%backup_port%"=="" set "backup_port=7890"
call :run_backup dummy %backup_port%
goto done

:run_direct_pause
call :run_direct
goto done

:run_status_pause
call :run_status
goto done

:run_test_pause
call :run_test
goto done

:done
echo.
pause
exit /b %errorlevel%
