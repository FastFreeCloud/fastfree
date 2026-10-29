pub mod commands;
pub mod discovery;
pub mod dto;
pub mod licensing;
pub mod logger;

use logger::InstallerLogger;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

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

            // Build Elegant Context Menu for System Tray Companion (Near Windows Clock)
            let title_item = MenuItem::with_id(app, "title_item", "FastFree Node Companion", false, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let open_portal = MenuItem::with_id(app, "open_portal", "دخول بوابة ERP (Open Portal)", true, None::<&str>)?;
            let show_window = MenuItem::with_id(app, "show_window", "فتح لوحة التحكم (Control Center)", true, None::<&str>)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let start_vm = MenuItem::with_id(app, "start_vm", "تشغيل العقدة (Start VM)", true, None::<&str>)?;
            let restart_vm = MenuItem::with_id(app, "restart_vm", "إعادة تشغيل العقدة (Restart VM)", true, None::<&str>)?;
            let stop_vm = MenuItem::with_id(app, "stop_vm", "إيقاف مؤقت (Stop VM)", true, None::<&str>)?;
            let sep3 = PredefinedMenuItem::separator(app)?;
            let check_updates = MenuItem::with_id(app, "check_updates", "فحص وتثبيت التحديثات (Check Updates)", true, None::<&str>)?;
            let sep4 = PredefinedMenuItem::separator(app)?;
            let exit_app = MenuItem::with_id(app, "exit_app", "إغلاق التطبيق نهائياً (Exit)", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &title_item,
                    &sep1,
                    &open_portal,
                    &show_window,
                    &sep2,
                    &start_vm,
                    &restart_vm,
                    &stop_vm,
                    &sep3,
                    &check_updates,
                    &sep4,
                    &exit_app,
                ],
            )?;

            // Register System Tray Icon
            let _tray = TrayIconBuilder::with_id("fastfree-companion-tray")
                .tooltip("FastFree Node Companion")
                .icon(app.default_window_icon().cloned().expect("icon must be present"))
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open_portal" => {
                            InstallerLogger::info("TRAY", "Opening FastFree ERP Portal URL");
                            let _ = tauri_plugin_opener::open_url("http://client2.fastfree.local", None::<&str>);
                        }
                        "show_window" => {
                            InstallerLogger::info("TRAY", "Restoring main window from tray");
                            if let Some(main) = app.get_webview_window("main") {
                                let _ = main.show();
                                let _ = main.unminimize();
                                let _ = main.set_focus();
                            }
                        }
                        "start_vm" => {
                            InstallerLogger::info("TRAY", "Triggering Start-VM 'FastFree-client2' from tray");
                            #[cfg(windows)]
                            {
                                use std::os::windows::process::CommandExt;
                                use std::process::Command;
                                let _ = Command::new("powershell")
                                    .creation_flags(0x08000000)
                                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Start-VM -Name 'FastFree-client2' -ErrorAction SilentlyContinue"])
                                    .spawn();
                            }
                        }
                        "restart_vm" => {
                            InstallerLogger::info("TRAY", "Triggering Restart-VM 'FastFree-client2' from tray");
                            #[cfg(windows)]
                            {
                                use std::os::windows::process::CommandExt;
                                use std::process::Command;
                                let _ = Command::new("powershell")
                                    .creation_flags(0x08000000)
                                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Restart-VM -Name 'FastFree-client2' -Force -ErrorAction SilentlyContinue"])
                                    .spawn();
                            }
                        }
                        "stop_vm" => {
                            InstallerLogger::info("TRAY", "Triggering Stop-VM 'FastFree-client2' from tray");
                            #[cfg(windows)]
                            {
                                use std::os::windows::process::CommandExt;
                                use std::process::Command;
                                let _ = Command::new("powershell")
                                    .creation_flags(0x08000000)
                                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Stop-VM -Name 'FastFree-client2' -Force -ErrorAction SilentlyContinue"])
                                    .spawn();
                            }
                        }
                        "check_updates" => {
                            InstallerLogger::info("TRAY", "Checking for updates from tray menu");
                            if let Some(main) = app.get_webview_window("main") {
                                let _ = main.show();
                                let _ = main.unminimize();
                                let _ = main.set_focus();
                                let _ = main.emit("trigger-check-updates", ());
                            }
                        }
                        "exit_app" => {
                            InstallerLogger::info("TRAY", "Exiting FastFree Companion");
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }
                        | TrayIconEvent::DoubleClick { button: MouseButton::Left, .. } => {
                            let app = tray.app_handle();
                            if let Some(main) = app.get_webview_window("main") {
                                if main.is_visible().unwrap_or(false) && !main.is_minimized().unwrap_or(false) {
                                    let _ = main.hide();
                                } else {
                                    let _ = main.show();
                                    let _ = main.unminimize();
                                    let _ = main.set_focus();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Keep the companion alive in the system tray when window is closed
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_discovery_report,
            commands::close_splashscreen,
            commands::verify_license_key,
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
            commands::apply_wireguard_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
