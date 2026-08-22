<#
.SYNOPSIS
    Deletes failed and cancelled GitHub Actions workflow runs.

.EXAMPLE
    .\cleanup-workflows.ps1
    .\cleanup-workflows.ps1 -DryRun
    .\cleanup-workflows.ps1 -All
#>

[CmdletBinding()]
param(
    [string]$Repository = 'FastFreeCloud/fastfree',
    [switch]$DryRun,
    [switch]$All
)

$ErrorActionPreference = 'Stop'

Write-Host "`nFetching failed + cancelled workflow runs for $Repository ..." -ForegroundColor Cyan

$allRuns = @()

# Fetch failed runs
try {
    $failedJson = gh run list --repo $Repository --status failure --limit 100 --json databaseId,name,createdAt,headBranch,event 2>$null
    if ($failedJson) {
        $failedRuns = $failedJson | ConvertFrom-Json
        $allRuns += $failedRuns
    }
} catch {
    Write-Host "Error fetching failed runs: $_" -ForegroundColor Red
}

# Fetch cancelled runs
try {
    $cancelledJson = gh run list --repo $Repository --status cancelled --limit 100 --json databaseId,name,createdAt,headBranch,event 2>$null
    if ($cancelledJson) {
        $cancelledRuns = $cancelledJson | ConvertFrom-Json
        $allRuns += $cancelledRuns
    }
} catch {
    Write-Host "Error fetching cancelled runs: $_" -ForegroundColor Red
}

if ($allRuns.Count -eq 0) {
    Write-Host "`nNo failed or cancelled workflow runs found.`n" -ForegroundColor Green
    exit 0
}

Write-Host "`nRuns to delete: $($allRuns.Count)`n" -ForegroundColor Yellow

foreach ($r in $allRuns) {
    $created = 'N/A'
    if ($r.createdAt) {
        $created = ([DateTimeOffset]$r.createdAt).ToLocalTime().ToString('yyyy-MM-dd HH:mm')
    }
    Write-Host "  ID: $($r.databaseId) | $($r.name) | $($r.headBranch) | $created"
}

if ($DryRun) {
    Write-Host "`n[DRY RUN] Would delete $($allRuns.Count) run(s).`n" -ForegroundColor Magenta
    exit 0
}

if (-not $All) {
    $answer = Read-Host "`nDelete all $($allRuns.Count) run(s)? (y/N)"
    if ($answer -notmatch '^[yY]') {
        Write-Host "`nAborted.`n" -ForegroundColor Yellow
        exit 0
    }
}

$deleted = 0
$failed = 0

foreach ($r in $allRuns) {
    $runId = $r.databaseId
    try {
        gh run delete $runId --repo $Repository 2>$null
        Write-Host "  [OK] Deleted $runId - $($r.name)" -ForegroundColor Green
        $deleted++
    } catch {
        Write-Host "  [FAIL] $runId - $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nDone. Deleted: $deleted | Failed: $failed`n" -ForegroundColor Cyan
