# ============================================================================
# FastFree Workflow Manager - Single File
# ============================================================================
# Usage:
#   .\scripts\workflow-manager.ps1
#   .\scripts\workflow-manager.ps1 -Help
#
# Phases:
# 1. Validate YAML files (actionlint)
# 2. Delete failed workflow runs only
# 3. Push project to git
# 4. Trigger workflow on GitHub
# 5. Monitor workflow run
# 6. Save complete logs
# ============================================================================

param(
    [switch]$Help,
    [switch]$SkipValidation,
    [switch]$SkipDelete,
    [switch]$SkipPush,
    [switch]$SkipRun,
    [int]$KeepRuns = 5
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$workflowsDir = Join-Path $repoRoot ".github\workflows"
$logsDir = Join-Path $repoRoot "logs\workflows"
$repo = "FastFreeCloud/fastfree"

# Colors
function Write-Header($text) {
    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan
}

function Write-Step($text) {
    Write-Host ""
    Write-Host "  >> $text" -ForegroundColor Yellow
}

function Write-Ok($text)    { Write-Host "    [OK] $text" -ForegroundColor Green }
function Write-Fail($text)  { Write-Host "    [FAIL] $text" -ForegroundColor Red }
function Write-Warn($text)  { Write-Host "    [WARN] $text" -ForegroundColor DarkYellow }
function Write-Info($text)  { Write-Host "    [INFO] $text" -ForegroundColor Gray }
function Write-Code($text)  { Write-Host "    $text" -ForegroundColor DarkGray }

# Help
if ($Help) {
    Write-Host "FastFree Workflow Manager"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\scripts\workflow-manager.ps1              Run all phases"
    Write-Host "  .\scripts\workflow-manager.ps1 -Help          Show this help"
    Write-Host "  .\scripts\workflow-manager.ps1 -SkipValidation  Skip YAML validation"
    Write-Host "  .\scripts\workflow-manager.ps1 -SkipDelete      Skip deleting failed runs"
    Write-Host "  .\scripts\workflow-manager.ps1 -SkipPush        Skip git push"
    Write-Host "  .\scripts\workflow-manager.ps1 -SkipRun         Skip workflow trigger"
    Write-Host "  .\scripts\workflow-manager.ps1 -KeepRuns 10     Keep last 10 runs (not 5)"
    exit 0
}

Write-Header "FastFree Workflow Manager"

# Create logs directory
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$logFile = Join-Path $logsDir "workflow-run-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"
Start-Transcript -Path $logFile -Append -Force

Write-Info "Repository: $repo"
Write-Info "Root: $repoRoot"
Write-Info "Logs dir: $logsDir"

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
            Invoke-WebRequest -Uri $url -OutFile $actionlintZip -UseBasicParsing
            Expand-Archive -Path $actionlintZip -DestinationPath $extractDir -Force
            Remove-Item $actionlintZip -Force
            Write-Ok "actionlint downloaded"
        } catch {
            Write-Fail "Failed to download actionlint: $_"
            Stop-Transcript
            exit 1
        }
    }

    $yamlFiles = Get-ChildItem -Path $workflowsDir -Filter "*.yaml" | Sort-Object Name
    $yamlFiles += Get-ChildItem -Path $workflowsDir -Filter "*.yml" | Sort-Object Name

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
            Write-Ok "$($file.Name) is valid"
        }
    }

    if ($yamlFailed) {
        Write-Fail "YAML validation failed. Fix errors before continuing."
        Stop-Transcript
        exit 1
    }

    Write-Ok "All YAML files valid!"
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
            Write-Info "Found $($allRuns.Count) total runs"

            $toDelete = @()
            foreach ($run in $allRuns) {
                $isFailed = $run.conclusion -in @("failure", "startup_failure", "cancelled", "timed_out")
                if ($isFailed) {
                    $toDelete += $run
                }
            }

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

            Write-Ok "Deleted: $deleted | Failed: $failedDel"
        }
    } catch {
        Write-Fail "Could not delete runs: $_"
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
            Write-Ok "Committed changes"
        }

        # Always check for unpushed commits and push
        $unpushed = git log origin/master..HEAD --oneline 2>&1
        if (-not [string]::IsNullOrWhiteSpace($unpushed)) {
            Write-Info "Unpushed commits detected:"
            Write-Code $unpushed
            Write-Info "Pushing to master..."
            $pushOutput = git push origin master 2>&1
            if ($LASTEXITCODE -ne 0) { throw "git push failed: $pushOutput" }
            Write-Ok "Pushed to master"
        } else {
            Write-Info "No unpushed commits"
        }
    } catch {
        Write-Fail "Git push FAILED: $_"
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
        $runResult = gh workflow run build-os.yaml --repo $repo --ref master 2>&1

        if ($LASTEXITCODE -ne 0) { throw "gh workflow run failed: $runResult" }
        Write-Ok "Workflow triggered successfully"
        Write-Info $runResult
    } catch {
        Write-Fail "Could not trigger workflow: $_"
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

    try {
        $runs = gh api "repos/$repo/actions/runs?per_page=1&page=1&status=in_progress" --jq '.workflow_runs[:1] | .[] | .id' 2>&1

        if ($runs -and $runs -ne "null" -and $runs -ne "[]") {
            $runId = ($runs -split "`n")[0]
            Write-Info "Active run ID: $runId"

            Write-Info "Watching workflow (Ctrl+C to skip)..."
            gh run watch $runId --repo $repo --exit-status 2>&1 | Out-Null

            $exitCode = $LASTEXITCODE
            if ($exitCode -eq 0) {
                Write-Ok "Workflow completed successfully!"
            } else {
                Write-Fail "Workflow failed with exit code: $exitCode"
                Stop-Transcript
                exit 1
            }
        } else {
            Write-Info "No active runs found - checking recent runs..."
            $recent = gh run list --repo $repo --limit 1 --json databaseId,status,conclusion,number 2>&1
            Write-Info "Recent run:"
            Write-Code $recent
        }
    } catch {
        Write-Fail "Monitoring failed: $_"
        Stop-Transcript
        exit 1
    }
}

# ========================================================================
# Phase 6: Summary
# ========================================================================

Write-Step "PHASE 6: Summary"

Write-Host ""
Write-Host "  Summary:" -ForegroundColor Cyan
Write-Host "  1. YAML Validation:    $(if ($SkipValidation) { 'Skipped' } else { 'Complete' })" -ForegroundColor White
Write-Host "  2. Delete Failed Runs: $(if ($SkipDelete) { 'Skipped' } else { 'Complete' })" -ForegroundColor White
Write-Host "  3. Git Push:           $(if ($SkipPush) { 'Skipped' } else { 'Complete' })" -ForegroundColor White
Write-Host "  4. Trigger Workflow:   $(if ($SkipRun) { 'Skipped' } else { 'Complete' })" -ForegroundColor White
Write-Host "  5. Monitor:            $(if ($SkipRun) { 'Skipped' } else { 'Complete' })" -ForegroundColor White
Write-Host ""
Write-Host "  Log file: $logFile" -ForegroundColor Gray
Write-Host ""

Stop-Transcript
Write-Header "Complete!"
