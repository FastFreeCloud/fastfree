<#
.SYNOPSIS
  Generates Play Store feature graphics (1024x500) and screenshot placeholders
  for the 4 Android apps (pos, erp, hr, ledger).

.DESCRIPTION
  Runs scripts/generate-feature-graphics.mjs which uses `sharp` to render:
    - fastlane/metadata/android/{ar,en-US}/images/feature-graphic.png  (1024x500)
    - fastlane/metadata/android/{ar,en-US}/images/phone-screenshots/{1,2}.png (1080x1920)

.EXAMPLE
  .\scripts\generate-feature-graphics.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot 'generate-feature-graphics.mjs'
$websiteSharp = Join-Path $repoRoot 'apps\fastfree_website\node_modules\sharp'

# 1. Node must be available
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js not found on PATH. Install Node.js 18+ first.'
}

# 2. sharp must be available alongside the website package
if (-not (Test-Path -LiteralPath $websiteSharp)) {
    Write-Warning "sharp not found at: $websiteSharp"
    Write-Warning 'Installing dependencies for apps/fastfree_website so sharp is available...'
    Push-Location (Join-Path $repoRoot 'apps\fastfree_website')
    try {
        & npm install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw 'npm install failed. Install sharp manually, then re-run this script.'
        }
    }
    finally {
        Pop-Location
    }
}

# 3. Run the generator
Write-Host "Running: node $scriptPath"
& node $scriptPath
exit $LASTEXITCODE