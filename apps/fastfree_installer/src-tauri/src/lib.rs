pub mod commands;
pub mod discovery;
pub mod dto;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .setup(|app| {
            // Build Context Menu for System Tray Companion
            let open_portal = MenuItem::with_id(app, "open_portal", "Open FastFree ERP Portal 🌐", true, None::<&str>)?;
            let show_window = MenuItem::with_id(app, "show_window", "Open Setup Companion 🖥️", true, None::<&str>)?;
            let start_vm = MenuItem::with_id(app, "start_vm", "Start Sovereign VM (Hyper-V) ▶", true, None::<&str>)?;
            let restart_vm = MenuItem::with_id(app, "restart_vm", "Restart Sovereign VM 🔄", true, None::<&str>)?;
            let stop_vm = MenuItem::with_id(app, "stop_vm", "Stop Sovereign VM ⏹", true, None::<&str>)?;
            let check_updates = MenuItem::with_id(app, "check_updates", "Check for Updates ⬇", true, None::<&str>)?;
            let exit_app = MenuItem::with_id(app, "exit_app", "Exit FastFree ✕", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &open_portal,
                    &show_window,
                    &start_vm,
                    &restart_vm,
                    &stop_vm,
                    &check_updates,
                    &exit_app,
                ],
            )?;

            // Register System Tray Icon
            let _tray = TrayIconBuilder::with_id("fastfree-companion-tray")
                .tooltip("FastFree Sovereign Node Companion")
                .icon(app.default_window_icon().cloned().expect("icon must be present"))
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open_portal" => {
                            let _ = tauri_plugin_opener::open_url("http://client2.fastfree.local", None::<&str>);
                        }
                        "show_window" => {
                            if let Some(main) = app.get_webview_window("main") {
                                let _ = main.show();
                                let _ = main.unminimize();
                                let _ = main.set_focus();
                            }
                        }
                        "start_vm" => {
                            #[cfg(windows)]
                            {
                                use std::process::Command;
                                let _ = Command::new("powershell")
                                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Start-VM -Name 'FastFree-client2' -ErrorAction SilentlyContinue"])
                                    .spawn();
                            }
                        }
                        "restart_vm" => {
                            #[cfg(windows)]
                            {
                                use std::process::Command;
                                let _ = Command::new("powershell")
                                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Restart-VM -Name 'FastFree-client2' -Force -ErrorAction SilentlyContinue"])
                                    .spawn();
                            }
                        }
                        "stop_vm" => {
                            #[cfg(windows)]
                            {
                                use std::process::Command;
                                let _ = Command::new("powershell")
                                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Stop-VM -Name 'FastFree-client2' -Force -ErrorAction SilentlyContinue"])
                                    .spawn();
                            }
                        }
                        "check_updates" => {
                            let _ = tauri_plugin_opener::open_url("https://github.com/FastFreeCloud/fastfree/releases", None::<&str>);
                        }
                        "exit_app" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(main) = app.get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.unminimize();
                            let _ = main.set_focus();
                        }
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
            commands::get_wireguard_status,
            commands::manage_vm,
            commands::minimize_to_tray,
            commands::show_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
