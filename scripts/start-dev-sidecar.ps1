$ErrorActionPreference = "Stop"

$root = "E:\Ninewood\dev-sidecar"
$guiDir = Join-Path $root "packages\gui"
$port = 31181

if (-not (Test-Path $guiDir)) {
  Write-Host "[ERROR] DevSidecar directory not found: $guiDir"
  exit 1
}

$isListening = (Test-NetConnection 127.0.0.1 -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
if ($isListening) {
  Write-Host "[INFO] DevSidecar seems already running (port $port is listening)."
  exit 0
}

Write-Host "[INFO] Starting DevSidecar..."
Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList "/c", "cd /d $root && npm run electron --prefix packages/gui"
Write-Host "[OK] Start command sent. Wait a few seconds for UI."
