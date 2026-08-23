# FastFree OS — Auto-fix flake hashes
# Usage: .\scripts\fastfree_fix_hashes.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 FastFree OS — Auto-fixing flake hashes..." -ForegroundColor Cyan

$apps = @("erp", "ledger", "hr", "pos")

foreach ($app in $apps) {
    Write-Host "`n📦 Checking fastfree_${app}..." -ForegroundColor Yellow
    
    Push-Location "apps/fastfree_${app}"
    
    try {
        $output = nix build .#frontendImage -o frontend-image 2>&1 | Out-String
        
        if ($output -match "hash mismatch") {
            $match = [regex]::Match($output, "got:\s+(sha256-[A-Za-z0-9+/=]+)")
            if ($match.Success) {
                $newHash = $match.Groups[1].Value
                Write-Host "📥 New hash for ${app}: $newHash" -ForegroundColor Green
                
                # Update flake.nix
                $content = Get-Content "flake.nix" -Raw
                $content = $content -replace 'hash = ".*"', "hash = `"$newHash`""
                $content = $content -replace 'sha256 = ".*"', "sha256 = `"$newHash`""
                Set-Content "flake.nix" -Value $content -NoNewline
                
                Write-Host "✅ Updated flake.nix for ${app}" -ForegroundColor Green
            }
        } else {
            Write-Host "✅ ${app} hash is correct" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Error checking ${app}: $_" -ForegroundColor Yellow
    }
    finally {
        Pop-Location
    }
}

# Website
Write-Host "`n📦 Checking fastfree_website..." -ForegroundColor Yellow
Push-Location "apps/fastfree_website"
try {
    $output = nix build .#frontendImage -o frontend-image 2>&1 | Out-String
    
    if ($output -match "hash mismatch") {
        $match = [regex]::Match($output, "got:\s+(sha256-[A-Za-z0-9+/=]+)")
        if ($match.Success) {
            $newHash = $match.Groups[1].Value
            Write-Host "📥 New hash for website: $newHash" -ForegroundColor Green
            
            $content = Get-Content "flake.nix" -Raw
            $content = $content -replace 'npmDepsHash = ".*"', "npmDepsHash = `"$newHash`""
            Set-Content "flake.nix" -Value $content -NoNewline
            
            Write-Host "✅ Updated flake.nix for website" -ForegroundColor Green
        }
    } else {
        Write-Host "✅ website hash is correct" -ForegroundColor Green
    }
}
finally {
    Pop-Location
}

Write-Host "`n🎉 Hash check complete!" -ForegroundColor Cyan
