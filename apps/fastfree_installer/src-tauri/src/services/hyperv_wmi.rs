#![cfg(windows)]

use serde::{Deserialize, Serialize};

use crate::logger::InstallerLogger;

/// Hyper-V virtualization CIM classes are namespace-scoped (`root\virtualization\v2`)
/// — never on `root\cimv2` like stock WMI.
#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_ComputerSystem")]
#[allow(non_snake_case)]
pub struct MsvmComputerSystem {
    #[allow(dead_code)]
    pub Name: String,
    pub ElementName: String,
    #[allow(dead_code)]
    pub EnabledState: u32,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_VirtualEthernetSwitchSettingData")]
#[allow(non_snake_case)]
pub struct MsvmVirtualEthernetSwitchSettingData {
    pub ElementName: String,
    #[allow(dead_code)]
    pub InstanceID: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_ProcessorSettingData")]
#[allow(non_snake_case)]
pub struct MsvmProcessorSettingData {
    pub InstanceID: String,
    #[serde(default)]
    pub Parent: String,
    #[serde(default)]
    pub VirtualQuantity: u64,
    #[serde(default)]
    pub ExposeVirtualizationExtensions: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_MemorySettingData")]
#[allow(non_snake_case)]
pub struct MsvmMemorySettingData {
    pub InstanceID: String,
    #[serde(default)]
    pub Parent: String,
    #[serde(default)]
    pub VirtualQuantity: u64, // in MB (AllocationUnits = byte * 2^20)
}

#[derive(Clone, Deserialize, Debug)]
#[serde(rename = "Msvm_VirtualSystemSettingData")]
#[allow(non_snake_case)]
pub struct MsvmVirtualSystemSettingData {
    pub InstanceID: String,
    #[serde(default)]
    pub VirtualSystemIdentifier: String,
    #[serde(default)]
    pub SecureBootEnabled: bool,
    #[serde(default)]
    pub CheckpointType: u32,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_StorageAllocationSettingData")]
#[allow(non_snake_case)]
pub struct MsvmStorageAllocationSettingData {
    pub InstanceID: String,
    #[serde(default)]
    pub VirtualSystemIdentifier: String,
    #[serde(default)]
    pub HostResource: Vec<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_SyntheticEthernetPortSettingData")]
#[allow(non_snake_case)]
pub struct MsvmSyntheticEthernetPortSettingData {
    pub InstanceID: String,
    #[serde(default)]
    pub Parent: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_EthernetPortAllocationSettingData")]
#[allow(non_snake_case)]
pub struct MsvmSyntheticEthernetAdapterSettingData {
    #[serde(default)]
    pub InstanceID: String,
    #[serde(default)]
    pub Connection: Vec<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Msvm_HeartbeatComponent")]
#[allow(non_snake_case)]
pub struct MsvmHeartbeatComponent {
    #[serde(default)]
    pub Name: String,
    #[serde(default)]
    pub InstanceID: String,
    #[serde(default)]
    pub PrimaryStatus: u16,
    #[serde(default)]
    pub PrimaryStatusDescription: String,
    #[serde(default)]
    pub Parent: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_UserAccount")]
#[allow(non_snake_case)]
pub struct Win32UserAccount {
    #[serde(default)]
    pub Name: String,
}

fn connect_cimv2() -> Result<wmi::WMIConnection, String> {
    wmi::WMIConnection::with_namespace_path("ROOT\\cimv2")
        .map_err(|e| format!("Failed to open CIMV2 namespace: {}", e))
}

// Settings are VM-scoped via the FIRST InstanceID segment: live setting instances are
// named `Microsoft:<ComputerSystem-GUID>\<definition-guid>...` (verified live on
// Windows 10/Server). The `Parent` property is EMPTY on many editions, so GUID lookup
// must key on InstanceID, not Parent.
fn live_instance_prefix(vm_guid: &str) -> String {
    let guid = vm_guid.trim().to_ascii_lowercase();
    format!("microsoft:{}\\", guid)
}

/// Among rows whose InstanceID starts with `Microsoft:<guid>\`, prefer the one whose
/// InstanceID ALSO starts with that prefix (the live config) over stale recovered
/// configs, and never match the generic `Microsoft:Definition\...` template rows.
fn fmt_is_live(s: &str, prefix: &str) -> bool {
    let id = s.trim().to_ascii_lowercase();
    id.starts_with(prefix)
}

pub fn processor_settings(vm_guid: &str) -> Option<MsvmProcessorSettingData> {
    let prefix = live_instance_prefix(vm_guid);
    connect_v2()
        .and_then(|con| con.query::<MsvmProcessorSettingData>().map_err(|e| e.to_string()))
        .unwrap_or_default()
        .into_iter()
        .find(|s| fmt_is_live(&s.InstanceID, &prefix))
}

pub fn memory_setting(vm_guid: &str) -> Option<MsvmMemorySettingData> {
    let prefix = live_instance_prefix(vm_guid);
    connect_v2()
        .and_then(|con| con.query::<MsvmMemorySettingData>().map_err(|e| e.to_string()))
        .unwrap_or_default()
        .into_iter()
        .find(|s| fmt_is_live(&s.InstanceID, &prefix))
}

pub fn virtual_system_setting(vm_guid: &str) -> Option<MsvmVirtualSystemSettingData> {
    let prefix = live_instance_prefix(vm_guid);
    let rows: Vec<MsvmVirtualSystemSettingData> = connect_v2()
        .and_then(|con| con.query::<MsvmVirtualSystemSettingData>().map_err(|e| e.to_string()))
        .unwrap_or_default();
    // Stale recovered configs can share the same VirtualSystemIdentifier; the live
    // configuration's InstanceID begins with `Microsoft:<guid>`.
    rows.iter()
        .find(|s| fmt_is_live(&s.InstanceID, &prefix))
        .cloned()
        .or_else(|| {
            rows.iter()
                .find(|s| s.VirtualSystemIdentifier.eq_ignore_ascii_case(vm_guid))
                .cloned()
        })
}

/// CheckpointType (uint32): 0 = Production, 1 = Standard (legacy), anything else gets a
/// safe "Production" default to keep the Hyper-V contract string.
pub fn checkpoint_type_string(kind: u32) -> &'static str {
    match kind {
        0 => "Production",
        1 => "Standard",
        _ => "Production",
    }
}

pub fn heartbeat_status(vm_guid: &str) -> String {
    let prefix = live_instance_prefix(vm_guid);
    let found = connect_v2()
        .and_then(|con| con.query::<MsvmHeartbeatComponent>().map_err(|e| e.to_string()))
        .unwrap_or_default()
        .into_iter()
        .find(|h| fmt_is_live(&h.InstanceID, &prefix));
    match found {
        Some(h) => {
            let desc = h.PrimaryStatusDescription.trim().to_string();
            if desc.is_empty() {
                "No Contact".to_string()
            } else {
                desc
            }
        }
        None => "No Contact".to_string(),
    }
}

pub fn vhdx_path(vm_guid: &str) -> Option<String> {
    let prefix = live_instance_prefix(vm_guid);
    connect_v2()
        .and_then(|con| con.query::<MsvmStorageAllocationSettingData>().map_err(|e| e.to_string()))
        .unwrap_or_default()
        .into_iter()
        .find(|s| fmt_is_live(&s.InstanceID, &prefix))
        .and_then(|s| {
            s.HostResource
                .iter()
                .find(|h| h.contains(".vhdx") || h.contains(".vhd"))
                .cloned()
        })
}

/// NIC -> Switch name: the appliance model creates one synthetic adapter per VM; the first
/// port-allocation setting of THIS VM (InstanceID prefix) with a Connection wins
/// (mirror of Get-VM.NetworkAdapters[0].SwitchName).
/// Falls back to None (caller uses "Default Switch") rather than guessing a wrong NIC.
pub fn vm_switch_name(vm_guid: &str) -> Option<String> {
    let prefix = live_instance_prefix(vm_guid);
    let con = connect_v2().ok()?;
    let allocations: Vec<MsvmSyntheticEthernetAdapterSettingData> = con
        .query::<MsvmSyntheticEthernetAdapterSettingData>()
        .unwrap_or_default();
    let switch_pid = allocations
        .into_iter()
        .find(|a| fmt_is_live(&a.InstanceID, &prefix))
        .and_then(|a| a.Connection.into_iter().next())?;
    let needle = switch_pid
        .split("InstanceID=\"")
        .nth(1)
        .and_then(|s| s.split('"').next())
        .unwrap_or_else(|| switch_pid.as_str());
    con.query::<MsvmVirtualEthernetSwitchSettingData>()
        .ok()?
        .into_iter()
        .find(|s| s.InstanceID.eq_ignore_ascii_case(needle))
        .map(|s| s.ElementName)
}

/// Cloak/hidden-account check: Win32_UserAccount in cimv2.
pub fn local_user_exists(username: &str) -> bool {
    connect_cimv2()
        .and_then(|con| con.query::<Win32UserAccount>().map_err(|e| e.to_string()))
        .unwrap_or_default()
        .into_iter()
        .any(|u| u.Name.eq_ignore_ascii_case(username))
}

fn connect_v2() -> Result<wmi::WMIConnection, String> {
    wmi::WMIConnection::with_namespace_path("ROOT\\virtualization\\v2")
        .map_err(|e| format!("Failed to open Hyper-V WMI namespace (root\\virtualization\\v2): {}", e))
}

/// True when a Hyper-V VM named exactly `vm_name` exists.
/// Any query failure maps to `false` (old script's behavior: any exception -> NOT_FOUND).
pub fn vm_exists(vm_name: &str) -> bool {
    match connect_v2().and_then(|con| {
        con.query::<MsvmComputerSystem>()
            .map_err(|e| format!("query failed: {}", e))
    }) {
        Ok(vms) => vms.iter().any(|v| v.ElementName.eq_ignore_ascii_case(vm_name)),
        Err(e) => {
            InstallerLogger::warn("HYPERV_WMI", &format!("VM existence query failed ({}), assuming VM absent.", e));
            false
        }
    }
}

/// Resolve a VM by exact ElementName ("FastFree-<clientId>"). `None` when absent.
pub fn find_vm(vm_name: &str) -> Result<Option<MsvmComputerSystem>, String> {
    let con = connect_v2()?;
    let vms = con
        .query::<MsvmComputerSystem>()
        .map_err(|e| format!("VM query failed: {}", e))?;
    Ok(vms
        .into_iter()
        .find(|v| v.ElementName.eq_ignore_ascii_case(vm_name)))
}

/// Map `Msvm_ComputerSystem.EnabledState` to Get-VM-style state strings.
/// Best-effort: 2 Running, 3 Off, 6 Paused, 9 Starting, 10 Reset, 11 Stopping,
/// 32768 Paused (legacy), 32770 Saved (legacy).
pub fn state_string(enabled: u32) -> &'static str {
    match enabled {
        2 => "Running",
        3 => "Off",
        6 => "Paused",
        9 => "Starting",
        10 => "Reset",
        11 => "Stopping",
        32768 => "Paused",
        32770 => "Saved",
        _ => "Unknown",
    }
}

#[derive(Serialize)]
#[allow(non_snake_case)]
struct RequestStateChangeInput {
    pub RequestedState: u32,
}

#[derive(Deserialize)]
#[allow(non_snake_case)]
struct RequestStateChangeOutput {
    #[allow(dead_code)]
    pub ReturnValue: u32,
}

/// Power-state transition on the VM instance identified by its `Name` (GUID).
/// `requested_state`: 2=Enabled (start), 4=Shut Down (graceful), 10=Reboot.
pub fn request_state_change(vm_guid: &str, requested_state: u32) -> Result<(), String> {
    let con = connect_v2()?;
    let object_path = format!("Msvm_ComputerSystem.Name=\"{}\"", vm_guid);
    con.exec_instance_method::<MsvmComputerSystem, RequestStateChangeOutput>(
        &object_path,
        "RequestStateChange",
        RequestStateChangeInput { RequestedState: requested_state },
    )
    .map(|_| ())
    .map_err(|e| format!("RequestStateChange failed ({}): {}", requested_state, e))
}

/// Mirror of the PowerShell fallback chain used before native migration:
///   1. 'Default Switch'  2. 'FastFree-Default-Switch'  3. first available switch
/// Returns the raw switch ElementName. The historical "External switch" probe
/// (Get-VMSwitch -SwitchType External) is intentionally dropped: its numerical
/// SwitchType enum could not be verified offline, and any-switch fallback already
/// covers external switches. Falls back to "Default Switch" when none exist.
pub fn resolve_virtual_switch() -> String {
    let con = match connect_v2() {
        Ok(c) => c,
        Err(e) => {
            InstallerLogger::warn("HYPERV_WMI", &format!("Switch lookup unavailable ({}); using default fallback.", e));
            return "Default Switch".to_string();
        }
    };

    match con.query::<MsvmVirtualEthernetSwitchSettingData>() {
        Ok(switches) if switches.is_empty() => {
            InstallerLogger::warn("HYPERV_WMI", "No virtual switches found; binding will fail downstream.");
            "Default Switch".to_string()
        }
        Ok(switches) => {
            let by_name = |needle: &str| {
                switches
                    .iter()
                    .find(|s| s.ElementName.eq_ignore_ascii_case(needle))
                    .map(|s| s.ElementName.clone())
            };
            let picked = by_name("Default Switch")
                .or_else(|| by_name("FastFree-Default-Switch"))
                .or_else(|| switches.first().map(|s| s.ElementName.clone()))
                .unwrap_or_else(|| "Default Switch".to_string());
            InstallerLogger::info("HYPERV_WMI", &format!("Resolved virtual switch: '{}'", picked));
            picked
        }
        Err(e) => {
            InstallerLogger::warn("HYPERV_WMI", &format!("Switch query failed ({}); using default fallback.", e));
            "Default Switch".to_string()
        }
    }
}
