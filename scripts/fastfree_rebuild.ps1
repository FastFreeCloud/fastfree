# FastFree OS — Rebuild all images
# Usage: .\scripts\fastfree_rebuild.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 FastFree OS — Rebuilding all images..." -ForegroundColor Cyan

$apps = @("erp", "ledger", "hr", "pos")

foreach ($app in $apps) {
    Write-Host "`n📦 Building fastfree_${app}..." -ForegroundColor Yellow
    
    Push-Location "apps/fastfree_${app}"
    
    try {
        # Clean previous build
        Remove-Item -Path "frontend-image" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "frontend-image.tar" -Force -ErrorAction SilentlyContinue
        
        # Build
        nix build .#frontendImage -o frontend-image --print-build-logs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Build failed for ${app}" -ForegroundColor Red
            continue
        }
        
        # Save as tar
        & ./frontend-image > frontend-image.tar
        
        # Push via skopeo
        Write-Host "📤 Pushing fastfree_${app}..." -ForegroundColor Green
        skopeo copy docker-archive:frontend-image.tar docker://ghcr.io/fastfreecloud/fastfree_${app}:latest
        skopeo copy docker-archive:frontend-image.tar docker://ghcr.io/fastfreecloud/fastfree_${app}:sha-$(git rev-parse --short HEAD)
        
        Write-Host "✅ ${app} pushed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
    finally {
        Pop-Location
    }
}

# Website
Write-Host "`n📦 Building fastfree_website..." -ForegroundColor Yellow
Push-Location "apps/fastfree_website"
try {
    Remove-Item -Path "frontend-image" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "frontend-image.tar" -Force -ErrorAction SilentlyContinue
    
    nix build .#frontendImage -o frontend-image --print-build-logs
    & ./frontend-image > frontend-image.tar
    
    skopeo copy docker-archive:frontend-image.tar docker://ghcr.io/fastfreecloud/fastfree_website:latest
    skopeo copy docker-archive:frontend-image.tar docker://ghcr.io/fastfreecloud/fastfree_website:sha-$(git rev-parse --short HEAD)
    
    Write-Host "✅ website pushed successfully" -ForegroundColor Green
}
finally {
    Pop-Location
}

Write-Host "`n🎉 All images rebuilt and pushed!" -ForegroundColor Cyan
