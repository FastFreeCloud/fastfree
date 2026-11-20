# FastFree AI stack auto-start
# Starts: Docker Desktop -> OmniRoute (compose) -> Obsidian -> Omnigent
$ErrorActionPreference = "Continue"
$logDir = Join-Path $env:LOCALAPPDATA "fastfree-ai"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir "startup.log"

function Write-Log([string]$message) {
  $line = "{0} {1}" -f (Get-Date -Format "o"), $message
  Add-Content -Path $log -Value $line
}

Write-Log "=== FastFree AI stack startup ==="

# 1) Docker Desktop
if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
  $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerExe) {
    Start-Process $dockerExe
    Write-Log "Started Docker Desktop"
  } else {
    Write-Log "Docker Desktop not found at $dockerExe"
  }
}

# Wait for Docker daemon (up to 5 minutes)
$dockerReady = $false
for ($i = 0; $i -lt 60; $i++) {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { $dockerReady = $true; break }
  Start-Sleep -Seconds 5
}
if (-not $dockerReady) {
  Write-Log "Docker daemon not ready; continuing with Obsidian/Omnigent"
} else {
  Write-Log "Docker is ready"
}

# 2) OmniRoute + Redis + Obsidian SelfSync
$composeDir = "C:\Users\FastFree\Desktop\fastfree\fastfree_ai"
Set-Location $composeDir
docker compose up -d --remove-orphans *>> $log
Write-Log "docker compose up -d requested"

# Wait for OmniRoute health (up to 5 minutes)
$omniReady = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:20128/healthz" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $omniReady = $true; break }
  } catch { }
  Start-Sleep -Seconds 5
}
if ($omniReady) { Write-Log "OmniRoute is healthy" } else { Write-Log "OmniRoute health check timed out" }

# 3) Obsidian (vault: fastfree)
if (-not (Get-Process obsidian -ErrorAction SilentlyContinue)) {
  Start-Process "obsidian://open?vault=fastfree"
  Write-Log "Started Obsidian (vault: fastfree)"
}

# Wait for Obsidian Local REST API on 27123 (up to 3 minutes)
$obsidianReady = $false
for ($i = 0; $i -lt 36; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:27123/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $obsidianReady = $true; break }
  } catch { }
  Start-Sleep -Seconds 5
}
if ($obsidianReady) { Write-Log "Obsidian Local REST API is reachable" } else { Write-Log "Obsidian Local REST API not reachable yet" }

# 4) Omnigent
$omniExe = Join-Path $env:USERPROFILE ".local\bin\omni.exe"
$opencodeConfig = Join-Path $env:USERPROFILE ".config\opencode\opencode.json"
if ((Test-Path $omniExe) -and (Test-Path $opencodeConfig)) {
  try {
    $key = (Get-Content $opencodeConfig -Raw | ConvertFrom-Json).provider.omniroute.options.apiKey
    if ($key) {
      $env:OMNIROUTE_API_KEY = $key
      # Persist for future processes; never log the value.
      setx OMNIROUTE_API_KEY $key *> $null
    }
  } catch {
    Write-Log "Could not read OmniRoute key from opencode config"
  }

  & $omniExe start --no-open --non-interactive *>> $log
  Write-Log "Omnigent start requested"
} else {
  Write-Log "Omnigent CLI or opencode config not found"
}

Write-Log "=== FastFree AI stack startup finished ==="
