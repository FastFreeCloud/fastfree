#![cfg(windows)]

use serde::{Deserialize, Serialize};

use crate::logger::InstallerLogger;

/// Hyper-V virtualization CIM classes are namespace-scoped (`root\virtualization\v2`)
/// — never on `root\cimv2` like stock WMI.
#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct MsvmComputerSystem {
    #[allow(dead_code)]
    pub Name: String,
    pub ElementName: String,
    #[allow(dead_code)]
    pub EnabledState: u32,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct MsvmVirtualEthernetSwitchSettingData {
    pub ElementName: String,
    #[allow(dead_code)]
    pub InstanceID: String,
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
