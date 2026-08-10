# ============================================================================
# FastFree Workflow Manager
# ============================================================================
# Deletes old runs + creates detailed log
# Usage: .\scripts\workflow-manager.ps1 [-DeleteAll] [-DryRun] [-KeepSuccessful]
# ============================================================================

param(
    [switch]$DryRun,
    [switch]$DeleteAll,
    [switch]$KeepSuccessful,
    [string]$LogDir = "logs/workflows"
)

$ErrorActionPreference = "Stop"
$repo = "FastFreeCloud/fastfree"

function Write-Header($text) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Write-Step($text) {
    Write-Host ""
    Write-Host "  -> $text" -ForegroundColor Yellow
}

function Write-Ok($text)    { Write-Host "    [OK] $text" -ForegroundColor Green }
function Write-Fail($text)  { Write-Host "    [FAIL] $text" -ForegroundColor Red }
function Write-Warn($text)  { Write-Host "    [WARN] $text" -ForegroundColor DarkYellow }
function Write-Info($text)  { Write-Host "    [INFO] $text" -ForegroundColor Gray }
function Write-Del($text)   { Write-Host "    [DEL] $text" -ForegroundColor DarkRed }

# Create log directory
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$logFile = Join-Path $LogDir "workflow-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
$summaryFile = Join-Path $LogDir "summary-latest.md"

function Write-Log($message, $level = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] [$level] $message"
}

# ============================================================
# Phase 1: Collect Data
# ============================================================

Write-Header "FastFree Workflow Manager"
Write-Log "Starting workflow manager"

# Check GitHub CLI
Write-Step "Checking GitHub CLI"
try {
    $ghVersion = gh --version 2>&1 | Select-Object -First 1
    Write-Ok "GitHub CLI: $ghVersion"
    Write-Log "GitHub CLI: $ghVersion"
} catch {
    Write-Fail "GitHub CLI not installed!"
    Write-Log "GitHub CLI not found" "ERROR"
    exit 1
}

# Check authentication
Write-Step "Checking authentication"
try {
    $authStatus = gh auth status 2>&1
    $logged = $authStatus | Select-String "Logged in to github.com"
    if ($logged) {
        Write-Ok "Authenticated"
        Write-Log "Authenticated to GitHub"
    } else {
        Write-Fail "Not authenticated!"
        Write-Log "Not authenticated" "ERROR"
        exit 1
    }
} catch {
    Write-Fail "Auth check failed"
    Write-Log "Auth check failed: $_" "ERROR"
    exit 1
}

# ============================================================
# Phase 2: Fetch All Runs
# ============================================================

Write-Step "Fetching all workflow runs..."
Write-Log "Fetching all workflow runs"

$allRuns = @()
$page = 1
$perPage = 100

do {
    $json = gh api "repos/$repo/actions/runs?per_page=$perPage&page=$page" --jq '.workflow_runs[] | {id: .id, name: .name, status: .status, conclusion: .conclusion, event: .event, created_at: .created_at, updated_at: .updated_at, run_number: .run_number, head_branch: .head_branch, head_sha: .head_sha}' 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to fetch runs"
        Write-Log "Failed to fetch runs: $json" "ERROR"
        break
    }
    $runs = $json | ConvertFrom-Json
    $allRuns += $runs
    $page++
} while ($runs.Count -eq $perPage)

Write-Ok "Loaded $($allRuns.Count) runs"
Write-Log "Loaded $($allRuns.Count) runs"

# ============================================================
# Phase 3: Analyze Runs
# ============================================================

Write-Step "Analyzing runs..."

$stats = @{
    total     = $allRuns.Count
    success   = ($allRuns | Where-Object { $_.conclusion -eq "success" }).Count
    failure   = ($allRuns | Where-Object { $_.conclusion -eq "failure" }).Count
    startup   = ($allRuns | Where-Object { $_.conclusion -eq "startup_failure" }).Count
    cancelled = ($allRuns | Where-Object { $_.conclusion -eq "cancelled" }).Count
    inProgress = ($allRuns | Where-Object { $_.status -eq "in_progress" }).Count
    queued    = ($allRuns | Where-Object { $_.status -eq "queued" }).Count
}

Write-Info "Total: $($stats.total)"
Write-Ok    "Success: $($stats.success)"
Write-Fail  "Failure: $($stats.failure)"
Write-Fail  "Startup: $($stats.startup)"
Write-Warn  "Cancelled: $($stats.cancelled)"
Write-Info  "In Progress: $($stats.inProgress)"
Write-Info  "Queued: $($stats.queued)"

Write-Log "Stats: total=$($stats.total) success=$($stats.success) failure=$($stats.failure) startup=$($stats.startup)"

# ============================================================
# Phase 4: Detailed Analysis
# ============================================================

Write-Step "Detailed analysis of each run..."
Write-Log "Detailed analysis of each run"

$detailedResults = @()

foreach ($run in $allRuns) {
    $runDetail = [ordered]@{
        id         = $run.id
        number     = $run.run_number
        name       = $run.name
        branch     = $run.head_branch
        commit     = if ($run.head_sha) { $run.head_sha.Substring(0, [Math]::Min(8, $run.head_sha.Length)) } else { "unknown" }
        event      = $run.event
        status     = $run.status
        conclusion = $run.conclusion
        created    = $run.created_at
        jobs       = @()
    }

    # Fetch jobs for each run
    $jobsJson = gh api "repos/$repo/actions/runs/$($run.id)/jobs" --jq '.jobs[] | {id: .id, name: .name, status: .status, conclusion: .conclusion, started_at: .started_at, completed_at: .completed_at}' 2>&1
    if ($LASTEXITCODE -eq 0) {
        $jobs = $jobsJson | ConvertFrom-Json
        $runDetail.jobs = $jobs
    }

    $detailedResults += [PSCustomObject]$runDetail
}

# ============================================================
# Phase 5: Write Report
# ============================================================

Write-Step "Writing detailed report..."
Write-Log "Writing detailed report"

$report = @"
# FastFree Workflow Report - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Summary

| Status | Count |
|--------|-------|
| Success | $($stats.success) |
| Failure | $($stats.failure) |
| Startup Failure | $($stats.startup) |
| Cancelled | $($stats.cancelled) |
| In Progress | $($stats.inProgress) |
| Queued | $($stats.queued) |
| **Total** | **$($stats.total)** |

---

## Run Details

"@

foreach ($run in $detailedResults) {
    $icon = switch ($run.conclusion) {
        "success"          { "[OK]" }
        "failure"          { "[FAIL]" }
        "startup_failure"  { "[STARTUP]" }
        "cancelled"        { "[CANCELLED]" }
        default            { "[RUNNING]" }
    }

    $report += @"

### Run #$($run.number) - $icon $($run.conclusion)

- **Name:** $($run.name)
- **Number:** #$($run.number)
- **ID:** $($run.id)
- **Branch:** $($run.branch)
- **Commit:** $($run.commit)
- **Event:** $($run.event)
- **Status:** $($run.status)
- **Conclusion:** $($run.conclusion)
- **Created:** $($run.created)

#### Jobs:

| Job | Status | Conclusion |
|-----|--------|------------|
"@

    foreach ($job in $run.jobs) {
        $jobIcon = switch ($job.conclusion) {
            "success"          { "[OK]" }
            "failure"          { "[FAIL]" }
            "startup_failure"  { "[STARTUP]" }
            "cancelled"        { "[CANCELLED]" }
            "skipped"          { "[SKIPPED]" }
            default            { "[RUNNING]" }
        }
        $report += "| $($job.name) | $($job.status) | $jobIcon $($job.conclusion) |`n"
    }

    $report += "`n---`n"
}

# ============================================================
# Phase 6: Save Report
# ============================================================

Write-Step "Saving report..."

$reportPath = Join-Path $LogDir "report-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').md"
Set-Content -Path $reportPath -Value $report -Encoding UTF8
Write-Ok "Detailed report: $reportPath"
Write-Log "Detailed report saved: $reportPath"

Set-Content -Path $summaryFile -Value $report -Encoding UTF8
Write-Ok "Latest summary: $summaryFile"

# ============================================================
# Phase 7: Delete Old Runs
# ============================================================

Write-Step "Identifying runs to delete..."

$toDelete = @()
$toKeep = @()

foreach ($run in $allRuns) {
    $shouldDelete = $false

    if ($DeleteAll) {
        $shouldDelete = $true
    } elseif ($KeepSuccessful) {
        if ($run.conclusion -ne "success") {
            $shouldDelete = $true
        }
    } else {
        # Keep only last 5 runs
        $index = [Array]::IndexOf($allRuns, $run)
        if ($index -ge 5) {
            $shouldDelete = $true
        }
    }

    if ($shouldDelete) {
        $toDelete += $run
    } else {
        $toKeep += $run
    }
}

Write-Info "To delete: $($toDelete.Count)"
Write-Info "To keep: $($toKeep.Count)"
Write-Log "To delete: $($toDelete.Count), To keep: $($toKeep.Count)"

if ($toDelete.Count -eq 0) {
    Write-Ok "Nothing to delete!"
} else {
    Write-Step "Starting deletion..."
    $deleted = 0
    $failedDel = 0

    foreach ($run in $toDelete) {
        if ($DryRun) {
            Write-Info "[DRY RUN] Would delete: #$($run.number) ($($run.conclusion))"
        } else {
            Write-Host -NoNewline "    [DEL] Deleting #$($run.number) ($($run.conclusion))... "
            $result = gh api -X DELETE "repos/$repo/actions/runs/$($run.id)" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Done" -ForegroundColor Green
                $deleted++
                Write-Log "Deleted run #$($run.number) (id=$($run.id))"
            } else {
                Write-Host "Failed" -ForegroundColor Red
                $failedDel++
                Write-Log "Failed to delete run #$($run.number): $result" "ERROR"
            }
        }
        Start-Sleep -Milliseconds 500
    }

    Write-Ok "Deleted: $deleted"
    if ($failedDel -gt 0) {
        Write-Fail "Failed to delete: $failedDel"
    }
    Write-Log "Deletion complete: deleted=$deleted failed=$failedDel"
}

# ============================================================
# Phase 8: Final Summary
# ============================================================

Write-Header "Final Summary"

Write-Host ""
Write-Host "  Log file:" -ForegroundColor Cyan
Write-Host "    $logFile" -ForegroundColor Gray
Write-Host ""
Write-Host "  Detailed report:" -ForegroundColor Cyan
Write-Host "    $reportPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Latest summary:" -ForegroundColor Cyan
Write-Host "    $summaryFile" -ForegroundColor Gray
Write-Host ""

# Show last 5 runs
Write-Host "  -- Last 5 runs --" -ForegroundColor Yellow
Write-Host ""
$showRuns = if ($toKeep.Count -gt 0) { $toKeep | Select-Object -First 5 } else { $allRuns | Select-Object -First 5 }
foreach ($run in $showRuns) {
    $icon = switch ($run.conclusion) {
        "success"          { "[OK]" }
        "failure"          { "[FAIL]" }
        "startup_failure"  { "[STARTUP]" }
        "cancelled"        { "[CANCELLED]" }
        default            { "[RUNNING]" }
    }
    Write-Host "    $icon #$($run.number) | $($run.name) | $($run.branch) | $($run.conclusion)" -ForegroundColor White
}

Write-Host ""
Write-Log "Workflow manager completed"
Write-Host ("=" * 70) -ForegroundColor Cyan
