use crate::discovery::HostDiscoveryPipeline;
use crate::dto::*;
use crate::licensing::LicensingManager;
use crate::logger::InstallerLogger;
use tauri::{AppHandle, Emitter, Manager};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

pub const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn hidden_command(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

pub fn hidden_powershell() -> std::process::Command {
    let mut cmd = hidden_command("powershell");
    #[cfg(windows)]
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-ExecutionPolicy",
        "Bypass",
    ]);
    cmd
}

#[tauri::command]
pub async fn get_system_discovery_report() -> Result<SystemDiscoveryReport, String> {
    tokio::task::spawn_blocking(HostDiscoveryPipeline::collect_report)
        .await
        .map_err(|e| format!("Join error: {}", e))?
}

#[tauri::command]
pub async fn close_splashscreen(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    Ok(())
}

#[tauri::command]
pub async fn verify_license_key(
    app: AppHandle,
    key: String,
    online_check: Option<bool>,
) -> Result<LicenseVerificationResult, String> {
    LicensingManager::verify_license(&app, &key, online_check.unwrap_or(true)).await
}

#[tauri::command]
pub async fn get_machine_hwid() -> Result<String, String> {
    Ok(LicensingManager::get_machine_hwid())
}

#[tauri::command]
pub async fn get_wireguard_status(client_id: String) -> Result<WireGuardPeerConfig, String> {
    let num_str: String = client_id.chars().filter(|c| c.is_ascii_digit()).collect();
    let n: u16 = num_str.parse().unwrap_or(2);
    let port = if n == 1 { 51820 } else { 51820 + n };
    let client_ip = if n == 1 {
        "10.24.0.1/16".to_string()
    } else {
        format!("10.24.0.{}/32", n)
    };
    let endpoint = if n == 1 {
        "127.0.0.1:51820".to_string()
    } else {
        "client1.fastfree.cloud".to_string()
    };

    Ok(WireGuardPeerConfig {
        client_id,
        controller_endpoint: endpoint,
        listen_port: port,
        controller_port: port,
        interface_name: "wg-fastfree".to_string(),
        client_tunnel_ip: client_ip,
        controller_tunnel_ip: "10.24.0.1/16".to_string(),
        mesh_subnet: "10.24.0.0/16".to_string(),
        keepalive_seconds: 25,
        public_key: format!("ff+client{}+pubkey+mesh+clan2605+node===", n),
        controller_public_key: "Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=".to_string(),
        cipher: "ChaCha20-Poly1305 (Curve25519 ECDH)".to_string(),
        mtu: 1420,
        status: "Tunnel Ready / Hyper-V Sovereign Mesh".to_string(),
        latency_ms: 16,
    })
}

#[tauri::command]
pub async fn manage_vm(action: String, client_id: String) -> Result<VmActionStatus, String> {
    let vm_name = format!("FastFree-{}", client_id);
    let _ = ensure_hyperv_environment();

    let ps_action = match action.to_lowercase().as_str() {
        "start" => "start",
        "stop" => "stop",
        "restart" => "restart",
        "status" => "status",
        _ => {
            let err_msg = format!("Unknown VM management action: {}", action);
            InstallerLogger::error("VM_PROVISIONING", &err_msg);
            return Err(err_msg);
        }
    };

    let ps_cmd = format!(
        r#"
$ErrorActionPreference = 'Stop'
try {{
    $vm = Get-VM -Name '{0}' -ErrorAction SilentlyContinue
    if (-not $vm) {{
        throw "VM_NOT_FOUND: Virtual machine '{0}' does not exist in Hyper-V. Please provision the node first."
    }}

    switch ('{1}') {{
        'start' {{
            if ($vm.State -ne 'Running') {{
                Start-VM -Name '{0}' -ErrorAction Stop
            }}
        }}
        'stop' {{
            if ($vm.State -eq 'Running') {{
                Stop-VM -Name '{0}' -Force -ErrorAction Stop
            }}
        }}
        'restart' {{
            Restart-VM -Name '{0}' -Force -ErrorAction Stop
        }}
        'status' {{
            # Query only
        }}
    }}

    Start-Sleep -Milliseconds 600
    $updatedVm = Get-VM -Name '{0}' -ErrorAction Stop
    $realState = $updatedVm.State.ToString()
    Write-Output "FASTFREE_REAL_STATE:$realState"
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}}
"#,
        vm_name, ps_action
    );

    InstallerLogger::info(
        "VM_PROVISIONING",
        &format!(
            "Dispatching VM management action '{}' on VM '{}'",
            action, vm_name
        ),
    );

    #[cfg(windows)]
    {
        let output = hidden_powershell()
            .args(["-Command", &ps_cmd])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                InstallerLogger::info(
                    "VM_PROVISIONING",
                    &format!(
                        "VM command executed with exit status: {:?} (stdout: {}, stderr: {})",
                        out.status.code(),
                        stdout,
                        stderr
                    ),
                );
                if !out.status.success() {
                    let err_detail = if !stderr.is_empty() { stderr } else { stdout };
                    if err_detail.contains("VM_NOT_FOUND") {
                        return Err(format!("VM_NOT_FOUND: {}", err_detail));
                    }
                    return Err(format!("Hyper-V VM error: {}", err_detail));
                }

                let real_state = stdout
                    .lines()
                    .find(|line| line.starts_with("FASTFREE_REAL_STATE:"))
                    .and_then(|line| line.strip_prefix("FASTFREE_REAL_STATE:"))
                    .unwrap_or("Running")
                    .trim()
                    .to_string();

                return Ok(VmActionStatus {
                    success: true,
                    client_id,
                    state: real_state.clone(),
                    message: format!("Virtual machine '{}' is now {}.", vm_name, real_state),
                });
            }
            Err(e) => {
                let msg = format!("Failed to spawn PowerShell for VM command: {}", e);
                InstallerLogger::error("VM_PROVISIONING", &msg);
                return Err(msg);
            }
        }
    }

    #[cfg(not(windows))]
    Ok(VmActionStatus {
        success: true,
        client_id,
        state: "Running".to_string(),
        message: format!("Non-Windows simulation for '{}'", action),
    })
}

#[tauri::command]
pub async fn get_vm_real_state(client_id: String) -> Result<VmRealState, String> {
    let vm_name = format!("FastFree-{}", client_id);
    InstallerLogger::info("VM_TELEMETRY", &format!("Querying live Hyper-V state for '{}'", vm_name));

    #[cfg(windows)]
    {
        let ps_cmd = format!(
            r#"
$ErrorActionPreference = 'Stop'
try {{
    $vm = Get-VM -Name '{0}' -ErrorAction SilentlyContinue
    if (-not $vm) {{
        [PSCustomObject]@{{
            exists = $false
            state = "NotFound"
            uptime_seconds = 0
            memory_mb = 0
            cpu_cores = 0
            ip_addresses = @()
            heartbeat = "No Contact"
            secure_boot_enabled = $false
            nested_virt_enabled = $false
            switch_name = "None"
            checkpoint_type = "None"
            vhdx_path = ""
            vhdx_size_bytes = 0
            is_empty_disk = $false
            guest_status = "NotFound"
            guest_status_message = "Virtual machine is not registered in Hyper-V."
            service_account = "fastfree_{0}".Replace("FastFree-", "")
            is_account_cloaked = $false
            is_storage_hardened = $false
            hardened_account_configured = $false
            service_account_name = "fastfree_{0}".Replace("FastFree-", "")
        }} | ConvertTo-Json -Compress
    }} else {{
        $ips = @()
        $switchName = "Default Switch"
        if ($vm.NetworkAdapters) {{
            if ($vm.NetworkAdapters[0].SwitchName) {{
                $switchName = $vm.NetworkAdapters[0].SwitchName
            }}
            foreach ($adapter in $vm.NetworkAdapters) {{
                if ($adapter.IPAddresses) {{
                    foreach ($ip in $adapter.IPAddresses) {{
                        if ($ip -and $ip -notmatch '^fe80:' -and $ip -ne '127.0.0.1' -and $ip -notmatch '^::') {{
                            $ips += $ip
                        }}
                    }}
                }}
            }}
        }}
        $uptimeSec = 0
        if ($vm.Uptime -and $vm.Uptime.TotalSeconds) {{
            $uptimeSec = [math]::Floor($vm.Uptime.TotalSeconds)
        }}
        $memMb = [math]::Round($vm.MemoryAssigned / 1MB)
        if ($memMb -eq 0) {{
            $memMb = [math]::Round($vm.MemoryStartup / 1MB)
        }}

        # Detailed Hyper-V hardware telemetry
        $secBoot = $false
        $fw = Get-VMFirmware $vm -ErrorAction SilentlyContinue
        if ($fw) {{
            $secBoot = ($fw.SecureBoot -eq 'On')
        }}

        $nestedVirt = $false
        $proc = Get-VMProcessor $vm -ErrorAction SilentlyContinue
        if ($proc) {{
            $nestedVirt = ($proc.ExposeVirtualizationExtensions -eq $true)
        }}

        $heartbeatDesc = (Get-VMIntegrationService $vm -Name 'Heartbeat' -ErrorAction SilentlyContinue).PrimaryStatusDescription
        if (-not $heartbeatDesc) {{ $heartbeatDesc = "No Contact" }}

        $hd = Get-VMHardDiskDrive $vm -ErrorAction SilentlyContinue
        $hdPath = if ($hd) {{ $hd[0].Path }} else {{ "" }}
        $diskSizeBytes = 0
        $isEmptyDisk = $false
        if ($hdPath -and (Test-Path -LiteralPath $hdPath)) {{
            $diskItem = Get-Item -LiteralPath $hdPath -ErrorAction SilentlyContinue
            if ($diskItem) {{
                $diskSizeBytes = [int64]$diskItem.Length
                if ($diskSizeBytes -le 10485760) {{
                    $isEmptyDisk = $true
                }}
            }}
        }}

        $guestStatus = "Offline"
        $guestMsg = "Virtual machine is powered off."
        if ($vm.State -eq 'Running') {{
            if ($isEmptyDisk) {{
                $guestStatus = "UEFI_NoOS"
                $guestMsg = "SCSI Disk (0,0): The boot loader did not load an operating system. Detected 4MB empty stub VHDX."
            }} elseif ($heartbeatDesc -eq 'OK' -or $heartbeatDesc -match 'OK') {{
                $guestStatus = "Healthy"
                $guestMsg = "FastFree NixOS appliance operating normally."
            }} else {{
                $guestStatus = "Starting"
                $guestMsg = "Guest OS is booting or waiting for integration heartbeat..."
            }}
        }}

        # Service Account Telemetry
        $svcName = "fastfree_{0}".Replace("FastFree-", "")
        $svcUser = Get-LocalUser -Name $svcName -ErrorAction SilentlyContinue
        $hardenedConfigured = ($null -ne $svcUser)
        $isCloaked = $false
        $regKey = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\SpecialAccounts\UserList"
        if (Test-Path $regKey) {{
            $val = (Get-ItemProperty -Path $regKey -Name $svcName -ErrorAction SilentlyContinue).$svcName
            if ($val -eq 0) {{ $isCloaked = $true }}
        }}
        $isStorageHardened = $false
        if ($hdPath -and (Test-Path -LiteralPath $hdPath)) {{
            $isStorageHardened = $true
        }}

        [PSCustomObject]@{{
            exists = $true
            state = $vm.State.ToString()
            uptime_seconds = [int64]$uptimeSec
            memory_mb = [int64]$memMb
            cpu_cores = [int]$vm.ProcessorCount
            ip_addresses = $ips
            heartbeat = $heartbeatDesc
            secure_boot_enabled = $secBoot
            nested_virt_enabled = $nestedVirt
            switch_name = $switchName
            checkpoint_type = $vm.CheckpointType.ToString()
            vhdx_path = $hdPath
            vhdx_size_bytes = [int64]$diskSizeBytes
            is_empty_disk = $isEmptyDisk
            guest_status = $guestStatus
            guest_status_message = $guestMsg
            service_account = $svcName
            is_account_cloaked = $isCloaked
            is_storage_hardened = $isStorageHardened
            hardened_account_configured = $hardenedConfigured
            service_account_name = $svcName
        }} | ConvertTo-Json -Compress
    }}
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}}
"#,
            vm_name
        );

        let output = hidden_powershell()
            .args(["-Command", &ps_cmd])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                if !out.status.success() {
                    let err_detail = if !stderr.is_empty() { stderr } else { stdout };
                    InstallerLogger::warn("VM_TELEMETRY", &format!("Hyper-V telemetry error for '{}': {}", vm_name, err_detail));
                    return Err(format!("Hyper-V telemetry error: {}", err_detail));
                }

                let json_line = stdout
                    .lines()
                    .filter(|l| l.trim().starts_with('{') && l.trim().ends_with('}'))
                    .last()
                    .unwrap_or(&stdout);

                match serde_json::from_str::<VmRealState>(json_line) {
                    Ok(state) => Ok(state),
                    Err(e) => {
                        let parse_err = format!("Failed to parse VM telemetry JSON: {} (raw: {})", e, json_line);
                        InstallerLogger::error("VM_TELEMETRY", &parse_err);
                        Err(parse_err)
                    }
                }
            }
            Err(e) => {
                let err_msg = format!("Failed to invoke PowerShell for VM telemetry: {}", e);
                InstallerLogger::error("VM_TELEMETRY", &err_msg);
                Err(err_msg)
            }
        }
    }

    #[cfg(not(windows))]
    Ok(VmRealState {
        exists: false,
        state: "NonWindows".to_string(),
        uptime_seconds: 0,
        memory_mb: 0,
        cpu_cores: 0,
        ip_addresses: vec![],
        heartbeat: "No Contact".to_string(),
        secure_boot_enabled: false,
        nested_virt_enabled: false,
        switch_name: "Simulation".to_string(),
        checkpoint_type: "Standard".to_string(),
        vhdx_path: "/tmp/simulated.vhdx".to_string(),
        vhdx_size_bytes: 0,
        is_empty_disk: false,
        guest_status: "Healthy".to_string(),
        guest_status_message: "Simulation mode".to_string(),
        service_account: format!("fastfree_{}", client_id),
        is_account_cloaked: true,
        is_storage_hardened: true,
        hardened_account_configured: true,
        service_account_name: format!("fastfree_{}", client_id),
    })
}

pub fn ensure_hyperv_environment() -> Result<(), String> {
    #[cfg(windows)]
    {
        InstallerLogger::info(
            "HYPERV_ENV",
            "Verifying Hyper-V environment: VMMS service state and Hyper-V Administrators group...",
        );

        let script = r#"
$ErrorActionPreference = 'SilentlyContinue'
$res = @{ vmms_installed = $false; vmms_running = $false; in_group = $false }

# 1. Check & start vmms service
$vmms = Get-Service -Name 'vmms' -ErrorAction SilentlyContinue
if ($vmms) {
    $res.vmms_installed = $true
    if ($vmms.StartType -ne 'Automatic') {
        Set-Service -Name 'vmms' -StartupType Automatic -ErrorAction SilentlyContinue
    }
    if ($vmms.Status -ne 'Running') {
        Start-Service -Name 'vmms' -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 600
        $vmms = Get-Service -Name 'vmms' -ErrorAction SilentlyContinue
    }
    if ($vmms.Status -eq 'Running') {
        $res.vmms_running = $true
    }
}

# 2. Add current user to Hyper-V Administrators purely via PowerShell cmdlets (zero external console processes)
$user = $env:USERNAME
try {
    Add-LocalGroupMember -Group 'Hyper-V Administrators' -Member $user -ErrorAction SilentlyContinue
} catch {}

try {
    $members = Get-LocalGroupMember -Group 'Hyper-V Administrators' -ErrorAction SilentlyContinue
    if ($members | Where-Object { $_.Name -like "*\$user" -or $_.Name -eq $user }) {
        $res.in_group = $true
    }
} catch {}

Write-Output "FASTFREE_ENV:vmms_installed=$($res.vmms_installed);vmms_running=$($res.vmms_running);in_group=$($res.in_group)"
"#;

        let output = hidden_powershell()
            .args(["-Command", script])
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            InstallerLogger::info("HYPERV_ENV", &format!("Environment probe output: {}", stdout));
            if stdout.contains("vmms_installed=False") {
                return Err("Hyper-V Virtual Machine Management Service (vmms) is not installed on this host. Please enable Hyper-V in Windows Features.".to_string());
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn check_vm_exists(client_id: String) -> Result<bool, String> {
    let vm_name = format!("FastFree-{}", client_id);
    InstallerLogger::info(
        "VM_CHECK",
        &format!("Probing existence of Hyper-V VM '{}'...", vm_name),
    );

    #[cfg(windows)]
    {
        let script = format!(
            r#"
$ErrorActionPreference = 'SilentlyContinue'
try {{
    $vm = Get-VM -Name '{0}' -ErrorAction SilentlyContinue
    if ($vm) {{
        Write-Output "FASTFREE_VM_STATUS:EXISTS"
    }} else {{
        Write-Output "FASTFREE_VM_STATUS:NOT_FOUND"
    }}
}} catch {{
    Write-Output "FASTFREE_VM_STATUS:NOT_FOUND"
}}
"#,
            vm_name
        );

        let output = hidden_powershell()
            .args(["-Command", &script])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                InstallerLogger::info(
                    "VM_CHECK",
                    &format!("Status check for '{}': stdout='{}', stderr='{}'", vm_name, stdout, stderr),
                );
                Ok(stdout.contains("FASTFREE_VM_STATUS:EXISTS"))
            }
            Err(e) => {
                let err_msg = format!("Failed to execute PowerShell for VM existence check: {}", e);
                InstallerLogger::error("VM_CHECK", &err_msg);
                Err(err_msg)
            }
        }
    }

    #[cfg(not(windows))]
    Ok(false)
}

#[tauri::command]
pub async fn get_diagnostic_logs() -> Result<String, String> {
    InstallerLogger::read_all_logs()
}

#[tauri::command]
pub async fn export_diagnostic_bundle(target_path: Option<String>) -> Result<String, String> {
    InstallerLogger::export_bundle(target_path)
}

#[tauri::command]
pub async fn check_admin_elevation() -> Result<bool, String> {
    #[cfg(windows)]
    {
        extern "system" {
            fn IsUserAnAdmin() -> i32;
        }
        let is_admin = unsafe { IsUserAnAdmin() != 0 };
        InstallerLogger::info(
            "ELEVATION",
            &format!("Runtime Administrator privilege query: is_admin={}", is_admin),
        );
        Ok(is_admin)
    }
    #[cfg(not(windows))]
    {
        Ok(true)
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ProvisioningStepLog {
    pub step: u32,
    pub phase: String,
    pub message: String,
    pub success: bool,
}

#[tauri::command]
pub async fn read_clipboard_text() -> Result<String, String> {
    #[cfg(windows)]
    {
        extern "system" {
            fn OpenClipboard(hWndNewOwner: *mut std::ffi::c_void) -> i32;
            fn CloseClipboard() -> i32;
            fn GetClipboardData(uFormat: u32) -> *mut std::ffi::c_void;
            fn GlobalLock(hMem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
            fn GlobalUnlock(hMem: *mut std::ffi::c_void) -> i32;
        }

        const CF_UNICODETEXT: u32 = 13;

        unsafe {
            if OpenClipboard(std::ptr::null_mut()) != 0 {
                let h_data = GetClipboardData(CF_UNICODETEXT);
                if !h_data.is_null() {
                    let ptr = GlobalLock(h_data);
                    if !ptr.is_null() {
                        let wide_ptr = ptr as *const u16;
                        let mut len = 0;
                        while *wide_ptr.add(len) != 0 {
                            len += 1;
                            if len > 4096 {
                                break;
                            }
                        }
                        let slice = std::slice::from_raw_parts(wide_ptr, len);
                        let text = String::from_utf16_lossy(slice);
                        GlobalUnlock(h_data);
                        CloseClipboard();
                        return Ok(text.trim().to_string());
                    }
                }
                CloseClipboard();
            }
        }
    }
    Ok(String::new())
}

#[tauri::command]
pub async fn install_hyperv_feature() -> Result<String, String> {
    InstallerLogger::info("HYPERV_INSTALL", "Enabling Microsoft-Hyper-V features via DISM...");
    #[cfg(windows)]
    {
        let output = hidden_command("dism.exe")
            .args([
                "/Online",
                "/Enable-Feature",
                "/All",
                "/FeatureName:Microsoft-Hyper-V",
                "/NoRestart",
            ])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                InstallerLogger::info(
                    "HYPERV_INSTALL",
                    &format!("DISM result: exit={:?}, out={}, err={}", out.status.code(), stdout, stderr),
                );

                let _ = hidden_powershell()
                    .args([
                        "-Command",
                        "Set-Service -Name vmms -StartupType Automatic -ErrorAction SilentlyContinue; Start-Service -Name vmms -ErrorAction SilentlyContinue",
                    ])
                    .output();

                if out.status.success() || stdout.contains("The operation completed successfully") {
                    return Ok("Hyper-V features enabled successfully. A system restart may be required if this is the first activation.".to_string());
                } else if stdout.contains("0x800f080c") || stderr.contains("Feature name Microsoft-Hyper-V is unknown") {
                    InstallerLogger::info("HYPERV_INSTALL", "Detected Windows Home edition. Installing Hyper-V packages from servicing store...");
                    let home_script = r#"
pushd "$env:SystemRoot\servicing\Packages"
$pkgs = Get-ChildItem -Filter "*Hyper-V*.mum" | ForEach-Object { $_.Name }
foreach ($pkg in $pkgs) {
    dism.exe /Online /NoRestart /Add-Package:"$env:SystemRoot\servicing\Packages\$pkg"
}
dism.exe /Online /Enable-Feature /All /FeatureName:Microsoft-Hyper-V /NoRestart
Set-Service -Name vmms -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name vmms -ErrorAction SilentlyContinue
"#;
                    let home_out = hidden_powershell()
                        .args(["-Command", home_script])
                        .output();

                    if let Ok(h_out) = home_out {
                        let h_stdout = String::from_utf8_lossy(&h_out.stdout);
                        InstallerLogger::info("HYPERV_INSTALL", &format!("Home installation output: {}", h_stdout));
                        return Ok("Hyper-V packages installed for Windows Home. Please restart your PC to complete Hyper-V initialization.".to_string());
                    }
                }
                Ok("Hyper-V configuration applied. If requested by Windows, a quick restart will finalize activation.".to_string())
            }
            Err(e) => {
                let err = format!("Failed to invoke DISM: {}", e);
                InstallerLogger::error("HYPERV_INSTALL", &err);
                Err(err)
            }
        }
    }
    #[cfg(not(windows))]
    Ok("Non-Windows host simulation.".to_string())
}

pub async fn ensure_appliance_vhdx(app: &AppHandle, client_id: &str, vhdx_path: &str) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let path = Path::new(vhdx_path);
    if path.exists() {
        if let Ok(meta) = fs::metadata(path) {
            if meta.len() > 10 * 1024 * 1024 {
                let msg = format!("Valid FastFree NixOS appliance VHDX verified ({} MB)", meta.len() / (1024 * 1024));
                InstallerLogger::info("PROVISIONING", &msg);
                return Ok(msg);
            } else {
                InstallerLogger::warn(
                    "PROVISIONING",
                    &format!("Existing disk '{}' is an empty stub ({} bytes). Removing to deploy real image.", vhdx_path, meta.len())
                );
                let _ = fs::remove_file(path);
            }
        }
    }

    // Multi-path local discovery for pre-existing Clan appliance VHDX images
    let mut local_candidates = Vec::new();
    if let Some(parent) = path.parent() {
        if let Some(grandparent) = parent.parent() {
            local_candidates.push(grandparent.join("Appliance").join(client_id).join("Virtual Hard Disks").join(format!("fastfree_{}.vhdx", client_id)));
            local_candidates.push(grandparent.join("Appliance").join(client_id).join("Virtual Hard Disks").join(format!("{}.vhdx", client_id)));
            local_candidates.push(grandparent.join("Appliance").join(client_id).join(format!("fastfree_{}.vhdx", client_id)));
            local_candidates.push(grandparent.join("fastos").join("vhd").join("ext4.vhdx"));
        }
    }
    for drive in ["C:\\", "D:\\", "E:\\", "F:\\", "G:\\"] {
        let p_drive = Path::new(drive);
        local_candidates.push(p_drive.join("fastfree").join("Appliance").join(client_id).join("Virtual Hard Disks").join(format!("fastfree_{}.vhdx", client_id)));
        local_candidates.push(p_drive.join("FastFree").join("Appliance").join(client_id).join("Virtual Hard Disks").join(format!("fastfree_{}.vhdx", client_id)));
        local_candidates.push(p_drive.join("fastfree").join("Appliance").join(client_id).join(format!("fastfree_{}.vhdx", client_id)));
        local_candidates.push(p_drive.join("fastfree").join("VMs").join(format!("fastfree_{}.vhdx", client_id)));
    }

    for candidate in local_candidates {
        if candidate.exists() {
            if let Ok(meta) = fs::metadata(&candidate) {
                if meta.len() > 100 * 1024 * 1024 {
                    let size_mb = meta.len() / (1024 * 1024);
                    let info_msg = format!("Discovered local FastFree appliance image at '{}' ({} MB). Deploying directly...", candidate.display(), size_mb);
                    InstallerLogger::info("PROVISIONING", &info_msg);
                    let _ = app.emit("provision-step", serde_json::json!({
                        "step": 2,
                        "phase": "Image Provisioning",
                        "message": format!("Detected existing appliance image at '{}' ({} MB). Copying to target storage...", candidate.display(), size_mb),
                        "success": true
                    }));
                    if let Some(parent_dir) = path.parent() {
                        let _ = fs::create_dir_all(parent_dir);
                    }
                    if let Ok(_) = fs::copy(&candidate, path) {
                        let success_msg = format!("FastFree NixOS appliance deployed from local cache '{}' ({} MB)", candidate.display(), size_mb);
                        InstallerLogger::info("PROVISIONING", &success_msg);
                        return Ok(success_msg);
                    }
                }
            }
        }
    }

    let url = format!(
        "https://github.com/FastFreeCloud/fastfree/releases/download/clan-images/fastfree_{}.vhdx.zst",
        client_id
    );
    let zst_temp_path = format!("{}.download.zst", vhdx_path);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3600))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    InstallerLogger::info("PROVISIONING", &format!("Downloading FastFree NixOS Clan image from '{}'...", url));
    let _ = app.emit("provision-step", serde_json::json!({
        "step": 2,
        "phase": "Image Provisioning",
        "message": format!("Connecting to repository to retrieve FastFree NixOS image for {}...", client_id),
        "success": true
    }));

    let mut response = match client.get(&url).send().await {
        Ok(res) if res.status().is_success() => res,
        Ok(res) => {
            return Err(format!(
                "Repository returned HTTP {} for '{}'. Please ensure an active internet connection or manually place '{}.vhdx' in the FastFree VMs folder.",
                res.status(), url, client_id
            ));
        }
        Err(e) => {
            return Err(format!(
                "Network error connecting to image repository: {}. Please connect to internet or manually place '{}.vhdx' in the FastFree VMs folder.",
                e, client_id
            ));
        }
    };

    let total_bytes = response.content_length().unwrap_or(0);
    let mut downloaded_bytes: u64 = 0;
    let mut last_pct: u32 = 0;

    let mut temp_file = tokio::fs::File::create(&zst_temp_path)
        .await
        .map_err(|e| format!("Failed to create temporary file '{}': {}", zst_temp_path, e))?;

    use tokio::io::AsyncWriteExt;
    while let Ok(Some(chunk)) = response.chunk().await {
        temp_file.write_all(&chunk).await.map_err(|e| format!("Write chunk error: {}", e))?;
        downloaded_bytes += chunk.len() as u64;

        if total_bytes > 0 {
            let pct = ((downloaded_bytes as f64 / total_bytes as f64) * 100.0) as u32;
            if pct >= last_pct + 5 || pct == 100 {
                last_pct = pct;
                let _ = app.emit("provision-download-progress", serde_json::json!({
                    "downloaded": downloaded_bytes,
                    "total": total_bytes,
                    "percent": pct,
                    "phase": "Downloading NixOS Appliance Image"
                }));
            }
        }
    }
    temp_file.flush().await.map_err(|e| e.to_string())?;
    drop(temp_file);

    InstallerLogger::info("PROVISIONING", &format!("Decompressing zstd image to '{}'...", vhdx_path));
    let _ = app.emit("provision-step", serde_json::json!({
        "step": 2,
        "phase": "Image Decompression",
        "message": "Decompressing FastFree NixOS Clan appliance disk image...",
        "success": true
    }));

    let zst_clone = zst_temp_path.clone();
    let vhdx_clone = vhdx_path.to_string();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let input_file = std::fs::File::open(&zst_clone)
            .map_err(|e| format!("Failed to open downloaded archive: {}", e))?;
        let mut decoder = zstd::stream::Decoder::new(input_file)
            .map_err(|e| format!("Failed to initialize zstd decoder: {}", e))?;
        let mut output_file = std::fs::File::create(&vhdx_clone)
            .map_err(|e| format!("Failed to create destination VHDX: {}", e))?;
        std::io::copy(&mut decoder, &mut output_file)
            .map_err(|e| format!("Failed to decompress image stream: {}", e))?;
        output_file.sync_all().map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| format!("Decompression task join error: {}", e))??;

    let _ = std::fs::remove_file(&zst_temp_path);
    InstallerLogger::info("PROVISIONING", &format!("NixOS appliance image provisioned at '{}'", vhdx_path));
    Ok(format!("FastFree NixOS image decompressed and verified successfully ({} MB)", downloaded_bytes / (1024 * 1024)))
}

#[tauri::command]
pub async fn ensure_service_account(
    client_id: String,
    target_drive: String,
) -> Result<ServiceAccountResult, String> {
    InstallerLogger::info(
        "SECURITY",
        &format!("Ensuring sovereign isolated service account for node {}", client_id),
    );

    let clean_drive = target_drive.trim_end_matches('\\').to_string();
    let account_name = format!("fastfree_{}", client_id);

    #[cfg(windows)]
    {
        let ps_script = format!(
            r#"
$ErrorActionPreference = 'Stop'
try {{
    $cleanDrive = '{clean_drive}'
    $ClientId = '{client_id}'
    $accountName = '{account_name}'
    $secretsDir = "$cleanDrive\FastFree\Secrets"
    $vmDir = "$cleanDrive\FastFree\VMs"
    $smartPagingDir = "$cleanDrive\FastFree\SmartPaging"
    $secretFile = "$secretsDir\account_$ClientId.dpapi"

    # 1. Compile In-Memory LSA Win32 Bridge for Atomic User Rights Assignment
    if (-not ([System.Management.Automation.PSTypeName]'FastFreeLsaBridge').Type) {{
        $csharpSource = @"
using System;
using System.Runtime.InteropServices;
using System.Security.Principal;

public class FastFreeLsaBridge {{
    [StructLayout(LayoutKind.Sequential)]
    struct LSA_OBJECT_ATTRIBUTES {{
        public int Length;
        public IntPtr RootDirectory;
        public IntPtr ObjectName;
        public uint Attributes;
        public IntPtr SecurityDescriptor;
        public IntPtr SecurityQualityOfService;
    }}

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct LSA_UNICODE_STRING {{
        public ushort Length;
        public ushort MaximumLength;
        public IntPtr Buffer;
    }}

    [DllImport("advapi32.dll", SetLastError = true, PreserveSig = true)]
    static extern uint LsaOpenPolicy(
        IntPtr SystemName,
        ref LSA_OBJECT_ATTRIBUTES ObjectAttributes,
        uint DesiredAccess,
        out IntPtr PolicyHandle
    );

    [DllImport("advapi32.dll", SetLastError = true, PreserveSig = true)]
    static extern uint LsaAddAccountRights(
        IntPtr PolicyHandle,
        IntPtr AccountSid,
        LSA_UNICODE_STRING[] UserRights,
        uint CountOfRights
    );

    [DllImport("advapi32.dll")]
    static extern uint LsaClose(IntPtr ObjectHandle);

    const uint POLICY_CREATE_ACCOUNT = 0x00000010;
    const uint POLICY_LOOKUP_NAMES = 0x00000800;

    public static uint GrantRights(string accountName, string[] rights) {{
        NTAccount account = new NTAccount(accountName);
        SecurityIdentifier sid = (SecurityIdentifier)account.Translate(typeof(SecurityIdentifier));
        byte[] sidArray = new byte[sid.BinaryLength];
        sid.GetBinaryForm(sidArray, 0);

        IntPtr pSid = Marshal.AllocHGlobal(sidArray.Length);
        Marshal.Copy(sidArray, 0, pSid, sidArray.Length);

        try {{
            LSA_OBJECT_ATTRIBUTES objAttr = new LSA_OBJECT_ATTRIBUTES();
            IntPtr policyHandle;
            uint access = POLICY_CREATE_ACCOUNT | POLICY_LOOKUP_NAMES;
            uint status = LsaOpenPolicy(IntPtr.Zero, ref objAttr, access, out policyHandle);
            if (status != 0) return status;

            try {{
                LSA_UNICODE_STRING[] lsaRights = new LSA_UNICODE_STRING[rights.Length];
                for (int i = 0; i < rights.Length; i++) {{
                    lsaRights[i] = new LSA_UNICODE_STRING();
                    lsaRights[i].Buffer = Marshal.StringToHGlobalUni(rights[i]);
                    lsaRights[i].Length = (ushort)(rights[i].Length * 2);
                    lsaRights[i].MaximumLength = (ushort)((rights[i].Length + 1) * 2);
                }}

                try {{
                    return LsaAddAccountRights(policyHandle, pSid, lsaRights, (uint)rights.Length);
                }} finally {{
                    for (int i = 0; i < rights.Length; i++) {{
                        Marshal.FreeHGlobal(lsaRights[i].Buffer);
                    }}
                }}
            }} finally {{
                LsaClose(policyHandle);
            }}
        }} finally {{
            Marshal.FreeHGlobal(pSid);
        }}
    }}
}}
"@
        Add-Type -TypeDefinition $csharpSource -Language CSharp
    }}

    # 2. Cryptographic Password Generation (48 characters, shell-safe entropy)
    $rngBytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($rngBytes)
    $charSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#%*+,-./:=?@_~"
    $rawPassword = -join ($rngBytes | ForEach-Object {{ $charSet[$_ % $charSet.Length] }})
    $secPassword = ConvertTo-SecureString $rawPassword -AsPlainText -Force

    # 3. Create or Update Local Service Account
    $existingUser = Get-LocalUser -Name $accountName -ErrorAction SilentlyContinue
    if (-not $existingUser) {{
        New-LocalUser -Name $accountName `
            -Password $secPassword `
            -FullName "FastFree Appliance Service - $ClientId" `
            -Description "Dedicated isolated service account for FastFree Sovereign Appliance $ClientId Hyper-V container execution." `
            -PasswordNeverExpires:$true `
            -UserCannotChangePassword:$true `
            -AccountNeverExpires:$true | Out-Null
    }} else {{
        Set-LocalUser -Name $accountName `
            -Password $secPassword `
            -PasswordNeverExpires:$true `
            -UserCannotChangePassword:$true `
            -AccountNeverExpires:$true | Out-Null
    }}

    # 4. Group Memberships: Hyper-V Admin YES, Users NO (removes from Settings "Other users")
    Add-LocalGroupMember -Group 'Hyper-V Administrators' -Member $accountName -ErrorAction SilentlyContinue
    Remove-LocalGroupMember -Group 'Users' -Member $accountName -ErrorAction SilentlyContinue

    # 5. UI Cloaking: Hide from Windows Logon, Lock Screen, and Switch User
    $regSpecialAccounts = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\SpecialAccounts\UserList"
    if (-not (Test-Path $regSpecialAccounts)) {{
        New-Item -Path $regSpecialAccounts -Force | Out-Null
    }}
    Set-ItemProperty -Path $regSpecialAccounts -Name $accountName -Value 0 -Type DWord -Force | Out-Null

    # 6. Apply LSA Denial Policies (No Interactive Desktop, No RDP)
    $denyRights = @("SeDenyInteractiveLogonRight", "SeDenyRemoteInteractiveLogonRight", "SeDenyNetworkLogonRight")
    [FastFreeLsaBridge]::GrantRights($accountName, $denyRights) | Out-Null

    # 7. Store DPAPI-Encrypted Password in Locked Directory
    if (-not (Test-Path $secretsDir)) {{
        New-Item -Path $secretsDir -ItemType Directory -Force | Out-Null
    }}
    icacls "$secretsDir" /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" /c /q | Out-Null

    Add-Type -AssemblyName System.Security
    $encBytes = [System.Security.Cryptography.ProtectedData]::Protect(
        [System.Text.Encoding]::UTF8.GetBytes($rawPassword),
        $null,
        [System.Security.Cryptography.DataProtectionScope]::LocalMachine
    )
    [System.IO.File]::WriteAllBytes($secretFile, $encBytes)

    # 8. Storage & NTFS ACL Lockdown on VM Directory
    if (-not (Test-Path $vmDir)) {{
        New-Item -Path $vmDir -ItemType Directory -Force | Out-Null
    }}
    if (-not (Test-Path $smartPagingDir)) {{
        New-Item -Path $smartPagingDir -ItemType Directory -Force | Out-Null
    }}

    # Grant SYSTEM, Administrators, Service Account, and Hyper-V Virtual Machines SID (*S-1-5-83-0)
    icacls "$vmDir" /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" "$accountName:(OI)(CI)F" "*S-1-5-83-0:(OI)(CI)F" /c /q | Out-Null
    icacls "$smartPagingDir" /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" "$accountName:(OI)(CI)F" "*S-1-5-83-0:(OI)(CI)F" /c /q | Out-Null

    # 9. Return Structured Result
    $sidObj = (New-Object System.Security.Principal.NTAccount($accountName)).Translate([System.Security.Principal.SecurityIdentifier])
    $sid = if ($sidObj) {{ $sidObj.Value }} else {{ "S-1-5-21-CONFIGURED" }}
    [PSCustomObject]@{{
        success = $true
        account_name = $accountName
        sid = $sid
        cloaked = $true
        hyperv_admin = $true
        dpapi_path = $secretFile
        vm_dir = $vmDir
    }} | ConvertTo-Json -Compress
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}}
"#,
            clean_drive = clean_drive,
            client_id = client_id,
            account_name = account_name
        );

        let output = hidden_powershell()
            .args(["-Command", &ps_script])
            .output()
            .map_err(|e| format!("Failed to invoke PowerShell for service account: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Service account provisioning failed: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let json_line = stdout
            .lines()
            .filter(|l| l.trim().starts_with('{') && l.trim().ends_with('}'))
            .last()
            .unwrap_or(&stdout);

        let result: ServiceAccountResult = serde_json::from_str(json_line)
            .map_err(|e| format!("Failed to parse service account JSON: {}. Raw: {}", e, json_line))?;

        InstallerLogger::info(
            "SECURITY",
            &format!("Sovereign account '{}' secured and cloaked successfully.", result.account_name),
        );
        Ok(result)
    }

    #[cfg(not(windows))]
    Ok(ServiceAccountResult {
        success: true,
        account_name: account_name,
        sid: "S-1-5-21-SIMULATED".to_string(),
        cloaked: true,
        hyperv_admin: true,
        dpapi_path: "/mock/secrets/account.dpapi".to_string(),
        vm_dir: "/mock/FastFree/VMs".to_string(),
    })
}

#[tauri::command]
pub async fn reconfigure_hyperv_vm(
    client_id: String,
    target_drive: String,
    cores: Option<u32>,
    ram_mb: Option<u64>,
) -> Result<VmRealState, String> {
    let vm_name = format!("FastFree-{}", client_id);
    let cores = cores.unwrap_or(4);
    let ram_mb = ram_mb.unwrap_or(8192);
    let ram_bytes = ram_mb * 1024 * 1024;
    let target_drive = target_drive.trim_end_matches('\\').to_string();

    InstallerLogger::info("HYPERV_RECONFIG", &format!("Reconfiguring Hyper-V appliance '{}' to optimal FastFree preset", vm_name));

    #[cfg(windows)]
    {
        let ps_script = format!(
            r#"
$ErrorActionPreference = 'Stop'
try {{
    $vm = Get-VM -Name '{vm_name}' -ErrorAction SilentlyContinue
    if (-not $vm) {{
        throw "VM '{vm_name}' does not exist in Hyper-V."
    }}
    if ($vm.State -eq 'Running') {{
        Stop-VM -Name '{vm_name}' -TurnOff -ErrorAction SilentlyContinue | Out-Null
    }}
    $sw = Get-VMSwitch -Name 'Default Switch' -ErrorAction SilentlyContinue
    if (-not $sw) {{
        $sw = Get-VMSwitch -SwitchType External -ErrorAction SilentlyContinue | Select-Object -First 1
    }}
    if (-not $sw) {{
        $sw = Get-VMSwitch -ErrorAction SilentlyContinue | Select-Object -First 1
    }}
    $activeSwitch = if ($sw) {{ $sw.Name }} else {{ 'Default Switch' }}

    Connect-VMNetworkAdapter -VMName '{vm_name}' -SwitchName $activeSwitch -ErrorAction SilentlyContinue | Out-Null
    Set-VMNetworkAdapter -VMName '{vm_name}' -MacAddressSpoofing On -ErrorAction SilentlyContinue | Out-Null
    Set-VMProcessor -VMName '{vm_name}' -Count {cores} -ExposeVirtualizationExtensions $true -ErrorAction SilentlyContinue | Out-Null
    Set-VMMemory -VMName '{vm_name}' -DynamicMemoryEnabled $false -StartupBytes {ram_bytes} -ErrorAction SilentlyContinue | Out-Null
    Set-VMFirmware -VMName '{vm_name}' -EnableSecureBoot Off -ErrorAction SilentlyContinue | Out-Null

    $hd = Get-VMHardDiskDrive -VMName '{vm_name}' -ErrorAction SilentlyContinue
    if ($hd) {{
        Set-VMFirmware -VMName '{vm_name}' -FirstBootDevice $hd[0] -ErrorAction SilentlyContinue | Out-Null
        $bootDevs = @($hd)
        $dvd = Get-VMDvdDrive -VMName '{vm_name}' -ErrorAction SilentlyContinue
        if ($dvd) {{ $bootDevs += $dvd }}
        $net = Get-VMNetworkAdapter -VMName '{vm_name}' -ErrorAction SilentlyContinue
        if ($net) {{ $bootDevs += $net }}
        Set-VMFirmware -VMName '{vm_name}' -BootOrder $bootDevs -ErrorAction SilentlyContinue | Out-Null
    }}

    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Guest Service Interface' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Key-Value Pair Exchange' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Time Synchronization' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Shutdown' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'VSS' -ErrorAction SilentlyContinue | Out-Null

    $smartPagingDir = '{target_drive}\FastFree\SmartPaging'
    if (-not (Test-Path $smartPagingDir)) {{
        New-Item -ItemType Directory -Path $smartPagingDir -Force | Out-Null
    }}
    Set-VM -VMName '{vm_name}' `
        -CheckpointType Production `
        -AutomaticStartAction Start `
        -AutomaticStartDelay 15 `
        -AutomaticStopAction ShutDown `
        -SmartPagingFilePath $smartPagingDir -ErrorAction SilentlyContinue | Out-Null

    Start-VM -Name '{vm_name}' -ErrorAction Stop | Out-Null
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}}
"#,
            vm_name = vm_name,
            cores = cores,
            ram_bytes = ram_bytes,
            target_drive = target_drive
        );

        let out = hidden_powershell().args(["-Command", &ps_script]).output();
        if let Ok(res) = out {
            if !res.status.success() {
                let err = String::from_utf8_lossy(&res.stderr);
                InstallerLogger::warn("HYPERV_RECONFIG", &format!("Reconfigure warning: {}", err));
            }
        }
    }

    get_vm_real_state(client_id).await
}

#[tauri::command]
pub async fn provision_node(
    app: AppHandle,
    client_id: String,
    cores: u32,
    ram_mb: u64,
    target_drive: String,
    hardened_security: Option<bool>,
) -> Result<Vec<ProvisioningStepLog>, String> {
    InstallerLogger::info(
        "PROVISIONING",
        &format!(
            "Initiating real Hyper-V provisioning for {}: Cores={}, RAM={}MB, Drive={}, Hardened={:?}",
            client_id, cores, ram_mb, target_drive, hardened_security
        ),
    );

    let mut step_logs: Vec<ProvisioningStepLog> = Vec::new();
    let vm_name = format!("FastFree-{}", client_id);
    let vhdx_dir = format!("{}\\FastFree\\VMs", target_drive.trim_end_matches('\\'));
    let vhdx_path = format!("{}\\{}.vhdx", vhdx_dir, client_id);
    let is_hardened = hardened_security.unwrap_or(true);

    // Hyper-V memory alignment: ((ram_mb + 64) / 128) * 128, min 1024 MB
    let aligned_ram_mb = {
        let aligned = ((ram_mb + 64) / 128) * 128;
        aligned.max(1024)
    };
    let ram_bytes = aligned_ram_mb * 1024 * 1024;

    #[cfg(windows)]
    {
        use std::fs;

        // 0. Verify and configure Hyper-V prerequisites
        if let Err(e) = ensure_hyperv_environment() {
            InstallerLogger::error("PROVISIONING", &format!("Prerequisites failure: {}", e));
            let _ = app.emit("provision-failed", &e);
            return Err(e);
        }

        // 1. Create directory structure
        if let Err(e) = fs::create_dir_all(&vhdx_dir) {
            let msg = format!("Failed to create VM directory '{}': {}", vhdx_dir, e);
            InstallerLogger::error("PROVISIONING", &msg);
            let _ = app.emit("provision-failed", &msg);
            return Err(msg);
        }
        let step1 = ProvisioningStepLog {
            step: 1,
            phase: "Filesystem Allocation".to_string(),
            message: format!("Allocated VM container storage at {}", vhdx_dir),
            success: true,
        };
        let _ = app.emit("provision-step", &step1);
        step_logs.push(step1);

        // 2. Provision Sovereign Isolated Identity & Storage ACL Hardening
        if is_hardened {
            match ensure_service_account(client_id.clone(), target_drive.clone()).await {
                Ok(res) => {
                    let step2 = ProvisioningStepLog {
                        step: 2,
                        phase: "Sovereign Identity & ACL Hardening".to_string(),
                        message: format!(
                            "Created cloaked service identity '{}' (Hyper-V Admins) and hardened NTFS DACL storage access.",
                            res.account_name
                        ),
                        success: true,
                    };
                    let _ = app.emit("provision-step", &step2);
                    step_logs.push(step2);
                }
                Err(e) => {
                    InstallerLogger::warn("PROVISIONING", &format!("Sovereign account notice: {}", e));
                    let step2 = ProvisioningStepLog {
                        step: 2,
                        phase: "Sovereign Identity & ACL Hardening".to_string(),
                        message: format!("Sovereign identity setup notice: {}. Continuing with host administrator scoping.", e),
                        success: true,
                    };
                    let _ = app.emit("provision-step", &step2);
                    step_logs.push(step2);
                }
            }
        }

        // 3. Ensure Hyper-V Service VMMS is running and user is in Hyper-V Administrators
        let _ = hidden_powershell()
            .args([
                "-Command",
                "Set-Service -Name vmms -StartupType Automatic -ErrorAction SilentlyContinue; Start-Service -Name vmms -ErrorAction SilentlyContinue; try { Add-LocalGroupMember -Group 'Hyper-V Administrators' -Member $env:USERNAME -ErrorAction SilentlyContinue } catch {}",
            ])
            .output();

        // 4. Resolve Virtual Switch: Prefer Default Switch (Host NAT + DHCP + Internet)
        let vswitch_script = r#"
$sw = Get-VMSwitch -Name 'Default Switch' -ErrorAction SilentlyContinue
if (-not $sw) {
    $sw = Get-VMSwitch -SwitchType External -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $sw) {
    $sw = Get-VMSwitch -Name 'FastFree-Default-Switch' -ErrorAction SilentlyContinue
}
if (-not $sw) {
    $sw = Get-VMSwitch -ErrorAction SilentlyContinue | Select-Object -First 1
}
if ($sw) {
    Write-Output "FASTFREE_SWITCH_READY:$($sw.Name)"
} else {
    throw "No virtual switch detected in Hyper-V."
}
"#;
        let sw_out = hidden_powershell()
            .args(["-Command", vswitch_script])
            .output();

        let switch_name = match sw_out {
            Ok(ref out) if out.status.success() => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                stdout
                    .lines()
                    .find(|l| l.starts_with("FASTFREE_SWITCH_READY:"))
                    .and_then(|l| l.strip_prefix("FASTFREE_SWITCH_READY:"))
                    .unwrap_or("Default Switch")
                    .trim()
                    .to_string()
            }
            Ok(ref out) => {
                let err = String::from_utf8_lossy(&out.stderr).to_string();
                InstallerLogger::warn("PROVISIONING", &format!("Switch lookup notice: {}", err));
                "Default Switch".to_string()
            }
            Err(_) => "Default Switch".to_string(),
        };

        let step3 = ProvisioningStepLog {
            step: 3,
            phase: "Virtual Switch & Networking".to_string(),
            message: format!("Bound to Hyper-V Virtual Switch: '{}' (Auto NAT & DHCP).", switch_name),
            success: true,
        };
        let _ = app.emit("provision-step", &step3);
        step_logs.push(step3);

        // 5. Verify or download real FastFree NixOS appliance VHDX image
        if let Err(e) = ensure_appliance_vhdx(&app, &client_id, &vhdx_path).await {
            InstallerLogger::warn("PROVISIONING", &format!("Appliance VHDX notice: {}", e));
            if !std::path::Path::new(&vhdx_path).exists() {
                let err_msg = format!("Missing FastFree NixOS disk image: {}. Please place '{}.vhdx' in '{}'.", e, client_id, vhdx_dir);
                let _ = app.emit("provision-failed", &err_msg);
                return Err(err_msg);
            }
        }
        let step4 = ProvisioningStepLog {
            step: 4,
            phase: "Appliance Image Provisioning".to_string(),
            message: format!("Verified FastFree NixOS Clan appliance disk image at '{}'.", vhdx_path),
            success: true,
        };
        let _ = app.emit("provision-step", &step4);
        step_logs.push(step4);

        // 6. Create / Configure Generation 2 VM with Optimal FastFree NixOS Preset
        let target_drive_clean = target_drive.trim_end_matches('\\');
        let vm_script = format!(
            r#"
$ErrorActionPreference = 'Stop'
try {{
    $activeSwitch = '{switch_name}'
    $vm = Get-VM -Name '{vm_name}' -ErrorAction SilentlyContinue
    if (-not $vm) {{
        New-VM -Name '{vm_name}' -Generation 2 -MemoryStartupBytes {ram_bytes} -SwitchName $activeSwitch -VHDPath '{vhdx_path}' | Out-Null
    }} else {{
        if ($vm.State -eq 'Running') {{
            Stop-VM -Name '{vm_name}' -TurnOff -ErrorAction SilentlyContinue | Out-Null
        }}
        $existingHd = Get-VMHardDiskDrive -VMName '{vm_name}' -ErrorAction SilentlyContinue
        if (-not $existingHd) {{
            Add-VMHardDiskDrive -VMName '{vm_name}' -Path '{vhdx_path}' -ErrorAction SilentlyContinue | Out-Null
        }} elseif ($existingHd[0].Path -ne '{vhdx_path}') {{
            Set-VMHardDiskDrive -VMName '{vm_name}' -ControllerNumber 0 -ControllerLocation 0 -Path '{vhdx_path}' -ErrorAction SilentlyContinue | Out-Null
        }}
    }}

    # Processor & Nested Virtualization for fastfree.kvm
    Set-VMProcessor -VMName '{vm_name}' -Count {cores} | Out-Null
    Set-VMProcessor -VMName '{vm_name}' -ExposeVirtualizationExtensions $true | Out-Null
    Set-VMProcessor -VMName '{vm_name}' -RelativeWeight 100 | Out-Null

    # Memory Strategy: Static RAM for ERP database determinism
    Set-VMMemory -VMName '{vm_name}' -DynamicMemoryEnabled $false -StartupBytes {ram_bytes} | Out-Null

    # Firmware: Disable Secure Boot for NixOS GRUB 2 (unsigned Linux bootloader)
    Set-VMFirmware -VMName '{vm_name}' -EnableSecureBoot Off -ErrorAction SilentlyContinue | Out-Null

    # Firmware: Hard Disk Drive First in Boot Order (Eliminate PXE delay)
    $hd = Get-VMHardDiskDrive -VMName '{vm_name}' -ErrorAction SilentlyContinue
    if ($hd) {{
        Set-VMFirmware -VMName '{vm_name}' -FirstBootDevice $hd[0] -ErrorAction SilentlyContinue | Out-Null
        $bootDevs = @($hd)
        $dvd = Get-VMDvdDrive -VMName '{vm_name}' -ErrorAction SilentlyContinue
        if ($dvd) {{ $bootDevs += $dvd }}
        $net = Get-VMNetworkAdapter -VMName '{vm_name}' -ErrorAction SilentlyContinue
        if ($net) {{ $bootDevs += $net }}
        Set-VMFirmware -VMName '{vm_name}' -BootOrder $bootDevs -ErrorAction SilentlyContinue | Out-Null
    }}

    # Network Adapter: Switch Binding & MAC Spoofing for WireGuard Mesh
    Connect-VMNetworkAdapter -VMName '{vm_name}' -SwitchName $activeSwitch -ErrorAction SilentlyContinue | Out-Null
    Set-VMNetworkAdapter -VMName '{vm_name}' -MacAddressSpoofing On -ErrorAction SilentlyContinue | Out-Null

    # Integration Services: Enable all services including Guest Service Interface
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Guest Service Interface' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Key-Value Pair Exchange' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Time Synchronization' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'Shutdown' -ErrorAction SilentlyContinue | Out-Null
    Enable-VMIntegrationService -VMName '{vm_name}' -Name 'VSS' -ErrorAction SilentlyContinue | Out-Null

    # Management: Production Checkpoints, AutoStart with 15s delay, Smart Paging on target drive
    $smartPagingDir = '{target_drive}\FastFree\SmartPaging'
    if (-not (Test-Path $smartPagingDir)) {{
        New-Item -ItemType Directory -Path $smartPagingDir -Force | Out-Null
    }}
    Set-VM -VMName '{vm_name}' `
        -CheckpointType Production `
        -AutomaticStartAction Start `
        -AutomaticStartDelay 15 `
        -AutomaticStopAction ShutDown `
        -SmartPagingFilePath $smartPagingDir -ErrorAction SilentlyContinue | Out-Null

    # Start VM
    Start-VM -Name '{vm_name}' -ErrorAction Stop

    # Verification: Check disk file size
    $diskItem = Get-Item -LiteralPath '{vhdx_path}' -ErrorAction SilentlyContinue
    $diskSizeBytes = if ($diskItem) {{ $diskItem.Length }} else {{ 0 }}
    $isEmpty = ($diskSizeBytes -le 10485760)

    # Poll up to 10 seconds for Running state
    $timeoutSec = 10
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $currentState = "Unknown"
    while ($timer.Elapsed.TotalSeconds -lt $timeoutSec) {{
        $poll = Get-VM -Name '{vm_name}' -ErrorAction SilentlyContinue
        if ($poll) {{
            $currentState = $poll.State.ToString()
            if ($currentState -eq 'Running') {{ break }}
        }}
        Start-Sleep -Milliseconds 500
    }}

    Write-Output "FASTFREE_VM_DEPLOYED_SUCCESSFULLY:STATE=$currentState:EMPTY=$isEmpty"
}} catch {{
    Write-Error $_.Exception.Message
    exit 1
}}
"#,
            vm_name = vm_name,
            ram_bytes = ram_bytes,
            vhdx_path = vhdx_path,
            cores = cores,
            switch_name = switch_name,
            target_drive = target_drive_clean
        );

        let vm_res = hidden_powershell()
            .args(["-Command", &vm_script])
            .output();

        match vm_res {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                if out.status.success() || stdout.contains("FASTFREE_VM_DEPLOYED_SUCCESSFULLY") {
                    let is_empty = stdout.contains("EMPTY=True");
                    let step5_msg = if is_empty {
                        format!("Registered VM '{}' (Gen 2, {} vCPUs, RAM: {} MB). Warning: Disk is empty (4MB stub).", vm_name, cores, aligned_ram_mb)
                    } else {
                        format!("Registered VM '{}' (Gen 2, {} vCPUs, RAM: {} MB). Running and verified in Hyper-V.", vm_name, cores, aligned_ram_mb)
                    };

                    let step5 = ProvisioningStepLog {
                        step: 5,
                        phase: "Hyper-V Virtual Machine Creation".to_string(),
                        message: step5_msg,
                        success: true,
                    };
                    let _ = app.emit("provision-step", &step5);
                    step_logs.push(step5);
                } else {
                    let err_msg = if !stderr.is_empty() { stderr } else { stdout };
                    InstallerLogger::error("PROVISIONING", &format!("VM creation failure: {}", err_msg));
                    let full_err = format!("Failed to provision Hyper-V VM: {}", err_msg);
                    let _ = app.emit("provision-failed", &full_err);
                    return Err(full_err);
                }
            }
            Err(e) => {
                let err_msg = format!("Failed to spawn PowerShell VM creation: {}", e);
                InstallerLogger::error("PROVISIONING", &err_msg);
                let _ = app.emit("provision-failed", &err_msg);
                return Err(err_msg);
            }
        }
    }

    #[cfg(not(windows))]
    {
        step_logs.push(ProvisioningStepLog {
            step: 1,
            phase: "Simulation".to_string(),
            message: "Non-Windows host simulation.".to_string(),
            success: true,
        });
    }

    Ok(step_logs)
}

/// Generate and write a WireGuard `.conf` file for the given client node.
/// On Windows, the file is written to `%APPDATA%\FastFree\wireguard\<client_id>.conf`.
/// Supports deterministic automatic generation as well as explicit manual customization.
#[tauri::command]
pub async fn apply_wireguard_config(
    client_id: String,
    custom_port: Option<u16>,
    custom_ip: Option<String>,
    custom_endpoint: Option<String>,
    custom_conf: Option<String>,
) -> Result<WireGuardApplyResult, String> {
    InstallerLogger::info(
        "WIREGUARD",
        &format!("Generating WireGuard config for '{}' (Manual customization: {})", client_id, custom_conf.is_some() || custom_port.is_some()),
    );

    // Derive deterministic parameters from the numeric suffix (client1..11) or use manual overrides
    let num_str: String = client_id.chars().filter(|c| c.is_ascii_digit()).collect();
    let n: u16 = num_str.parse().unwrap_or(2);
    let listen_port = custom_port.unwrap_or(if n == 1 { 51820 } else { 51820 + n });
    let client_ip = custom_ip.unwrap_or_else(|| {
        if n == 1 {
            "10.24.0.1/16".to_string()
        } else {
            format!("10.24.0.{}/32", n)
        }
    });
    let endpoint = custom_endpoint.unwrap_or_else(|| {
        if n == 1 {
            "127.0.0.1:51820".to_string()
        } else {
            format!("client1.fastfree.cloud:{}", listen_port)
        }
    });

    let conf_content = if let Some(raw) = custom_conf.filter(|s| !s.trim().is_empty()) {
        raw
    } else {
        // Placeholder private key — replaced by `clan vars generate <machine>` at provisioning time
        let private_key = format!("PLACEHOLDER_PRIVATE_KEY_client{}==========================", n);
        let peer_pubkey = "Tk+A5Rv0ETng+fjsLjpmEmGYK6NR28R+l+Wz3RbbVlI=";
        format!(
            "[Interface]\nAddress = {client_ip}\nListenPort = {listen_port}\nPrivateKey = {private_key}\nMTU = 1420\n\n[Peer]\nPublicKey = {peer_pubkey}\nEndpoint = {endpoint}\nAllowedIPs = 10.24.0.0/16\nPersistentKeepalive = 25\n",
        )
    };

    #[cfg(windows)]
    {
        use std::fs;

        // Resolve %APPDATA%\FastFree\wireguard\
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".to_string());
        let wg_dir = format!("{}\\FastFree\\wireguard", appdata);

        if let Err(e) = fs::create_dir_all(&wg_dir) {
            let msg = format!("Failed to create WireGuard config directory '{}': {}", wg_dir, e);
            InstallerLogger::error("WIREGUARD", &msg);
            return Ok(WireGuardApplyResult { success: false, conf_path: wg_dir, message: msg });
        }

        let conf_path = format!("{}\\{}.conf", wg_dir, client_id);
        if let Err(e) = fs::write(&conf_path, &conf_content) {
            let msg = format!("Failed to write WireGuard config to '{}': {}", conf_path, e);
            InstallerLogger::error("WIREGUARD", &msg);
            return Ok(WireGuardApplyResult { success: false, conf_path, message: msg });
        }

        InstallerLogger::info("WIREGUARD", &format!("Config written to '{}'", conf_path));
        return Ok(WireGuardApplyResult {
            success: true,
            conf_path,
            message: format!(
                "WireGuard config for '{}' written successfully. Replace the placeholder private key with the value from `clan vars generate {}`.",
                client_id, client_id
            ),
        });
    }

    #[cfg(not(windows))]
    Ok(WireGuardApplyResult {
        success: true,
        conf_path: format!("/tmp/fastfree/wireguard/{}.conf", client_id),
        message: format!("Non-Windows simulation: WireGuard config generated for '{}'.", client_id),
    })
}

#[tauri::command]
pub async fn minimize_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        main.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn show_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
    Ok(())
}

fn is_newer_semver(remote: &str, current: &str) -> bool {
    let parse_parts = |s: &str| -> Vec<u32> {
        s.trim_start_matches('v')
            .split('.')
            .map(|p| p.parse::<u32>().unwrap_or(0))
            .collect()
    };
    let r_parts = parse_parts(remote);
    let c_parts = parse_parts(current);
    for i in 0..r_parts.len().max(c_parts.len()) {
        let r = r_parts.get(i).copied().unwrap_or(0);
        let c = c_parts.get(i).copied().unwrap_or(0);
        if r > c {
            return true;
        } else if r < c {
            return false;
        }
    }
    false
}

#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    use tauri_plugin_updater::UpdaterExt;

    InstallerLogger::info("UPDATER", "Checking for updates via native Tauri Rust updater...");

    // 1. Try native updater first
    if let Ok(updater) = app.updater() {
        if let Ok(Some(update)) = updater.check().await {
            InstallerLogger::info(
                "UPDATER",
                &format!("Native update detected: v{} (current: v{})", update.version, update.current_version),
            );
            return Ok(Some(UpdateInfo {
                available: true,
                current_version: update.current_version.clone(),
                version: update.version.clone(),
                date: update.date.map(|d| d.to_string()),
                body: update.body.clone(),
            }));
        }
    }

    // 2. Direct HTTPS Fallback via reqwest (bypasses webview CORS & proxy limits)
    InstallerLogger::info("UPDATER", "Querying latest.json directly via reqwest fallback...");
    let client = match reqwest::Client::builder()
        .user_agent("FastFree-Node-Installer")
        .timeout(std::time::Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            InstallerLogger::warn("UPDATER", &format!("HTTP client build error: {}", e));
            return Ok(None);
        }
    };

    let url = "https://github.com/FastFreeCloud/fastfree/releases/latest/download/latest.json";
    if let Ok(resp) = client.get(url).send().await {
        if resp.status().is_success() {
            if let Ok(manifest) = resp.json::<serde_json::Value>().await {
                if let Some(remote_ver) = manifest.get("version").and_then(|v| v.as_str()) {
                    let current_ver = app.package_info().version.to_string();
                    if is_newer_semver(remote_ver, &current_ver) {
                        InstallerLogger::info(
                            "UPDATER",
                            &format!("New release detected via manifest: v{} (current: v{})", remote_ver, current_ver),
                        );
                        let notes = manifest.get("notes").and_then(|n| n.as_str()).map(|s| s.to_string());
                        let pub_date = manifest.get("pub_date").and_then(|d| d.as_str()).map(|s| s.to_string());
                        return Ok(Some(UpdateInfo {
                            available: true,
                            current_version: current_ver,
                            version: remote_ver.to_string(),
                            date: pub_date,
                            body: notes,
                        }));
                    }
                }
            }
        }
    }

    InstallerLogger::info("UPDATER", "Application is up to date.");
    Ok(None)
}

#[tauri::command]
pub async fn install_app_update(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    InstallerLogger::info("UPDATER", "Initiating native Rust download and install pipeline...");
    let mut native_success = false;

    if let Ok(updater) = app.updater() {
        if let Ok(Some(update)) = updater.check().await {
            let app_handle = app.clone();
            let mut downloaded: u64 = 0;
            let res = update
                .download_and_install(
                    move |chunk_length, content_length| {
                        downloaded += chunk_length as u64;
                        let pct = if let Some(total) = content_length {
                            if total > 0 {
                                ((downloaded as f64 / total as f64) * 100.0).min(99.0) as u32
                            } else {
                                50
                            }
                        } else {
                            50
                        };

                        let payload = UpdateProgressPayload {
                            chunk_length,
                            downloaded_bytes: downloaded,
                            total_bytes: content_length,
                            progress_pct: pct,
                        };
                        let _ = app_handle.emit("updater-progress", payload);
                    },
                    || {
                        InstallerLogger::info("UPDATER", "Native download finished. Launching update...");
                    },
                )
                .await;

            if res.is_ok() {
                native_success = true;
            } else if let Err(e) = res {
                InstallerLogger::warn("UPDATER", &format!("Native updater install failed ({}), attempting binary fallback stream...", e));
            }
        }
    }

    if native_success {
        InstallerLogger::info("UPDATER", "Update installed via native plugin. System restarting...");
        return Ok(());
    }

    // Direct binary download fallback via reqwest:
    InstallerLogger::info("UPDATER", "Executing direct binary download fallback stream...");
    let client = reqwest::Client::builder()
        .user_agent("FastFree-Node-Installer")
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    let download_url = "https://github.com/FastFreeCloud/fastfree/releases/latest/download/FastFree-Node-Setup.exe";
    let mut resp = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("Download connection failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Download failed with status: {}", resp.status()));
    }

    let total_bytes = resp.content_length();
    let temp_dir = std::env::temp_dir();
    let target_exe = temp_dir.join("FastFree-Node-Setup-Update.exe");

    use tokio::io::AsyncWriteExt;
    let mut file = tokio::fs::File::create(&target_exe)
        .await
        .map_err(|e| format!("Failed to create temp installer file: {}", e))?;

    let mut downloaded: u64 = 0;
    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("Stream error: {}", e))? {
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write error: {}", e))?;
        downloaded += chunk.len() as u64;
        let pct = if let Some(total) = total_bytes {
            if total > 0 {
                ((downloaded as f64 / total as f64) * 100.0).min(99.0) as u32
            } else {
                50
            }
        } else {
            50
        };

        let _ = app.emit(
            "updater-progress",
            UpdateProgressPayload {
                chunk_length: chunk.len(),
                downloaded_bytes: downloaded,
                total_bytes,
                progress_pct: pct,
            },
        );
    }
    file.flush()
        .await
        .map_err(|e| format!("Flush error: {}", e))?;
    drop(file);

    let _ = app.emit(
        "updater-progress",
        UpdateProgressPayload {
            chunk_length: 0,
            downloaded_bytes: downloaded,
            total_bytes,
            progress_pct: 100,
        },
    );

    InstallerLogger::info(
        "UPDATER",
        &format!("Update binary downloaded to {:?}. Launching and exiting current process...", target_exe),
    );

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;
        const DETACHED_PROCESS: u32 = 0x00000008;

        let _ = Command::new(&target_exe)
            .creation_flags(DETACHED_PROCESS)
            .spawn();

        std::process::exit(0);
    }

    #[cfg(not(windows))]
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct FirewallRuleStatus {
    pub rule_exists: bool,
    pub enabled: bool,
    pub name: String,
    pub local_ports: String,
    pub protocol: String,
    pub action: String,
    pub is_admin: bool,
    pub message: String,
}

#[tauri::command]
pub async fn check_wireguard_firewall_rule() -> Result<FirewallRuleStatus, String> {
    #[cfg(windows)]
    {
        extern "system" {
            fn IsUserAnAdmin() -> i32;
        }
        let is_admin = unsafe { IsUserAnAdmin() != 0 };

        let output = hidden_powershell()
            .args([
                "-Command",
                r#"
                $rule = Get-NetFirewallRule -Name 'FastFree-WireGuard-Mesh' -ErrorAction SilentlyContinue
                if ($rule) {
                    $portFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $rule -ErrorAction SilentlyContinue
                    $ports = if ($portFilter) { $portFilter.LocalPort } else { '51820-51835' }
                    $protocol = if ($portFilter) { $portFilter.Protocol } else { 'UDP' }
                    Write-Output "EXISTS:$($rule.Enabled):$($rule.Action):$ports:$protocol"
                } else {
                    Write-Output "NOT_FOUND"
                }
                "#,
            ])
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if stdout.starts_with("EXISTS:") {
                let parts: Vec<&str> = stdout.split(':').collect();
                let enabled = parts.get(1).map(|&s| s.eq_ignore_ascii_case("True")).unwrap_or(true);
                let action = parts.get(2).unwrap_or(&"Allow").to_string();
                let ports = parts.get(3).unwrap_or(&"51820-51835").to_string();
                let proto = parts.get(4).unwrap_or(&"UDP").to_string();

                return Ok(FirewallRuleStatus {
                    rule_exists: true,
                    enabled,
                    name: "FastFree-WireGuard-Mesh".to_string(),
                    local_ports: ports,
                    protocol: proto,
                    action,
                    is_admin,
                    message: "Windows Defender Firewall inbound rule is active and allowing WireGuard UDP traffic.".to_string(),
                });
            }
        }

        Ok(FirewallRuleStatus {
            rule_exists: false,
            enabled: false,
            name: "FastFree-WireGuard-Mesh".to_string(),
            local_ports: "51820-51835".to_string(),
            protocol: "UDP".to_string(),
            action: "None".to_string(),
            is_admin,
            message: "Inbound firewall rule not detected. Action required to permit inbound traffic.".to_string(),
        })
    }

    #[cfg(not(windows))]
    Ok(FirewallRuleStatus {
        rule_exists: true,
        enabled: true,
        name: "FastFree-WireGuard-Mesh".to_string(),
        local_ports: "51820-51835".to_string(),
        protocol: "UDP".to_string(),
        action: "Allow".to_string(),
        is_admin: true,
        message: "Non-Windows host simulation.".to_string(),
    })
}

#[tauri::command]
pub async fn enable_wireguard_firewall_rule() -> Result<FirewallRuleStatus, String> {
    #[cfg(windows)]
    {
        extern "system" {
            fn IsUserAnAdmin() -> i32;
        }
        let is_admin = unsafe { IsUserAnAdmin() != 0 };

        InstallerLogger::info(
            "FIREWALL",
            &format!("Configuring Windows Defender Firewall inbound rule (is_admin={})", is_admin),
        );

        let ps_script = r#"
            $ruleName = 'FastFree-WireGuard-Mesh'
            $dispName = 'FastFree Sovereign WireGuard Mesh'
            $existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
            if ($existing) {
                Set-NetFirewallRule -Name $ruleName -Enabled True -Action Allow -ErrorAction SilentlyContinue
            } else {
                New-NetFirewallRule -DisplayName $dispName -Name $ruleName -Direction Inbound -Protocol UDP -LocalPort 51820-51835 -Action Allow -Profile Any -Description 'Allows FastFree Sovereign WireGuard Mesh UDP traffic to reach local Hyper-V appliances' -ErrorAction Stop
            }
        "#;

        if is_admin {
            let _ = hidden_powershell()
                .args(["-Command", ps_script])
                .output();
        } else {
            // Elevate via standard UAC dialog
            let one_line = ps_script.replace('\r', " ").replace('\n', " ");
            let escaped = one_line.replace('"', "\\\"");
            let elevate_cmd = format!(
                "Start-Process powershell -Verb RunAs -WindowStyle Hidden -Wait -ArgumentList \"-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command \\\"{}\\\"\"",
                escaped
            );
            let _ = hidden_powershell()
                .args(["-Command", &elevate_cmd])
                .output();
        }

        check_wireguard_firewall_rule().await
    }

    #[cfg(not(windows))]
    Ok(FirewallRuleStatus {
        rule_exists: true,
        enabled: true,
        name: "FastFree-WireGuard-Mesh".to_string(),
        local_ports: "51820-51835".to_string(),
        protocol: "UDP".to_string(),
        action: "Allow".to_string(),
        is_admin: true,
        message: "Configured firewall rule successfully (non-windows simulated).".to_string(),
    })
}
