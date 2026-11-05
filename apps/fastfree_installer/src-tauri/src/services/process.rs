use crate::logger::InstallerLogger;

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

pub fn is_admin_elevated() -> bool {
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
        is_admin
    }
    #[cfg(not(windows))]
    {
        true
    }
}

pub fn read_native_clipboard() -> String {
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
                        return text.trim().to_string();
                    }
                }
                CloseClipboard();
            }
        }
    }
    String::new()
}

pub fn promote_tray_icon() -> Result<(), String> {
    #[cfg(windows)]
    {
        use crate::services::service_hub::to_wide;
        use windows::core::PCWSTR;
        use windows::Win32::System::Registry::{
            RegCloseKey, RegOpenKeyExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER, KEY_SET_VALUE,
            REG_DWORD,
        };

        InstallerLogger::info("TRAY", "Configuring Windows Explorer to promote tray icon next to taskbar language and clock...");
        // Native HKCU registry write replaces the previous PowerShell Set-ItemProperty call.
        unsafe {
            let subkey = to_wide("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer");
            let value_name = to_wide("EnableAutoTray");
            let mut hkey = HKEY::default();
            if RegOpenKeyExW(HKEY_CURRENT_USER, PCWSTR::from_raw(subkey.as_ptr()), 0, KEY_SET_VALUE, &mut hkey).0 == 0 {
                let dword = 0u32.to_ne_bytes();
                let _ = RegSetValueExW(hkey, PCWSTR::from_raw(value_name.as_ptr()), 0, REG_DWORD, Some(dword.as_slice()));
                let _ = RegCloseKey(hkey);
            }
        }
    }
    Ok(())
}
