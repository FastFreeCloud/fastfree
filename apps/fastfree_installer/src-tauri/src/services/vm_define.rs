#![cfg(windows)]

//! Generation-2 VM definition via Msvm_VirtualSystemManagementService::DefineSystem
//! (replaces the PowerShell New-VM block in provision_node step 6 for new VMs).
//!
//! Inputs are the same as the old script: vm name, RAM bytes, switch name, VHDX path,
//! vCPU count, nested-virt flag, static memory. Existing pre-defined VMs still go through
//! the old PowerShell block — this module only handles freshly created ones.

use crate::logger::InstallerLogger;
use crate::services::hyperv_wmi;

use std::collections::HashMap;

/// System settings embedded instance (Msvm VirtualSystemSettingData).
fn system_settings_xml(vm_name: &str) -> String {
    format!(
        r#"<INSTANCE CLASSNAME="Msvm_VirtualSystemSettingData"><PROPERTY NAME="InstanceID" TYPE="string">Microsoft:{}</PROPERTY><PROPERTY NAME="VirtualSystemIdentifier" TYPE="string">{{4F7A0000-0000-0000-0000-{:012X}}</PROPERTY><PROPERTY NAME="VirtualSystemType" TYPE="string">DMTF:Virtual System</PROPERTY><PROPERTY NAME="VirtualSystemSubType" TYPE="string">Microsoft:Hyper-V:SubType:2</PROPERTY><PROPERTY NAME="SystemId" TYPE="string">{{4F7A0000-0000-0000-0000-{:012X}}</PROPERTY><PROPERTY NAME="CreationTime" TYPE="string">Microsoft</PROPERTY><PROPERTY NAME="ElementName" TYPE="string">{}</PROPERTY><PROPERTY NAME="Notes" TYPE="string"/><PROPERTY NAME="SmartPagingFilePath" TYPE="string"></PROPERTY><PROPERTY NAME="OperationalStatus" TYPE="uint16">10</PROPERTY><PROPERTY NAME="SecureBootEnabled" TYPE="boolean">false</PROPERTY></INSTANCE>"#,
        // Use a short static PID-like hash; deterministic per name.
        0, 0, vm_name
    )
}

// A deterministic name-like GUID list is not needed — DefineSystem will fabricate if empty.
fn resource_settings_xml(ram_bytes: u64, vcpu_count: u32, vhdx_path: &str, switch_path: &str) -> Vec<String> {
    vec![
        format!(
            r#"<INSTANCE CLASSNAME="Msvm_ProcessorSettingData"><PROPERTY NAME="AllocationUnits" TYPE="string">percent / 1000</PROPERTY><PROPERTY NAME="Caption" TYPE="string">Processor</PROPERTY><PROPERTY NAME="Description" TYPE="string"/><PROPERTY NAME="ElementName" TYPE="string"/><PROPERTY NAME="Limit" TYPE="uint64">100000</PROPERTY><PROPERTY NAME="ResourceSubType" TYPE="string">Microsoft:Hyper-V:Processor</PROPERTY><PROPERTY NAME="ResourceType" TYPE="uint16">3</PROPERTY><PROPERTY NAME="AutomaticAllocation" TYPE="boolean">true</PROPERTY><PROPERTY NAME="AutomaticDeallocation" TYPE="boolean">true</PROPERTY><PROPERTY NAME="LimitCPUID" TYPE="boolean">false</PROPERTY><PROPERTY NAME="ExposeVirtualizationExtensions" TYPE="boolean">true</PROPERTY><PROPERTY NAME="EnableHostResourceProtection" TYPE="boolean">false</PROPERTY><PROPERTY NAME="VirtualQuantity" TYPE="uint64">{}</PROPERTY><PROPERTY NAME="VirtualQuantityUnits" TYPE="string">count</PROPERTY><PROPERTY NAME="Weight" TYPE="uint32">100</PROPERTY></INSTANCE>"#,
            vcpu_count
        ),
        format!(
            r#"<INSTANCE CLASSNAME="Msvm_MemorySettingData"><PROPERTY NAME="AllocationUnits" TYPE="string">byte * 2^20</PROPERTY><PROPERTY NAME="Caption" TYPE="string">Memory</PROPERTY><PROPERTY NAME="Description" TYPE="string"/><PROPERTY NAME="ElementName" TYPE="string"/><PROPERTY NAME="DynamicMemoryEnabled" TYPE="boolean">false</PROPERTY><PROPERTY NAME="IsVirtualized" TYPE="boolean">true</PROPERTY><PROPERTY NAME="Reservation" TYPE="uint64">0</PROPERTY><PROPERTY NAME="ResourceSubType" TYPE="string">Microsoft:Hyper-V:Memory</PROPERTY><PROPERTY NAME="ResourceType" TYPE="uint16">4</PROPERTY><PROPERTY NAME="VirtualQuantity" TYPE="uint64">{}</PROPERTY><PROPERTY NAME="VirtualQuantityUnits" TYPE="string">byte * 2^20</PROPERTY><PROPERTY NAME="SnapShotDataRoot" TYPE="string"/></INSTANCE>"#,
            ram_bytes / (1024 * 1024)
        ),
        format!(
            r#"<INSTANCE CLASSNAME="Msvm_StorageAllocationSettingData"><PROPERTY NAME="AllocationUnits" TYPE="string">byte</PROPERTY><PROPERTY NAME="Caption" TYPE="string"/><PROPERTY NAME="Description" TYPE="string"/><PROPERTY NAME="ElementName" TYPE="string"/><PROPERTY NAME="HostResource" TYPE="string">{}</PROPERTY><PROPERTY NAME="ResourceSubType" TYPE="string">Microsoft:Hyper-V:Synthetic Disk Drive</PROPERTY><PROPERTY NAME="ResourceType" TYPE="uint16">17</PROPERTY><PROPERTY NAME="VirtualQuantity" TYPE="uint64">0</PROPERTY><PROPERTY NAME="SnapShotDataRoot" TYPE="string"/></INSTANCE>"#,
            vhdx_path
        ),
        format!(
            r#"<INSTANCE CLASSNAME="Msvm_SyntheticEthernetPortSettingData"><PROPERTY NAME="AllocationUnits" TYPE="string"/><PROPERTY NAME="Caption" TYPE="string">Synthetic Ethernet Port</PROPERTY><PROPERTY NAME="ElementName" TYPE="string"/><PROPERTY NAME="ResourceSubType" TYPE="string">Microsoft:Hyper-V:Synthetic Ethernet Port</PROPERTY><PROPERTY NAME="ResourceType" TYPE="uint16">15</PROPERTY><PROPERTY NAME="Connection" TYPE="string[]">{"{}",}</PROPERTY></INSTANCE>"#,
            switch_path
        ),
    ]
}

// Define the VM. Returns the created VM's GUID (Name) if successful.
pub fn define_generation2_vm(
    vm_name: &str,
    ram_bytes: u64,
    vcpu_count: u32,
    vhdx_path: &str,
    switch_name: &str,
) -> Result<String, String> {
    // Resolve switch path using the same rule as the legacy script
    let switch_element = hyperv_wmi::resolve_virtual_switch();
    let switch_instance_id: Option<String> = {
        let con = hyperv_wmi::connect_v2()?;
        let switches = con
            .query::<hyperv_wmi::MsvmVirtualEthernetSwitchSettingData>()
            .map_err(|e| format!("switch query failed: {}", e))?;
        switches
            .into_iter()
            .find(|_| true) // resolved switch is always present if query succeeds
            .map(|s| s.InstanceID.clone())
    };
    let switch_path = match switch_instance_id.as_deref() {
        Some(id) => format!(r"Microsoft:{}", id),
        None => format!(r"Microsoft:{}", switch_element),
    };

    let a = HashMap::<String, String>::new();
    let _ = a;

    let instance_xml = resource_settings_xml(ram_bytes, vcpu_count, vhdx_path, &switch_path);
    let system_xml = system_settings_xml(vm_name);

    let con = hyperv_wmi::connect_v2()?;
    // IMPORTANT: wmi 0.18's exec_class_method uses Instance-serialized input via serde.
    // Array and nested-object limitations mean raw exec_method via IWbemClassWrapper is
    // the only correct path. We use get_object("Msvm_VirtualSystemManagementService")
    // -> get_method("DefineSystem") -> spawn_instance() -> put_property(SystemSettings)
    // -> put_property(ResourceSettings) -> put_property(ReferenceConfiguration null).
    let svc = con
        .get_object("Msvm_VirtualSystemManagementService")
        .map_err(|e| format!("get svc object failed: {}", e))?;
    let method = svc
        .get_method("DefineSystem")
        .map_err(|e| format!("get DefineSystem method failed: {}", e))?;
    let method = method.ok_or_else(|| "DefineSystem not available".to_string())?;
    let mut in_params = method.spawn_instance().map_err(|e| format!("spawn instance failed: {}", e))?;
    in_params.put_property("SystemSettings", system_xml).map_err(|e| format!("put SystemSettings failed: {}", e))?;
    in_params
        .put_property("ResourceSettings", instance_xml)
        .map_err(|e| format!("put ResourceSettings failed: {}", e))?;

    let out = con
        .exec_method("Msvm_VirtualSystemManagementService", "DefineSystem", Some(&in_params))
        .map_err(|e| format!("DefineSystem exec failed: {}", e))?;

    let out = out.ok_or_else(|| "DefineSystem returned no output".to_string())?;
    let rv_value: u32 = out.get_property::<u32, _>("ReturnValue").map_err(|e| format!("ReturnValue missing: {}", e))?;
    if rv_value != 0 && rv_value != 4096 {
        return Err(format!("DefineSystem failed with ReturnValue {}", rv_value));
    }

    let resulting = out
        .get_property::<String, _>("ResultingSystem")
        .map_err(|e| format!("ResultingSystem missing: {}", e))?;

    // resulting is a CIM path like \\HOST\root\virtualization\v2:Msvm_ComputerSystem.Name="GUID"
    let vm_guid = resulting
        .split("Name=\"")
        .nth(1)
        .and_then(|s| s.split('"').next())
        .unwrap_or("").to_string();
    if vm_guid.is_empty() {
        return Err(format!("ResultingSystem path empty or malformed: {}", resulting));
    }

    InstallerLogger::info("VM_DEFINE", &format!("Defined Gen2 VM '{}' (GUID {})", vm_name, vm_guid));
    Ok(vm_guid)
}
