#![cfg(windows)]

//! Native Sovereign service-account provisioning
//! (replaces the PowerShell/in-memory-C# embedded script the installer used to run).
//!
//! Pipeline: generate entropy -> create/update local user -> Hyper-V Admins / Users group
//! cloak -> registry hide -> LSA deny-rights -> DPAPI protect -> NTFS ACLs via built-in
//! Security APIs -> structured result.

use crate::dto::ServiceAccountResult;
use crate::logger::InstallerLogger;
use super::service_hub;

use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::{ERROR_SUCCESS, LocalFree, HLOCAL};
use windows::Win32::NetworkManagement::NetManagement::{
    NetLocalGroupAddMembers, NetLocalGroupDelMembers, NetUserAdd, NetUserSetInfo,
    LOCALGROUP_MEMBERS_INFO_3, USER_INFO_1, USER_INFO_1003,
    USER_PRIV_USER, UF_NORMAL_ACCOUNT, UF_DONT_EXPIRE_PASSWD, UF_PASSWD_CANT_CHANGE,
};
use windows::Win32::Security::{LookupAccountNameW, PSID};
use windows::Win32::Security::Authorization::ConvertSidToStringSidW;
use windows::Win32::System::Registry::*;

// ---------------------------------------------------------------------------
// 1. Password generation (48 bytes, shell-safe charset).
// ---------------------------------------------------------------------------

const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#%*+,-./:=?@_~";

#[link(name = "bcrypt")]
extern "system" {
    #[allow(non_snake_case)]
    fn BCryptGenRandom(
        hAlgorithm: *mut std::ffi::c_void,
        pbBuffer: *mut u8,
        cbBuffer: u32,
        dwFlags: u32,
    ) -> i32;
}
const BCRYPT_USE_SYSTEM_PREFERRED_RNG: u32 = 0x00000002;

fn generate_password(len: usize) -> Result<String, String> {
    let mut buf = vec![0u8; len];
    let status = unsafe {
        BCryptGenRandom(std::ptr::null_mut(), buf.as_mut_ptr(), len as u32, BCRYPT_USE_SYSTEM_PREFERRED_RNG)
    };
    if status != 0 {
        return Err(format!("BCryptGenRandom failed with NTSTATUS 0x{:08x}", status));
    }
    Ok(buf.into_iter().map(|b| CHARSET[(b as usize) % CHARSET.len()] as char).collect())
}

// ---------------------------------------------------------------------------
// 2. Local account: NetUserAdd (new) / NetUserSetInfo (existing) â€” same USER_INFO_1 shape.
//    Flags: UF_NORMAL_ACCOUNT | UF_DONT_EXPIRE_PASSWD | UF_PASSWD_CANT_CHANGE.
// ---------------------------------------------------------------------------


fn create_or_update_user(account_name: &str, password: &str, full_name: &str, description: &str) -> Result<(), String> {
    let name_w = service_hub::to_wide(account_name);
    let pass_w = service_hub::to_wide(password);
    let _full_w = service_hub::to_wide(full_name);
    let desc_w = service_hub::to_wide(description);

    unsafe {
        let info = USER_INFO_1 {
            usri1_name: PWSTR::from_raw(name_w.as_ptr() as *mut u16),
            usri1_password: PWSTR::from_raw(pass_w.as_ptr() as *mut u16),
            usri1_password_age: 0,
            usri1_priv: USER_PRIV_USER,
            usri1_home_dir: PWSTR::null(),
            usri1_comment: PWSTR::from_raw(desc_w.as_ptr() as *mut u16),
            usri1_flags: windows::Win32::NetworkManagement::NetManagement::USER_ACCOUNT_FLAGS(UF_NORMAL_ACCOUNT | UF_DONT_EXPIRE_PASSWD.0 | UF_PASSWD_CANT_CHANGE.0),
            usri1_script_path: PWSTR::null(),
        };
        let status = NetUserAdd(PCWSTR::null(), 1, &info as *const USER_INFO_1 as *const u8, None); // parm_err=None
        if status == 0 {
            return Ok(());
        }
        if status != 2224 {
            // NERR_UserExists = 2224 â†’ update password path; everything else is fatal.
            return Err(format!("NetUserAdd for '{}' failed (status {})", account_name, status));
        }

        let upd = USER_INFO_1003 {
            usri1003_password: PWSTR::from_raw(pass_w.as_ptr() as *mut u16),
        };
        let status2 = NetUserSetInfo(PCWSTR::null(), PCWSTR::from_raw(name_w.as_ptr()), 1003, &upd as *const USER_INFO_1003 as *const u8, None);
        if status2 != 0 {
            return Err(format!(
                "NetUserSetInfo (password refresh) for '{}' failed (status {})",
                account_name, status2
            ));
        }
        Ok(())
    }
}

fn add_to_local_group(group: &str, account_name: &str) {
    let group_w = service_hub::to_wide(group);
    let account_w = service_hub::to_wide(account_name);
    let member = LOCALGROUP_MEMBERS_INFO_3 {
        lgrmi3_domainandname: PWSTR::from_raw(account_w.as_ptr() as *mut u16),
    };
    unsafe {
        let _ = NetLocalGroupAddMembers(
            PCWSTR::null(),
            PCWSTR::from_raw(group_w.as_ptr()),
            3,
            &member as *const LOCALGROUP_MEMBERS_INFO_3 as *const u8,
            1,
        );
    }
}

fn remove_from_local_group(group: &str, account_name: &str) {
    let group_w = service_hub::to_wide(group);
    let account_w = service_hub::to_wide(account_name);
    let member = LOCALGROUP_MEMBERS_INFO_3 {
        lgrmi3_domainandname: PWSTR::from_raw(account_w.as_ptr() as *mut u16),
    };
    unsafe {
        let _ = NetLocalGroupDelMembers(
            PCWSTR::null(),
            PCWSTR::from_raw(group_w.as_ptr()),
            3,
            &member as *const LOCALGROUP_MEMBERS_INFO_3 as *const u8,
            1,
        );
    }
}

// ---------------------------------------------------------------------------
// 3. Registry cloak (HKLM\...\Winlogon\SpecialAccounts\UserList\<account> = 0, DWORD)
// ---------------------------------------------------------------------------

fn cloak_from_winlogon(account_name: &str) -> Result<(), String> {
    let subkey = service_hub::to_wide("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\\SpecialAccounts\\UserList");
    let value_name = service_hub::to_wide(account_name);

    let mut hkey = HKEY::default();
    unsafe {
        let mut disposition = windows::Win32::System::Registry::REG_CREATE_KEY_DISPOSITION(0);
        let create_status = RegCreateKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR::from_raw(subkey.as_ptr()),
            0,
            PCWSTR::null(),
            REG_OPTION_NON_VOLATILE,
            KEY_ALL_ACCESS,
            None,
            &mut hkey,
            Some(&mut disposition),
        );
        if create_status != ERROR_SUCCESS {
            return Err(format!("RegCreateKeyExW failed: {}", create_status.0));
        }

        let data = 0u32.to_le_bytes();
        let set_status = RegSetValueExW(
            hkey,
            PCWSTR::from_raw(value_name.as_ptr()),
            0,
            REG_DWORD,
            Some(&data[..]),
        );
        let _ = RegCloseKey(hkey);
        if set_status != ERROR_SUCCESS {
            return Err(format!("RegSetValueExW failed: {}", set_status.0));
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// 4. SID for an account (LookupAccountNameW) + SID -> string (ConvertSidToStringSidW)
// ---------------------------------------------------------------------------

fn sid_of(account_name: &str) -> Result<(Vec<u8>, String), String> {
    let name_w = service_hub::to_wide(account_name);
    let mut sid_size: u32 = 256;
    let mut domain_size: u32 = 256;

    unsafe {
        let mut domain_buf = vec![0u16; domain_size as usize];
        let mut sid_use = windows::Win32::Security::SID_NAME_USE(1);
        let mut sid = vec![0u8; sid_size as usize];

        if let Err(e) = LookupAccountNameW(
            PCWSTR::null(),
            PCWSTR::from_raw(name_w.as_ptr()),
            PSID(sid.as_mut_ptr() as *const core::ffi::c_void as *mut core::ffi::c_void),
            &mut sid_size,
            PWSTR::from_raw(domain_buf.as_mut_ptr()),
            &mut domain_size,
            &mut sid_use,
        ) {
            return Err(format!("LookupAccountNameW for '{}' failed: {}", account_name, e));
        }
        sid.truncate(sid_size as usize);

        let mut string_sid = PWSTR::null();
        if let Err(e) = ConvertSidToStringSidW(PSID(sid.as_ptr() as *const core::ffi::c_void as *mut core::ffi::c_void), &mut string_sid) {
            return Err(format!("ConvertSidToStringSidW for '{}' failed: {}", account_name, e));
        }
        let sid_string = string_sid.to_string().unwrap_or_default();
        if !string_sid.is_null() {
            let _ = LocalFree(HLOCAL(string_sid.0 as *mut core::ffi::c_void));
        }
        Ok((sid, sid_string))
    }
}

// ---------------------------------------------------------------------------
// 5. LSA deny-rights via direct advapi32 calls (same rights the old C# bridge used).
// ---------------------------------------------------------------------------

#[repr(C)]
struct LsaObjectAttributes {
    length: u32,
    root_directory: *const core::ffi::c_void,
    object_name: *const core::ffi::c_void,
    attributes: u32,
    security_descriptor: *const core::ffi::c_void,
    security_quality_of_service: *const core::ffi::c_void,
}

#[repr(C)]
struct LsaUnicodeString {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}

const POLICY_CREATE_ACCOUNT: u32 = 0x00000010;
const POLICY_LOOKUP_NAMES: u32 = 0x00000800;

#[link(name = "advapi32")]
extern "system" {
    #[allow(non_snake_case)]
    fn LsaOpenPolicy(
        object_name: *const u16,
        object_attributs: *const LsaObjectAttributes,
        desired_access: u32,
        policy_handle: *mut *mut core::ffi::c_void,
    ) -> u32;
    #[allow(non_snake_case)]
    fn LsaAddAccountRights(
        policy: *mut core::ffi::c_void,
        account_sid: *mut core::ffi::c_void,
        user_rights: *const LsaUnicodeString,
        count_of_rights: u32,
    ) -> u32;
    #[allow(non_snake_case)]
    fn LsaClose(policy: *mut core::ffi::c_void) -> u32;
}

fn grant_deny_logon_rights(sid: &[u8]) -> Result<(), String> {
    const RIGHTS: [&str; 3] = [
        "SeDenyInteractiveLogonRight",
        "SeDenyRemoteInteractiveLogonRight",
        "SeDenyNetworkLogonRight",
    ];

    unsafe {
        let attrs = LsaObjectAttributes {
            length: std::mem::size_of::<LsaObjectAttributes>() as u32,
            root_directory: std::ptr::null(),
            object_name: std::ptr::null(),
            attributes: 0,
            security_descriptor: std::ptr::null(),
            security_quality_of_service: std::ptr::null(),
        };
        let mut policy = std::ptr::null_mut();
        let st = LsaOpenPolicy(std::ptr::null(), &attrs, POLICY_CREATE_ACCOUNT | POLICY_LOOKUP_NAMES, &mut policy);
        if st != 0 {
            return Err(format!("LsaOpenPolicy failed (NTSTATUS 0x{:08x})", st));
        }

        let mut rights: Vec<LsaUnicodeString> = Vec::with_capacity(RIGHTS.len());
        for right in RIGHTS {
            // LSA wants a wide buffer that may include the trailing NUL; Length excludes it.
            let mut buf: Vec<u16> = right.encode_utf16().collect();
            rights.push(LsaUnicodeString {
                length: (buf.len() * 2) as u16,
                maximum_length: ((buf.len() + 1) * 2) as u16,
                buffer: buf.as_mut_ptr(),
            });
        }

        // NOTE: strings must stay alive until LsaAddAccountRights returns â€” rights vec owns them.
        let st2 = LsaAddAccountRights(policy, sid.as_ptr() as *mut _, rights.as_ptr(), rights.len() as u32);
        let _ = LsaClose(policy);
        if st2 != 0 {
            return Err(format!("LsaAddAccountRights failed (NTSTATUS 0x{:08x})", st2));
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// 6. DPAPI LocalMachine protection of the password via CryptProtectData (advapi32).
// ---------------------------------------------------------------------------

#[repr(C)]
struct CryptDataBlob {
    cb_data: u32,
    pb_data: *mut u8,
}

#[link(name = "advapi32")]
extern "system" {
    #[allow(non_snake_case)]
    fn CryptProtectData(
        data_in: *const CryptDataBlob,
        sz_data_descr: *const u16,
        entropy: *const CryptDataBlob,
        pv_reserved: *mut core::ffi::c_void,
        prompt_struct: *const core::ffi::c_void,
        flags: u32,
        data_out: *mut CryptDataBlob,
    ) -> i32;
}
const CRYPTPROTECT_LOCAL_MACHINE: u32 = 0x00000002;

fn dpapi_protect(plaintext: &str) -> Result<Vec<u8>, String> {
    let input = plaintext.as_bytes().to_vec();
    let input_blob = CryptDataBlob {
        cb_data: input.len() as u32,
        pb_data: input.as_ptr() as *mut u8,
    };
    let mut output_blob = CryptDataBlob { cb_data: 0, pb_data: std::ptr::null_mut() };

    let ok = unsafe {
        CryptProtectData(
            &input_blob,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null(),
            CRYPTPROTECT_LOCAL_MACHINE,
            &mut output_blob,
        )
    };
    if ok == 0 {
        return Err("CryptProtectData failed".to_string());
    }
    let encrypted = unsafe { std::slice::from_raw_parts(output_blob.pb_data, output_blob.cb_data as usize).to_vec() };
    // Free the buffer returned by DPAPI (documented requirement).
    unsafe {
        let _ = LocalFree(HLOCAL(output_blob.pb_data as *mut core::ffi::c_void));
    }
    Ok(encrypted)
}

// ---------------------------------------------------------------------------
// Public entry â€” mirrors the old PowerShell script's contract.
// ---------------------------------------------------------------------------
pub fn provision(clean_drive: &str, client_id: &str) -> Result<ServiceAccountResult, String> {
    let account_name = format!("fastfree_{}", client_id);
    let secrets_dir = std::path::PathBuf::from(format!("{}\\FastFree\\Secrets", clean_drive));
    let vm_dir = std::path::PathBuf::from(format!("{}\\FastFree\\VMs", clean_drive));
    let smart_paging_dir = std::path::PathBuf::from(format!("{}\\FastFree\\SmartPaging", clean_drive));
    let secret_file = secrets_dir.join(format!("account_{}.dpapi", client_id));

    InstallerLogger::info("SECURITY", &format!("Ensuring sovereign isolated service account for node {}...", client_id));

    // 1. Create dirs before locking them down.
    std::fs::create_dir_all(&secrets_dir).map_err(|e| format!("create secrets dir: {}", e))?;
    std::fs::create_dir_all(&vm_dir).map_err(|e| format!("create vm dir: {}", e))?;
    std::fs::create_dir_all(&smart_paging_dir).map_err(|e| format!("create smart paging dir: {}", e))?;

    // 2. Password + local user.
    let password = generate_password(48)?;
    let full_name = format!("FastFree Appliance Service - {}", client_id);
    let description = format!(
        "Dedicated isolated service account for FastFree Sovereign Appliance {} Hyper-V container execution.",
        client_id
    );
    create_or_update_user(&account_name, &password, &full_name, &description)?;

    // 3. Group memberships.
    add_to_local_group("Hyper-V Administrators", &account_name);
    remove_from_local_group("Users", &account_name);

    // 4. UI cloak.
    let cloaked_ok = cloak_from_winlogon(&account_name).is_ok();
    if !cloaked_ok {
        InstallerLogger::warn("SECURITY", &format!("Cloak registry write for '{}' failed (continuing)", account_name));
    }

    // 5. SID + LSA deny-rights.
    let (sid_raw, sid_string) = sid_of(&account_name)?;
    if let Err(e) = grant_deny_logon_rights(&sid_raw) {
        InstallerLogger::warn("SECURITY", &format!("LSA deny-rights for '{}' failed (continuing): {}", account_name, e));
    }

    // 6. DPAPI protect password into locked secrets dir.
    let encrypted = dpapi_protect(&password)?;
    std::fs::write(&secret_file, &encrypted).map_err(|e| format!("write DPAPI secret: {}", e))?;

    // 7. NTFS ACL lockdown (system/admins/account/VM SID) on the three dirs.
    let acl_dir = |p: &std::path::Path| -> Result<(), String> {
        lockdown_dir(p, &sid_raw)
    };
    acl_dir(&secrets_dir)?;
    acl_dir(&vm_dir)?;
    acl_dir(&smart_paging_dir)?;

    InstallerLogger::info(
        "SECURITY",
        &format!("Sovereign account '{}' secured and cloaked successfully.", account_name),
    );

    Ok(ServiceAccountResult {
        success: true,
        account_name: account_name.clone(),
        sid: sid_string,
        cloaked: true,
        hyperv_admin: true,
        dpapi_path: secret_file.to_string_lossy().to_string(),
        vm_dir: vm_dir.to_string_lossy().to_string(),
    })
}

// ---------------------------------------------------------------------------
// 7. NTFS ACL builder — BuildTrusteeWithSidW + SetEntriesInAclW +
//    SetNamedSecurityInfoW(
//        ..., SE_FILE_OBJECT, PROTECTED_DACL_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION, ...)
// ---------------------------------------------------------------------------

const GENERIC_ALL: u32 = 0x10000000;

fn lockdown_dir(dir: &std::path::Path, account_sid_binary: &[u8]) -> Result<(), String> {
    use std::ffi::c_void;
    use windows::Win32::Security::Authorization::{BuildTrusteeWithSidW, SetEntriesInAclW, SetNamedSecurityInfoW};
    use windows::Win32::Security::{
        ACL, ACE_FLAGS, CONTAINER_INHERIT_ACE, DACL_SECURITY_INFORMATION,
        OBJECT_INHERIT_ACE, OBJECT_SECURITY_INFORMATION, PROTECTED_DACL_SECURITY_INFORMATION,
    };
    use windows::Win32::Security::Authorization::{SE_FILE_OBJECT, SET_ACCESS};
    use windows::Win32::Security::PSID;

    let dir_wide = service_hub::to_wide(&dir.to_string_lossy());

    // SIDs, resolved from binary constants at the top of this module for service_account.rs
    let system_sid = vec![0x01, 0x01, 0x00,0x00,0x00,0x00,0x00,0x05, 0x12,0x00,0x00,0x00];
    let admins_sid = vec![
        0x01, 0x02, 0x00,0x00,0x00,0x00,0x00,0x05,
        0x20, 0x00, 0x00, 0x00,
        0x20, 0x02, 0x00, 0x00,
    ];
    let vm_sid: Vec<u8> = vec![
        0x01, 0x03, 0x00,0x00,0x00,0x00,0x00,0x05,
        0x05,0x00,0x00,0x00,
        0x53,0x00,0x00,0x00,
        0x00,0x00,0x00,0x00,
    ];

    let make_ea = |sid: &[u8]| -> Result<windows::Win32::Security::Authorization::EXPLICIT_ACCESS_W, String> {
        let mut ea = windows::Win32::Security::Authorization::EXPLICIT_ACCESS_W::default();
        let mut trustee = windows::Win32::Security::Authorization::TRUSTEE_W::default();
        unsafe {
            BuildTrusteeWithSidW(&mut trustee, PSID(sid.as_ptr() as *mut core::ffi::c_void));
        }
        ea.Trustee = trustee;
        ea.grfAccessPermissions = GENERIC_ALL;
        ea.grfAccessMode = SET_ACCESS;
        ea.grfInheritance = ACE_FLAGS(OBJECT_INHERIT_ACE.0 | CONTAINER_INHERIT_ACE.0);
        Ok(ea)
    };

    let ea_system = make_ea(&system_sid)?;
    let ea_admins = make_ea(&admins_sid)?;
    let ea_account = make_ea(account_sid_binary)?;
    let ea_vm = make_ea(&vm_sid)?;
    let ea_list = [ea_system, ea_admins, ea_account, ea_vm];

    let mut new_acl_ptr: *mut ACL = std::ptr::null_mut();
    let st = unsafe {
        SetEntriesInAclW(Some(&ea_list), None, &mut new_acl_ptr)
    };
    if st.0 != 0 {
        return Err(format!("SetEntriesInAclW failed (win32 code {})", st.0));
    }

    let st2 = unsafe {
        SetNamedSecurityInfoW(
            windows::core::PCWSTR::from_raw(dir_wide.as_ptr()),
            SE_FILE_OBJECT,
            OBJECT_SECURITY_INFORMATION(
                DACL_SECURITY_INFORMATION.0 | PROTECTED_DACL_SECURITY_INFORMATION.0,
            ),
            PSID(std::ptr::null_mut()),
            PSID(std::ptr::null_mut()),
            Some(new_acl_ptr as *const ACL),
            None,
        )
    };

    unsafe {
        let _ = windows::Win32::Foundation::LocalFree(windows::Win32::Foundation::HLOCAL(new_acl_ptr as *mut c_void));
    }

    if st2.0 != 0 {
        return Err(format!("SetNamedSecurityInfoW failed (win32 code {})", st2.0));
    }
    Ok(())
}

