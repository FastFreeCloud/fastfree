# FastFree Validation Script
# Checks TypeScript errors and lint warnings for all Quasar apps

$apps = @(
    "fastfree_pos",
    "fastfree_erp",
    "fastfree_hr",
    "fastfree_ledger"
)

$rootPath = "C:\Users\fastfree\Desktop\fastfree-lowcode-roadmap\fastfree"
$allPassed = $true

foreach ($app in $apps) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Checking: $app" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    # TypeScript Check
    Write-Host ""
    Write-Host "  TypeScript Check..." -ForegroundColor Yellow
    Set-Location $rootPath
    $tsResult = pnpm --filter $app exec vue-tsc --noEmit 2>&1 | Where-Object { $_ -notmatch "quasar\.config\.ts" }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  TypeScript errors found!" -ForegroundColor Red
        Write-Host $tsResult -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "  TypeScript: No errors" -ForegroundColor Green
    }
    
    # Lint Check
    Write-Host ""
    Write-Host "  Lint Check..." -ForegroundColor Yellow
    Set-Location $rootPath
    $lintResult = pnpm --filter $app exec eslint --max-warnings 0 . 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Lint errors found!" -ForegroundColor Red
        Write-Host $lintResult -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "  Lint: No errors" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  ALL CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "  SOME CHECKS FAILED!" -ForegroundColor Red
}
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Set-Location $rootPath
