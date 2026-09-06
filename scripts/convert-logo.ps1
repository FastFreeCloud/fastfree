#Requires -Version 5.1
<#
.SYNOPSIS
  Derives all FastFree brand assets from the master logo (fastfree_logo.jpeg).
  Uses only built-in .NET System.Drawing — no external tools needed.
.DESCRIPTION
  Reads the square master JPEG and produces:
    Website (apps/fastfree_website/public):
      fastfree_logo.png      512px master (header/footer/favicon refs, same filename = zero code edits)
      apple-touch-icon.png   180px (solid background, as Apple requires)
      favicon.ico            32px single-image ICO
      favicon-32x32.png / favicon-16x16.png
      icon-192x192.png / icon-512x512.png (PWA manifest slots)
      assets/og-image.png    1200x630 (logo centered on dark #030712)
    Website (apps/fastfree_website/app):
      icon.png               512px (Next.js App Router convention)
    Each SPA app (apps/fastfree_{hr,erp,pos,ledger}/public):
      favicon.ico, icons/favicon-{16,32,96,128}.png, icons/icon-{128,192,512}.png
  Idempotent: safe to re-run; overwrites outputs.
.EXAMPLE
  .\scripts\convert-logo.ps1
  .\scripts\convert-logo.ps1 -Master .\custom-logo.jpeg
#>
[CmdletBinding()]
param(
  [string]$Master = (Join-Path $PSScriptRoot '..\fastfree_logo.jpeg')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$masterPath = (Resolve-Path $Master).Path

function New-ResizedBitmap {
  param(
    [System.Drawing.Image]$Src,
    [int]$Width,
    [int]$Height
  )
  $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
  $bmp.SetResolution($Src.HorizontalResolution, $Src.VerticalResolution)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($Src, 0, 0, $Width, $Height)
  } finally {
    $g.Dispose()
  }
  return $bmp
}

function Save-Png {
  param(
    [System.Drawing.Image]$Img,
    [string]$Dest
  )
  $dir = Split-Path $Dest -Parent
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
  $Img.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "wrote $Dest ($((Get-Item -LiteralPath $Dest).Length) bytes)"
}

$src = [System.Drawing.Image]::FromFile($masterPath)
try {
  Write-Output "master: $($src.Width)x$($src.Height) $masterPath"
  if ($src.Width -ne $src.Height) {
    throw 'Master logo must be square; got {0}x{1}' -f $src.Width, $src.Height
  }

  # ── Website ────────────────────────────────────────────────
  $webPub = Join-Path $repoRoot 'apps\fastfree_website\public'

  $bmp512 = New-ResizedBitmap -Src $src -Width 512 -Height 512
  try { Save-Png -Img $bmp512 -Dest (Join-Path $webPub 'fastfree_logo.png') } finally { $bmp512.Dispose() }
  try { Copy-Item -LiteralPath (Join-Path $webPub 'fastfree_logo.png') -Destination (Join-Path $repoRoot 'apps\fastfree_website\app\icon.png') -Force; Write-Output 'wrote app\icon.png (copy of 512 master)' } catch { throw }

  foreach ($size in @(192, 512)) {
    $b = New-ResizedBitmap -Src $src -Width $size -Height $size
    try { Save-Png -Img $b -Dest (Join-Path $webPub ('icon-{0}x{0}.png' -f $size)) } finally { $b.Dispose() }
  }

  $b180 = New-ResizedBitmap -Src $src -Width 180 -Height 180
  try { Save-Png -Img $b180 -Dest (Join-Path $webPub 'apple-touch-icon.png') } finally { $b180.Dispose() }

  foreach ($size in @(32, 16)) {
    $b = New-ResizedBitmap -Src $src -Width $size -Height $size
    try { Save-Png -Img $b -Dest (Join-Path $webPub ('favicon-{0}x{0}.png' -f $size)) } finally { $b.Dispose() }
  }

  # favicon.ico (32px single image) via HICON round-trip
  $b32 = New-ResizedBitmap -Src $src -Width 32 -Height 32
  try {
    $hicon = $b32.GetHicon()
    try {
      $ico = [System.Drawing.Icon]::FromHandle($hicon)
      try {
        $fs = [System.IO.File]::Open((Join-Path $webPub 'favicon.ico'), [System.IO.FileMode]::Create)
        try { $ico.Save($fs) } finally { $fs.Dispose() }
        Write-Output "wrote $(Join-Path $webPub 'favicon.ico')"
      } finally { $ico.Dispose() }
    } finally {
      # DestroyIcon via user32 to avoid GDI leak
      Add-Type -Namespace Win32 -Name Native -MemberDefinition '[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool DestroyIcon(System.IntPtr hIcon);' | Out-Null
      [Win32.Native]::DestroyIcon($hicon) | Out-Null
    }
  } finally { $b32.Dispose() }

  # og-image.png 1200x630: dark canvas + centered square logo
  $og = New-Object System.Drawing.Bitmap(1200, 630)
  $g = [System.Drawing.Graphics]::FromImage($og)
  try {
    $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#030712'))
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $logoSide = 560
    $g.DrawImage($src, (1200 - $logoSide) / 2, (630 - $logoSide) / 2, $logoSide, $logoSide)
  } finally { $g.Dispose() }
  try { Save-Png -Img $og -Dest (Join-Path $webPub 'assets\og-image.png') } finally { $og.Dispose() }

  # ── SPA apps ───────────────────────────────────────────────
  foreach ($app in @('fastfree_hr', 'fastfree_erp', 'fastfree_pos', 'fastfree_ledger')) {
    $pub = Join-Path $repoRoot ("apps\{0}\public" -f $app)
    foreach ($size in @(16, 32, 96, 128)) {
      $b = New-ResizedBitmap -Src $src -Width $size -Height $size
      try { Save-Png -Img $b -Dest (Join-Path $pub ('icons\favicon-{0}x{0}.png' -f $size)) } finally { $b.Dispose() }
    }
    foreach ($size in @(128, 192, 512)) {
      $b = New-ResizedBitmap -Src $src -Width $size -Height $size
      try { Save-Png -Img $b -Dest (Join-Path $pub ('icons\icon-{0}x{0}.png' -f $size)) } finally { $b.Dispose() }
    }
    $b32a = New-ResizedBitmap -Src $src -Width 32 -Height 32
    try {
      $h2 = $b32a.GetHicon()
      try {
        $ico2 = [System.Drawing.Icon]::FromHandle($h2)
        try {
          $fs2 = [System.IO.File]::Open((Join-Path $pub 'favicon.ico'), [System.IO.FileMode]::Create)
          try { $ico2.Save($fs2) } finally { $fs2.Dispose() }
          Write-Output "wrote $(Join-Path $pub 'favicon.ico')"
        } finally { $ico2.Dispose() }
      } finally { [Win32.Native]::DestroyIcon($h2) | Out-Null }
    } finally { $b32a.Dispose() }
  }
} finally {
  $src.Dispose()
}

Write-Output 'done.'
