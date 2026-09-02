# FastFree VPN Native Files Copier
# Copies VPN Java files from extension to all apps

$apps = @(
    @{Name="fastfree_pos"; Package="pos"},
    @{Name="fastfree_erp"; Package="erp"},
    @{Name="fastfree_hr"; Package="hr"},
    @{Name="fastfree_ledger"; Package="ledger"}
)

$extensionDir = "C:\Users\fastfree\Desktop\fastfree-lowcode-roadmap\fastfree\packages\fastfree_vpn\ae\src\android\app\src\main\java\com\fastfree\vpn"
$targetBase = "C:\Users\fastfree\Desktop\fastfree-lowcode-roadmap\fastfree\apps"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  FastFree VPN Native Files Copier" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if extension source exists
if (-not (Test-Path $extensionDir)) {
    Write-Host "Extension source not found: $extensionDir" -ForegroundColor Red
    exit 1
}

# Get Java files from extension
$javaFiles = Get-ChildItem -Path $extensionDir -Filter "*.java" -File
Write-Host "Found $($javaFiles.Count) Java files in extension:" -ForegroundColor Green
foreach ($file in $javaFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor Gray
}
Write-Host ""

foreach ($app in $apps) {
    $targetDir = "$targetBase\$($app.Name)\src-capacitor\android\app\src\main\java\com\fastfree\vpn"
    
    Write-Host "Processing $($app.Name)..." -ForegroundColor Yellow
    
    # Create target directory if it doesn't exist
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Write-Host "  Created directory: com\fastfree\vpn" -ForegroundColor Gray
    }
    
    # Copy Java files
    foreach ($file in $javaFiles) {
        $targetFile = Join-Path $targetDir $file.Name
        Copy-Item -Path $file.FullName -Destination $targetFile -Force
        Write-Host "  Copied: $($file.Name)" -ForegroundColor Gray
    }
    
    Write-Host "  Done!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  All VPN native files copied!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
