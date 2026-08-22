<#
.SYNOPSIS
    Pushes the FastFree project to GitHub.

.DESCRIPTION
    Stages, commits, and pushes changes to the FastFree repository.
    Checks for uncommitted changes, stages all, commits with a timestamped
    or custom message, and pushes to origin master.

.PARAMETER Message
    Custom commit message. If omitted, uses "Auto update: YYYY-MM-DD HH:mm".

.PARAMETER Force
    Skip confirmation prompts.

.EXAMPLE
    .\push-project.ps1
    .\push-project.ps1 -Message "feat: add new module" -Force
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(HelpMessage = 'Custom commit message (default: timestamped).')]
    [string]$Message,

    [Parameter(HelpMessage = 'Skip confirmation prompts.')]
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# ── Helpers ──────────────────────────────────────────────────────────────────
function Write-Status {
    param([string]$Text)
    Write-Host "  >> $Text" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  [WARN] $Text" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Text)
    Write-Host "  [FAIL] $Text" -ForegroundColor Red
}

# ── Resolve repo root ────────────────────────────────────────────────────────
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "  FastFree — Push to GitHub" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White
Write-Host ""

# ── 1. Verify we are inside a git repo ──────────────────────────────────────
Write-Status "Checking git repository..."

try {
    $gitRoot = & git -C $RepoRoot rev-parse --show-toplevel 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not inside a git repository."
    }
    Write-Ok "Repository root: $gitRoot"
}
catch {
    Write-Fail "Not inside a git repository. Aborting."
    exit 1
}

# ── 2. Verify remote 'origin' exists ────────────────────────────────────────
Write-Status "Checking remote 'origin'..."

try {
    $remoteUrl = & git -C $RepoRoot remote get-url origin 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Remote 'origin' not configured."
    }
    Write-Ok "Remote: $remoteUrl"
}
catch {
    Write-Fail "Remote 'origin' not configured. Aborting."
    exit 1
}

# ── 3. Check current branch ─────────────────────────────────────────────────
Write-Status "Checking current branch..."

$branch = & git -C $RepoRoot branch --show-current 2>&1
Write-Ok "Branch: $branch"

if ($branch -ne 'master') {
    Write-Warn "Not on 'master' branch (currently on '$branch')."
    if (-not $Force) {
        $continue = Read-Host "  Continue pushing '$branch'? [y/N]"
        if ($continue -notin @('y', 'Y', 'yes', 'Yes')) {
            Write-Warn "Aborted by user."
            exit 0
        }
    }
}

# ── 4. Show git status (before) ─────────────────────────────────────────────
Write-Host ""
Write-Status "Current status (before):"
Write-Host ""
& git -C $RepoRoot status
Write-Host ""

# ── 5. Check for uncommitted changes ────────────────────────────────────────
Write-Status "Checking for uncommitted changes..."

$porcelain = & git -C $RepoRoot status --porcelain 2>&1
if ([string]::IsNullOrWhiteSpace($porcelain)) {
    Write-Warn "No changes detected. Nothing to commit."
    Write-Host ""
    Write-Status "Pulling latest from origin..."
    & git -C $RepoRoot pull --rebase origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Pull failed."
        exit 1
    }
    Write-Ok "Up to date with origin/$branch."
    exit 0
}

$changedFiles = ($porcelain | Measure-Object).Count
Write-Ok "$changedFiles file(s) with changes."

# ── 6. Confirm before staging (unless -Force) ───────────────────────────────
if (-not $Force -and -not $WhatIfPreference) {
    Write-Host ""
    $confirm = Read-Host "  Stage ALL changes and commit? [Y/n]"
    if ($confirm -notin @('y', 'Y', 'yes', 'Yes', '')) {
        Write-Warn "Aborted by user."
        exit 0
    }
}

# ── 7. Stage all changes ────────────────────────────────────────────────────
Write-Status "Staging all changes..."

if ($PSCmdlet.ShouldProcess($RepoRoot, 'git add -A')) {
    & git -C $RepoRoot add -A
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "git add failed."
        exit 1
    }
    Write-Ok "All changes staged."
}

# ── 8. Build commit message ─────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
    $Message = "Auto update: $timestamp"
}

Write-Status "Commit message: $Message"

# ── 9. Commit ───────────────────────────────────────────────────────────────
Write-Status "Committing..."

if ($PSCmdlet.ShouldProcess($RepoRoot, "git commit -m `"$Message`"")) {
    & git -C $RepoRoot commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "git commit failed."
        exit 1
    }
    Write-Ok "Committed successfully."
}

# ── 10. Show status before push ─────────────────────────────────────────────
Write-Host ""
Write-Status "Status before push:"
Write-Host ""
& git -C $RepoRoot status
Write-Host ""

# ── 11. Push to origin ──────────────────────────────────────────────────────
Write-Status "Pushing to origin/$branch..."

if ($PSCmdlet.ShouldProcess("origin/$branch", 'git push')) {
    & git -C $RepoRoot push origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Push failed! Check your credentials and network."
        Write-Host ""
        Write-Status "Recent commits (local):"
        & git -C $RepoRoot log --oneline -5
        exit 1
    }
    Write-Ok "Pushed to origin/$branch successfully."
}

# ── 12. Show recent commits after push ──────────────────────────────────────
Write-Host ""
Write-Status "Recent commits:"
Write-Host ""
& git -C $RepoRoot log --oneline -5
Write-Host ""

Write-Host "============================================" -ForegroundColor Green
Write-Host "  Done!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
