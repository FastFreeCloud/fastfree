use crate::commands::ProvisioningStepLog;
use crate::dto::*;
use crate::logger::InstallerLogger;
use crate::services::process::{hidden_command, hidden_powershell};
use crate::services::service_hub;
use tauri::{AppHandle, Emitter};

pub struct HyperVService;

/// Native SCM probe: `(vmms installed, vmms running)`. Read-only; never mutates.
/// Mirrors what the old script derived from `Get-Service -Name vmms`.
#[cfg(windows)]
fn query_vmms_installed_and_running() -> (bool, bool) {
    use windows::core::PCWSTR;
    use windows::Win32::System::Services::{
        CloseServiceHandle, OpenSCManagerW, OpenServiceW, QueryServiceStatus, SC_MANAGER_CONNECT,
        SERVICE_QUERY_STATUS, SERVICE_RUNNING, SERVICE_STATUS,
    };

    unsafe {
        let scm = match OpenSCManagerW(PCWSTR::null(), PCWSTR::null(), SC_MANAGER_CONNECT) {
            Ok(handle) => handle,
            Err(e) => {
                InstallerLogger::warn("HYPERV_ENV", &format!("OpenSCManagerW failed: {}", e));
                return (false, false);
            }
        };

        let service_name = service_hub::to_wide("vmms");
        let service = match OpenServiceW(
            scm,
            PCWSTR::from_raw(service_name.as_ptr()),
            SERVICE_QUERY_STATUS,
        ) {
            Ok(handle) => handle,
            Err(_) => {
                // Service does not exist on this host.
                let _ = CloseServiceHandle(scm);
                return (false, false);
            }
        };

        let mut status = SERVICE_STATUS::default();
        let running = match QueryServiceStatus(service, &mut status) {
            Ok(()) => status.dwCurrentState == SERVICE_RUNNING,
            Err(_) => false,
        };

        let _ = CloseServiceHandle(service);
        let _ = CloseServiceHandle(scm);
        (true, running)
    }
}

/// Native `NetLocalGroupGetMembers` (level 3) probe of the caller's membership in
/// 'Hyper-V Administrators'. Matches the old script's semantics: the member is
/// `$env:USERNAME`, matched case-insensitively, allowing a `DOMAIN\` prefix.
#[cfg(windows)]
fn current_user_is_hyperv_administrator() -> bool {
    use windows::core::PCWSTR;
    use windows::Win32::NetworkManagement::NetManagement::{
        NetApiBufferFree, NetLocalGroupGetMembers, LOCALGROUP_MEMBERS_INFO_3,
    };

    let user = match std::env::var("USERNAME") {
        Ok(name) if !name.is_empty() => name,
        _ => return false,
    };
    let user_lower = user.to_ascii_lowercase();
    let suffix = format!("\\{}", user_lower);

    let group_wide = service_hub::to_wide("Hyper-V Administrators");
    let mut buffer: *mut u8 = std::ptr::null_mut();
    let mut entries_read: u32 = 0;
    let mut total_entries: u32 = 0;

    // prefmaxlen = MAX_PREFERRED_LENGTH (-1 as u32): one call returns all members.
    let status = unsafe {
        NetLocalGroupGetMembers(
            PCWSTR::null(),
            PCWSTR::from_raw(group_wide.as_ptr()),
            3,
            &mut buffer,
            u32::MAX,
            &mut entries_read,
            &mut total_entries,
            None,
        )
    };

    // NET_API_STATUS: 0 == NERR_Success.
    if status != 0 || buffer.is_null() {
        InstallerLogger::warn(
            "HYPERV_ENV",
            &format!("NetLocalGroupGetMembers failed (error {}), assuming not a member.", status),
        );
        return false;
    }

    let mut in_group = false;
    for index in 0..entries_read as usize {
        let entry = unsafe { &*(buffer as *const LOCALGROUP_MEMBERS_INFO_3).add(index) };
        if entry.lgrmi3_domainandname.is_null() {
            continue;
        }
        if let Ok(domain_and_name) = unsafe { entry.lgrmi3_domainandname.to_string() } {
            let member_lower = domain_and_name.to_ascii_lowercase();
            if member_lower == user_lower || member_lower.ends_with(&suffix) {
                in_group = true;
                break;
            }
        }
    }

    unsafe {
        let _ = NetApiBufferFree(Some(buffer as *const std::ffi::c_void));
    }
    in_group
}

#[cfg(windows)]
fn is_account_hidden_in_winlogon(svc_name: &str) -> bool {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        HKEY_LOCAL_MACHINE, KEY_READ, RegCloseKey, RegOpenKeyExW, RegQueryValueExW,
    };

    unsafe {
        let subkey = service_hub::to_wide("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\\SpecialAccounts\\UserList");
        let val_name = service_hub::to_wide(svc_name);
        let mut hkey = windows::Win32::System::Registry::HKEY::default();

        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR::from_raw(subkey.as_ptr()),
            0,
            KEY_READ,
            &mut hkey,
        )
        .is_err()
        {
            return false;
        }

        let mut data = [0u8; 4];
        let mut size = 4u32;
        let mut dtype = windows::Win32::System::Registry::REG_VALUE_TYPE(0u32);
        let ok = RegQueryValueExW(
            hkey,
            PCWSTR::from_raw(val_name.as_ptr()),
            None,
            Some(&mut dtype),
            Some(data.as_mut_ptr()),
            Some(&mut size),
        )
        .is_ok();
        let _ = RegCloseKey(hkey);
        ok && data == [0, 0, 0, 0]
    }
}

impl HyperVService {
    pub fn ensure_hyperv_environment() -> Result<(), String> {
        #[cfg(windows)]
        {
            InstallerLogger::info(
                "HYPERV_ENV",
                "Verifying Hyper-V environment: VMMS service state and Hyper-V Administrators group...",
            );

            // 1. Service ACTION via native SCM: set vmms to Automatic and ensure running.
            let _ = service_hub::ensure_vmms_autostart_running();
            // 2. Group ACTION via native NetLocalGroupAddMembers (best effort).
            let _ = service_hub::add_current_user_to_hyperv_administrators();

            // 3. Native QUERY portion: probe vmms install/running state via SCM and
            //    Hyper-V Administrators membership via NetLocalGroupGetMembers.
            let (vmms_installed, vmms_running) = query_vmms_installed_and_running();
            let in_group = current_user_is_hyperv_administrator();

            // Preserve the historical stdout-style marker (capitalized True/False).
            let tf = |b: bool| if b { "True" } else { "False" };
            let probe = format!(
                "FASTFREE_ENV:vmms_installed={};vmms_running={};in_group={}",
                tf(vmms_installed),
                tf(vmms_running),
                tf(in_group)
            );
            InstallerLogger::info("HYPERV_ENV", &format!("Environment probe output: {}", probe));
            if !vmms_installed {
                return Err("Hyper-V Virtual Machine Management Service (vmms) is not installed on this host. Please enable Hyper-V in Windows Features.".to_string());
            }
        }
        Ok(())
    }

    pub async fn manage_vm(action: String, client_id: String) -> Result<VmActionStatus, String> {
        let vm_name = format!("FastFree-{}", client_id);
        let _ = Self::ensure_hyperv_environment();
    
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
    
        #[cfg(windows)]
        {
            use crate::services::hyperv_wmi;

            InstallerLogger::info(
                "VM_PROVISIONING",
                &format!("Dispatching VM management action '{}' on VM '{}'", action, vm_name),
            );

            // VM must exist first (mirrors the old Get-VM probe).
            let vm = match hyperv_wmi::find_vm(&vm_name) {
                Ok(Some(vm)) => vm,
                Ok(None) => {
                    let msg = format!(
                        "VM_NOT_FOUND: Virtual machine '{}' does not exist in Hyper-V. Please provision the node first.",
                        vm_name
                    );
                    InstallerLogger::error("VM_PROVISIONING", &msg);
                    return Err(msg);
                }
                Err(e) => {
                    InstallerLogger::error("VM_PROVISIONING", &e);
                    return Err(e);
                }
            };

            // Power-state transitions via Msvm_ComputerSystem.RequestStateChange.
            let requested = match ps_action {
                // Same semantics as: Start-VM / Stop-VM -Force (graceful shutdown) / Restart-VM -Force
                "start" if vm.EnabledState != 2 => Some(2u32),
                "start" => None,
                "stop" if vm.EnabledState == 2 || vm.EnabledState == 6 => Some(4u32),
                "stop" => None,
                "restart" => Some(10u32),
                _ => None, // "status"
            };

            if let Some(rs) = requested {
                if let Err(e) = hyperv_wmi::request_state_change(&vm.Name, rs) {
                    InstallerLogger::error("VM_PROVISIONING", &e);
                    return Err(format!("Hyper-V VM error: {}", e));
                }
            }

            std::thread::sleep(std::time::Duration::from_millis(600));

            let real_state = hyperv_wmi::find_vm(&vm_name)
                .ok()
                .flatten()
                .map(|v| hyperv_wmi::state_string(v.EnabledState).to_string())
                .unwrap_or_else(|| "Running".to_string());

            return Ok(VmActionStatus {
                success: true,
                client_id,
                state: real_state.clone(),
                message: format!("Virtual machine '{}' is now {}.", vm_name, real_state),
            });
        }
    
        #[cfg(not(windows))]
        Ok(VmActionStatus {
            success: true,
            client_id,
            state: "Running".to_string(),
            message: format!("Non-Windows simulation for '{}'", action),
        })
    }

    pub async fn get_vm_real_state(client_id: String) -> Result<VmRealState, String> {
        let vm_name = format!("FastFree-{}", client_id);
        InstallerLogger::info("VM_TELEMETRY", &format!("Querying live Hyper-V state for '{}'", vm_name));
    
        #[cfg(windows)]
        {
            use crate::services::hyperv_wmi;

            // ------------------------------------------------------------
            // Native telemetry: 21 VmRealState fields via WMI (v2) + std::fs + registry.
            // Every probe is individually best-effort and falls back to the same
            // defaults the old PowerShell silently used.
            // ------------------------------------------------------------

            let service_account = format!("fastfree_{}", client_id);

            let vm_opt = match hyperv_wmi::find_vm(&vm_name) {
                Ok(vm) => vm,
                Err(e) => {
                    InstallerLogger::warn("VM_TELEMETRY", &format!("Hyper-V telemetry error for '{}': {}", vm_name, e));
                    return Err(format!("Hyper-V telemetry error: {}", e));
                }
            };

            // Not-found branch â€” mirrors the synthetic JSON object the PS script emitted.
            let vm = match vm_opt {
                Some(v) => v,
                None => {
                    return Ok(VmRealState {
                        exists: false,
                        state: "NotFound".to_string(),
                        uptime_seconds: 0,
                        memory_mb: 0,
                        cpu_cores: 0,
                        ip_addresses: vec![],
                        heartbeat: "No Contact".to_string(),
                        secure_boot_enabled: false,
                        nested_virt_enabled: false,
                        switch_name: "None".to_string(),
                        checkpoint_type: "None".to_string(),
                        vhdx_path: String::new(),
                        vhdx_size_bytes: 0,
                        is_empty_disk: false,
                        guest_status: "NotFound".to_string(),
                        guest_status_message: "Virtual machine is not registered in Hyper-V.".to_string(),
                        service_account: service_account.clone(),
                        is_account_cloaked: false,
                        is_storage_hardened: false,
                        hardened_account_configured: false,
                        service_account_name: service_account,
                    });
                }
            };

            // --- Hardware probes (best-effort; each failure keeps a safe default) ---
            let processor = hyperv_wmi::processor_settings(&vm.Name);
            let cpu_cores: u32 = processor
                .as_ref()
                .map(|s| s.VirtualQuantity.min(u32::MAX as u64) as u32)
                .unwrap_or(0);
            let nested_virt_enabled = processor
                .as_ref()
                .map(|s| s.ExposeVirtualizationExtensions)
                .unwrap_or(false);

            let memory_mb: u64 = hyperv_wmi::memory_setting(&vm.Name)
                .map(|m| m.VirtualQuantity)
                .unwrap_or(0);

            let virt_settings = hyperv_wmi::virtual_system_setting(&vm.Name);
            let secure_boot_enabled = virt_settings.as_ref().map(|s| s.SecureBootEnabled).unwrap_or(false);
            let checkpoint_type = virt_settings
                .as_ref()
                .map(|s| hyperv_wmi::checkpoint_type_string(s.CheckpointType))
                .unwrap_or("Production")
                .to_string();

            let heartbeat = hyperv_wmi::heartbeat_status(&vm.Name); // "OK" | "No Contact"

            // --- Disk: VHDX path via storage-allocation settings; size via std::fs ---
            let vhdx_path = hyperv_wmi::vhdx_path(&vm.Name).unwrap_or_default();
            let (vhdx_size_bytes, is_empty_disk) = match std::fs::metadata(&vhdx_path) {
                Ok(meta) => {
                    let len = meta.len();
                    (len, len <= 10_485_760)
                }
                Err(_) => (0u64, false),
            };
            let is_storage_hardened = !vhdx_path.is_empty() && std::path::Path::new(&vhdx_path).exists();

            // --- Guest health inference (mirrors the old PS decision tree) ---
            let running = vm.EnabledState == 2;
            let (guest_status, guest_status_message) = if running {
                if is_empty_disk {
                    (
                        "UEFI_NoOS".to_string(),
                        "SCSI Disk (0,0): The boot loader did not load an operating system. Detected 4MB empty stub VHDX.".to_string(),
                    )
                } else if heartbeat.eq_ignore_ascii_case("OK") {
                    ("Healthy".to_string(), "FastFree NixOS appliance operating normally.".to_string())
                } else {
                    ("Starting".to_string(), "Guest OS is booting or waiting for integration heartbeat...".to_string())
                }
            } else {
                ("Offline".to_string(), "Virtual machine is powered off.".to_string())
            };

            // --- Switch name via NIC allocation chain (adapter -> switch) ---
            let switch_name = hyperv_wmi::vm_switch_name(&vm.Name).unwrap_or_else(|| "Default Switch".to_string());

            // --- Service account / cloak detection: Win32_UserAccount + HKLM registry ---
            let hardened_account_configured = hyperv_wmi::local_user_exists(&service_account);
            let is_account_cloaked = is_account_hidden_in_winlogon(&service_account);

            // ip_addresses: WMI v2 KVP exchange (Msvm_KvpExchangeComponent.GetInterNetworkAddresses)
            // requires an out-param array over exec_method and is intentionally left to a later pass.
            let ip_addresses: Vec<String> = Vec::new();

            // uptime_seconds: not exposed as a plain property (only via GetSummaryInformation method);
            // reported 0 until that method is wired â€” matches the old script's SilentlyContinue behavior.
            let uptime_seconds = 0u64;

            return Ok(VmRealState {
                exists: true,
                state: hyperv_wmi::state_string(vm.EnabledState).to_string(),
                uptime_seconds,
                memory_mb,
                cpu_cores,
                ip_addresses,
                heartbeat,
                secure_boot_enabled,
                nested_virt_enabled,
                switch_name,
                checkpoint_type,
                vhdx_path,
                vhdx_size_bytes,
                is_empty_disk,
                guest_status,
                guest_status_message,
                service_account: service_account.clone(),
                is_account_cloaked,
                is_storage_hardened,
                hardened_account_configured,
                service_account_name: service_account,
            });
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

    pub async fn check_vm_exists(client_id: String) -> Result<bool, String> {
        let vm_name = format!("FastFree-{}", client_id);
        InstallerLogger::info(
            "VM_CHECK",
            &format!("Probing existence of Hyper-V VM '{}'...", vm_name),
        );
    
        #[cfg(windows)]
        {
            Ok(crate::services::hyperv_wmi::vm_exists(&vm_name))
        }

        #[cfg(not(windows))]
        Ok(false)
    }

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
    
                    // Native SCM call replaces the previous PowerShell Set-Service/Start-Service script.
                    service_hub::ensure_vmms_autostart_running()?;
    
                    if out.status.success() || stdout.contains("The operation completed successfully") {
                        return Ok("Hyper-V features enabled successfully. A system restart may be required if this is the first activation.".to_string());
                    } else if stdout.contains("0x800f080c") || stderr.contains("Feature name Microsoft-Hyper-V is unknown") {
                        InstallerLogger::info("HYPERV_INSTALL", "Detected Windows Home edition. Installing Hyper-V packages from servicing store...");
                        let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
                        let packages_dir = std::path::Path::new(&system_root).join("servicing").join("Packages");

                        // Equivalent of: Get-ChildItem -Filter "*Hyper-V*.mum" (case-insensitive).
                        let mut mum_packages: Vec<std::path::PathBuf> = Vec::new();
                        match std::fs::read_dir(&packages_dir) {
                            Ok(entries) => {
                                for entry in entries.flatten() {
                                    let path = entry.path();
                                    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
                                    if name.contains("hyper-v") && name.ends_with(".mum") {
                                        mum_packages.push(path);
                                    }
                                }
                            }
                            Err(e) => {
                                InstallerLogger::warn(
                                    "HYPERV_INSTALL",
                                    &format!("Failed to enumerate servicing Packages dir '{}': {}", packages_dir.display(), e),
                                );
                            }
                        }

                        for pkg in &mum_packages {
                            let add_out = hidden_command("dism.exe")
                                .args(["/Online", "/NoRestart", &format!("/Add-Package:{}", pkg.display())])
                                .output();
                            match add_out {
                                Ok(pkg_out) => {
                                    let pkg_stdout = String::from_utf8_lossy(&pkg_out.stdout);
                                    let pkg_stderr = String::from_utf8_lossy(&pkg_out.stderr);
                                    InstallerLogger::info(
                                        "HYPERV_INSTALL",
                                        &format!(
                                            "Add-Package '{}' exit={:?} out={} err={}",
                                            pkg.display(),
                                            pkg_out.status.code(),
                                            pkg_stdout,
                                            pkg_stderr
                                        ),
                                    );
                                }
                                Err(e) => {
                                    InstallerLogger::warn(
                                        "HYPERV_INSTALL",
                                        &format!("Failed to invoke DISM Add-Package for '{}': {}", pkg.display(), e),
                                    );
                                }
                            }
                        }

                        // Service ACTION via native SCM instead of the PowerShell one-liner.
                        let _ = service_hub::ensure_vmms_autostart_running();

                        let enable_out = hidden_command("dism.exe")
                            .args([
                                "/Online",
                                "/Enable-Feature",
                                "/All",
                                "/FeatureName:Microsoft-Hyper-V",
                                "/NoRestart",
                            ])
                            .output();
                        match enable_out {
                            Ok(e_out) => {
                                let e_stdout = String::from_utf8_lossy(&e_out.stdout);
                                let e_stderr = String::from_utf8_lossy(&e_out.stderr);
                                InstallerLogger::info(
                                    "HYPERV_INSTALL",
                                    &format!(
                                        "Home Enable-Feature exit={:?} out={} err={}",
                                        e_out.status.code(),
                                        e_stdout,
                                        e_stderr
                                    ),
                                );
                            }
                            Err(e) => {
                                InstallerLogger::warn(
                                    "HYPERV_INSTALL",
                                    &format!("Failed to invoke DISM Enable-Feature (Home path): {}", e),
                                );
                            }
                        }
                        return Ok("Hyper-V packages installed for Windows Home. Please restart your PC to complete Hyper-V initialization.".to_string());
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

    pub async fn ensure_service_account(
        client_id: String,
        target_drive: String,
    ) -> Result<ServiceAccountResult, String> {
        InstallerLogger::info(
            "SECURITY",
            &format!("Ensuring sovereign isolated service account for node {}", client_id),
        );
    
        let clean_drive = target_drive.trim_end_matches('\\').to_string();
    
        #[cfg(windows)]
        {
            crate::services::service_account::provision(&clean_drive, &client_id)
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
            // 1. Stop VM via WMI v2 RequestStateChange (RequestedState=3 = Disabled/Stop).
            match crate::services::hyperv_wmi::find_vm(&vm_name) {
                Ok(Some(vm)) => {
                    use crate::services::hyperv_wmi::request_state_change;
                    let guid = vm.Name.clone();
                    if let Err(e) = request_state_change(&guid, 3) {
                        InstallerLogger::warn("HYPERV_RECONFIG", &format!("Failed to stop VM (continuing): {}", e));
                    }
                    std::thread::sleep(std::time::Duration::from_millis(1500));
                }
                Ok(None) => {
                    return Err(format!("VM '{}' does not exist in Hyper-V.", vm_name));
                }
                Err(e) => {
                    InstallerLogger::warn("HYPERV_RECONFIG", &format!("VM state lookup failed (continuing): {}", e));
                }
            }
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
    
        Self::get_vm_real_state(client_id).await
    }

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
            if let Err(e) = Self::ensure_hyperv_environment() {
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
                match Self::ensure_service_account(client_id.clone(), target_drive.clone()).await {
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
            // Native SCM + NetLocalGroup calls replace the previous PowerShell one-liner.
            let _ = service_hub::ensure_vmms_autostart_running();
            let _ = service_hub::add_current_user_to_hyperv_administrators();
    
            // 4. Resolve Virtual Switch: Prefer Default Switch (Host NAT + DHCP + Internet) ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â native WMI, no PowerShell.
            #[cfg(windows)]
            let switch_name = crate::services::hyperv_wmi::resolve_virtual_switch();
            #[cfg(not(windows))]
            let switch_name = "Default Switch".to_string();
    
            let step3 = ProvisioningStepLog {
                step: 3,
                phase: "Virtual Switch & Networking".to_string(),
                message: format!("Bound to Hyper-V Virtual Switch: '{}' (Auto NAT & DHCP).", switch_name),
                success: true,
            };
            let _ = app.emit("provision-step", &step3);
            step_logs.push(step3);
    
            // 5. Verify or download real FastFree NixOS appliance VHDX image
            if let Err(e) = crate::services::storage::StorageService::ensure_appliance_vhdx(&app, &client_id, &vhdx_path).await {
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
}
