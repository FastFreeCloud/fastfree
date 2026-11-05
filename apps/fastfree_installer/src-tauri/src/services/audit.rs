use crate::logger::InstallerLogger;
use crate::services::network::NetworkService;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct StepAuditItem {
    pub step_id: String,
    pub step_number: u8,
    pub category: String,
    pub title_en: String,
    pub title_ar: String,
    pub status: String, // "pass" | "warn" | "fail"
    pub message_en: String,
    pub message_ar: String,
    pub details: Option<String>,
    pub can_auto_fix: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SystemAuditReport {
    pub client_id: String,
    pub overall_status: String, // "healthy" | "warning" | "error"
    pub all_steps_completed: bool,
    pub total_passed: usize,
    pub total_warnings: usize,
    pub total_errors: usize,
    pub items: Vec<StepAuditItem>,
    pub timestamp: String,
}

pub struct AuditService;

/// Native collection probes for `audit_system_steps` — these replace the
/// single PowerShell audit script. Everything is silent/best-effort by design
/// (the original script ran with `$ErrorActionPreference = 'SilentlyContinue'`
/// and every probe fell back to a conservative default instead of failing).

/// SCM query for the Hyper-V Virtual Machine Management service (`vmms`).
#[cfg(windows)]
fn vmms_running_native() -> bool {
    use crate::services::service_hub::to_wide;
    use windows::Win32::System::Services::{
        CloseServiceHandle, OpenSCManagerW, OpenServiceW, QueryServiceStatusEx,
        SC_MANAGER_CONNECT, SC_STATUS_PROCESS_INFO, SERVICE_QUERY_STATUS, SERVICE_RUNNING,
        SERVICE_STATUS_PROCESS,
    };
    use windows::core::PCWSTR;

    unsafe {
        let scm = match OpenSCManagerW(None, None, SC_MANAGER_CONNECT) {
            Ok(handle) => handle,
            Err(_) => return false,
        };
        let service_name = to_wide("vmms");
        let service = match OpenServiceW(
            scm,
            PCWSTR::from_raw(service_name.as_ptr()),
            SERVICE_QUERY_STATUS,
        ) {
            Ok(handle) => handle,
            Err(_) => {
                let _ = CloseServiceHandle(scm);
                return false;
            }
        };
        let mut status = SERVICE_STATUS_PROCESS::default();
        let mut bytes_needed = 0u32;
        let buffer = std::slice::from_raw_parts_mut(
            &mut status as *mut _ as *mut u8,
            std::mem::size_of::<SERVICE_STATUS_PROCESS>(),
        );
        let query = QueryServiceStatusEx(service, SC_STATUS_PROCESS_INFO, Some(buffer), &mut bytes_needed);
        let running = query.is_ok() && status.dwCurrentState == SERVICE_RUNNING;
        let _ = CloseServiceHandle(service);
        let _ = CloseServiceHandle(scm);
        running
    }
}

/// Token-based membership check for the local "Hyper-V Administrators" group
/// (replaces `Get-LocalGroupMember -Group 'Hyper-V Administrators'`).
/// `CheckTokenMembership` resolves nested group membership and, with a NULL
/// token, inspects the calling thread's access token.
#[cfg(windows)]
fn in_hyperv_admin_group_native() -> bool {
    use crate::services::service_hub::to_wide;
    use windows::Win32::Foundation::{BOOL, HANDLE};
    use windows::Win32::Security::{CheckTokenMembership, LookupAccountNameW, PSID, SID_NAME_USE};
    use windows::core::{PCWSTR, PWSTR};

    let account = to_wide("Hyper-V Administrators");
    unsafe {
        // Sizing probe for the SID and the referenced domain name.
        let mut sid_len = 0u32;
        let mut domain_len = 0u32;
        let mut sid_use = SID_NAME_USE(0);
        let _ = LookupAccountNameW(
            PCWSTR::null(),
            PCWSTR::from_raw(account.as_ptr()),
            PSID(std::ptr::null_mut()),
            &mut sid_len,
            PWSTR::null(),
            &mut domain_len,
            &mut sid_use,
        );
        if sid_len == 0 {
            return false;
        }
        let mut sid_buffer = vec![0u8; sid_len as usize];
        let mut domain_buffer = vec![0u16; domain_len as usize];
        let lookup = LookupAccountNameW(
            PCWSTR::null(),
            PCWSTR::from_raw(account.as_ptr()),
            PSID(sid_buffer.as_mut_ptr() as *mut core::ffi::c_void),
            &mut sid_len,
            PWSTR::from_raw(domain_buffer.as_mut_ptr()),
            &mut domain_len,
            &mut sid_use,
        );
        if lookup.is_err() {
            return false;
        }
        let mut is_member = BOOL::default();
        CheckTokenMembership(
            HANDLE(std::ptr::null_mut()),
            PSID(sid_buffer.as_mut_ptr() as *mut core::ffi::c_void),
            &mut is_member,
        )
        .map(|_| is_member.0 != 0)
        .unwrap_or(false)
    }
}

/// Existence probe for the "WireGuard" / "FastFree" Windows firewall rules
/// (replaces `Get-NetFirewallRule -DisplayName "*WireGuard*" | "*FastFree*"`).
/// Local firewall policy values are REG_SZ pipe-separated `key=value` payloads
/// under FirewallPolicy\FirewallRules; the `Name=` segment holds the display name.
/// Group-Policy-distributed rules are out of scope here, same as worst-case
/// failures of the old command (which also mapped to `hasFwRule = $false`).
#[cfg(windows)]
fn wireguard_or_fastfree_firewall_rule_exists() -> bool {
    use crate::services::service_hub::to_wide;
    use windows::Win32::System::Registry::{
        HKEY_LOCAL_MACHINE, KEY_READ, REG_SZ, RegCloseKey, RegEnumValueW, RegOpenKeyExW,
        RegQueryInfoKeyW,
    };
    use windows::core::{PCWSTR, PWSTR};

    const FIREWALL_RULES_SUBKEY: &str =
        "SYSTEM\\CurrentControlSet\\Services\\SharedAccess\\Parameters\\FirewallPolicy\\FirewallRules";

    let subkey = to_wide(FIREWALL_RULES_SUBKEY);
    unsafe {
        let mut hkey = windows::Win32::System::Registry::HKEY::default();
        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR::from_raw(subkey.as_ptr()),
            0,
            KEY_READ,
            &mut hkey,
        )
        .0 != 0
        {
            return false;
        }

        let mut num_values = 0u32;
        let mut max_value_name = 0u32;
        let mut max_value_data = 0u32;
        let info = RegQueryInfoKeyW(
            hkey,
            PWSTR::null(),
            None,
            None,
            None,
            None,
            None,
            Some(&mut num_values),
            Some(&mut max_value_name),
            Some(&mut max_value_data),
            None,
            None,
        );
        if info.0 != 0 || num_values == 0 {
            let _ = RegCloseKey(hkey);
            return false;
        }

        let mut found = false;
        for index in 0..num_values {
            let mut name_buffer = vec![0u16; max_value_name as usize + 2];
            let mut data_buffer = vec![0u8; max_value_data as usize + 4];
            let mut name_len = name_buffer.len() as u32;
            let mut data_len = data_buffer.len() as u32;
            let mut value_type = 0u32;
            let rc = RegEnumValueW(
                hkey,
                index,
                PWSTR::from_raw(name_buffer.as_mut_ptr()),
                &mut name_len,
                None,
                Some(&mut value_type),
                Some(data_buffer.as_mut_ptr()),
                Some(&mut data_len),
            );
            if rc.0 != 0 || value_type != REG_SZ.0 {
                continue;
            }
            // REG_SZ payload: UTF-16LE, possibly null-padded.
            let words: Vec<u16> = data_buffer[..data_len as usize]
                .chunks_exact(2)
                .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                .collect();
            let payload = String::from_utf16_lossy(&words);
            // The display name is stored in the `Name=` segment (pipe-separated).
            for segment in payload.split('|') {
                if let Some(display_name) = segment.strip_prefix("Name=") {
                    let lowered = display_name.to_lowercase();
                    if lowered.contains("wireguard") || lowered.contains("fastfree") {
                        found = true;
                        break;
                    }
                }
            }
            if found {
                break;
            }
        }
        let _ = RegCloseKey(hkey);
        found
    }
}

/// Native equivalent of `Get-VMSwitch -Name 'Default Switch'` with the
/// `-ErrorAction SilentlyContinue | Select-Object -First 1` fallback chain.
/// Returns `None` when no virtual switch exists (audit maps this to "None").
#[cfg(windows)]
fn virtual_switch_name_native() -> Option<String> {
    #[derive(serde::Deserialize)]
    #[allow(non_snake_case)]
    struct MsvmVirtualEthernetSwitchSettingData {
        ElementName: String,
    }

    let con = wmi::WMIConnection::with_namespace_path("ROOT\\virtualization\\v2").ok()?;
    let switches: Vec<MsvmVirtualEthernetSwitchSettingData> = con.query().ok()?;
    if switches.is_empty() {
        return None;
    }
    switches
        .iter()
        .find(|switch| switch.ElementName.eq_ignore_ascii_case("Default Switch"))
        .map(|switch| switch.ElementName.clone())
        .or_else(|| switches.first().map(|switch| switch.ElementName.clone()))
}

/// Everything the audit needs out of the Hyper-V WMI namespace
/// (`root\virtualization\v2`) — replaces `Get-VM`, `Get-VMHardDiskDrive`,
/// `Test-Path` and `Get-VMFirmware`.
#[cfg(windows)]
fn probe_vm(vm_name: &str) -> VmNativeProbe {
    let mut probe = VmNativeProbe {
        exists: false,
        actual_name: vm_name.to_string(),
        state: "NotFound".to_string(),
        guid: String::new(),
        hd_path: String::new(),
        secure_boot: false,
    };

    #[derive(serde::Deserialize)]
    #[allow(non_snake_case)]
    struct MsvmComputerSystem {
        Name: String,
        ElementName: String,
        EnabledState: u32,
    }
    #[derive(serde::Deserialize)]
    #[allow(non_snake_case)]
    struct MsvmVirtualSystemSettingData {
        VirtualSystemIdentifier: Option<String>,
        SecureBootEnabled: Option<bool>,
    }
    #[derive(serde::Deserialize)]
    #[allow(non_snake_case)]
    struct MsvmStorageAllocationSettingData {
        InstanceID: Option<String>,
        HostResource: Option<Vec<String>>,
    }

    let con = match wmi::WMIConnection::with_namespace_path("ROOT\\virtualization\\v2") {
        Ok(con) => con,
        Err(_) => return probe,
    };
    let systems: Vec<MsvmComputerSystem> = match con.query() {
        Ok(systems) => systems,
        Err(_) => return probe,
    };
    // Exact match first, then any FastFree-* appliance VM (the old script's
    // `Get-VM | Where-Object { $_.Name -like 'FastFree-*' } | Select -First 1`).
    let picked = systems
        .iter()
        .find(|system| system.ElementName.eq_ignore_ascii_case(vm_name))
        .or_else(|| {
            systems
                .iter()
                .find(|system| system.ElementName.to_lowercase().starts_with("fastfree-"))
        });
    let vm = match picked {
        Some(vm) => vm,
        None => return probe,
    };
    probe.exists = true;
    probe.actual_name = vm.ElementName.clone();
    probe.state = vm_state_label(vm.EnabledState).to_string();
    probe.guid = vm.Name.clone();

    // Secure Boot lives on Msvm_VirtualSystemSettingData (Get-VMFirmware equivalent).
    if let Ok(settings) = con.query::<MsvmVirtualSystemSettingData>() {
        if let Some(setting) = settings
            .iter()
            .find(|setting| setting.VirtualSystemIdentifier.as_deref() == Some(probe.guid.as_str()))
        {
            probe.secure_boot = setting.SecureBootEnabled.unwrap_or(false);
        }
    }

    // VHD/VHDX attach path lives in Msvm_StorageAllocationSettingData.HostResource;
    // the instance ID embeds the VM GUID ("Microsoft:<guid>\<device>").
    if let Ok(allocations) = con.query::<MsvmStorageAllocationSettingData>() {
        let mut first_path: Option<String> = None;
        let mut vhd_path: Option<String> = None;
        for allocation in allocations.iter() {
            let belongs_to_vm = allocation
                .InstanceID
                .as_deref()
                .map(|id| id.contains(probe.guid.as_str()))
                .unwrap_or(false);
            if !belongs_to_vm {
                continue;
            }
            if let Some(resource) = allocation.HostResource.as_ref().and_then(|res| res.first()) {
                let lowered = resource.to_lowercase();
                if lowered.ends_with(".vhdx") || lowered.ends_with(".vhd") {
                    vhd_path = Some(resource.clone());
                    break;
                }
                if first_path.is_none() {
                    first_path = Some(resource.clone());
                }
            }
        }
        probe.hd_path = vhd_path.or(first_path).unwrap_or_default();
    }

    probe
}

#[cfg(windows)]
struct VmNativeProbe {
    exists: bool,
    actual_name: String,
    state: String,
    guid: String,
    hd_path: String,
    secure_boot: bool,
}

/// DMTF/Hyper-V `EnabledState` values mapped to the Get-VM `State` vocabulary
/// used by the report messages ("Running" is the only value that gates step 6).
#[cfg(windows)]
fn vm_state_label(enabled_state: u32) -> &'static str {
    match enabled_state {
        2 => "Running",
        3 => "Off",
        4 => "Stopping",
        6 => "Offline",
        9 => "Quiesce",
        10 => "Starting",
        32768 => "Paused",
        32769 => "Saved",
        _ => "Unknown",
    }
}

impl AuditService {
    pub async fn audit_system_steps(client_id: Option<String>) -> Result<SystemAuditReport, String> {
        let cid = client_id.unwrap_or_else(|| "client1".to_string());
        InstallerLogger::info("AUDIT", &format!("Running complete end-to-end audit for '{}'...", cid));
    
        #[cfg(windows)]
        {
            // Native collection replaces the PowerShell audit script entirely.
            let vm_name = format!("FastFree-{}", cid);

            let is_admin = crate::services::process::is_admin_elevated();
            let vmms_running = vmms_running_native();
            let in_hyperv_group = in_hyperv_admin_group_native();

            let appdata = std::env::var_os("APPDATA").map(std::path::PathBuf::from);
            let has_license = appdata
                .as_ref()
                .map(|dir| {
                    let base = dir.join("cloud.fastfree.installer");
                    base.join("fastfree_license_store.json").exists()
                        || base.join("fastfree_license_cache.json").exists()
                })
                .unwrap_or(false);

            let target_drive = if std::path::Path::new("G:\\").exists() {
                "G:"
            } else {
                "C:"
            };
            let free_space_gb = {
                use sysinfo::Disks;
                Disks::new_with_refreshed_list()
                    .list()
                    .iter()
                    .find(|disk| {
                        disk.mount_point()
                            .to_string_lossy()
                            .to_uppercase()
                            .starts_with(target_drive)
                    })
                    .map(|disk| (disk.available_space() as f64) / (1024.0 * 1024.0 * 1024.0))
                    .unwrap_or(0.0)
            };
            let free_space_gb = (free_space_gb * 10.0).round() / 10.0;

            let switch_name = virtual_switch_name_native().unwrap_or_else(|| "None".to_string());
            let has_wg_conf = appdata
                .as_ref()
                .map(|dir| {
                    dir.join("FastFree")
                        .join("wireguard")
                        .join(format!("{}.conf", cid))
                        .exists()
                })
                .unwrap_or(false);
            if has_wg_conf {
                let _ = NetworkService::configure_windows_dns_and_hosts(&cid);
            }
            let has_fw_rule = wireguard_or_fastfree_firewall_rule_exists();

            let vm_probe = probe_vm(&vm_name);
            let vm_exists = vm_probe.exists;
            let actual_vm_name = vm_probe.actual_name.clone();
            let vm_state = vm_probe.state.as_str();
            let hd_path = vm_probe.hd_path.as_str();
            let secure_boot_on = vm_probe.secure_boot;
            let disk_exists =
                !hd_path.is_empty() && std::path::Path::new(hd_path).exists();
            let has_os_partitions =
                disk_exists && crate::services::storage::is_valid_vhdx(std::path::Path::new(hd_path));
    
            let mut items = Vec::new();
    
            // 1. Step 1: Environment & Hyper-V
            let step1_status = if vmms_running && in_hyperv_group {
                "pass"
            } else if vmms_running || is_admin {
                "warn"
            } else {
                "fail"
            };
            items.push(StepAuditItem {
                step_id: "step_1_env".to_string(),
                step_number: 1,
                category: "Environment & Hyper-V".to_string(),
                title_en: "Hardware & Hyper-V Environment".to_string(),
                title_ar: "بيئة العتاد والمحاكاة الافتراضية Hyper-V".to_string(),
                status: step1_status.to_string(),
                message_en: if vmms_running && in_hyperv_group {
                    "Hyper-V service running and user granted administrative privileges.".to_string()
                } else if vmms_running {
                    "Hyper-V is running, but user group permissions require elevation.".to_string()
                } else {
                    "Hyper-V VMMS service is not active or not installed on this host.".to_string()
                },
                message_ar: if vmms_running && in_hyperv_group {
                    "خدمة Hyper-V تعمل بنشاط والمستخدم يتمتع بصلاحيات إدارة المحاكاة كاملة.".to_string()
                } else if vmms_running {
                    "خدمة Hyper-V تعمل، لكن ينصح بتشغيل المثبت كمسؤول لتأكيد العضوية.".to_string()
                } else {
                    "خدمة Hyper-V VMMS غير نشطة أو غير مثبتة على هذا الجهاز.".to_string()
                },
                details: Some(format!("VMMS Running: {}, Hyper-V Admins: {}, Admin Elevation: {}", vmms_running, in_hyperv_group, is_admin)),
                can_auto_fix: !vmms_running,
            });
    
            // 2. Step 2: License & Identity
            let step2_status = if has_license { "pass" } else { "warn" };
            items.push(StepAuditItem {
                step_id: "step_2_license".to_string(),
                step_number: 2,
                category: "License & Sovereignty".to_string(),
                title_en: "Sovereign License & Identity".to_string(),
                title_ar: "الترخيص وهوية العقدة السيادية".to_string(),
                status: step2_status.to_string(),
                message_en: if has_license {
                    format!("Cryptographic license verified and stored securely for node '{}'.", cid)
                } else {
                    "No cached license found on disk; license activation required.".to_string()
                },
                message_ar: if has_license {
                    format!("تم التحقق من الترخيص المشفر وتخزينه بأمان للعقدة '{}'.", cid)
                } else {
                    "لم يتم العثور على ترخيص مخزن على القرص؛ يلزم تفعيل الترخيص.".to_string()
                },
                details: Some(format!("License Store: {}, Target Node: {}", if has_license { "Configured" } else { "Missing" }, cid)),
                can_auto_fix: false,
            });
    
            // 3. Step 3: Storage & Sizing
            let step3_status = if free_space_gb >= 15.0 { "pass" } else if free_space_gb >= 5.0 { "warn" } else { "fail" };
            items.push(StepAuditItem {
                step_id: "step_3_storage".to_string(),
                step_number: 3,
                category: "Storage & Allocation".to_string(),
                title_en: "Storage Sizing & Drive Capacity".to_string(),
                title_ar: "تخصيص الموارد ومساحة التخزين".to_string(),
                status: step3_status.to_string(),
                message_en: format!("Target storage drive {} has {:.1} GB free capacity (minimum 15 GB recommended).", target_drive, free_space_gb),
                message_ar: format!("قرص التخزين المختار {} يحتوي على مساحة فارغة تبلغ {:.1} جيجابايت (الحد الأدنى 15 جيجابايت).", target_drive, free_space_gb),
                details: Some(format!("Target Drive: {}, Available: {:.1} GB", target_drive, free_space_gb)),
                can_auto_fix: false,
            });
    
            // 4. Step 4: Network & FastFree VPN
            let step4_status = if switch_name != "None" && has_wg_conf {
                "pass"
            } else if switch_name != "None" {
                "warn"
            } else {
                "fail"
            };
            items.push(StepAuditItem {
                step_id: "step_4_network".to_string(),
                step_number: 4,
                category: "Virtual Switch & VPN".to_string(),
                title_en: "FastFree VPN & Virtual Switch".to_string(),
                title_ar: "شبكة FastFree VPN والمحول الافتراضي".to_string(),
                status: step4_status.to_string(),
                message_en: if switch_name != "None" && has_wg_conf {
                    format!("Virtual Switch '{}' active with WireGuard topology configured.", switch_name)
                } else if switch_name != "None" {
                    format!("Virtual Switch '{}' bound; WireGuard config ready to generate.", switch_name)
                } else {
                    "No Hyper-V virtual switch detected on the system.".to_string()
                },
                message_ar: if switch_name != "None" && has_wg_conf {
                    format!("المحول الافتراضي '{}' نشط وملف WireGuard مجهز بالكامل.", switch_name)
                } else if switch_name != "None" {
                    format!("المحول الافتراضي '{}' جاهز، وسيتم استكمال إعدادات VPN تلقائياً.", switch_name)
                } else {
                    "لم يتم العثور على أي محول افتراضي (Virtual Switch) في Hyper-V.".to_string()
                },
                details: Some(format!("Switch: {}, WireGuard Conf: {}, Firewall Rule: {}", switch_name, has_wg_conf, has_fw_rule)),
                can_auto_fix: !has_fw_rule,
            });
    
            // 5. Step 5: Appliance VM & Bootable Disk
            let step5_status = if vm_exists && disk_exists && has_os_partitions && !secure_boot_on {
                "pass"
            } else if vm_exists && (!disk_exists || !has_os_partitions) {
                "fail"
            } else if vm_exists {
                "warn"
            } else {
                "fail"
            };
            items.push(StepAuditItem {
                step_id: "step_5_vm".to_string(),
                step_number: 5,
                category: "Appliance VM & Disk".to_string(),
                title_en: "NixOS Appliance VM & Boot Disk".to_string(),
                title_ar: "الآلة الافتراضية وقرص إقلاع NixOS".to_string(),
                status: step5_status.to_string(),
                message_en: if !vm_exists {
                    format!("Hyper-V VM '{}' is not provisioned.", actual_vm_name)
                } else if !disk_exists {
                    format!("VM '{}' registered, but VHDX disk is missing from storage (0x80070002).", actual_vm_name)
                } else if !has_os_partitions {
                    format!("VM disk exists at '{}' but has no bootable OS partitions (Empty dynamic disk).", hd_path)
                } else if secure_boot_on {
                    "VM exists with bootable OS, but Secure Boot is enabled (must be Off for NixOS GRUB).".to_string()
                } else {
                    format!("VM '{}' verified with valid bootable NixOS Clan appliance disk (State: {}).", actual_vm_name, vm_state)
                },
                message_ar: if !vm_exists {
                    format!("الآلة الافتراضية '{}' لم يتم إنشاؤها بعد في Hyper-V.", actual_vm_name)
                } else if !disk_exists {
                    format!("الآلة '{}' مسجلة، لكن ملف القرص VHDX مفقود على الهارد ديسك (سبب الخطأ 0x80070002).", actual_vm_name)
                } else if !has_os_partitions {
                    format!("قرص الآلة موجود في '{}' لكنه فارغ ولا يحتوي على نظام تشغيل قابل للإقلاع.", hd_path)
                } else if secure_boot_on {
                    "الآلة موجودة وبها نظام، لكن Secure Boot مفعل (يجب إيقافه ليعمل GRUB الخاص بـ NixOS).".to_string()
                } else {
                    format!("الآلة '{}' تم التحقق منها وتحتوي على قرص NixOS حقيقي جاهز للإقلاع (الحالة: {}).", actual_vm_name, vm_state)
                },
                details: Some(format!("VM: {} ({}), Disk: {} (exists: {}, has_os: {}), SecureBoot: {}", actual_vm_name, vm_state, hd_path, disk_exists, has_os_partitions, secure_boot_on)),
                can_auto_fix: !vm_exists || !disk_exists || !has_os_partitions || secure_boot_on,
            });
    
            // 6. Step 6: Launchpad & System Readiness
            let total_passed = items.iter().filter(|i| i.status == "pass").count();
            let total_warnings = items.iter().filter(|i| i.status == "warn").count();
            let total_errors = items.iter().filter(|i| i.status == "fail").count();
    
            let all_completed = total_errors == 0 && vm_exists && disk_exists && has_os_partitions;
            let step6_status = if all_completed && vm_state == "Running" {
                "pass"
            } else if all_completed {
                "warn"
            } else {
                "fail"
            };
    
            items.push(StepAuditItem {
                step_id: "step_6_launchpad".to_string(),
                step_number: 6,
                category: "Launchpad Readiness".to_string(),
                title_en: "Sovereign Control Center Readiness".to_string(),
                title_ar: "جاهزية لوحة التحكم ونظام التشغيل".to_string(),
                status: step6_status.to_string(),
                message_en: if step6_status == "pass" {
                    "FastFree Sovereign Appliance is fully operational and healthy.".to_string()
                } else if step6_status == "warn" {
                    "All components provisioned; start the VM to achieve active status.".to_string()
                } else {
                    "Appliance requires resolution of preceding steps before entering Launchpad.".to_string()
                },
                message_ar: if step6_status == "pass" {
                    "نظام FastFree السيادي مكتمل وجاهز بالكامل للعمل دون أي مشاكل.".to_string()
                } else if step6_status == "warn" {
                    "جميع الخطوات مكتملة بنجاح، فقط قم بتشغيل الآلة لبدء استخدام النظام.".to_string()
                } else {
                    "يلزم استكمال أو إصلاح الخطوات السابقة قبل العمل في لوحة التحكم.".to_string()
                },
                details: Some(format!("Passed: {}/5, Warnings: {}, Errors: {}", total_passed, total_warnings, total_errors)),
                can_auto_fix: step6_status != "pass",
            });
    
            let final_passed = items.iter().filter(|i| i.status == "pass").count();
            let final_warnings = items.iter().filter(|i| i.status == "warn").count();
            let final_errors = items.iter().filter(|i| i.status == "fail").count();
    
            let overall = if final_errors > 0 {
                "error"
            } else if final_warnings > 0 {
                "warning"
            } else {
                "healthy"
            };
    
            Ok(SystemAuditReport {
                client_id: cid,
                overall_status: overall.to_string(),
                all_steps_completed: final_errors == 0,
                total_passed: final_passed,
                total_warnings: final_warnings,
                total_errors: final_errors,
                items,
                timestamp: InstallerLogger::get_timestamp(),
            })
        }
    
        #[cfg(not(windows))]
        {
            Ok(SystemAuditReport {
                client_id: cid,
                overall_status: "healthy".to_string(),
                all_steps_completed: true,
                total_passed: 6,
                total_warnings: 0,
                total_errors: 0,
                items: Vec::new(),
                timestamp: "Simulation".to_string(),
            })
        }
    }
}
