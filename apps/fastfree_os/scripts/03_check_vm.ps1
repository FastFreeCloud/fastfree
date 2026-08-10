# ═══════════════════════════════════════════════════════════════
# FastFree — VM Health Check
# ═══════════════════════════════════════════════════════════════
# Run from PowerShell:
#   .\03_check_vm.ps1
#   .\03_check_vm.ps1 -Host 10.0.0.1
# ═══════════════════════════════════════════════════════════════

param(
    [string]$VmHost = "dev.local",
    [string]$User = "root",
    [string]$Pass = "fastfree@2026"
)

$ErrorActionPreference = "Stop"
$LOG_DIR = "$PSScriptRoot\logs"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE = "$LOG_DIR\check_$TIMESTAMP.log"

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
    $result = sshpass -p $Pass ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 $User@$VmHost $cmd 2>&1
    return $result
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
Write-Host "  FastFree — VM Health Check" -ForegroundColor Cyan
Write-Host "  $(Get-Date)" -ForegroundColor DarkGray
Write-Host "  Host: $VmHost" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Connection
# ═══════════════════════════════════════════════════════════════
Header "STEP 1/6: Connection"

$conn = SSH-Cmd "echo OK"
if ($conn -match "OK") {
    Ok "SSH connection successful"
} else {
    Fail "Cannot connect to $VmHost"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: System Info
# ═══════════════════════════════════════════════════════════════
Header "STEP 2/6: System Info"

SSH-Cmd "uname -a" | Out-File -Append $LOG_FILE
SSH-Cmd "nixos-version 2>/dev/null || echo 'Not NixOS'" | Out-File -Append $LOG_FILE
Ok "System info collected"

# ═══════════════════════════════════════════════════════════════
# STEP 3: Services
# ═══════════════════════════════════════════════════════════════
Header "STEP 3/6: Services"

$services = @("sshd", "mysql", "caddy", "avahi-daemon", "wireguard-wg0", "podman", "fastfree-backend-app", "fastfree-backend-frontend")
foreach ($svc in $services) {
    $status = SSH-Cmd "systemctl is-active $svc 2>/dev/null || echo inactive"
    $cleanStatus = $status.ToString().Trim()
    if ($cleanStatus -eq "active") {
        Ok "$svc: active"
    } elseif ($cleanStatus -eq "inactive") {
        Warn "$svc: inactive"
    } else {
        Fail "$svc: $cleanStatus"
    }
}

# ═══════════════════════════════════════════════════════════════
# STEP 4: Ports
# ═══════════════════════════════════════════════════════════════
Header "STEP 4/6: Ports"

$ports = @(
    @{ Port=22;    Name="SSH" },
    @{ Port=3306;  Name="MySQL" },
    @{ Port=443;   Name="Caddy" },
    @{ Port=51820; Name="WireGuard" },
    @{ Port=8080;  Name="Frappe" },
    @{ Port=8082;  Name="phpMyAdmin" }
)
foreach ($p in $ports) {
    $listening = SSH-Cmd "ss -tlnp | grep -q ':$($p.Port) ' && echo yes || echo no"
    if ($listening -match "yes") {
        Ok "Port $($p.Port) ($($p.Name)): listening"
    } else {
        Warn "Port $($p.Port) ($($p.Name)): not listening"
    }
}

# ═══════════════════════════════════════════════════════════════
# STEP 5: Containers
# ═══════════════════════════════════════════════════════════════
Header "STEP 5/6: Containers"

SSH-Cmd "podman ps --format '{{.Names}}: {{.Status}}' 2>/dev/null" | Out-File -Append $LOG_FILE

# ═══════════════════════════════════════════════════════════════
# STEP 6: Errors
# ═══════════════════════════════════════════════════════════════
Header "STEP 6/6: Recent Errors"

SSH-Cmd "journalctl -p err --since '1 hour ago' --no-pager 2>/dev/null | tail -20" | Out-File -Append $LOG_FILE

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
Header "SUMMARY"
Write-Host "  Report: $LOG_FILE" -ForegroundColor DarkGray
Write-Host "  Completed: $(Get-Date)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Health check complete!" -ForegroundColor Green
