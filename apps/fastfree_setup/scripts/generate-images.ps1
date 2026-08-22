# Generate FastFree Setup Images
# Creates wizard-image.bmp, wizard-small.bmp, and setup-icon.ico

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$OutputDir = "C:\Users\fastfree\Desktop\fastfree-lowcode-roadmap\fastfree\apps\fastfree_setup\resources\images"

# Color Palette
$BgColor = [System.Drawing.Color]::FromArgb(26, 26, 46)        # #1a1a2e - Dark navy
$AccentColor = [System.Drawing.Color]::FromArgb(212, 140, 60)  # #D48C3C - Gold/amber
$LightColor = [System.Drawing.Color]::FromArgb(220, 220, 220)  # Light gray
$WhiteColor = [System.Drawing.Color]::White
$DarkAccent = [System.Drawing.Color]::FromArgb(180, 120, 50)   # Darker gold

# ============================================================================
# Create Large Wizard Image (164x314)
# ============================================================================
Write-Host "Creating wizard-image.bmp (164x314)..." -ForegroundColor Yellow

$bmp1 = New-Object System.Drawing.Bitmap(164, 314)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g1.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background gradient (top to bottom)
$brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(0, 314)),
    $BgColor,
    [System.Drawing.Color]::FromArgb(15, 15, 30)
)
$g1.FillRectangle($brushBg, 0, 0, 164, 314)

# Decorative top bar
$brushAccent = New-Object System.Drawing.SolidBrush($AccentColor)
$g1.FillRectangle($brushAccent, 0, 0, 164, 4)

# Circle decoration (top area)
$penCircle = New-Object System.Drawing.Pen($AccentColor, 2)
$g1.DrawEllipse($penCircle, 52, 30, 60, 60)

# "FF" text inside circle
$fontBig = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush($AccentColor)
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$g1.DrawString("FF", $fontBig, $textBrush, (New-Object System.Drawing.RectangleF(52, 30, 60, 60)), $stringFormat)

# "FastFree" text below circle
$fontMed = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$g1.DrawString("FastFree", $fontMed, $textBrush, 82, 100, $stringFormat)

# "DEV TOOLKIT" subtitle
$fontSmall = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Regular)
$subtitleBrush = New-Object System.Drawing.SolidBrush($LightColor)
$g1.DrawString("DEV TOOLKIT", $fontSmall, $subtitleBrush, 82, 125, $stringFormat)

# Separator line
$g1.DrawLine($penCircle, 30, 150, 134, 150)

# Docker icon area (simple Docker whale silhouette placeholder)
$dockerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, $AccentColor))
$g1.FillRoundedRectangle($dockerBrush, 30, 165, 104, 45, 8)

# Version text
$fontVer = New-Object System.Drawing.Font("Segoe UI", 7, [System.Drawing.FontStyle]::Regular)
$g1.DrawString("v1.0.0", $fontVer, $subtitleBrush, 82, 230, $stringFormat)

# Bottom decorative line
$g1.FillRectangle($brushAccent, 0, 310, 164, 4)

# Dispose
$g1.Dispose()
$bmp1.Save("$OutputDir\wizard-image.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmp1.Dispose()

# ============================================================================
# Create Small Wizard Image (55x58)
# ============================================================================
Write-Host "Creating wizard-small.bmp (55x58)..." -ForegroundColor Yellow

$bmp2 = New-Object System.Drawing.Bitmap(55, 58)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background
$brushBg2 = New-Object System.Drawing.SolidBrush($BgColor)
$g2.FillRectangle($brushBg2, 0, 0, 55, 58)

# Top accent bar
$g2.FillRectangle($brushAccent, 0, 0, 55, 3)

# Circle with "FF"
$g2.DrawEllipse($penCircle, 8, 8, 38, 38)
$fontSmall2 = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$g2.DrawString("FF", $fontSmall2, $textBrush, (New-Object System.Drawing.RectangleF(8, 8, 38, 38)), $stringFormat)

# Bottom accent bar
$g2.FillRectangle($brushAccent, 0, 55, 55, 3)

$g2.Dispose()
$bmp2.Save("$OutputDir\wizard-small.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmp2.Dispose()

# ============================================================================
# Create Setup Icon (ICO)
# ============================================================================
Write-Host "Creating setup-icon.ico..." -ForegroundColor Yellow

# Create ICO file manually using System.Drawing
$icoPath = "$OutputDir\setup-icon.ico"

# Create 32x32 icon
$bmpIcon = New-Object System.Drawing.Bitmap(32, 32)
$gIcon = [System.Drawing.Graphics]::FromImage($bmpIcon)
$gIcon.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gIcon.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background
$gIcon.FillRectangle($brushBg2, 0, 0, 32, 32)

# Top accent
$gIcon.FillRectangle($brushAccent, 0, 0, 32, 2)

# "FF" text
$fontIcon = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$gIcon.DrawString("FF", $fontIcon, $textBrush, (New-Object System.Drawing.RectangleF(0, 0, 32, 32)), $stringFormat)

# Bottom accent
$gIcon.FillRectangle($brushAccent, 0, 30, 32, 2)

$gIcon.Dispose()

# Save as ICO using Icon class
$hIcon = $bmpIcon.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Create($icoPath)
$icon.Save($fs)
$fs.Close()

# Clean up
$icon.Dispose()
$bmpIcon.Dispose()

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Images created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  - wizard-image.bmp (164x314)" -ForegroundColor Gray
Write-Host "  - wizard-small.bmp (55x58)" -ForegroundColor Gray
Write-Host "  - setup-icon.ico (32x32)" -ForegroundColor Gray
Write-Host ""
Write-Host "Location: $OutputDir" -ForegroundColor Yellow
