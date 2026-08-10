# ═══════════════════════════════════════════════════════════════
# FastFree — Test
# ═══════════════════════════════════════════════════════════════
# Run from PowerShell:
#   .\01_test.ps1              # Default: 5 basic tests
#   .\01_test.ps1 -Quick       # Quick: 2 tests (syntax + flake check)
#   .\01_test.ps1 -Full        # Full: 15 comprehensive tests
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$Quick,
    [switch]$Full
)

$ErrorActionPreference = "Stop"
$WSL = "fastfree"
$REPO = "/mnt/d/2026/fastfree/dev/fastfree_os"
$NIX = "/run/current-system/sw/bin/nix"
$NIXF = "nix-command flakes"
$LOG_DIR = "$PSScriptRoot\logs"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE = "$LOG_DIR\test_$TIMESTAMP.log"

# ── Helpers ────────────────────────────────────────────────────
function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor DarkGray
    "[$ts] $msg" | Out-File -Append $LOG_FILE
}
function Ok($msg) {
    Write-Host "  PASS: $msg" -ForegroundColor Green
    "  PASS: $msg" | Out-File -Append $LOG_FILE
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
Write-Host "  FastFree - Testing" -ForegroundColor Cyan
if ($Quick) { Write-Host "  Mode: QUICK (2 tests)" -ForegroundColor Yellow }
elseif ($Full) { Write-Host "  Mode: FULL (15 tests)" -ForegroundColor Yellow }
else { Write-Host "  Mode: DEFAULT (5 tests)" -ForegroundColor Yellow }
Write-Host "  $(Get-Date)" -ForegroundColor DarkGray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# Build test list based on mode
# ═══════════════════════════════════════════════════════════════
$tests = @()

if ($Quick) {
    # ── QUICK MODE: 2 tests ────────────────────────────────────
    $tests += @{ Num="1"; Phase="Syntax"; Name="Parse all .nix files"; Cmd="$NIX --extra-experimental-features '$NIXF' flake check --no-build 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="2"; Phase="Flake"; Name="Flake metadata"; Cmd="$NIX --extra-experimental-features '$NIXF' flake metadata . 2>&1 >/dev/null && echo PASS || echo FAIL" }
}
elseif ($Full) {
    # ── FULL MODE: 15 tests across 6 phases ────────────────────

    # Phase 1: Syntax Validation
    $tests += @{ Num="1";  Phase="Syntax Validation"; Name="Flake check --no-build (validates all .nix)"; Cmd="$NIX --extra-experimental-features '$NIXF' flake check --no-build 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="2";  Phase="Syntax Validation"; Name="Flake metadata structure"; Cmd="$NIX --extra-experimental-features '$NIXF' flake metadata . 2>&1 >/dev/null && echo PASS || echo FAIL" }
    $tests += @{ Num="3";  Phase="Syntax Validation"; Name="Flake show (list all outputs)"; Cmd="$NIX --extra-experimental-features '$NIXF' flake show 2>&1 && echo PASS || echo FAIL" }

    # Phase 2: Evaluation Tests
    $tests += @{ Num="4";  Phase="Evaluation"; Name="eval fastfree.identity.name"; Cmd="$NIX --extra-experimental-features '$NIXF' eval .#nixosConfigurations.dev.config.fastfree.identity.name 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="5";  Phase="Evaluation"; Name="eval fastfree.apps.base"; Cmd="$NIX --extra-experimental-features '$NIXF' eval .#nixosConfigurations.dev.config.fastfree.apps.base 2>&1 >/dev/null && echo PASS || echo FAIL" }
    $tests += @{ Num="6";  Phase="Evaluation"; Name="eval services.openssh.enable"; Cmd="$NIX --extra-experimental-features '$NIXF' eval .#nixosConfigurations.dev.config.services.openssh.enable 2>&1 && echo PASS || echo FAIL" }

    # Phase 3: Flake Tests
    $tests += @{ Num="7";  Phase="Flake"; Name="Flake check --no-build (structural)"; Cmd="$NIX --extra-experimental-features '$NIXF' flake check --no-build 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="8";  Phase="Flake"; Name="Flake show (all outputs)"; Cmd="$NIX --extra-experimental-features '$NIXF' flake show 2>&1 && echo PASS || echo FAIL" }

    # Phase 4: Build Tests
    $tests += @{ Num="9";  Phase="Build"; Name="Build dry-run (packages.dev)"; Cmd="$NIX --extra-experimental-features '$NIXF' build .#packages.x86_64-linux.dev --dry-run 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="10"; Phase="Build"; Name="Build system.build.toplevel"; Cmd="$NIX --extra-experimental-features '$NIXF' build .#nixosConfigurations.dev.config.system.build.toplevel 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="11"; Phase="Build"; Name="Build VHDX (--print-build-logs)"; Cmd="$NIX --extra-experimental-features '$NIXF' build .#packages.x86_64-linux.dev --print-build-logs --max-jobs auto 2>&1 && echo PASS || echo FAIL" }

    # Phase 5: Integration Tests
    $tests += @{ Num="12"; Phase="Integration"; Name="Eval all nixosConfigurations"; Cmd="$NIX --extra-experimental-features '$NIXF' eval .#nixosConfigurations.dev.config.system.build.toplevel --raw 2>&1 >/dev/null && $NIX --extra-experimental-features '$NIXF' eval .#nixosConfigurations.client1.config.system.build.toplevel --raw 2>&1 >/dev/null && echo PASS || echo FAIL" }
    $tests += @{ Num="13"; Phase="Integration"; Name="Check options.nix validity"; Cmd="$NIX --extra-experimental-features '$NIXF' eval .#nixosConfigurations.dev.config.fastfree 2>&1 >/dev/null && echo PASS || echo FAIL" }
    $tests += @{ Num="14"; Phase="Integration"; Name="Validate packages output"; Cmd="$NIX --extra-experimental-features '$NIXF' eval .#packages.x86_64-linux.dev.type 2>&1 && echo PASS || echo FAIL" }

    # Phase 6: Cleanup
    $tests += @{ Num="15"; Phase="Cleanup"; Name="nix store gc (garbage collection)"; Cmd="$NIX --extra-experimental-features '$NIXF' store gc 2>&1 && echo PASS || echo FAIL" }
}
else {
    # ── DEFAULT MODE: 5 tests ──────────────────────────────────
    $tests += @{ Num="1"; Phase="Syntax"; Name="Flake check --no-build"; Cmd="$NIX --extra-experimental-features '$NIXF' flake check --no-build 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="2"; Phase="Evaluation"; Name="eval fastfree.identity.name"; Cmd="$NIX --extra-experimental-features '$NIXF' eval .#nixosConfigurations.dev.config.fastfree.identity.name 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="3"; Phase="Flake"; Name="Flake show"; Cmd="$NIX --extra-experimental-features '$NIXF' flake show 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="4"; Phase="Build"; Name="Build system.build.toplevel"; Cmd="$NIX --extra-experimental-features '$NIXF' build .#nixosConfigurations.dev.config.system.build.toplevel 2>&1 && echo PASS || echo FAIL" }
    $tests += @{ Num="5"; Phase="Flake"; Name="Flake metadata"; Cmd="$NIX --extra-experimental-features '$NIXF' flake metadata . 2>&1 >/dev/null && echo PASS || echo FAIL" }
}

# ═══════════════════════════════════════════════════════════════
# Run Tests
# ═══════════════════════════════════════════════════════════════
$passed = 0
$failed = 0
$total = $tests.Count
$results = @()

foreach ($test in $tests) {
    $n = $test.Num
    Header "[$n/$total] $($test.Phase) > $($test.Name)"
    Log "Running..."

    $result = Run-Nix $test.Cmd
    $result | Out-File -Append $LOG_FILE

    $output = $result -join " "
    if ($output -match "PASS") {
        Ok "$($test.Name)"
        $passed++
        $results += "$n|PASS|$($test.Phase)|$($test.Name)"
    } else {
        Fail "$($test.Name)"
        $failed++
        $results += "$n|FAIL|$($test.Phase)|$($test.Name)"
    }
}

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
$summaryLine = "========================================"
Write-Host ""
Write-Host $summaryLine -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host $summaryLine -ForegroundColor Cyan
Write-Host ""

# Results table
Write-Host "  #  | Status | Phase           | Test" -ForegroundColor DarkGray
Write-Host "  ---|--------|-----------------|-----" -ForegroundColor DarkGray
foreach ($r in $results) {
    $parts = $r -split "\|"
    $num = $parts[0]
    $status = $parts[1]
    $phase = $parts[2]
    $name = $parts[3]
    if ($status -eq "PASS") {
        Write-Host ("  {0,-3}| {1,-7}| {2,-16}| {3}" -f $num, "PASS", $phase, $name) -ForegroundColor Green
    } else {
        Write-Host ("  {0,-3}| {1,-7}| {2,-16}| {3}" -f $num, "FAIL", $phase, $name) -ForegroundColor Red
    }
    "  $num | $status | $phase | $name" | Out-File -Append $LOG_FILE
}

Write-Host ""
Write-Host $summaryLine -ForegroundColor Cyan

# Percentage
if ($total -gt 0) {
    $pct = [math]::Round(($passed / $total) * 100, 1)
} else {
    $pct = 0
}

if ($failed -eq 0) {
    Write-Host "  All $passed/$total tests passed ($pct%)" -ForegroundColor Green
} else {
    Write-Host "  Total: $total | Passed: $passed | Failed: $failed ($pct%)" -ForegroundColor Red
}

Write-Host "  Mode: $(if ($Quick) {'QUICK'} elseif ($Full) {'FULL'} else {'DEFAULT'})" -ForegroundColor DarkGray
Write-Host "  Log: $LOG_FILE" -ForegroundColor DarkGray
Write-Host "  Completed: $(Get-Date)" -ForegroundColor DarkGray
Write-Host ""

if ($failed -gt 0) { exit 1 }
