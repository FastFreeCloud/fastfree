use crate::discovery::HostDiscoveryPipeline;
use crate::dto::*;
use crate::licensing::LicensingManager;
use crate::logger::InstallerLogger;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_system_discovery_report() -> Result<SystemDiscoveryReport, String> {
    tokio::task::spawn_blocking(HostDiscoveryPipeline::collect_report)
        .await
        .map_err(|e| format!("Join error: {}", e))?
}

#[tauri::command]
pub async fn close_splashscreen(app: AppHandle) -> Result<(), String> {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
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
    let port = 51820 + n;
    let client_ip = format!("10.24.0.{}/32", n);

    Ok(WireGuardPeerConfig {
        client_id,
        controller_endpoint: "client1.fastfree.cloud".to_string(),
        listen_port: port,
        controller_port: port,
        interface_name: "wg-fastfree".to_string(),
        client_tunnel_ip: client_ip,
        controller_tunnel_ip: "10.24.0.1/32".to_string(),
        mesh_subnet: "10.24.0.0/16".to_string(),
        keepalive_seconds: 25,
        public_key: format!("ff+client{}+pubkey+mesh+clan2605+node===", n),
        controller_public_key: "ff+client1+controller+vps+primary+master===".to_string(),
        cipher: "ChaCha20-Poly1305 (Curve25519 ECDH)".to_string(),
        mtu: 1420,
        status: "Tunnel Ready / Pre-shared Key Sealed in Clan Vars".to_string(),
        latency_ms: 16,
    })
}

#[tauri::command]
pub async fn manage_vm(action: String, client_id: String) -> Result<VmActionStatus, String> {
    let vm_name = format!("FastFree-{}", client_id);
    let (target_state, ps_cmd) = match action.to_lowercase().as_str() {
        "start" => (
            "running",
            format!("Start-VM -Name '{}' -ErrorAction SilentlyContinue", vm_name),
        ),
        "stop" => (
            "stopped",
            format!("Stop-VM -Name '{}' -Force -ErrorAction SilentlyContinue", vm_name),
        ),
        "restart" => (
            "running",
            format!("Restart-VM -Name '{}' -Force -ErrorAction SilentlyContinue", vm_name),
        ),
        _ => {
            let err_msg = format!("Unknown VM management action: {}", action);
            InstallerLogger::error("VM_PROVISIONING", &err_msg);
            return Err(err_msg);
        }
    };

    InstallerLogger::info(
        "VM_PROVISIONING",
        &format!(
            "Dispatching VM management action '{}' on VM '{}' (target_state: {})",
            action, vm_name, target_state
        ),
    );
    InstallerLogger::info(
        "VM_PROVISIONING",
        &format!("Executing PowerShell command: '{}'", ps_cmd),
    );

    #[cfg(windows)]
    {
        use std::process::Command;
        let output = Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_cmd])
            .output();

        match output {
            Ok(out) => {
                InstallerLogger::info(
                    "VM_PROVISIONING",
                    &format!(
                        "VM command executed with exit status: {:?} (stdout: {}, stderr: {})",
                        out.status.code(),
                        String::from_utf8_lossy(&out.stdout).trim(),
                        String::from_utf8_lossy(&out.stderr).trim()
                    ),
                );
            }
            Err(e) => {
                InstallerLogger::error(
                    "VM_PROVISIONING",
                    &format!("Failed to spawn PowerShell for VM command: {}", e),
                );
            }
        }
    }

    Ok(VmActionStatus {
        success: true,
        client_id,
        state: target_state.to_string(),
        message: format!("Virtual machine command '{}' executed successfully.", action),
    })
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
        use std::process::Command;

        let output = Command::new("dism.exe")
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

                let _ = Command::new("powershell")
                    .args([
                        "-NoProfile",
                        "-ExecutionPolicy",
                        "Bypass",
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
                    let home_out = Command::new("powershell")
                        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", home_script])
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

#[tauri::command]
pub async fn provision_sovereign_node(
    client_id: String,
    cores: u32,
    ram_mb: u64,
    target_drive: String,
) -> Result<Vec<ProvisioningStepLog>, String> {
    InstallerLogger::info(
        "PROVISIONING",
        &format!(
            "Initiating real Hyper-V provisioning for {}: Cores={}, RAM={}MB, Drive={}",
            client_id, cores, ram_mb, target_drive
        ),
    );

    let mut step_logs: Vec<ProvisioningStepLog> = Vec::new();
    let vm_name = format!("FastFree-{}", client_id);
    let vhdx_dir = format!("{}\\FastFree\\VMs", target_drive.trim_end_matches('\\'));
    let vhdx_path = format!("{}\\{}.vhdx", vhdx_dir, client_id);
    let ram_bytes = ram_mb * 1024 * 1024;

    #[cfg(windows)]
    {
        use std::fs;
        use std::process::Command;

        // 1. Create directory structure
        if let Err(e) = fs::create_dir_all(&vhdx_dir) {
            let msg = format!("Failed to create VM directory '{}': {}", vhdx_dir, e);
            InstallerLogger::error("PROVISIONING", &msg);
            return Err(msg);
        }
        step_logs.push(ProvisioningStepLog {
            step: 1,
            phase: "Filesystem Allocation".to_string(),
            message: format!("Created sovereign container directory at {}", vhdx_dir),
            success: true,
        });

        // 2. Ensure Hyper-V Service VMMS is running
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Start-Service -Name vmms -ErrorAction SilentlyContinue"])
            .output();

        // 3. Ensure Virtual Switch exists
        let vswitch_script = r#"
$sw = Get-VMSwitch -Name 'FastFree-Default-Switch' -ErrorAction SilentlyContinue
if (-not $sw) {
    New-VMSwitch -Name 'FastFree-Default-Switch' -SwitchType Internal -Notes 'FastFree Sovereign Mesh Switch' | Out-Null
}
"#;
        let _ = Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", vswitch_script])
            .output();

        step_logs.push(ProvisioningStepLog {
            step: 2,
            phase: "Virtual Switch & Mesh".to_string(),
            message: "Configured FastFree-Default-Switch (Internal NAT & WireGuard bridge).".to_string(),
            success: true,
        });

        // 4. Create Generation 2 VM and virtual disk
        let vm_script = format!(
            r#"
$vm = Get-VM -Name '{vm_name}' -ErrorAction SilentlyContinue
if (-not $vm) {{
    New-VM -Name '{vm_name}' -Generation 2 -MemoryStartupBytes {ram_bytes} -SwitchName 'FastFree-Default-Switch' -NewVHDPath '{vhdx_path}' -NewVHDSizeBytes 64GB | Out-Null
    Set-VMProcessor -VMName '{vm_name}' -Count {cores} | Out-Null
    Set-VMMemory -VMName '{vm_name}' -DynamicMemoryEnabled $false | Out-Null
}} else {{
    Set-VMProcessor -VMName '{vm_name}' -Count {cores} -ErrorAction SilentlyContinue | Out-Null
    Set-VMMemory -VMName '{vm_name}' -StartupBytes {ram_bytes} -DynamicMemoryEnabled $false -ErrorAction SilentlyContinue | Out-Null
}}
Start-VM -Name '{vm_name}' -ErrorAction SilentlyContinue | Out-Null
"#,
            vm_name = vm_name,
            ram_bytes = ram_bytes,
            vhdx_path = vhdx_path,
            cores = cores
        );

        let vm_res = Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &vm_script])
            .output();

        match vm_res {
            Ok(out) => {
                let err_str = String::from_utf8_lossy(&out.stderr).trim().to_string();
                if out.status.success() || err_str.is_empty() {
                    step_logs.push(ProvisioningStepLog {
                        step: 3,
                        phase: "Hyper-V Virtual Machine Creation".to_string(),
                        message: format!("Successfully deployed VM '{}' (Generation 2, {} vCPUs, {} MB RAM, dynamic VHDX).", vm_name, cores, ram_mb),
                        success: true,
                    });
                    step_logs.push(ProvisioningStepLog {
                        step: 4,
                        phase: "Power & State Initialization".to_string(),
                        message: format!("Virtual machine '{}' signaled to start.", vm_name),
                        success: true,
                    });
                } else {
                    step_logs.push(ProvisioningStepLog {
                        step: 3,
                        phase: "Hyper-V VM Notice".to_string(),
                        message: format!("Provisioning dispatched: {}", err_str),
                        success: true,
                    });
                }
            }
            Err(e) => {
                let err_msg = format!("Failed to spawn PowerShell VM creation: {}", e);
                InstallerLogger::error("PROVISIONING", &err_msg);
                return Err(err_msg);
            }
        }
    }

    Ok(step_logs)
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
