# ═══════════════════════════════════════════════════════════════
# FastFree — WireGuard Key Generator (PowerShell)
# ═══════════════════════════════════════════════════════════════
# Run from PowerShell:
#   .\wg_keys.ps1                    Generate keys for new devices only
#   .\wg_keys.ps1 -Device client2    Generate key for specific device
#   .\wg_keys.ps1 -Force             Force regenerate ALL keys
#   .\wg_keys.ps1 -Status            Show current key status
# ═══════════════════════════════════════════════════════════════

param(
    [string]$Device,
    [switch]$Force,
    [switch]$Status
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path $PSScriptRoot -Parent
$KEYS_DIR = Join-Path $PSScriptRoot "keys"
$CONFIGS_DIR = Join-Path $KEYS_DIR "_configs"
$WG_PATH = "C:\Program Files\WireGuard\wg.exe"

# ── Device Registry ──────────────────────────────────────────────
$DEVICES = @{
    # Hub
    "dev" = @{
        ip       = "10.100.0.1"
        port     = 51820
        role     = "hub"
        domain   = "dev.local"
    }
    # Sub-hubs (connect to dev)
    "client1" = @{
        ip          = "10.100.0.2"
        port        = 51820
        role        = "sub-hub"
        domain      = "client1.fastfree.local"
        connects_to = "dev"
    }
    "client2" = @{
        ip          = "10.100.0.6"
        port        = 51820
        role        = "sub-hub"
        domain      = "client2.fastfree.local"
        connects_to = "dev"
    }
    "server" = @{
        ip          = "10.100.0.3"
        port        = 51820
        role        = "sub-hub"
        domain      = "fastfree.cloud"
        connects_to = "dev"
    }
    "client3" = @{
        ip          = "10.100.0.7"
        port        = 51820
        role        = "sub-hub"
        domain      = "client3.fastfree.cloud"
        connects_to = "dev"
    }
    # Direct clients (connect to dev)
    "windows" = @{
        ip          = "10.100.0.4"
        port        = 51820
        role        = "client"
        domain      = $null
        connects_to = "dev"
    }
    "mobile" = @{
        ip          = "10.100.0.5"
        port        = 51820
        role        = "client"
        domain      = $null
        connects_to = "dev"
    }
    # client1 devices (connect to client1 directly)
    "c1-device1" = @{
        ip          = "10.100.1.1"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client1"
    }
    "c1-device2" = @{
        ip          = "10.100.1.2"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client1"
    }
    "c1-device3" = @{
        ip          = "10.100.1.3"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client1"
    }
    "c1-device4" = @{
        ip          = "10.100.1.4"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client1"
    }
    "c1-device5" = @{
        ip          = "10.100.1.5"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client1"
    }
    # server devices (connect to server directly)
    "s-device1" = @{
        ip          = "10.100.2.1"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "server"
    }
    "s-device2" = @{
        ip          = "10.100.2.2"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "server"
    }
    "s-device3" = @{
        ip          = "10.100.2.3"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "server"
    }
    "s-device4" = @{
        ip          = "10.100.2.4"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "server"
    }
    "s-device5" = @{
        ip          = "10.100.2.5"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "server"
    }
    # client2 devices (connect to client2 directly)
    "c2-device1" = @{
        ip          = "10.100.4.1"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client2"
    }
    "c2-device2" = @{
        ip          = "10.100.4.2"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client2"
    }
    "c2-device3" = @{
        ip          = "10.100.4.3"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client2"
    }
    "c2-device4" = @{
        ip          = "10.100.4.4"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client2"
    }
    "c2-device5" = @{
        ip          = "10.100.4.5"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client2"
    }
    # client3 devices (connect to client3 directly)
    "c3-device1" = @{
        ip          = "10.100.3.1"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client3"
    }
    "c3-device2" = @{
        ip          = "10.100.3.2"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client3"
    }
    "c3-device3" = @{
        ip          = "10.100.3.3"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client3"
    }
    "c3-device4" = @{
        ip          = "10.100.3.4"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client3"
    }
    "c3-device5" = @{
        ip          = "10.100.3.5"
        port        = 51820
        role        = "device"
        domain      = $null
        connects_to = "client3"
    }
}

# ── Helpers ──────────────────────────────────────────────────────
function Header($msg) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
}

function Info($msg) {
    Write-Host "  [..] $msg" -ForegroundColor DarkCyan
}

function Warn($msg) {
    Write-Host "  [!!] $msg" -ForegroundColor Yellow
}

# ── Winget Install ────────────────────────────────────────────────
function Ensure-Winget {
    # Step 1: Check if winget already works
    $test = Get-Command winget -ErrorAction SilentlyContinue
    if ($test) {
        Info "winget already available"
        return $true
    }

    # Step 2: Try to find winget via AppX package (it's installed but not in PATH)
    $pkg = Get-AppxPackage Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue
    if ($pkg) {
        $wingetPath = Join-Path $pkg.InstallLocation "winget.exe"
        if (Test-Path $wingetPath) {
            Ok "winget found via AppX package: $wingetPath"
            $env:Path += ";$($pkg.InstallLocation)"
            $test = Get-Command winget -ErrorAction SilentlyContinue
            if ($test) {
                Info "winget now available in PATH"
                return $true
            }
        }
    }

    # Step 3: Try common paths
    $wingetPaths = @(
        "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe",
        "C:\Program Files\WindowsApps\Microsoft.DesktopAppInstaller_*\winget.exe"
    )
    foreach ($p in $wingetPaths) {
        $found = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            Info "winget found at: $($found.FullName)"
            $env:Path += ";$(Split-Path $found.FullName)"
            $test = Get-Command winget -ErrorAction SilentlyContinue
            if ($test) {
                Info "winget now available"
                return $true
            }
        }
    }

    # Step 4: Install winget (only if truly not installed)
    Warn "winget not found. Installing from Microsoft..."
    try {
        $bundleUrl = "https://aka.ms/getwinget"
        $bundlePath = "$env:TEMP\winget.msixbundle"

        Info "Downloading winget from $bundleUrl ..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $bundleUrl -OutFile $bundlePath -UseBasicParsing
        Ok "Downloaded winget bundle"

        Info "Installing winget..."
        Add-AppxPackage -Path $bundlePath -ErrorAction Stop
        Start-Sleep -Seconds 5

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        # Check again
        $test = Get-Command winget -ErrorAction SilentlyContinue
        if ($test) {
            Ok "winget installed successfully"
            return $true
        }

        # Try AppX again after install
        $pkg = Get-AppxPackage Microsoft.DesktopAppInstaller -ErrorAction SilentlyContinue
        if ($pkg) {
            $wingetPath = Join-Path $pkg.InstallLocation "winget.exe"
            if (Test-Path $wingetPath) {
                Ok "winget found after install: $wingetPath"
                $env:Path += ";$($pkg.InstallLocation)"
                return $true
            }
        }

        Fail "winget installation completed but not available"
        return $false
    }
    catch {
        Fail "Failed to install winget: $_"
        return $false
    }
}

# ── WireGuard Check & Install ────────────────────────────────────
function Ensure-WireGuard {
    if (Test-Path $WG_PATH) {
        Info "WireGuard CLI found: $WG_PATH"
        return $true
    }

    Warn "WireGuard not found. Installing..."

    # Step 1: Ensure winget is installed FIRST
    Info "Step 1: Ensuring winget is available..."
    if (-not (Ensure-Winget)) {
        Fail "Cannot continue without winget"
        return $false
    }

    # Step 2: Use winget to install WireGuard
    Info "Step 2: Installing WireGuard via winget..."
    try {
        winget install -e --id WireGuard.WireGuard --silent --accept-package-agreements --accept-source-agreements
        if (Test-Path $WG_PATH) {
            Ok "WireGuard installed successfully via winget"
            return $true
        }

        # Maybe installed to a different path
        $found = Get-ChildItem "C:\Program Files\WireGuard" -Filter "wg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $script:WG_PATH = $found.FullName
            Ok "WireGuard installed at: $($found.FullName)"
            return $true
        }

        Warn "winget install completed but wg.exe not found"
    }
    catch {
        Warn "winget failed: $_"
    }

    # Step 3: Fallback - download MSI directly
    Info "Step 3: Fallback - downloading MSI directly..."
    try {
        $msiUrl = "https://download.wireguard.com/windows-client/wireguard-amd64-0.5.3.msi"
        $msiPath = "$env:TEMP\wireguard-amd64-0.5.3.msi"

        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
        Ok "Downloaded WireGuard MSI"

        $proc = Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" DO_NOT_LAUNCH=1 /qn /norestart" -Verb RunAs -Wait -PassThru

        if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
            Ok "WireGuard installed via MSI"
            return (Test-Path $WG_PATH)
        }

        # Check alternative paths
        $found = Get-ChildItem "C:\Program Files\WireGuard" -Filter "wg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $script:WG_PATH = $found.FullName
            Ok "WireGuard found at: $($found.FullName)"
            return $true
        }

        Fail "WireGuard install failed (exit code: $($proc.ExitCode))"
        return $false
    }
    catch {
        Fail "Failed to install WireGuard: $_"
        return $false
    }
}

function Invoke-Wg {
    param(
        [string]$Command,
        [string]$InputData
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $WG_PATH
    $psi.Arguments = $Command
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $proc = [System.Diagnostics.Process]::Start($psi)

    if ($InputData) {
        $proc.StandardInput.WriteLine($InputData)
        $proc.StandardInput.Close()
    }

    $stdout = $proc.StandardOutput.ReadToEnd()
    $stderr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()

    if ($proc.ExitCode -ne 0) {
        throw "wg $Command failed: $stderr"
    }
    return $stdout.Trim()
}

# ── Key Generation ───────────────────────────────────────────────
function Generate-Keypair {
    $privateKey = Invoke-Wg -Command "genkey"
    $publicKey = Invoke-Wg -Command "pubkey" -InputData $privateKey
    return @{ PrivateKey = $privateKey; PublicKey = $publicKey }
}

function Save-Keys {
    param([string]$Device, [string]$PrivateKey, [string]$PublicKey)
    $deviceDir = Join-Path $KEYS_DIR $Device
    New-Item -ItemType Directory -Path $deviceDir -Force | Out-Null

    $privPath = Join-Path $deviceDir "privatekey"
    $pubPath = Join-Path $deviceDir "publickey"

    # Delete existing files first (old Python icacls permissions may block writes)
    foreach ($f in @($privPath, $pubPath)) {
        if (Test-Path $f) {
            try { Remove-Item $f -Force -ErrorAction Stop }
            catch {
                try {
                    takeown /F $f /A /Q 2>$null | Out-Null
                    icacls $f /inheritance:r /grant:r "${env:USERNAME}:(F)" /T /Q 2>$null | Out-Null
                    Remove-Item $f -Force -ErrorAction Stop
                }
                catch { }
            }
        }
    }

    [System.IO.File]::WriteAllText($privPath, $PrivateKey)
    [System.IO.File]::WriteAllText($pubPath, $PublicKey)
}

function Load-Keys {
    param([string]$Device)
    $deviceDir = Join-Path $KEYS_DIR $Device
    $privPath = Join-Path $deviceDir "privatekey"
    $pubPath = Join-Path $deviceDir "publickey"

    if ((Test-Path $privPath) -and (Test-Path $pubPath)) {
        # Try reading directly first
        try {
            $priv = (Get-Content $privPath -Raw -ErrorAction Stop).Trim()
            $pub = (Get-Content $pubPath -Raw -ErrorAction Stop).Trim()
            if ($priv -and $pub) {
                return @{ PrivateKey = $priv; PublicKey = $pub }
            }
        }
        catch {
            # Fix permissions via icacls and retry
            try {
                icacls $privPath /inheritance:r /grant:r "${env:USERNAME}:(F)" /T /Q 2>$null | Out-Null
                icacls $pubPath /inheritance:r /grant:r "${env:USERNAME}:(F)" /T /Q 2>$null | Out-Null
                Start-Sleep -Milliseconds 200
                $priv = (Get-Content $privPath -Raw).Trim()
                $pub = (Get-Content $pubPath -Raw).Trim()
                if ($priv -and $pub) {
                    return @{ PrivateKey = $priv; PublicKey = $pub }
                }
            }
            catch { }
        }
    }
    return $null
}

function Get-OrGenerateKeys {
    param([string]$Device, [bool]$ForceRegen = $false)

    if ($ForceRegen) {
        $keys = Generate-Keypair
        Save-Keys -Device $Device -PrivateKey $keys.PrivateKey -PublicKey $keys.PublicKey
        return $keys
    }

    $existing = Load-Keys $Device
    if ($existing) { return $existing }

    $keys = Generate-Keypair
    Save-Keys -Device $Device -PrivateKey $keys.PrivateKey -PublicKey $keys.PublicKey
    return $keys
}

# ── Peers Resolution ─────────────────────────────────────────────
function Get-PeersForDevice {
    param([string]$Device)
    $info = $DEVICES[$Device]
    $role = $info.role
    $connectsTo = $info.connects_to

    if ($role -eq "hub") {
        return $DEVICES.Keys | Where-Object { $_ -ne $Device -and $DEVICES[$_].connects_to -eq "dev" }
    }

    if ($role -eq "sub-hub") {
        $peers = @("dev")
        $peers += $DEVICES.Keys | Where-Object { $DEVICES[$_].connects_to -eq $Device }
        return $peers
    }

    if ($role -eq "client") {
        return @("dev")
    }

    if ($role -eq "device") {
        return @($connectsTo)
    }

    return @()
}

function Get-AllowedIPs {
    param([string]$PeerName, [string]$Requester)
    $peerInfo = $DEVICES[$PeerName]
    $requesterInfo = $DEVICES[$Requester]
    $peerRole = $peerInfo.role
    $requesterRole = $requesterInfo.role

    if ($peerRole -eq "hub") {
        return @("$($peerInfo.ip)/32", "10.100.0.0/24")
    }

    if ($peerRole -eq "sub-hub") {
        if ($requesterRole -eq "hub") {
            $subnet = if ($PeerName -eq "client1") { "10.100.1.0/24" }
                      elseif ($PeerName -eq "client2") { "10.100.4.0/24" }
                      else { "10.100.2.0/24" }
            return @("$($peerInfo.ip)/32", $subnet)
        }
        elseif ($requesterRole -eq "device") {
            return @("$($peerInfo.ip)/32")
        }
        else {
            return @("$($peerInfo.ip)/32", "10.100.0.0/24")
        }
    }

    if ($peerRole -eq "client") {
        return @("$($peerInfo.ip)/32", "10.100.0.0/24")
    }

    if ($peerRole -eq "device") {
        return @("$($peerInfo.ip)/32")
    }

    return @("$($peerInfo.ip)/32")
}

# ── Config Generation ────────────────────────────────────────────
function Generate-WgConfig {
    param([string]$Device, [hashtable]$Deviceinfo, [string]$PrivateKey, [hashtable]$AllKeys)
    $lines = @()
    $lines += "# WireGuard config - auto-generated by wg_keys.ps1"
    $lines += "# Device: $Device ($($DeviceInfo.ip))"
    $lines += "# Do not edit manually; run: .\wireguard\wg_keys.ps1 -Force"
    $lines += ""
    $lines += "[Interface]"
    $lines += "Address = $($DeviceInfo.ip)/24"
    $lines += "ListenPort = $($DeviceInfo.port)"
    $lines += "PrivateKey = $PrivateKey"
    $lines += ""

    $peers = Get-PeersForDevice $Device

    foreach ($peerName in $peers) {
        $peerInfo = $DEVICES[$peerName]
        $peerData = $AllKeys[$peerName]
        $pubKey = if ($peerData) { $peerData.PublicKey } else { "<PENDING>" }
        if (-not $pubKey) { $pubKey = "<PENDING>" }

        $allowedIPs = Get-AllowedIPs $peerName $Device

        $lines += "[Peer]"
        $lines += "# $peerName ($($peerInfo.ip))"
        $lines += "PublicKey = $pubKey"
        $lines += "AllowedIPs = $($allowedIPs -join ', ')"

        if ($DeviceInfo.role -eq "device" -and $peerInfo.role -in @("sub-hub", "hub")) {
            $endpointDomain = $peerInfo.domain
            if ($endpointDomain) {
                $lines += "Endpoint = ${endpointDomain}:$($peerInfo.port)"
                $lines += "PersistentKeepalive = 25"
            }
        }

        if ($DeviceInfo.role -eq "sub-hub" -and $peerName -eq "dev") {
            $lines += "Endpoint = $($peerInfo.domain):$($peerInfo.port)"
            $lines += "PersistentKeepalive = 25"
        }

        if ($DeviceInfo.role -eq "client" -and $peerName -eq "dev") {
            $lines += "Endpoint = $($peerInfo.domain):$($peerInfo.port)"
            $lines += "PersistentKeepalive = 25"
        }

        $lines += ""
    }

    return ($lines -join "`n")
}

function Generate-AllConfigs {
    param([hashtable]$AllKeys)
    New-Item -ItemType Directory -Path $CONFIGS_DIR -Force | Out-Null

    foreach ($device in $AllKeys.Keys) {
        $config = Generate-WgConfig -Device $device -Deviceinfo $DEVICES[$device] -PrivateKey $AllKeys[$device].PrivateKey -AllKeys $AllKeys
        $configPath = Join-Path $CONFIGS_DIR "${device}_wg0.conf"
        Set-Content -Path $configPath -Value $config -NoNewline
        Info "Generated ${device}_wg0.conf"
    }
}

# ── Status ───────────────────────────────────────────────────────
function Show-Status {
    Header "WireGuard Key Status"

    foreach ($device in $DEVICES.Keys) {
        $deviceDir = Join-Path $KEYS_DIR $device
        $privPath = Join-Path $deviceDir "privatekey"
        $pubPath = Join-Path $deviceDir "publickey"
        $hasPriv = Test-Path $privPath
        $hasPub = Test-Path $pubPath

        $info = $DEVICES[$device]
        if ($hasPriv -and $hasPub) {
            $pubKey = ((Get-Content $pubPath -Raw).Trim()).Substring(0, [Math]::Min(20, ((Get-Content $pubPath -Raw).Trim()).Length)) + "..."
            Ok "$($device.PadRight(12)) $($info.ip.PadRight(15)) $($info.role.PadRight(10)) $pubKey"
        }
        elseif ($hasPriv -or $hasPub) {
            Warn "$($device.PadRight(12)) $($info.ip.PadRight(15)) $($info.role.PadRight(10)) INCOMPLETE"
        }
        else {
            Info "$($device.PadRight(12)) $($info.ip.PadRight(15)) $($info.role.PadRight(10)) NOT GENERATED"
        }
    }
}

# ── Cleanup ──────────────────────────────────────────────────────
function Invoke-Cleanup {
    if (Test-Path $CONFIGS_DIR) {
        Remove-Item -Path $CONFIGS_DIR -Recurse -Force
        Info "Deleted old configs"
    }

    foreach ($device in $DEVICES.Keys) {
        $deviceDir = Join-Path $KEYS_DIR $device
        if (Test-Path $deviceDir) {
            Remove-Item -Path $deviceDir -Recurse -Force
        }
    }
    Info "Deleted old keys"
}

# ── Main ─────────────────────────────────────────────────────────
Header "FastFree WireGuard Key Generator (PowerShell)"

# Step 1: Ensure winget is available FIRST (it's the package manager)
Info "=== Step 1: Ensuring winget is available ==="
if (-not (Ensure-Winget)) {
    Fail "Cannot continue without winget"
    exit 1
}

# Step 2: Ensure WireGuard CLI is available (installed via winget)
Info "=== Step 2: Ensuring WireGuard CLI is available ==="
if (-not (Ensure-WireGuard)) {
    Fail "Cannot proceed without WireGuard CLI"
    exit 1
}

if ($Status) {
    Show-Status
    exit 0
}

if ($Device) {
    if (-not $DEVICES.ContainsKey($Device)) {
        Fail "Unknown device: $Device"
        Fail "Valid devices: $($DEVICES.Keys -join ', ')"
        exit 1
    }
    $devicesToProcess = @($Device)
    # Also include devices that connect_to this device
    foreach ($d in $DEVICES.Keys) {
        if ($DEVICES[$d].connects_to -eq $Device -and $d -ne $Device) {
            $devicesToProcess += $d
        }
    }
}
else {
    $devicesToProcess = @($DEVICES.Keys)
}

if ($Force) {
    Header "Cleaning old keys and configs"
    Invoke-Cleanup
}

# Generate or load keys for all devices
$allKeys = @{}

foreach ($d in $devicesToProcess) {
    $info = $DEVICES[$d]
    Info "Processing $d ($($info.ip)) ..."

    $keys = Get-OrGenerateKeys -Device $d -ForceRegen $Force

    if ($Force) {
        Info "  Generated NEW key pair"
    }
    else {
        $existing = Load-Keys $d
        if ($existing) {
            Info "  Loaded existing key"
        }
        else {
            Info "  Generated new key pair"
        }
    }

    $allKeys[$d] = @{
        PrivateKey = $keys.PrivateKey
        PublicKey  = $keys.PublicKey
    }
}

# If single device mode, load other devices' keys for config generation
if ($Device) {
    foreach ($d in $DEVICES.Keys) {
        if (-not $allKeys.ContainsKey($d)) {
            $loaded = Load-Keys $d
            if ($loaded) {
                $allKeys[$d] = @{
                    PrivateKey = $loaded.PrivateKey
                    PublicKey  = $loaded.PublicKey
                }
            }
        }
    }
}

# Generate configs
Header "Generating wg0.conf files"
Generate-AllConfigs $allKeys

# Summary
Header "Summary"
Ok "Processed $($devicesToProcess.Count) device(s)"
Ok "Keys saved to: wireguard/keys/"
Ok "Configs saved to: wireguard/keys/_configs/"

Show-Status
