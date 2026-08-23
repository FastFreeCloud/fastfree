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

# 3. Trigger deploy workflow (using workflow file name)
Write-Host "`nTriggering deploy workflow..." -ForegroundColor Yellow
gh workflow run deploy-client3.yaml --ref master

# 4. Watch for completion
Write-Host "Waiting for deploy to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
$runs = gh run list --workflow=deploy-client3.yaml --limit=1 --json databaseId | ConvertFrom-Json
$runId = $runs[0].databaseId
Write-Host "Deploy run ID: $runId" -ForegroundColor Green
gh run watch $runId --exit-status

# 5. Run diagnostic
Write-Host "`nRunning diagnostic..." -ForegroundColor Yellow
gh workflow run diagnose-client3.yaml --ref master
Start-Sleep -Seconds 10
$diagRuns = gh run list --workflow=diagnose-client3.yaml --limit=1 --json databaseId | ConvertFrom-Json
$diagRunId = $diagRuns[0].databaseId
Write-Host "Diagnose run ID: $diagRunId" -ForegroundColor Green
gh run watch $diagRunId --exit-status

Write-Host "`nDeploy complete!" -ForegroundColor Cyan
