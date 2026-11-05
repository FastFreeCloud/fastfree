use crate::logger::InstallerLogger;

#[cfg(windows)]
use std::env;

#[cfg(windows)]
use windows::core::{PCWSTR, PWSTR};
#[cfg(windows)]
use windows::Win32::NetworkManagement::NetManagement::{NetLocalGroupAddMembers, LOCALGROUP_MEMBERS_INFO_3};
#[cfg(windows)]
use windows::Win32::System::Services::{
    ChangeServiceConfigW, CloseServiceHandle, OpenSCManagerW, OpenServiceW, StartServiceW,
    ENUM_SERVICE_TYPE, SC_MANAGER_ALL_ACCESS, SERVICE_AUTO_START, SERVICE_CHANGE_CONFIG,
    SERVICE_ERROR, SERVICE_NO_CHANGE, SERVICE_START,
};

pub fn to_wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(windows)]
pub fn ensure_vmms_autostart_running() -> Result<(), String> {
    InstallerLogger::info(
        "SERVICE_HUB",
        "Ensuring VMMS service autostart and running state via SCM...",
    );

    unsafe {
        let scm = match OpenSCManagerW(PCWSTR::null(), PCWSTR::null(), SC_MANAGER_ALL_ACCESS) {
            Ok(handle) => handle,
            Err(e) => {
                let msg = format!("Failed to open Service Control Manager: {}", e);
                InstallerLogger::error("SERVICE_HUB", &msg);
                return Err(msg);
            }
        };

        let service_name = to_wide("vmms");
        let service = match OpenServiceW(
            scm,
            PCWSTR::from_raw(service_name.as_ptr()),
            SERVICE_CHANGE_CONFIG | SERVICE_START,
        ) {
            Ok(handle) => handle,
            Err(e) => {
                let _ = CloseServiceHandle(scm);
                InstallerLogger::warn(
                    "SERVICE_HUB",
                    &format!("Failed to open vmms service (not installed yet): {}", e),
                );
                return Ok(());
            }
        };

        if let Err(e) = ChangeServiceConfigW(
            service,
            ENUM_SERVICE_TYPE(SERVICE_NO_CHANGE),
            SERVICE_AUTO_START,
            SERVICE_ERROR(SERVICE_NO_CHANGE),
            PCWSTR::null(),
            PCWSTR::null(),
            None,
            PCWSTR::null(),
            PCWSTR::null(),
            PCWSTR::null(),
            PCWSTR::null(),
        ) {
            InstallerLogger::warn(
                "SERVICE_HUB",
                &format!("Failed to configure vmms autostart: {}", e),
            );
        }

        if let Err(e) = StartServiceW(service, None) {
            InstallerLogger::warn(
                "SERVICE_HUB",
                &format!("Failed to start vmms service: {}", e),
            );
        }

        let _ = CloseServiceHandle(service);
        let _ = CloseServiceHandle(scm);
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn ensure_vmms_autostart_running() -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
pub fn add_current_user_to_hyperv_administrators() -> Result<(), String> {
    let account = match env::var("USERNAME") {
        Ok(name) => name,
        Err(_) => return Ok(()),
    };

    if account.is_empty() {
        return Ok(());
    }

    unsafe {
        let mut account_wide = to_wide(&account);
        let group_wide = to_wide("Hyper-V Administrators");
        let member = LOCALGROUP_MEMBERS_INFO_3 {
            lgrmi3_domainandname: PWSTR(account_wide.as_mut_ptr()),
        };

        let _ = NetLocalGroupAddMembers(
            PCWSTR::null(),
            PCWSTR::from_raw(group_wide.as_ptr()),
            3,
            &member as *const LOCALGROUP_MEMBERS_INFO_3 as *const u8,
            1,
        );
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn add_current_user_to_hyperv_administrators() -> Result<(), String> {
    Ok(())
}
