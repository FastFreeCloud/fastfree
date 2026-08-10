# ═══════════════════════════════════════════════════════════════
# FastFree — Build VHDX
# ═══════════════════════════════════════════════════════════════
# Run from PowerShell:
#   .\02_build.ps1
#   .\02_build.ps1 -Client client1
# ═══════════════════════════════════════════════════════════════

param(
    [string]$Client = "dev"
)

$ErrorActionPreference = "Stop"
$WSL = "fastfree"
$REPO = "/mnt/d/2026/fastfree/dev/fastfree_os"
$NIX = "/run/current-system/sw/bin/nix"
$NIXF = "nix-command flakes"
$LOG_DIR = "$PSScriptRoot\logs"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE = "$LOG_DIR\build_$TIMESTAMP.log"

# ── Helpers ────────────────────────────────────────────────────
function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor DarkGray
    "[$ts] $msg" | Out-File -Append $LOG_FILE
}
function Ok($msg) {
    Write-Host "  OK: $msg" -ForegroundColor Green
    "  OK: $msg" | Out-File -Append $LOG_FILE
}
function Fail($msg) {
    Write-Host "  FAIL: $msg" -ForegroundColor Red
    "  FAIL: $msg" | Out-File -Append $LOG_FILE
}
function Header($msg) {
    Write-Host ""
    Write-Host "--- $msg ---" -ForegroundColor Cyan
    "--- $msg ---" | Out-File -Append $LOG_FILE
}
function Run-Nix($cmd) {
    $result = wsl -d $WSL -e bash -c "cd $REPO && $cmd" 2>&1
    return $result
}

# ── Setup ──────────────────────────────────────────────────────
if (!(Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FastFree - Build VHDX" -ForegroundColor Cyan
Write-Host "  $(Get-Date)" -ForegroundColor DarkGray
Write-Host "  Client: $Client" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Syntax Check
# ═══════════════════════════════════════════════════════════════
Header "STEP 1/3: Syntax Check"

$syntax = Run-Nix "find nix -name '*.nix' -not -name 'cli.nix' -exec nix-instantiate --parse {} + 2>&1 && echo SYNTAX_OK || echo SYNTAX_FAIL"
$syntax | Out-File -Append $LOG_FILE

if ($syntax -match "SYNTAX_OK") {
    Ok "All .nix files valid"
} else {
    Fail "Syntax errors found!"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: Flake Check
# ═══════════════════════════════════════════════════════════════
Header "STEP 2/3: Flake Check"

$flake = Run-Nix "$NIX --extra-experimental-features '$NIXF' flake check --no-build --no-update-lock-file 2>&1 && echo FLAKE_OK || echo FLAKE_FAIL"
$flake | Out-File -Append $LOG_FILE

if ($flake -match "FLAKE_OK") {
    Ok "Flake valid"
} else {
    Fail "Flake invalid!"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 3: Build VHDX
# ═══════════════════════════════════════════════════════════════
Header "STEP 3/3: Build VHDX"

Log "Building: nix build .#packages.x86_64-linux.$Client"
Log "This may take 20-40 minutes..."
Write-Host ""

$build = Run-Nix "$NIX --extra-experimental-features '$NIXF' build .#packages.x86_64-linux.$Client --print-build-logs --max-jobs auto 2>&1"
$build | Out-File -Append $LOG_FILE

if ($LASTEXITCODE -eq 0) {
    Ok "Build successful!"
    $size = Run-Nix "du -h $REPO/result/fastfree_$Client.vhdx.7z 2>/dev/null"
    if ($size) {
        Ok "Output: result/fastfree_$Client.vhdx.7z"
    }
} else {
    Fail "Build failed! Check log: $LOG_FILE"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
Header "SUMMARY"
Write-Host "  Log: $LOG_FILE" -ForegroundColor DarkGray
Write-Host "  Completed: $(Get-Date)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
