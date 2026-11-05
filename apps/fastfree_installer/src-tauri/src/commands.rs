use crate::discovery::HostDiscoveryPipeline;
use crate::dto::*;
use crate::licensing::LicensingManager;
use crate::logger::InstallerLogger;
use crate::services::audit::{AuditService, SystemAuditReport};
use crate::services::hyperv::HyperVService;
use crate::services::network::NetworkService;
use crate::services::process;
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

#[tauri::command]
pub async fn verify_admin_password(password: String) -> Result<bool, String> {
    Ok(password.trim() == crate::licensing::FASTFREE_MASTER_TRANSFER_SECRET)
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
    InstallerLogger::export_bundle(target_path)
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
        let updater = app.updater().map_err(|e| format!("Updater init error: {}", e))?;
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
            app.restart();
        }
        Ok(())
    }
}

#[tauri::command]
pub async fn audit_system_steps(client_id: Option<String>) -> Result<SystemAuditReport, String> {
    AuditService::audit_system_steps(client_id).await
}
