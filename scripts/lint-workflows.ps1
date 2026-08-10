# ============================================================================
# FastFree Workflow Linter
# ============================================================================
# Validates all GitHub Actions workflow files using actionlint
# Usage: .\scripts\lint-workflows.ps1 [-Verbose]
# ============================================================================

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$workflowsDir = Join-Path $repoRoot ".github\workflows"

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
function Write-Info($text)  { Write-Host "    [INFO] $text" -ForegroundColor Gray }
function Write-Code($text)  { Write-Host "    $text" -ForegroundColor DarkGray }

# Install actionlint
Write-Header "FastFree Workflow Linter"

$actionlintDir = Join-Path $env:TEMP "actionlint"
$actionlintExe = Join-Path $actionlintDir "actionlint.exe"

if (-not (Test-Path $actionlintExe)) {
    Write-Step "Installing actionlint..."
    New-Item -ItemType Directory -Path $actionlintDir -Force | Out-Null
    $url = "https://github.com/rhysd/actionlint/releases/download/v1.7.7/actionlint_1.7.7_windows_amd64.zip"
    $zip = Join-Path $env:TEMP "actionlint.zip"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $actionlintDir -Force
    Remove-Item $zip -Force
    Write-Ok "actionlint installed"
} else {
    Write-Ok "actionlint already installed"
}

# Find workflow files
Write-Step "Scanning workflow files..."
$workflowFiles = @(Get-ChildItem -Path $workflowsDir -Filter "*.yaml")
$workflowFiles += @(Get-ChildItem -Path $workflowsDir -Filter "*.yml")
$workflowFiles = $workflowFiles | Sort-Object Name

Write-Info "Found $($workflowFiles.Count) files"

# Lint each file
Write-Step "Linting..."
Write-Host ""

$passedFiles = 0
$failedFiles = 0
$totalErrors = 0
$totalWarnings = 0

foreach ($file in $workflowFiles) {
    $output = & $actionlintExe -color $file.FullName 2>&1
    $exitCode = $LASTEXITCODE

    $errors = @($output | Where-Object { $_ -match "error:" })
    $warnings = @($output | Where-Object { $_ -match "warning:" })

    if ($exitCode -eq 0) {
        $passedFiles++
        Write-Ok "$($file.Name)"
        if ($Verbose -and $warnings.Count -gt 0) {
            foreach ($w in $warnings) { Write-Code "  $w" }
        }
    } else {
        $failedFiles++
        $totalErrors += $errors.Count
        Write-Fail "$($file.Name) -- $($errors.Count) error(s)"
        foreach ($e in $errors) { Write-Code "  $e" }
    }
    $totalWarnings += $warnings.Count
}

# Summary
Write-Host ""
Write-Header "Summary"
Write-Host ""
Write-Host "  Files:     $($workflowFiles.Count)" -ForegroundColor White
Write-Host "  Passed:    $passedFiles" -ForegroundColor Green
Write-Host "  Failed:    $failedFiles" -ForegroundColor $(if ($failedFiles -gt 0) { "Red" } else { "Green" })
Write-Host "  Errors:    $totalErrors" -ForegroundColor $(if ($totalErrors -gt 0) { "Red" } else { "Green" })
Write-Host "  Warnings:  $totalWarnings" -ForegroundColor $(if ($totalWarnings -gt 0) { "DarkYellow" } else { "Green" })
Write-Host ""

if ($failedFiles -eq 0) {
    Write-Host "  All workflows are valid!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  Fix errors before pushing!" -ForegroundColor Red
    exit 1
}
