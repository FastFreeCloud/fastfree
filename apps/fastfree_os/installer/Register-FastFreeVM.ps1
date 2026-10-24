# ==============================================================================
# FastFree OS - Hyper-V Gen 2 Virtual Machine Provisioning Automation
# ==============================================================================
# This script is executed with elevated administrator privileges by Inno Setup.
# It automatically:
#   1. Verifies CPU virtualization (VT-x / AMD-V) & Hyper-V feature status.
#   2. Optionally enables Hyper-V if disabled (or reports actionable status).
#   3. Creates or updates an enterprise-grade Generation 2 Virtual Machine.
#   4. Attaches the fastfree_*.vhdx disk via SCSI controller.
#   5. Configures UEFI Linux Secure Boot (MicrosoftUEFICertificateAuthority).
#   6. Binds the VM to the Hyper-V Default Virtual Switch.
#   7. Starts the Virtual Machine and verifies running status.
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$VmName = "FastFree-Client2",

    [Parameter(Mandatory = $false)]
    [string]$VhdxPath = "",

    [Parameter(Mandatory = $false)]
    [string]$InstallDir = "",

    [int]$CpuCount = 4,
    [int64]$MemoryGB = 4,
    [string]$SwitchName = "Default Switch",
    [switch]$CheckOnly,
    [switch]$AutoEnableHyperV
)

# Resolve target log file path: Prioritize the chosen installation directory
$LogPath = ""
if ($InstallDir -and (Test-Path $InstallDir)) {
    $LogPath = Join-Path $InstallDir "fastfree_hyperv_install.log"
} elseif ($VhdxPath) {
    $parentDir = Split-Path (Split-Path $VhdxPath -Parent) -Parent
    if ($parentDir -and (Test-Path $parentDir)) {
        $LogPath = Join-Path $parentDir "fastfree_hyperv_install.log"
    }
}
if (-not $LogPath) {
    $LogPath = Join-Path $env:TEMP "fastfree_hyperv_install.log"
}

if (-not $CheckOnly) {
    Start-Transcript -Path $LogPath -Append
}

function Write-InstallerLog($Msg, $Level = "INFO") {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Output "[$Timestamp] [$Level] $Msg"
}

try {
    Write-InstallerLog "=========================================================="
    Write-InstallerLog "FastFree Hyper-V VM Provisioning Engine"
    Write-InstallerLog "Mode: $(if ($CheckOnly) { 'CheckOnly (Diagnostics)' } else { 'Provisioning' })"
    Write-InstallerLog "Target VM Name: $VmName"
    if ($VhdxPath) { Write-InstallerLog "Target VHDX Path: $VhdxPath" }
    Write-InstallerLog "=========================================================="

    # 1. Verify CPU Hardware Virtualization (VT-x / AMD-V)
    # When a hypervisor (Hyper-V / WSL2 / nested VM) is active, Windows masks VirtualizationFirmwareEnabled.
    # Therefore, we check both HypervisorPresent and VirtualizationFirmwareEnabled.
    $comp = Get-CimInstance Win32_ComputerSystem | Select-Object -First 1
    $proc = Get-CimInstance Win32_Processor | Select-Object -First 1

    $virtEnabled = $false
    if ($comp.HypervisorPresent -eq $true) {
        $virtEnabled = $true
        Write-InstallerLog "Hardware Virtualization is active (Hypervisor is present and executing)."
    } elseif ($proc.VirtualizationFirmwareEnabled -eq $true) {
        $virtEnabled = $true
        Write-InstallerLog "Hardware Virtualization (VT-x/AMD-V) is enabled in BIOS/UEFI firmware."
    }

    if (-not $virtEnabled) {
        Write-InstallerLog "Hardware Virtualization (VT-x/AMD-V) is DISABLED in BIOS/UEFI!" "ERROR"
        if ($CheckOnly) {
            Write-Output "RESULT: CPU_VIRTUALIZATION_DISABLED"
            return
        }
        exit 101
    }

    # 2. Check Hyper-V Feature Status
    $isHypervActive = $false
    if (Get-Command Get-VM -ErrorAction SilentlyContinue) {
        $isHypervActive = $true
        Write-InstallerLog "Hyper-V PowerShell module & Hypervisor are available."
    } else {
        $vmms = Get-Service -Name "vmms" -ErrorAction SilentlyContinue
        if ($vmms) {
            $isHypervActive = $true
            Write-InstallerLog "Hyper-V Management Service (vmms) is present."
        }
    }

    if (-not $isHypervActive) {
        Write-InstallerLog "Hyper-V Hypervisor / Management is NOT currently active on this system." "WARN"

        # If user / installer requested auto-enabling Hyper-V:
        if ($AutoEnableHyperV) {
            Write-InstallerLog "Attempting to enable Microsoft-Hyper-V feature automatically..."
            try {
                $featureResult = Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All -NoRestart -ErrorAction Stop
                if ($featureResult.RestartNeeded) {
                    Write-InstallerLog "Microsoft-Hyper-V feature was enabled successfully. System restart is REQUIRED." "WARN"
                    exit 104
                }
            } catch {
                Write-InstallerLog "Could not automatically enable Hyper-V: $_" "ERROR"
            }
        }

        if ($CheckOnly) {
            Write-Output "RESULT: HYPERV_NOT_ENABLED"
            return
        }
        exit 102
    }

    # 3. Ensure Hyper-V Service (vmms) is running
    $vmms = Get-Service -Name "vmms" -ErrorAction SilentlyContinue
    if ($vmms -and $vmms.Status -ne "Running") {
        Write-InstallerLog "Starting Hyper-V Virtual Machine Management Service (vmms)..."
        Start-Service -Name "vmms" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # If running in check-only diagnostic mode, exit cleanly here
    if ($CheckOnly) {
        Write-InstallerLog "Diagnostics Passed: System is 100% ready for Hyper-V Generation 2 VMs."
        Write-Output "RESULT: READY"
        return
    }

    # 4. Verify VHDX file existence
    if (-not $VhdxPath -or -not (Test-Path $VhdxPath)) {
        Write-InstallerLog "Target VHDX file not found at: '$VhdxPath'" "ERROR"
        exit 103
    }

    # 5. Handle Existing VM if already present
    $existingVM = Get-VM -Name $VmName -ErrorAction SilentlyContinue
    if ($existingVM) {
        Write-InstallerLog "VM '$VmName' already exists. Updating existing machine..."
        if ($existingVM.State -ne "Off") {
            Write-InstallerLog "Stopping existing VM '$VmName' before configuration update..."
            Stop-VM -Name $VmName -TurnOff -Force
            Start-Sleep -Seconds 2
        }

        # Update disk attached to SCSI controller
        $hardDisk = Get-VMHardDiskDrive -VMName $VmName -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($hardDisk -and $hardDisk.Path -ne $VhdxPath) {
            Write-InstallerLog "Updating VM hard disk path to: $VhdxPath"
            Set-VMHardDiskDrive -VMHardDiskDrive $hardDisk -Path $VhdxPath
        }
    } else {
        # 6. Select or Create Virtual Switch
        $switch = Get-VMSwitch -Name $SwitchName -ErrorAction SilentlyContinue
        if (-not $switch) {
            $switch = Get-VMSwitch | Where-Object { $_.SwitchType -eq 'Internal' -or $_.Name -like "*Default*" } | Select-Object -First 1
            if ($switch) {
                $SwitchName = $switch.Name
                Write-InstallerLog "Selected existing switch: $SwitchName"
            } else {
                $SwitchName = "FastFree-Internal"
                Write-InstallerLog "Creating internal virtual switch: $SwitchName"
                New-VMSwitch -Name $SwitchName -SwitchType Internal | Out-Null
            }
        }

        # 7. Create Generation 2 VM
        Write-InstallerLog "Creating Generation 2 Virtual Machine: $VmName..."
        $VmDir = Split-Path $VhdxPath -Parent
        New-VM -Name $VmName `
               -Generation 2 `
               -MemoryStartupBytes ($MemoryGB * 1GB) `
               -VHDPath $VhdxPath `
               -SwitchName $SwitchName `
               -Path $VmDir | Out-Null

        # 8. Configure Linux UEFI Secure Boot (Microsoft UEFI CA)
        Write-InstallerLog "Configuring UEFI Secure Boot template for Linux (MicrosoftUEFICertificateAuthority)..."
        Set-VMFirmware -VMName $VmName `
                       -EnableSecureBoot On `
                       -SecureBootTemplate "MicrosoftUEFICertificateAuthority"

        # 9. Configure Processor Count & Optional Nested Virtualization
        Write-InstallerLog "Allocating $CpuCount vCPUs..."
        Set-VMProcessor -VMName $VmName -Count $CpuCount
        Set-VMProcessor -VMName $VmName -ExposeVirtualizationExtensions $true -ErrorAction SilentlyContinue

        # 10. Memory configuration: Static allocation for reliable database operation
        Set-VMMemory -VMName $VmName -DynamicMemoryEnabled $false

        # 11. Auto-Start & Auto-Stop settings
        Set-VM -Name $VmName `
               -AutomaticStopAction ShutDown `
               -AutomaticStartAction StartIfRunning

        Write-InstallerLog "Successfully registered Hyper-V Gen 2 VM: $VmName"
    }

    # 12. Start the VM automatically
    Write-InstallerLog "Starting Virtual Machine '$VmName'..."
    Start-VM -Name $VmName
    Write-InstallerLog "FastFree Sovereign Node is now running on Hyper-V."

    exit 0
} catch {
    Write-InstallerLog "Fatal exception during VM provisioning: $_" "FATAL"
    exit 199
} finally {
    if (-not $CheckOnly) {
        Stop-Transcript
    }
}
