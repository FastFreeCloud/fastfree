# FastFree OS - Deploy to client3
# Usage: .\scripts\fastfree_deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "FastFree OS - Deploying to client3..." -ForegroundColor Cyan

# 1. Push code
Write-Host "`nPushing code..." -ForegroundColor Yellow
git add -A
git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" --allow-empty
git push origin master

# 2. Wait for push to register
Start-Sleep -Seconds 5

# 3. Trigger deploy workflow
Write-Host "`nTriggering deploy workflow..." -ForegroundColor Yellow
$deployName = "Deploy client3"
gh workflow run $deployName --ref master

# 4. Watch for completion
Write-Host "Waiting for deploy to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
$runs = gh run list --workflow=$deployName --limit=1 --json databaseId | ConvertFrom-Json
$runId = $runs[0].databaseId
Write-Host "Deploy run ID: $runId" -ForegroundColor Green
gh run watch $runId --exit-status

# 5. Run diagnostic
Write-Host "`nRunning diagnostic..." -ForegroundColor Yellow
$diagName = "Diagnose client3"
gh workflow run $diagName --ref master
Start-Sleep -Seconds 10
$diagRuns = gh run list --workflow=$diagName --limit=1 --json databaseId | ConvertFrom-Json
$diagRunId = $diagRuns[0].databaseId
Write-Host "Diagnose run ID: $diagRunId" -ForegroundColor Green
gh run watch $diagRunId --exit-status

Write-Host "`nDeploy complete!" -ForegroundColor Cyan
