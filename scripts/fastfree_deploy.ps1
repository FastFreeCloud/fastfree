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
gh workflow run "Deploy client3" --ref master

# 4. Watch for completion
Write-Host "Waiting for deploy to complete..." -ForegroundColor Yellow
$run = gh run list --workflow="Deploy client3" --limit=1 --json databaseId --jq '.[0].databaseId'
gh run watch $run --exit-status

# 5. Run diagnostic
Write-Host "`nRunning diagnostic..." -ForegroundColor Yellow
gh workflow run "Diagnose client3" --ref master
Start-Sleep -Seconds 5
$diagRun = gh run list --workflow="Diagnose client3" --limit=1 --json databaseId --jq '.[0].databaseId'
gh run watch $diagRun --exit-status

Write-Host "`nDeploy complete!" -ForegroundColor Cyan
