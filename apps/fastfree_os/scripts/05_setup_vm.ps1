# ═══════════════════════════════════════════════════════════════
# FastFree — Setup Hyper-V VM
# ═══════════════════════════════════════════════════════════════
# Run from PowerShell (as Administrator):
#   .\05_setup_vm.ps1
#   .\05_setup_vm.ps1 -VMName "FastFree-Prod" -Memory 8GB -DiskSize 100GB
# ═══════════════════════════════════════════════════════════════

param(
    [string]$ClientName = "dev",
    [string]$VMName     = "FastFree-Dev",
    [string]$Memory     = "4GB",
    [string]$DiskSize   = "50GB",
    [string]$SwitchName = "Default Switch"
)

$ErrorActionPreference = "Stop"
$REPO     = "D:\2026\fastfree\dev\fastfree_os"
$RESULT   = "$REPO\result"
$LOG_DIR  = "$PSScriptRoot\logs"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE = "$LOG_DIR\setup_vm_$TIMESTAMP.log"

# ── Helpers ────────────────────────────────────────────────────
function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg" -ForegroundColor DarkGray
    "[$ts] $msg" | Out-File -Append $LOG_FILE
}
function Ok($msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
    "  ✓ $msg" | Out-File -Append $LOG_FILE
}
function Fail($msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
    "  ✗ $msg" | Out-File -Append $LOG_FILE
}
function Warn($msg) {
    Write-Host "  ⚠ $msg" -ForegroundColor Yellow
    "  ⚠ $msg" | Out-File -Append $LOG_FILE
}
function Header($msg) {
    Write-Host ""
    Write-Host "═══ $msg ═══" -ForegroundColor Cyan
    "═══ $msg ═══" | Out-File -Append $LOG_FILE
}

# ── Setup ──────────────────────────────────────────────────────
if (!(Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  FastFree — Setup Hyper-V VM" -ForegroundColor Cyan
Write-Host "  $(Get-Date)" -ForegroundColor DarkGray
Write-Host "  VM: $VMName | Client: $ClientName" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Find VHDX Archive
# ═══════════════════════════════════════════════════════════════
Header "STEP 1/6: Find VHDX Archive"

$vhdx7z = $null
$searchPaths = @(
    "$RESULT\fastfree_$ClientName.vhdx.7z",
    "$RESULT\fastfree_dev.vhdx.7z",
    "$RESULT\fastfree.vhdx.7z"
)

foreach ($p in $searchPaths) {
    if (Test-Path $p) {
        $vhdx7z = $p
        break
    }
}

if ($vhdx7z) {
    Ok "Found: $vhdx7z"
} else {
    Fail "No VHDX archive found in $RESULT"
    Fail "Expected: fastfree_$ClientName.vhdx.7z or fastfree_dev.vhdx.7z"
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 2: Extract VHDX
# ═══════════════════════════════════════════════════════════════
Header "STEP 2/6: Extract VHDX"

# Find 7-Zip
$sevenZip = $null
$sevenZipPaths = @(
    "C:\Program Files\7-Zip\7z.exe",
    "C:\Program Files (x86)\7-Zip\7z.exe",
    "$env:ProgramFiles\7-Zip\7z.exe"
)
foreach ($z in $sevenZipPaths) {
    if (Test-Path $z) {
        $sevenZip = $z
        break
    }
}

if (!$sevenZip) {
    # Try PATH
    $sevenZip = Get-Command 7z.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if (!$sevenZip) {
        $sevenZip = Get-Command 7z -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    }
}

if (!$sevenZip) {
    Fail "7-Zip not found!"
    Fail "Install from https://7-zip.org or check C:\Program Files\7-Zip\"
    exit 1
}
Ok "7-Zip: $sevenZip"

# VM paths
$vmPath   = "$env:LOCALAPPDATA\Microsoft\Windows\Hyper-V\FastFree\$VMName"
$vhdPath  = "$vmPath\$VMName.vhdx"
New-Item -ItemType Directory -Path $vmPath -Force | Out-Null

# Check if VHDX already extracted
$vhdxBase = [System.IO.Path]::GetFileNameWithoutExtension($vhdx7z)  # fastfree_dev.vhdx (which is actually inside .7z)
# Inside the 7z, the file is named fastfree_dev.vhdx (or fastfree_client1.vhdx, etc.)
# We will extract it directly to the writable VM path
$extractedVhdxName = $vhdxBase.Replace(".vhdx", "") # base name inside 7z
$extractedVhdxPath = "$vmPath\$vhdxBase"

if (Test-Path $vhdPath) {
    Ok "VHDX already present in VM directory: $vhdPath"
} else {
    Log "Extracting $vhdx7z to $vmPath..."
    & $sevenZip x "$vhdx7z" -p"FastOS@2026" -o"$vmPath" -y 2>&1 | Out-File -Append $LOG_FILE
    
    # Check if extracted file exists and rename it to match the VMName
    $tempExtractedPath = "$vmPath\$extractedVhdxName"
    if (Test-Path $tempExtractedPath) {
        Rename-Item -Path $tempExtractedPath -NewName "$VMName.vhdx" -Force
    }
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $vhdPath)) {
        Ok "Extracted and set up: $vhdPath"
    } else {
        Fail "Extraction failed!"
        exit 1
    }
}

$diskSizeBytes = (Get-Item $vhdPath).Length
$diskSizeMB    = [math]::Round($diskSizeBytes / 1MB, 1)
Log "VHDX size: ${diskSizeMB} MB"

# ═══════════════════════════════════════════════════════════════
# STEP 3: Check Hyper-V
# ═══════════════════════════════════════════════════════════════
Header "STEP 3/6: Check Hyper-V"

$hvFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction SilentlyContinue
if ($hvFeature -and $hvFeature.State -eq "Enabled") {
    Ok "Hyper-V is enabled"
} else {
    Fail "Hyper-V is not enabled!"
    Fail "Run: Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All"
    exit 1
}

# Check RunAs Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (!$isAdmin) {
    Fail "This script must be run as Administrator!"
    exit 1
}
Ok "Running as Administrator"

# ═══════════════════════════════════════════════════════════════
# STEP 4: Stop & Remove Existing VM
# ═══════════════════════════════════════════════════════════════
Header "STEP 4/6: Stop & Remove Existing VM"

$existingVM = Get-VM -Name $VMName -ErrorAction SilentlyContinue
if ($existingVM) {
    if ($existingVM.State -eq "Running") {
        Log "Stopping VM: $VMName ..."
        Stop-VM -Name $VMName -Force -ErrorAction SilentlyContinue
        Ok "VM stopped"
    }

    # Remove all checkpoints/snapshots
    $checkpoints = Get-VMSnapshot -VMName $VMName -ErrorAction SilentlyContinue
    foreach ($cp in $checkpoints) {
        Remove-VMSnapshot -Name $cp.Name -VMName $VMName -ErrorAction SilentlyContinue
    }

    # Remove existing VHDX files from VM folder (using standard hard disk drive cmdlet)
    $existingHDs = Get-VMHardDiskDrive -VMName $VMName -ErrorAction SilentlyContinue
    foreach ($hd in $existingHDs) {
        if (Test-Path $hd.Path) {
            Remove-Item -Path $hd.Path -Force -ErrorAction SilentlyContinue
            Log "Removed old VHDX: $($hd.Path)"
        }
    }

    Remove-VM -Name $VMName -Force -ErrorAction SilentlyContinue
    Ok "Existing VM removed"
} else {
    Ok "No existing VM named '$VMName'"
}

# ═══════════════════════════════════════════════════════════════
# STEP 5: Create New VM
# ═══════════════════════════════════════════════════════════════
Header "STEP 5/6: Create New VM"

# Parse memory
$memoryBytes = 0
if ($Memory -match '^\d+GB$') {
    $memoryBytes = [int]($Memory -replace 'GB','') * 1GB
} elseif ($Memory -match '^\d+MB$') {
    $memoryBytes = [int]($Memory -replace 'MB','') * 1MB
} else {
    $memoryBytes = [long]$Memory
}
$memoryMB = [math]::Round($memoryBytes / 1MB)
Log "Memory: ${memoryMB} MB"

# Parse disk size
$diskSizeMB = 0
if ($DiskSize -match '^\d+GB$') {
    $diskSizeMB = [int]($DiskSize -replace 'GB','') * 1024
} elseif ($DiskSize -match '^\d+MB$') {
    $diskSizeMB = [int]($DiskSize -replace 'MB','')
} else {
    $diskSizeMB = [int]$DiskSize
}
Log "Disk size: ${diskSizeMB} MB"

# Create VM without attaching an empty disk first
Log "Creating VM: $VMName ..."
New-VM -Name $VMName `
       -Path "$env:LOCALAPPDATA\Microsoft\Windows\Hyper-V\FastFree" `
       -Generation 2 `
       -MemoryStartupBytes $memoryBytes `
       -SwitchName $SwitchName | Out-Null
Ok "VM created: $VMName (Gen 2)"

# Disable dynamic memory
Set-VMMemory -VMName $VMName -DynamicMemoryEnabled $false
Ok "Dynamic memory disabled"

# Set processor count
Set-VMProcessor -VMName $VMName -Count 2
Ok "Processor count: 2"

# Attach extracted VHDX
Add-VMHardDiskDrive -VMName $VMName `
                     -ControllerType SCSI `
                     -ControllerNumber 0 `
                     -ControllerLocation 0 `
                     -Path $vhdPath
Ok "VHDX attached"

# Set boot order (disk first)
$hdd = Get-VMHardDiskDrive -VMName $VMName -ControllerNumber 0
Set-VMFirmware -VMName $VMName -FirstBootDevice $hdd
Ok "Boot order: disk first"

# Disable Secure Boot (NixOS systemd-boot / GRUB is not signed by Microsoft keys by default)
Set-VMFirmware -VMName $VMName -EnableSecureBoot Off
Ok "Secure Boot disabled (NixOS UEFI compatibility)"

# Enable TPM (if available)
try {
    Enable-VMTPM -VMName $VMName -ErrorAction Stop
    Ok "TPM enabled"
} catch {
    Warn "TPM not available (Windows 11 may require it)"
}

# Enable Guest Services
Enable-VMIntegrationService -VMName $VMName -Name "Guest Service Interface" -ErrorAction SilentlyContinue
Ok "Guest Services enabled"

# Set checkpoint type
Set-VM -Name $VMName -CheckpointType Standard -AutomaticCheckpointsEnabled $false
Ok "Checkpoints: Standard"

# ═══════════════════════════════════════════════════════════════
# STEP 6: Start VM
# ═══════════════════════════════════════════════════════════════
Header "STEP 6/6: Start VM"

Log "Starting VM: $VMName ..."
Start-VM -Name $VMName -ErrorAction Stop
Ok "VM started"

# Wait for VM to boot
Log "Waiting for VM to boot (30s) ..."
Start-Sleep -Seconds 30

# Check VM state
$vmState = (Get-VM -Name $VMName).State
Log "VM state: $vmState"
if ($vmState -ne "Running") {
    Warn "VM is not running! State: $vmState"
}

# Try to get IP via PowerShell Direct (if Guest Services enabled)
$ipAddress = $null
try {
    $ipAddress = (Get-VMNetworkAdapter -VMName $VMName | Select-Object -First 1).IPAddresses | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1
} catch {}

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
Header "SUMMARY"

Write-Host ""
Write-Host "  VM Created Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  VM Name:     $VMName" -ForegroundColor White
Write-Host "  Memory:      ${memoryMB} MB (static)" -ForegroundColor White
Write-Host "  Processors:  2" -ForegroundColor White
Write-Host "  Disk:        ${diskSizeMB} MB ($DiskSize)" -ForegroundColor White
Write-Host "  Network:     $SwitchName" -ForegroundColor White
if ($ipAddress) {
    Write-Host "  IP Address:  $ipAddress" -ForegroundColor White
}
Write-Host ""
Write-Host "  ── Connection Info ──" -ForegroundColor Cyan
if ($ipAddress) {
    Write-Host "  SSH:    ssh root@$ipAddress" -ForegroundColor White
    Write-Host "  SSH:    ssh root://${VMName}.local" -ForegroundColor White
} else {
    Write-Host "  IP not available yet. Check Hyper-V Manager or wait for mDNS." -ForegroundColor Yellow
    Write-Host "  SSH:    ssh root@${VMName}.local" -ForegroundColor White
}
Write-Host ""
Write-Host "  ── Hyper-V Manager ──" -ForegroundColor Cyan
Write-Host "  Open:   virtmgmt.msc" -ForegroundColor White
Write-Host "  Connect: vmconnect.exe localhost $VMName" -ForegroundColor White
Write-Host ""
Write-Host "  Log: $LOG_FILE" -ForegroundColor DarkGray
Write-Host "  Completed: $(Get-Date)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
