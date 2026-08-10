# ═══════════════════════════════════════════════════════════════
# FastFree — Deploy to VM
# ═══════════════════════════════════════════════════════════════
# Run from PowerShell:
#   .\04_deploy.ps1
#   .\04_deploy.ps1 -Host 10.0.0.1
# ═══════════════════════════════════════════════════════════════

param(
    [string]$VmHost = "dev.local",
    [string]$User = "root",
    [string]$Pass = "fastfree@2026"
)

$ErrorActionPreference = "Stop"
$REPO = "D:\2026\fastfree\dev\fastfree_os"
$WSL = "fastfree"
$LOG_DIR = "$PSScriptRoot\logs"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE = "$LOG_DIR\deploy_$TIMESTAMP.log"

# ── Helpers ────────────────────────────────────────────────────
function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor DarkGray
    "[$ts] $msg" | Out-File -Append $LOG_FILE
}
function Ok($msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
    "  ✓ $msg" | Out-File -Append $LOG_FILE
}
function Fail($msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
    "  ✗ $msg" | Out-File -Append $LOG_FILE
}
function Warn($msg) {
    Write-Host "  ⚠ $msg" -ForegroundColor Yellow
    "  ⚠ $msg" | Out-File -Append $LOG_FILE
}
function Header($msg) {
    Write-Host ""
    Write-Host "═══ $msg ═══" -ForegroundColor Cyan
    "═══ $msg ═══" | Out-File -Append $LOG_FILE
}
function SSH-Cmd($cmd) {
    $result = sshpass -p $Pass ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $User@$VmHost $cmd 2>&1
    return $result
}
function SCP-File($local, $remote) {
    sshpass -p $Pass scp -o StrictHostKeyChecking=no $local "${User}@${VmHost}:${remote}" 2>&1
}
function SCP-Dir($local, $remote) {
    sshpass -p $Pass scp -o StrictHostKeyChecking=no -r $local "${User}@${VmHost}:${remote}" 2>&1
}

# ── Check sshpass ──────────────────────────────────────────────
if (!(Get-Command sshpass -ErrorAction SilentlyContinue)) {
    Write-Host "sshpass not found!" -ForegroundColor Red
    Write-Host "Install: nix-env -iA nixos.sshpass" -ForegroundColor Yellow
    exit 1
}

# ── Setup ──────────────────────────────────────────────────────
if (!(Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  FastFree — Deploy to VM" -ForegroundColor Cyan
Write-Host "  $(Get-Date)" -ForegroundColor DarkGray
Write-Host "  Host: $VmHost" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Check Connection
# ═══════════════════════════════════════════════════════════════
Header "STEP 1/4: Check Connection"

$conn = SSH-Cmd "echo OK"
if ($conn -match "OK") {
    Ok "SSH connection successful"
} else {
    Fail "Cannot connect to $VmHost"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: Sync Files
# ═══════════════════════════════════════════════════════════════
Header "STEP 2/4: Sync Files"

# Ensure destination directories exist
$mkdir = SSH-Cmd "mkdir -p /etc/fastfree"
$mkdir | Out-File -Append $LOG_FILE

$synced = 0
$failed = 0

# 1. Sync flake.nix
$flakeNix = Join-Path $REPO "flake.nix"
if (Test-Path $flakeNix) {
    SCP-File $flakeNix "/etc/fastfree/flake.nix" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Ok "flake.nix"
        $synced++
    } else {
        Fail "flake.nix"
        $failed++
    }
}

# 2. Sync flake.lock (if exists)
$flakeLock = Join-Path $REPO "flake.lock"
if (Test-Path $flakeLock) {
    SCP-File $flakeLock "/etc/fastfree/flake.lock" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Ok "flake.lock"
        $synced++
    } else {
        Fail "flake.lock"
        $failed++
    }
}

# 3. Sync nix directory recursively
$nixDir = Join-Path $REPO "nix"
if (Test-Path $nixDir) {
    SCP-Dir $nixDir "/etc/fastfree/" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Ok "nix/ directory recursively"
        $synced++
    } else {
        Fail "nix/ directory recursively"
        $failed++
    }
}

Log "Synced: $synced | Failed: $failed"

# ═══════════════════════════════════════════════════════════════
# STEP 3: Commit + Rebuild
# ═══════════════════════════════════════════════════════════════
Header "STEP 3/4: Commit + Rebuild"

Log "Committing changes on VM..."
SSH-Cmd "cd /etc/fastfree && git add -A && git commit -m 'deploy: $(Get-Date -Format yyyy-MM-dd_HH:mm)' --allow-empty" | Out-File -Append $LOG_FILE

Log "Rebuilding NixOS..."
$rebuild = SSH-Cmd "nixos-rebuild switch --flake /etc/fastfree#dev --extra-experimental-features 'nix-command flakes'"
$rebuild | Out-File -Append $LOG_FILE

if ($LASTEXITCODE -eq 0) {
    Ok "NixOS rebuild successful"
} else {
    Fail "NixOS rebuild failed! Check log: $LOG_FILE"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 4: Verify Services
# ═══════════════════════════════════════════════════════════════
Header "STEP 4/4: Verify Services"

Start-Sleep -Seconds 3

$services = @("sshd", "mysql", "caddy", "avahi-daemon")
foreach ($svc in $services) {
    $status = SSH-Cmd "systemctl is-active $svc 2>/dev/null || echo inactive"
    $cleanStatus = $status.ToString().Trim()
    if ($cleanStatus -eq "active") {
        Ok "$svc: active"
    } else {
        Warn "$svc: $cleanStatus"
    }
}

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
Header "SUMMARY"
Write-Host "  Log: $LOG_FILE" -ForegroundColor DarkGray
Write-Host "  Completed: $(Get-Date)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Deploy complete!" -ForegroundColor Green
