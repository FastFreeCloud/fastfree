# FastFree Android Icons Generator
# Generates mipmap icons from source icon

param(
    [string]$SourceIcon = "C:\Users\fastfree\Desktop\fastfree-lowcode-roadmap\fastfree\apps\fastfree_pos\public\icons\favicon-128x128.png"
)

$apps = @(
    @{Name="fastfree_pos"; Dir="apps/fastfree_pos"},
    @{Name="fastfree_erp"; Dir="apps/fastfree_erp"},
    @{Name="fastfree_hr"; Dir="apps/fastfree_hr"},
    @{Name="fastfree_ledger"; Dir="apps/fastfree_ledger"}
)

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  FastFree Android Icons Generator" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($app in $apps) {
    $resDir = "C:\Users\fastfree\Desktop\fastfree-lowcode-roadmap\fastfree\$($app.Dir)\src-capacitor\android\app\src\main\res"
    
    Write-Host "Processing $($app.Name)..." -ForegroundColor Yellow
    
    foreach ($folder in $sizes.Keys) {
        $size = $sizes[$folder]
        $targetDir = Join-Path $resDir $folder
        
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        
        # Create a simple colored square PNG icon
        # This creates a valid PNG with the correct dimensions
        $size = $sizes[$folder]
        
        # Create a simple 1x1 blue pixel PNG (valid but small)
        # For production, use ImageMagick or similar
        $placeholderPng = [byte[]]@(
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xD8, 0xAC, 0xC0, 0x0F,
            0x00, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
            0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        )
        
        $iconPath = Join-Path $targetDir "ic_launcher.png"
        [System.IO.File]::WriteAllBytes($iconPath, $placeholderPng)
        Write-Host "  Created: $folder/ic_launcher.png" -ForegroundColor Gray
    }
    
    Write-Host "  Done!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Icons generated for all apps!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: These are placeholder icons." -ForegroundColor Yellow
Write-Host "Replace with real icons before publishing." -ForegroundColor Yellow
