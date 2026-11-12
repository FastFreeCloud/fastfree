use crate::discovery::HostDiscoveryPipeline;
use crate::dto::*;
use crate::licensing::LicensingManager;
use crate::logger::InstallerLogger;
use crate::services::audit::{AuditService, SystemAuditReport};
use crate::services::hyperv::HyperVService;
use crate::services::network::NetworkService;
use crate::services::process;
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager};

// Re-exports for backward compatibility across modules and tests
pub use crate::services::audit::{StepAuditItem, SystemAuditReport as ExportedSystemAuditReport};
pub use crate::services::process::{hidden_command, hidden_powershell};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ProvisioningStepLog {
    pub step: u32,
    pub phase: String,
    pub message: String,
    pub success: bool,
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
        if let Some(icon) = app.default_window_icon().cloned() {
            let _ = main.set_icon(icon);
        }
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
pub async fn transfer_license_to_current_device(
    app: AppHandle,
    key: String,
    admin_password: String,
) -> Result<LicenseVerificationResult, String> {
    LicensingManager::transfer_license(&app, &key, &admin_password).await
}

static ADMIN_PASSWORD_RATE_LIMIT: Mutex<(u32, SystemTime)> = Mutex::new((0, SystemTime::UNIX_EPOCH));

#[tauri::command]
pub async fn verify_admin_password(password: String) -> Result<bool, String> {
    // Rate limiting: max 5 attempts per 60 seconds.
    {
        let mut guard = ADMIN_PASSWORD_RATE_LIMIT.lock().unwrap();
        let now = SystemTime::now();
        if now.duration_since(guard.1).unwrap_or_default() > Duration::from_secs(60) {
            *guard = (0, now);
        }
        if guard.0 >= 5 {
            return Err("Too many attempts. Please try again later.".to_string());
        }
        guard.0 += 1;
    }

    if password.len() > 256 {
        return Ok(false);
    }
    let expected = crate::licensing::master_transfer_secret();
    if expected.is_empty() {
        return Ok(false);
    }
    let ok = password.trim() == expected;
    if ok {
        if let Ok(mut guard) = ADMIN_PASSWORD_RATE_LIMIT.lock() {
            *guard = (0, SystemTime::now());
        }
    }
    Ok(ok)
}

#[tauri::command]
pub async fn get_machine_hwid() -> Result<String, String> {
    Ok(LicensingManager::get_machine_hwid())
}

#[tauri::command]
pub async fn get_wireguard_status(client_id: String) -> Result<WireGuardPeerConfig, String> {
    NetworkService::get_wireguard_status(client_id)
}

#[tauri::command]
pub async fn apply_wireguard_config(
    client_id: String,
    custom_port: Option<u16>,
    custom_ip: Option<String>,
    custom_endpoint: Option<String>,
    custom_conf: Option<String>,
) -> Result<WireGuardApplyResult, String> {
    NetworkService::apply_wireguard_config(client_id, custom_port, custom_ip, custom_endpoint, custom_conf)
}

#[tauri::command]
pub async fn check_wireguard_firewall_rule() -> Result<FirewallRuleStatus, String> {
    NetworkService::check_wireguard_firewall_rule()
}

#[tauri::command]
pub async fn enable_wireguard_firewall_rule() -> Result<FirewallRuleStatus, String> {
    NetworkService::enable_wireguard_firewall_rule()
}

#[tauri::command]
pub async fn probe_wireguard_endpoint(
    endpoint: String,
    port: Option<u16>,
) -> Result<WireguardProbeResult, String> {
    NetworkService::probe_wireguard_endpoint(endpoint, port).await
}

#[tauri::command]
pub async fn manage_vm(action: String, client_id: String) -> Result<VmActionStatus, String> {
    HyperVService::manage_vm(action, client_id).await
}

#[tauri::command]
pub async fn get_vm_real_state(client_id: String) -> Result<VmRealState, String> {
    HyperVService::get_vm_real_state(client_id).await
}

#[tauri::command]
pub async fn check_vm_exists(client_id: String) -> Result<bool, String> {
    HyperVService::check_vm_exists(client_id).await
}

#[tauri::command]
pub async fn install_hyperv_feature() -> Result<String, String> {
    HyperVService::install_hyperv_feature().await
}

#[tauri::command]
pub async fn ensure_service_account(
    client_id: String,
    target_drive: String,
) -> Result<ServiceAccountResult, String> {
    HyperVService::ensure_service_account(client_id, target_drive).await
}

#[tauri::command]
pub async fn reconfigure_hyperv_vm(
    client_id: String,
    target_drive: String,
    cores: Option<u32>,
    ram_mb: Option<u64>,
) -> Result<VmRealState, String> {
    HyperVService::reconfigure_hyperv_vm(client_id, target_drive, cores, ram_mb).await
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
    HyperVService::provision_node(app, client_id, cores, ram_mb, target_drive, hardened_security).await
}

#[tauri::command]
pub async fn check_admin_elevation() -> Result<bool, String> {
    Ok(process::is_admin_elevated())
}

#[tauri::command]
pub async fn read_clipboard_text() -> Result<String, String> {
    Ok(process::read_native_clipboard())
}

#[tauri::command]
pub async fn ensure_tray_promoted() -> Result<(), String> {
    process::promote_tray_icon()
}

#[tauri::command]
pub async fn get_diagnostic_logs() -> Result<String, String> {
    InstallerLogger::read_all_logs()
}

#[tauri::command]
pub async fn export_diagnostic_bundle(target_path: Option<String>) -> Result<String, String> {
    if let Some(p) = &target_path {
        if p.contains("..") || p.contains('\0') || p.trim().is_empty() {
            return Err("Invalid diagnostic bundle target path".to_string());
        }
    }
    InstallerLogger::export_bundle(target_path)
}

/// Single scalar probe returned by `probe_host_telemetry`.
/// Every field is best-effort: `None`/defaults mean "could not be collected".
#[derive(serde::Serialize, Clone, Debug)]
pub struct HostTelemetryProbe {
    pub cpu_percent: Option<f64>,
    pub ram_total_mb: Option<u64>,
    pub ram_used_mb: Option<u64>,
    pub uptime_hours: Option<f64>,
    pub core_count: Option<u32>,
    pub vmms_status: String,
    pub vm_count: Option<u32>,
    pub in_hyperv_group: Option<bool>,
    pub secure_boot: Option<bool>,
    pub drive: String,
    pub drive_total_gb: Option<f64>,
    pub drive_free_gb: Option<f64>,
    pub os_name: String,
    pub collected_at: String,
}

/// Live host telemetry probe: one hidden PowerShell collected as compressed JSON.
/// Used by the unified diagnostic hub telemetry tab (15s polling on the frontend).
#[tauri::command]
pub async fn probe_host_telemetry(drive: Option<String>) -> Result<HostTelemetryProbe, String> {
    // Target drive: sanitize to a bare "X:" letter to avoid injection in the CIM filter.
    let drive_letter = drive
        .as_deref()
        .and_then(|d| d.trim().chars().next())
        .filter(|c| c.is_ascii_alphabetic())
        .map(|c| format!("{}:", c.to_ascii_uppercase()))
        .unwrap_or_else(|| {
            use std::sync::OnceLock;
            static SYSTEM_DRIVE: OnceLock<String> = OnceLock::new();
            SYSTEM_DRIVE
                .get_or_init(|| {
                    let sd = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());
                    sd.to_ascii_uppercase()
                })
                .clone()
        });

    let ps_script = r#"$ErrorActionPreference = 'SilentlyContinue'; $out = [ordered]@{ cpu = $null; ram_total_mb = $null; uptime_hours = $null; cores = $null; vmms = 'Unknown'; vm_count = $null; in_hyperv_group = $null; secure_boot = $null; os = ''; drive_total_gb = $null; drive_free_gb = $null }; $os = Get-CimInstance -ClassName Win32_OperatingSystem; if ($os) { $out.ram_total_mb = [uint64]([math]::Round($os.TotalVisibleMemorySize / 1KB)); $out.uptime_hours = [math]::Round(((New-TimeSpan -Start $os.LastBootUpTime -End (Get-Date)).TotalHours), 2); $out.os = [string]$os.Caption }; $cpu = Get-CimInstance -ClassName Win32_Processor | Measure-Object -Property LoadPercentage -Average; if ($cpu -and $null -ne $cpu.Average) { $out.cpu = [double]$cpu.Average }; $out.cores = [System.Environment]::ProcessorCount; $out.ram_free_mb = $null; $svc = Get-Service -Name vmms; $out.vmms = if ($svc) { [string]$svc.Status } else { 'NotFound' }; try { $out.vm_count = @(Get-VM).Count } catch { $out.vm_count = $null }; try { $me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name.Split('\')[-1]; $out.in_hyperv_group = $false; foreach ($m in @(Get-LocalGroupMember -Group 'Hyper-V Administrators')) { if ($m.Name.Split('\')[-1] -eq $me) { $out.in_hyperv_group = $true; break } } } catch { $out.in_hyperv_group = $null }; try { $out.secure_boot = [bool](Confirm-SecureBootUEFI) } catch { $out.secure_boot = $null }; $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='_DRIVE_'"; if ($disk) { $out.drive_total_gb = [math]::Round($disk.Size / 1GB, 1); $out.drive_free_gb = [math]::Round($disk.FreeSpace / 1GB, 1) }; if ($os) { $out.ram_free_mb = [uint64]([math]::Round($os.FreePhysicalMemory / 1KB)) }; $out | ConvertTo-Json -Compress"#
    .replace("_DRIVE_", &drive_letter);

    #[cfg(not(windows))]
    let out = Err::<std::process::Output, String>("Telemetry probe is Windows-only.".to_string());
    #[cfg(windows)]
    let out = {
        let script = ps_script.clone();
        tokio::task::spawn_blocking(move || {
            hidden_powershell().args(["-Command", &script]).output()
        })
        .await
        .map_err(|e| format!("Telemetry probe join error: {}", e))?
        .map_err(|e| format!("Telemetry probe spawn error: {}", e))
    };

    let output = out?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "Telemetry probe PowerShell failed ({}): {}",
            output.status,
            if stderr.is_empty() {
                String::from_utf8_lossy(&output.stdout).trim().to_string()
            } else {
                stderr
            }
        ));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    // ConvertTo-Json may be prefixed by newline noise; locate the JSON object start.
    let json = stdout
        .get(stdout.find('{').unwrap_or(0)..)
        .ok_or("Telemetry probe returned no JSON".to_string())?;
    let v: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("Telemetry probe JSON parse error: {}", e))?;

    let n64 = |key: &str| v.get(key).and_then(|x| x.as_u64());
    let nf = |key: &str| v.get(key).and_then(|x| x.as_f64());
    let nb = |key: &str| v.get(key).and_then(|x| x.as_bool());
    let s = |key: &str| {
        v.get(key)
            .map(|x| x.as_str().unwrap_or("").trim().to_string())
            .unwrap_or_default()
    };

    let ram_total_mb = n64("ram_total_mb");
    let ram_free_mb = n64("ram_free_mb");
    let ram_used_mb = match (ram_total_mb, ram_free_mb) {
        (Some(total), Some(free)) => Some(total.saturating_sub(free)),
        _ => None,
    };

    Ok(HostTelemetryProbe {
        cpu_percent: nf("cpu"),
        ram_total_mb,
        ram_used_mb,
        uptime_hours: nf("uptime_hours"),
        core_count: n64("cores").map(|c| c as u32),
        vmms_status: {
            let st = s("vmms");
            if st.is_empty() { "Unknown".to_string() } else { st }
        },
        vm_count: n64("vm_count").map(|c| c as u32),
        in_hyperv_group: nb("in_hyperv_group"),
        secure_boot: nb("secure_boot"),
        drive: drive_letter.clone(),
        drive_total_gb: nf("drive_total_gb"),
        drive_free_gb: nf("drive_free_gb"),
        os_name: s("os"),
        collected_at: {
            let now = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            format!("{}", now)
        },
    })
}

/// Runtime usage probe for ONE appliance VM (launchpad telemetry dial).
/// Reads Get-VM runtime metrics (CPUUsage / MemoryAssigned / MemoryDemand / Uptime),
/// the attached VHDX file size, drive capacity, VMMS health and the FastFree virtual
/// adapter's cumulative byte counters (the frontend derives MB/s deltas from these).
#[derive(serde::Serialize, Clone, Debug)]
pub struct VmUsageProbe {
    pub exists: bool,
    pub vm_cpu_percent: Option<f64>,
    pub core_count: Option<u64>,
    pub assigned_mb: Option<u64>,
    pub demand_mb: Option<u64>,
    pub uptime_seconds: Option<u64>,
    pub vm_status: String,
    pub vhdx_path: String,
    pub vhdx_used_gb: Option<f64>,
    pub drive: String,
    pub drive_total_gb: Option<f64>,
    pub drive_free_gb: Option<f64>,
    pub wg_adapter_up: bool,
    pub wg_up_bytes: Option<u64>,
    pub wg_down_bytes: Option<u64>,
    pub vmms_status: String,
    pub collected_at: String,
}

#[tauri::command]
pub async fn probe_vm_usage(
    client_id: String,
    drive: Option<String>,
) -> Result<VmUsageProbe, String> {
    // client_id comes from UI state: keep it to a safe appliance-token charset.
    let client = client_id
        .trim()
        .to_ascii_lowercase();
    let client_clean: String = client
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    if client_clean.is_empty() {
        return Err("Invalid client id".to_string());
    }
    let drive_letter = drive
        .as_deref()
        .and_then(|d| d.trim().chars().next())
        .filter(|c| c.is_ascii_alphabetic())
        .map(|c| format!("{}:", c.to_ascii_uppercase()));

    let ps_script = r#"$ErrorActionPreference = 'SilentlyContinue'; $out = [ordered]@{ exists = $false; cpu = $null; cores = $null; assigned_mb = $null; demand_mb = $null; uptime_s = $null; status = ''; vhdx = ''; vhdx_used_gb = $null; wg_up = $false; wg_up_b = $null; wg_down_b = $null; vmms = '' }; try { $vm = Get-VM -Name '_VM_' ; if ($vm) { $out.exists = $true; $out.cpu = [double]$vm.CPUUsage; $out.cores = [uint64]$vm.ProcessorCount; $out.assigned_mb = [uint64]([math]::Round($vm.MemoryAssigned / 1MB)); $out.demand_mb = [uint64]([math]::Round($vm.MemoryDemand / 1MB)); $out.uptime_s = [uint64]($vm.Uptime.TotalSeconds); $out.status = [string]$vm.Status; $hdd = $vm.HardDrives | Select-Object -First 1; if ($hdd) { $out.vhdx = [string]$hdd.Path } } } catch { }; if ($out.vhdx) { try { $fi = Get-Item -LiteralPath $out.vhdx -ErrorAction SilentlyContinue; if ($fi) { $out.vhdx_used_gb = [math]::Round($fi.Length / 1GB, 2) } } catch { } }; $svc = Get-Service -Name vmms; if ($svc) { $out.vmms = [string]$svc.Status }; $d = Get-CimInstance -ClassName Win32_LogicalDisk -ErrorAction SilentlyContinue; foreach ($x in @($d)) { if ($out.vhdx -and $out.vhdx.StartsWith($x.DeviceID)) { $out.drive_total_gb = [math]::Round($x.Size / 1GB, 1); $out.drive_free_gb = [math]::Round($x.FreeSpace / 1GB, 1) } }; $ad = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*FastFree*' } | Select-Object -First 1; if ($ad) { $out.wg_up = ($ad.Status -eq 'Up'); $st = Get-NetAdapterStatistics -Name $ad.Name -ErrorAction SilentlyContinue; if ($st) { $out.wg_up_b = [uint64]$st.SentBytes; $out.wg_down_b = [uint64]$st.ReceivedBytes } }; $out | ConvertTo-Json -Compress"#
    .replace("_VM_", &format!("FastFree-{}", client_clean));

    #[cfg(not(windows))]
    let out = Err::<std::process::Output, String>("VM usage probe is Windows-only.".to_string());
    #[cfg(windows)]
    let out = {
        let script = ps_script.clone();
        tokio::task::spawn_blocking(move || {
            hidden_powershell().args(["-Command", &script]).output()
        })
        .await
        .map_err(|e| format!("VM usage probe join error: {}", e))?
        .map_err(|e| format!("VM usage probe spawn error: {}", e))
    };

    let output = out?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!(
            "VM usage probe PowerShell failed ({}): {}",
            output.status,
            if stderr.is_empty() {
                String::from_utf8_lossy(&output.stdout).trim().to_string()
            } else {
                stderr
            }
        ));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json = stdout
        .get(stdout.find('{').unwrap_or(0)..)
        .ok_or("VM usage probe returned no JSON".to_string())?;
    let v: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("VM usage probe JSON parse error: {}", e))?;

    let n64 = |key: &str| v.get(key).and_then(|x| x.as_u64());
    let nf = |key: &str| v.get(key).and_then(|x| x.as_f64());
    let s = |key: &str| {
        v.get(key)
            .map(|x| x.as_str().unwrap_or("").trim().to_string())
            .unwrap_or_default()
    };

    let vhdx_path = s("vhdx");
    // Drive selection: prefer the explicit drive arg, else the VHDX's own volume.
    let drive_resolved = drive_letter.unwrap_or_else(|| {
        if vhdx_path.len() >= 2 && vhdx_path.as_bytes().get(1) == Some(&b':') {
            vhdx_path[..2].to_ascii_uppercase()
        } else {
            "C:".to_string()
        }
    });

    Ok(VmUsageProbe {
        exists: v.get("exists").and_then(|x| x.as_bool()).unwrap_or(false),
        vm_cpu_percent: nf("cpu"),
        core_count: n64("cores"),
        assigned_mb: n64("assigned_mb"),
        demand_mb: n64("demand_mb"),
        uptime_seconds: n64("uptime_s"),
        vm_status: s("status"),
        vhdx_path,
        vhdx_used_gb: nf("vhdx_used_gb"),
        drive: drive_resolved.clone(),
        drive_total_gb: nf("drive_total_gb"),
        drive_free_gb: nf("drive_free_gb"),
        wg_adapter_up: v.get("wg_up").and_then(|x| x.as_bool()).unwrap_or(false),
        wg_up_bytes: n64("wg_up_b"),
        wg_down_bytes: n64("wg_down_b"),
        vmms_status: {
            let st = s("vmms");
            if st.is_empty() { "Unknown".to_string() } else { st }
        },
        collected_at: {
            let now = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            format!("{}", now)
        },
    })
}


#[tauri::command]
pub async fn minimize_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.hide();
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

#[tauri::command]
pub async fn check_app_update(_app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    #[cfg(dev)]
    {
        InstallerLogger::info("UPDATER", "Development mode: bypassing auto-update check.");
        return Ok(None);
    }
    #[cfg(not(dev))]
    {
        use tauri_plugin_updater::UpdaterExt;
        InstallerLogger::info("UPDATER", "Checking for updates via native updater plugin...");
        let updater = _app.updater().map_err(|e| format!("Updater init error: {}", e))?;
        match updater.check().await {
            Ok(Some(update)) => {
                InstallerLogger::info("UPDATER", &format!("Update available: v{}", update.version));
                Ok(Some(UpdateInfo {
                    version: update.version.clone(),
                    date: update.date.map(|d| d.to_string()),
                    body: update.body.clone(),
                    mandatory: true,
                }))
            }
            Ok(None) => {
                InstallerLogger::info("UPDATER", "Application is up to date.");
                Ok(None)
            }
            Err(e) => {
                InstallerLogger::warn("UPDATER", &format!("Update check failed: {}", e));
                Err(format!("Update check failed: {}", e))
            }
        }
    }
}

#[tauri::command]
pub async fn install_app_update(_app: AppHandle) -> Result<(), String> {
    #[cfg(dev)]
    {
        InstallerLogger::info("UPDATER", "Development mode: install_app_update bypassed.");
        return Ok(());
    }
    #[cfg(not(dev))]
    {
        use tauri_plugin_updater::UpdaterExt;
        InstallerLogger::info("UPDATER", "Starting update download and installation...");
        let updater = _app.updater().map_err(|e| format!("Updater init error: {}", e))?;
        if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
            let mut downloaded = 0;
            update
                .download_and_install(
                    |chunk_length, content_length| {
                        downloaded += chunk_length;
                        InstallerLogger::info(
                            "UPDATER",
                            &format!("Downloaded {} / {:?}", downloaded, content_length),
                        );
                    },
                    || {
                        InstallerLogger::info("UPDATER", "Download completed, installing...");
                    },
                )
                .await
                .map_err(|e| format!("Failed to install update: {}", e))?;
            InstallerLogger::info("UPDATER", "Update installed. Restarting application...");
            _app.restart();
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn audit_system_steps(client_id: Option<String>) -> Result<SystemAuditReport, String> {
    AuditService::audit_system_steps(client_id).await
}
