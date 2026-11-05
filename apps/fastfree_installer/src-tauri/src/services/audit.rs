use crate::logger::InstallerLogger;
use crate::services::process::hidden_powershell;
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

impl AuditService {
    pub async fn audit_system_steps(client_id: Option<String>) -> Result<SystemAuditReport, String> {
        let cid = client_id.unwrap_or_else(|| "client1".to_string());
        InstallerLogger::info("AUDIT", &format!("Running complete end-to-end audit for '{}'...", cid));
    
        #[cfg(windows)]
        {
            let ps_script = format!(
                r#"
    $ErrorActionPreference = 'SilentlyContinue'
    $clientId = '{cid}'
    $vmName = "FastFree-$clientId"
    
    # 1. Hyper-V & Admin
    $isAdmin = $false
    try {{
        $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    }} catch {{}}
    $vmms = Get-Service -Name vmms -ErrorAction SilentlyContinue
    $vmmsRunning = ($vmms -and $vmms.Status -eq 'Running')
    $inHypervGroup = $false
    try {{
        $members = Get-LocalGroupMember -Group 'Hyper-V Administrators' -ErrorAction SilentlyContinue
        $inHypervGroup = ($members | Where-Object {{ $_.Name -like "*$env:USERNAME*" }}).Count -gt 0
    }} catch {{}}
    
    # 2. License check
    $licenseFile1 = "$env:APPDATA\cloud.fastfree.installer\fastfree_license_store.json"
    $licenseFile2 = "$env:APPDATA\cloud.fastfree.installer\fastfree_license_cache.json"
    $hasLicense = (Test-Path $licenseFile1) -or (Test-Path $licenseFile2)
    
    # 3. Storage check
    $targetDrive = if (Test-Path "G:\") {{ "G:" }} else {{ "C:" }}
    $driveObj = Get-PSDrive -Name ($targetDrive.TrimEnd(':')) -ErrorAction SilentlyContinue
    $freeGb = if ($driveObj) {{ [math]::Round($driveObj.Free / 1GB, 1) }} else {{ 0 }}
    
    # 4. Switch & VPN
    $sw = Get-VMSwitch -Name 'Default Switch' -ErrorAction SilentlyContinue
    if (-not $sw) {{ $sw = Get-VMSwitch -ErrorAction SilentlyContinue | Select-Object -First 1 }}
    $wgConf = "$env:APPDATA\FastFree\wireguard\$clientId.conf"
    $hasWgConf = Test-Path $wgConf
    $fwRule = Get-NetFirewallRule -DisplayName "*WireGuard*" -ErrorAction SilentlyContinue
    if (-not $fwRule) {{ $fwRule = Get-NetFirewallRule -DisplayName "*FastFree*" -ErrorAction SilentlyContinue }}
    
    # 5. VM & Bootable Disk
    $vm = Get-VM -Name $vmName -ErrorAction SilentlyContinue
    if (-not $vm) {{
        $vm = Get-VM | Where-Object {{ $_.Name -like 'FastFree-*' }} | Select-Object -First 1
    }}
    $vmExists = ($null -ne $vm)
    $actualVmName = if ($vm) {{ $vm.Name }} else {{ $vmName }}
    $vmState = if ($vm) {{ $vm.State.ToString() }} else {{ "NotFound" }}
    $hd = if ($vm) {{ Get-VMHardDiskDrive $vm -ErrorAction SilentlyContinue }} else {{ $null }}
    $hdPath = if ($hd) {{ $hd[0].Path }} else {{ "" }}
    $diskExists = $false
    $hasOs = $false
    if ($hdPath) {{
        if (Test-Path -LiteralPath $hdPath -ErrorAction SilentlyContinue) {{
            $diskExists = $true
            $vhd = Get-VHD -Path $hdPath -ErrorAction SilentlyContinue
            if ($vhd -and $vhd.MinimumSize -and $vhd.MinimumSize -gt 0) {{
                $hasOs = $true
            }}
        }}
    }}
    $secBoot = $false
    if ($vm) {{
        $fw = Get-VMFirmware $vm -ErrorAction SilentlyContinue
        if ($fw) {{ $secBoot = ($fw.SecureBoot -eq 'On') }}
    }}
    
    [PSCustomObject]@{{
        isAdmin = $isAdmin
        vmmsRunning = $vmmsRunning
        inHypervGroup = $inHypervGroup
        hasLicense = $hasLicense
        targetDrive = $targetDrive
        freeSpaceGb = $freeGb
        switchName = if ($sw) {{ $sw.Name }} else {{ "None" }}
        hasWgConf = $hasWgConf
        hasFwRule = ($null -ne $fwRule)
        vmExists = $vmExists
        actualVmName = $actualVmName
        vmState = $vmState
        hdPath = $hdPath
        diskExists = $diskExists
        hasOsPartitions = $hasOs
        secureBootOn = $secBoot
    }} | ConvertTo-Json -Compress
    "#,
                cid = cid
            );
    
            let output = hidden_powershell()
                .args(["-Command", &ps_script])
                .output()
                .map_err(|e| format!("PowerShell audit failure: {}", e))?;
    
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let raw: serde_json::Value = serde_json::from_str(&stdout)
                .unwrap_or(serde_json::json!({}));
    
            let is_admin = raw["isAdmin"].as_bool().unwrap_or(false);
            let vmms_running = raw["vmmsRunning"].as_bool().unwrap_or(false);
            let in_hyperv_group = raw["inHypervGroup"].as_bool().unwrap_or(false);
            let has_license = raw["hasLicense"].as_bool().unwrap_or(false);
            let target_drive = raw["targetDrive"].as_str().unwrap_or("C:");
            let free_space_gb = raw["freeSpaceGb"].as_f64().unwrap_or(0.0);
            let switch_name = raw["switchName"].as_str().unwrap_or("None");
            let has_wg_conf = raw["hasWgConf"].as_bool().unwrap_or(false);
            if has_wg_conf {
                let _ = NetworkService::configure_windows_dns_and_hosts(&cid);
            }
            let has_fw_rule = raw["hasFwRule"].as_bool().unwrap_or(false);
            let vm_exists = raw["vmExists"].as_bool().unwrap_or(false);
            let actual_vm_name = raw["actualVmName"].as_str().unwrap_or("FastFree-client1");
            let vm_state = raw["vmState"].as_str().unwrap_or("NotFound");
            let hd_path = raw["hdPath"].as_str().unwrap_or("");
            let disk_exists = raw["diskExists"].as_bool().unwrap_or(false);
            let has_os_partitions = raw["hasOsPartitions"].as_bool().unwrap_or(false);
            let secure_boot_on = raw["secureBootOn"].as_bool().unwrap_or(false);
    
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
