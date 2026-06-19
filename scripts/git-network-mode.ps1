param(
  [ValidateSet("dev", "backup", "direct", "status", "test")]
  [string]$Mode = "status",

  [int]$Port = 31181
)

$ErrorActionPreference = "Stop"
$proxy = "http://127.0.0.1:$Port"

function Write-Info([string]$msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "[ OK ] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

function Show-Status {
  $httpProxy = git config --global --get http.proxy
  $httpsProxy = git config --global --get https.proxy
  $sslBackend = git config --global --get http.sslBackend
  $checkRevoke = git config --global --get http.schannelCheckRevoke
  $httpVersion = git config --global --get http.version

  Write-Host ""
  Write-Info "Current Git network config:"
  Write-Host "http.proxy               = $httpProxy"
  Write-Host "https.proxy              = $httpsProxy"
  Write-Host "http.sslBackend          = $sslBackend"
  Write-Host "http.schannelCheckRevoke = $checkRevoke"
  Write-Host "http.version             = $httpVersion"
  Write-Host ""
}

function Test-GitHub {
  Write-Info "Testing GitHub connectivity..."
  git ls-remote https://github.com/git/git.git HEAD
  Write-Ok "GitHub is reachable."
}

switch ($Mode) {
  'dev' {
    Write-Info "Switch to DevSidecar mode: $proxy"

    $portOpen = (Test-NetConnection 127.0.0.1 -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
    if (-not $portOpen) {
      Write-Warn "Port $Port is not listening. Start DevSidecar first."
    }

    git config --global http.proxy $proxy
    git config --global https.proxy $proxy
    git config --global http.sslBackend schannel
    git config --global http.schannelCheckRevoke false
    git config --global http.version HTTP/1.1

    Write-Ok "Applied DevSidecar network config."
    Show-Status
  }
  'backup' {
    Write-Info "Switch to backup proxy mode: $proxy"

    $portOpen = (Test-NetConnection 127.0.0.1 -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
    if (-not $portOpen) {
      Write-Warn "Port $Port is not listening. Ensure your backup proxy is running."
    }

    git config --global http.proxy $proxy
    git config --global https.proxy $proxy
    git config --global http.sslBackend schannel
    git config --global http.schannelCheckRevoke false
    git config --global http.version HTTP/1.1

    Write-Ok "Applied backup proxy network config."
    Show-Status
  }
  'direct' {
    Write-Info "Switch to direct mode (clear proxy overrides)."

    git config --global --unset http.proxy 2>$null
    git config --global --unset https.proxy 2>$null
    git config --global --unset http.sslBackend 2>$null
    git config --global --unset http.schannelCheckRevoke 2>$null
    git config --global --unset http.version 2>$null

    Write-Ok "Cleared proxy and compatibility overrides."
    Show-Status
  }
  'status' {
    Show-Status
  }
  'test' {
    Show-Status
    Test-GitHub
  }
}
