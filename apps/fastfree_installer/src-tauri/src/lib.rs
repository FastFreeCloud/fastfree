pub mod discovery;
pub mod dto;

use discovery::HostDiscoveryPipeline;
use dto::SystemDiscoveryReport;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_system_discovery_report,
            close_splashscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
