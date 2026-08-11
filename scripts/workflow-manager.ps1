#Requires -Version 5.1
<#
.SYNOPSIS
    FastFree Workflow Manager — Build, push, and monitor GitHub Actions workflows.

.DESCRIPTION
    Automates the full lifecycle:
      1. Validate YAML workflow files with actionlint
      2. Delete failed GitHub Actions workflow runs
      3. Stage, commit, and push changes to the remote repository
      4. Trigger the build-os.yaml workflow
      5. Monitor the workflow run until completion
      6. Save a full transcript log

.PARAMETER Help
    Show usage information and exit.

.PARAMETER SkipValidation
    Skip the YAML validation phase.

.PARAMETER SkipDelete
    Skip deleting failed workflow runs.

.PARAMETER SkipPush
    Skip the git commit and push phase.

.PARAMETER SkipRun
    Skip triggering and monitoring the workflow.

.PARAMETER Menu
    Show an interactive menu instead of running all phases.

.PARAMETER KeepRuns
    Number of successful workflow runs to keep (default: 5).

.EXAMPLE
    .\scripts\workflow-manager.ps1
    .\scripts\workflow-manager.ps1 -SkipValidation -SkipPush
    .\scripts\workflow-manager.ps1 -Menu
    .\scripts\workflow-manager.ps1 -Help

.VERSION
    2.0.0 — Production-quality rewrite with retry logic, colored output, logging, and menu.

.NOTES
    Author : FastFree Team
    Repo   : FastFreeCloud/fastfree
#>

[CmdletBinding()]
param(
    [switch]$Help,
    [switch]$SkipValidation,
    [switch]$SkipDelete,
    [switch]$SkipPush,
    [switch]$SkipRun,
    [switch]$Menu,
    [int]$KeepRuns = 5
)

$ErrorActionPreference = "Stop"
$ScriptVersion = "2.0.0"

$repoRoot      = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$workflowsDir  = Join-Path $repoRoot ".github\workflows"
$logsDir       = Join-Path $repoRoot "logs\workflows"
$summaryLog    = Join-Path $PSScriptRoot "..\workflow-manager.log"
$repo          = "FastFreeCloud/fastfree"

# ============================================================================
# Colored Output Helpers
# ============================================================================

function Write-Header($msg) {
    Write-Host ""
    Write-Host ("=" * 78) -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 78) -ForegroundColor Cyan
}

function Write-Step($msg) {
    Write-Host ""
    Write-Host "  >> $msg" -ForegroundColor Cyan
}

function Write-OK($msg) {
    Write-Host "    [OK] $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    Write-Host "    [FAIL] $msg" -ForegroundColor Red
}

function Write-Warn($msg) {
    Write-Host "    [WARN] $msg" -ForegroundColor Yellow
}

function Write-Info($msg) {
    Write-Host "    [INFO] $msg" -ForegroundColor White
}

function Write-Code($msg) {
    Write-Host "    $msg" -ForegroundColor DarkGray
}

function Write-Check($msg) {
    Write-Host "    [x] $msg" -ForegroundColor Green
}

function Write-Cross($msg) {
    Write-Host "    [ ] $msg" -ForegroundColor Red
}

function Write-Timer($elapsed) {
    $m = [math]::Floor($elapsed.TotalMinutes)
    $s = [math]::Floor($elapsed.TotalSeconds % 60)
    Write-Host -NoNewline ("`r    Elapsed: {0:D2}:{1:D2}" -f $m, $s) -ForegroundColor DarkCyan
}

# ============================================================================
# Retry Helper
# ============================================================================

function Invoke-WithRetry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][scriptblock]$ScriptBlock,
        [int]$MaxAttempts = 3,
        [int]$DelaySeconds = 5,
        [string]$Description = "operation"
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $result = & $ScriptBlock
            return $result
        } catch {
            if ($attempt -lt $MaxAttempts) {
                Write-Warn "$Description failed (attempt $attempt/$MaxAttempts): $_"
                Write-Info "Retrying in $DelaySeconds seconds..."
                Start-Sleep -Seconds $DelaySeconds
            } else {
                throw "$Description failed after $MaxAttempts attempts: $_"
            }
        }
    }
}

# ============================================================================
# Logging
# ============================================================================

function Write-SummaryLog {
    param(
        [string]$Status,
        [string]$Detail = ""
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $branch = ""
    try { $branch = (git -C $repoRoot rev-parse --abbrev-ref HEAD 2>$null) } catch {}
    $entry = "[$timestamp] $Status | branch=$branch | $Detail"

    try {
        if (-not (Test-Path (Split-Path $summaryLog -Parent))) {
            New-Item -ItemType Directory -Path (Split-Path $summaryLog -Parent) -Force | Out-Null
        }
        Add-Content -Path $summaryLog -Value $entry -ErrorAction SilentlyContinue
    } catch {}
}

function Show-LogTail {
    if (Test-Path $summaryLog) {
        Write-Host ""
        Write-Host ("=" * 78) -ForegroundColor DarkGray
        Write-Host "  Last 20 lines of workflow-manager.log" -ForegroundColor DarkGray
        Write-Host ("=" * 78) -ForegroundColor DarkGray
        Get-Content $summaryLog -Tail 20 | ForEach-Object {
            if ($_ -match "\[FAIL\]") {
                Write-Host "  $_" -ForegroundColor Red
            } elseif ($_ -match "\[OK\]") {
                Write-Host "  $_" -ForegroundColor Green
            } else {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
        Write-Host ""
    } else {
        Write-Warn "No log file found at $summaryLog"
    }
}

# ============================================================================
# Git Branch Helper
# ============================================================================

function Get-GitBranch {
    try {
        $b = git -C $repoRoot rev-parse --abbrev-ref HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $b) { return $b }
    } catch {}
    return "unknown"
}

# ============================================================================
# Menu System
# ============================================================================

function Show-Menu {
    $branch = Get-GitBranch
    Write-Host ""
    Write-Host ("=" * 78) -ForegroundColor Cyan
    Write-Host "  FastFree Workflow Manager v$ScriptVersion" -ForegroundColor Cyan
    Write-Host "  Git branch: $branch" -ForegroundColor White
    Write-Host ("=" * 78) -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1]  Run all phases (validate, delete, push, trigger, monitor)" -ForegroundColor White
    Write-Host "  [2]  Validate YAML only" -ForegroundColor White
    Write-Host "  [3]  Delete failed runs only" -ForegroundColor White
    Write-Host "  [4]  Push only" -ForegroundColor White
    Write-Host "  [5]  Trigger workflow only" -ForegroundColor White
    Write-Host "  [6]  View last 20 log entries" -ForegroundColor White
    Write-Host "  [7]  Show git status" -ForegroundColor White
    Write-Host "  [0]  Exit" -ForegroundColor DarkGray
    Write-Host ""
    $choice = Read-Host "  Select option"

    switch ($choice) {
        "1" { return $true }
        "2" {
            $script:SkipValidation = $false; $script:SkipDelete = $true
            $script:SkipPush = $true;       $script:SkipRun = $true
            return $true
        }
        "3" {
            $script:SkipValidation = $true; $script:SkipDelete = $false
            $script:SkipPush = $true;       $script:SkipRun = $true
            return $true
        }
        "4" {
            $script:SkipValidation = $true; $script:SkipDelete = $true
            $script:SkipPush = $false;      $script:SkipRun = $true
            return $true
        }
        "5" {
            $script:SkipValidation = $true; $script:SkipDelete = $true
            $script:SkipPush = $true;       $script:SkipRun = $false
            return $true
        }
        "6" {
            Show-LogTail
            return $false
        }
        "7" {
            Write-Host ""
            Write-Host "  Current branch: $(Get-GitBranch)" -ForegroundColor White
            $st = git -C $repoRoot status --short 2>&1
            if ([string]::IsNullOrWhiteSpace($st)) {
                Write-OK "Working tree is clean"
            } else {
                Write-Info "Uncommitted changes:"
                Write-Code $st
            }
            return $false
        }
        "0" { return $false }
        default {
            Write-Warn "Invalid option"
            return $false
        }
    }
}

# ============================================================================
# Help
# ============================================================================

if ($Help) {
    Write-Host "FastFree Workflow Manager v$ScriptVersion"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\workflow-manager.ps1              Run all phases"
    Write-Host "  .\scripts\workflow-manager.ps1 -Menu         Interactive menu"
    Write-Host "  .\scripts\workflow-manager.ps1 -Help          Show this help"
    Write-Host ""
    Write-Host "Phase flags:"
    Write-Host "  -SkipValidation    Skip YAML validation"
    Write-Host "  -SkipDelete        Skip deleting failed runs"
    Write-Host "  -SkipPush          Skip git push"
    Write-Host "  -SkipRun           Skip workflow trigger and monitoring"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -KeepRuns <n>      Number of successful runs to keep (default: 5)"
    Write-Host ""
    exit 0
}

# ============================================================================
# Interactive Menu Loop
# ============================================================================

if ($Menu) {
    do {
        $continue = Show-Menu
    } while (-not $continue)
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Header "FastFree Workflow Manager v$ScriptVersion"

# Create logs directory
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$logFile = Join-Path $logsDir "workflow-run-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
Start-Transcript -Path $logFile -Append -Force

$branch = Get-GitBranch
Write-Info "Repository: $repo"
Write-Info "Root: $repoRoot"
Write-Info "Branch: $branch"
Write-Info "Logs dir: $logsDir"
Write-Info "Log file: $logFile"

$phaseStart = Get-Date
$overallSuccess = $true

# ========================================================================
# Phase 1: Validate YAML files
# ========================================================================

if (-not $SkipValidation) {
    Write-Step "PHASE 1: Validating YAML files..."

    $actionlintPath = Join-Path (Join-Path $env:TEMP "actionlint") "actionlint.exe"
    if (-not (Test-Path $actionlintPath)) {
        Write-Info "Downloading actionlint..."
        $actionlintZip = Join-Path $env:TEMP "actionlint.zip"
        $url = "https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_windows_amd64.zip"
        $extractDir = Join-Path $env:TEMP "actionlint"

        try {
            Invoke-WithRetry -Description "Download actionlint" -ScriptBlock {
                Invoke-WebRequest -Uri $url -OutFile $actionlintZip -UseBasicParsing
                Expand-Archive -Path $actionlintZip -DestinationPath $extractDir -Force
                Remove-Item $actionlintZip -Force
            }
            Write-OK "actionlint downloaded"
        } catch {
            Write-Fail "Failed to download actionlint: $_"
            Write-SummaryLog -Status "[FAIL]" -Detail "actionlint download failed"
            Stop-Transcript
            exit 1
        }
    }

    $yamlFiles = @(Get-ChildItem -Path $workflowsDir -Filter "*.yaml" -ErrorAction SilentlyContinue)
    $yamlFiles += @(Get-ChildItem -Path $workflowsDir -Filter "*.yml" -ErrorAction SilentlyContinue)
    $yamlFiles = $yamlFiles | Sort-Object Name

    if ($yamlFiles.Count -eq 0) {
        Write-Warn "No YAML files found in $workflowsDir"
    }

    $yamlFailed = $false
    foreach ($file in $yamlFiles) {
        Write-Info "Checking: $($file.Name)"

        $result = & $actionlintPath -color "$($file.FullName)" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "$($file.Name) has errors:"
            foreach ($line in $result) {
                Write-Code "  $line"
            }
            $yamlFailed = $true
        } else {
            Write-OK "$($file.Name) is valid"
        }
    }

    if ($yamlFailed) {
        Write-Fail "YAML validation failed. Fix errors before continuing."
        Write-SummaryLog -Status "[FAIL]" -Detail "YAML validation failed"
        Stop-Transcript
        exit 1
    }

    Write-OK "All YAML files valid"
}

# ========================================================================
# Phase 2: Delete failed workflow runs
# ========================================================================

if (-not $SkipDelete) {
    Write-Step "PHASE 2: Deleting failed workflow runs..."

    try {
        Write-Info "Fetching workflow runs..."
        $runsJson = gh api "repos/$repo/actions/runs?per_page=100&page=1" --jq '.workflow_runs[] | {id: .id, number: .number, conclusion: .conclusion, status: .status, event: .event, created_at: .created_at}' 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Could not fetch runs: $runsJson"
        } else {
            $allRuns = $runsJson | ConvertFrom-Json
            if ($null -eq $allRuns) { $allRuns = @() }
            if ($allRuns -isnot [array]) { $allRuns = @($allRuns) }
            Write-Info "Found $($allRuns.Count) total runs"

            $failedConclusions = @("failure", "startup_failure", "cancelled", "timed_out")
            $toDelete = @($allRuns | Where-Object { $_.conclusion -in $failedConclusions })

            Write-Info "Failed runs to delete: $($toDelete.Count)"
            Write-Info "Successful runs to keep: $(($allRuns.Count - $toDelete.Count))"

            $deleted = 0
            $failedDel = 0

            foreach ($run in $toDelete) {
                Write-Host -NoNewline "    Deleting #$($run.number) ($($run.conclusion))... "
                $result = gh api -X DELETE "repos/$repo/actions/runs/$($run.id)" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Done" -ForegroundColor Green
                    $deleted++
                } else {
                    Write-Host "Failed" -ForegroundColor Red
                    $failedDel++
                }
                Start-Sleep -Milliseconds 300
            }

            Write-OK "Deleted: $deleted | Failed: $failedDel"
        }
    } catch {
        Write-Fail "Could not delete runs: $_"
        Write-SummaryLog -Status "[FAIL]" -Detail "Delete runs failed"
        Stop-Transcript
        exit 1
    }
}

# ========================================================================
# Phase 3: Push project
# ========================================================================

if (-not $SkipPush) {
    Write-Step "PHASE 3: Pushing project..."

    Push-Location $repoRoot

    try {
        Write-Info "Checking git status..."
        $gitStatus = git status --short 2>&1

        if ([string]::IsNullOrWhiteSpace($gitStatus)) {
            Write-Info "No uncommitted changes"
        } else {
            Write-Info "Changes detected:"
            Write-Code $gitStatus

            Write-Info "Staging files..."
            $stageResult = git add . 2>&1
            if ($LASTEXITCODE -ne 0) { throw "git add failed: $stageResult" }

            Write-Info "Committing..."
            $commitMsg = "Automated workflow: fix + push at $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
            $commitResult = git commit -m $commitMsg 2>&1
            if ($LASTEXITCODE -ne 0) { throw "git commit failed: $commitResult" }
            Write-OK "Committed changes"
        }

        $unpushed = git log origin/$branch..HEAD --oneline 2>&1
        if (-not [string]::IsNullOrWhiteSpace($unpushed)) {
            Write-Info "Unpushed commits detected:"
            Write-Code $unpushed
            Write-Info "Pushing to $branch..."
            $pushOutput = git push origin $branch 2>&1
            if ($LASTEXITCODE -ne 0) { throw "git push failed: $pushOutput" }
            Write-OK "Pushed to $branch"
        } else {
            Write-Info "No unpushed commits"
        }
    } catch {
        Write-Fail "Git push FAILED: $_"
        Write-SummaryLog -Status "[FAIL]" -Detail "Git push failed"
        Stop-Transcript
        Pop-Location
        exit 1
    } finally {
        Pop-Location
    }
}

# ========================================================================
# Phase 4: Trigger workflow
# ========================================================================

if (-not $SkipRun) {
    Write-Step "PHASE 4: Triggering workflow..."

    try {
        Write-Info "Running build-os.yaml workflow..."
        $runResult = Invoke-WithRetry -Description "Trigger workflow" -ScriptBlock {
            $r = gh workflow run build-os.yaml --repo $repo --ref $branch 2>&1
            if ($LASTEXITCODE -ne 0) { throw "gh workflow run failed: $r" }
            return $r
        }
        Write-OK "Workflow triggered successfully"
        Write-Info $runResult
    } catch {
        Write-Fail "Could not trigger workflow: $_"
        Write-SummaryLog -Status "[FAIL]" -Detail "Workflow trigger failed"
        Stop-Transcript
        exit 1
    }
}

# ========================================================================
# Phase 5: Monitor workflow run
# ========================================================================

if (-not $SkipRun) {
    Write-Step "PHASE 5: Monitoring workflow run..."

    Start-Sleep -Seconds 10

    $monitorFailed = $false
    try {
        $runs = gh api "repos/$repo/actions/runs?per_page=1&page=1&status=in_progress" --jq '.workflow_runs[:1] | .[] | .id' 2>&1
    } catch {
        Write-Fail "Monitoring failed: $_"
        $monitorFailed = $true
    }

    if ($monitorFailed) {
        Write-SummaryLog -Status "[FAIL]" -Detail "Monitoring failed"
        Stop-Transcript
        exit 1
    }

    if ($runs -and $runs -ne "null" -and $runs -ne "[]") {
        $runId = ($runs -split "`n")[0].Trim()
        Write-Info "Active run ID: $runId"

        $monitorStart = Get-Date
        Write-Info "Watching workflow (Ctrl+C to skip)..."
        Write-Host ""

        gh run watch $runId --repo $repo --exit-status 2>&1 | Out-Null

        $elapsed = (Get-Date) - $monitorStart
        $exitCode = $LASTEXITCODE

        Write-Host ""
        if ($exitCode -eq 0) {
            Write-OK "Workflow completed successfully!"
            Write-SummaryLog -Status "[OK]" -Detail "Workflow run $runId succeeded in $([math]::Floor($elapsed.TotalSeconds))s"
        } else {
            Write-Fail "Workflow failed with exit code: $exitCode"
            Write-SummaryLog -Status "[FAIL]" -Detail "Workflow run $runId failed"
            Stop-Transcript
            exit 1
        }

        # Fetch and display per-job summary
        $jobsQuery = ".jobs[] | {name: .name, conclusion: .conclusion}"
        $jobs = $null
        try {
            $jobs = gh api "repos/$repo/actions/runs/$runId/jobs" --jq $jobsQuery 2>&1
        } catch {
            # Non-critical
        }

        if ($LASTEXITCODE -eq 0 -and $jobs) {
            Write-Host ""
            Write-Info "Job summary:"
            try {
                $jobList = $jobs | ConvertFrom-Json
                if ($null -eq $jobList) { $jobList = @() }
                if ($jobList -isnot [array]) { $jobList = @($jobList) }
                foreach ($job in $jobList) {
                    if ($job.conclusion -eq "success") {
                        Write-Check "$($job.name)"
                    } else {
                        Write-Cross "$($job.name) - $($job.conclusion)"
                    }
                }
            } catch {
                # Non-critical
            }
        }

    } else {
        Write-Info "No active runs found - checking recent runs..."
        $recent = gh run list --repo $repo --limit 1 --json databaseId,status,conclusion,number 2>&1
        Write-Info "Recent run:"
        Write-Code $recent
    }
}

# ========================================================================
# Phase 6: Summary
# ========================================================================

Write-Step "PHASE 6: Summary"

$totalElapsed = (Get-Date) - $phaseStart
$status1 = if ($SkipValidation) { 'Skipped' } else { 'Complete' }
$status2 = if ($SkipDelete) { 'Skipped' } else { 'Complete' }
$status3 = if ($SkipPush) { 'Skipped' } else { 'Complete' }
$status4 = if ($SkipRun) { 'Skipped' } else { 'Complete' }
$status5 = if ($SkipRun) { 'Skipped' } else { 'Complete' }

Write-Host ""
Write-Host "  Pipeline Summary:" -ForegroundColor Cyan
Write-Host "  ------------------" -ForegroundColor DarkGray
Write-Host "  1. YAML Validation:    $status1" -ForegroundColor $(if ($status1 -eq 'Skipped') { 'DarkGray' } else { 'White' })
Write-Host "  2. Delete Failed Runs: $status2" -ForegroundColor $(if ($status2 -eq 'Skipped') { 'DarkGray' } else { 'White' })
Write-Host "  3. Git Push:           $status3" -ForegroundColor $(if ($status3 -eq 'Skipped') { 'DarkGray' } else { 'White' })
Write-Host "  4. Trigger Workflow:   $status4" -ForegroundColor $(if ($status4 -eq 'Skipped') { 'DarkGray' } else { 'White' })
Write-Host "  5. Monitor:            $status5" -ForegroundColor $(if ($status5 -eq 'Skipped') { 'DarkGray' } else { 'White' })
Write-Host ""
Write-Host "  Branch: $branch" -ForegroundColor White
Write-Host "  Total time: $([math]::Floor($totalElapsed.TotalSeconds))s" -ForegroundColor White
Write-Host "  Transcript: $logFile" -ForegroundColor DarkGray
Write-Host "  Summary log: $summaryLog" -ForegroundColor DarkGray
Write-Host ""

Write-SummaryLog -Status "[OK]" -Detail "Pipeline completed in $([math]::Floor($totalElapsed.TotalSeconds))s"

Stop-Transcript
Write-Header "Complete!"
