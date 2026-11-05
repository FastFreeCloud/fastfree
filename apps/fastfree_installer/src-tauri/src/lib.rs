pub mod commands;
pub mod discovery;
pub mod dto;
pub mod licensing;
pub mod logger;
pub mod services;

use logger::InstallerLogger;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn toggle_tray_dialog(app: &tauri::AppHandle) {
    if let Some(tray_win) = app.get_webview_window("tray-dialog") {
        let is_visible = tray_win.is_visible().unwrap_or(false);
        if is_visible {
            let _ = tray_win.hide();
        } else {
            // Position above the taskbar clock/tray notification area
            if let Ok(Some(monitor)) = tray_win.primary_monitor() {
                let screen_size = monitor.size();
                let scale_factor = monitor.scale_factor();

                let win_w = 320.0;
                let win_h = 420.0;

                let phys_w = (win_w * scale_factor) as i32;
                let phys_h = (win_h * scale_factor) as i32;

                let margin_x = (16.0 * scale_factor) as i32;
                let margin_y = (60.0 * scale_factor) as i32;

                let x = screen_size.width as i32 - phys_w - margin_x;
                let y = screen_size.height as i32 - phys_h - margin_y;

                let _ = tray_win.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
            }
            let _ = tray_win.show();
            let _ = tray_win.unminimize();
            let _ = tray_win.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    InstallerLogger::info(
        "BOOT",
        "FastFree Node Setup Companion initializing (v26.5.0)...",
    );
    InstallerLogger::info(
        "BOOT",
        &format!("Host Target: {} {}", std::env::consts::OS, std::env::consts::ARCH),
    );
    InstallerLogger::info(
        "BOOT",
        &format!("Forensic Log File: {}", InstallerLogger::get_log_path().display()),
    );

    #[cfg(windows)]
    {
        extern "system" {
            fn IsUserAnAdmin() -> i32;
        }
        let is_admin = unsafe { IsUserAnAdmin() != 0 };
        if is_admin {
            InstallerLogger::info("ELEVATION", "Application running with Administrator privileges.");
        } else {
            InstallerLogger::warn(
                "ELEVATION",
                "Application running under standard user token (elevation may be required for Hyper-V features).",
            );
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            InstallerLogger::info("SINGLE_INSTANCE", "Secondary instance launch intercepted; focusing existing window.");
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.unminimize();
                let _ = main.set_focus();
            }
        }))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .setup(|app| {
            InstallerLogger::info("BOOT", "Tauri core setup phase completed.");

            // Explicitly set window icon for Taskbar and DWM in Windows 11
            if let Some(icon) = app.default_window_icon().cloned() {
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.set_icon(icon.clone());
                }
                if let Some(splash) = app.get_webview_window("splashscreen") {
                    let _ = splash.set_icon(icon);
                }
            }

            // Ensure Windows Explorer keeps the tray icon permanently pinned next to taskbar language and clock
            #[cfg(windows)]
            {
                // Native HKCU write via services::process::promote_tray_icon (replaces the hidden PowerShell call)
                let _ = crate::services::process::promote_tray_icon();
            }

            // Register System Tray Icon (Opens Modern Fluent 2 Flyout Dialog above clock)
            let tray = TrayIconBuilder::with_id("fastfree-companion-tray")
                .tooltip("FastFree Node Companion")
                .icon(app.default_window_icon().cloned().expect("icon must be present"))
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    let app = tray.app_handle();
                    match event {
                        TrayIconEvent::Click { button_state: MouseButtonState::Up, .. } => {
                            toggle_tray_dialog(app);
                        }
                        TrayIconEvent::DoubleClick { button: MouseButton::Left, .. } => {
                            if let Some(main) = app.get_webview_window("main") {
                                let _ = main.show();
                                let _ = main.unminimize();
                                let _ = main.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Persist TrayIcon in app state so it is never dropped/removed by Rust RAII
            app.manage(tray);

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "tray-dialog" {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = window.hide();
                }
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    // Keep the companion alive in the system tray when main window is closed
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_discovery_report,
            commands::close_splashscreen,
            commands::verify_license_key,
            commands::transfer_license_to_current_device,
            commands::verify_admin_password,
            commands::get_machine_hwid,
            commands::get_wireguard_status,
            commands::manage_vm,
            commands::minimize_to_tray,
            commands::show_main_window,
            commands::get_diagnostic_logs,
            commands::export_diagnostic_bundle,
            commands::check_admin_elevation,
            commands::read_clipboard_text,
            commands::install_hyperv_feature,
            commands::provision_node,
            commands::check_vm_exists,
            commands::get_vm_real_state,
            commands::check_app_update,
            commands::install_app_update,
            commands::apply_wireguard_config,
            commands::check_wireguard_firewall_rule,
            commands::enable_wireguard_firewall_rule,
            commands::probe_wireguard_endpoint,
            commands::reconfigure_hyperv_vm,
            commands::ensure_service_account,
            commands::ensure_tray_promoted,
            commands::audit_system_steps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
