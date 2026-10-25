use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskTelemetry {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_space_gb: f64,
    pub available_space_gb: f64,
    pub is_system_drive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HyperVStatus {
    pub hardware_virt_enabled: bool,
    pub hypervisor_present: bool,
    pub vmms_running: bool,
    pub ready_for_hyperv: bool,
    pub status_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VmAllocationRecommendation {
    pub recommended_ram_mb: u64,
    pub min_ram_mb: u64,
    pub max_ram_mb: u64,
    pub recommended_cores: usize,
    pub min_cores: usize,
    pub target_disk_drive: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDiscoveryReport {
    pub host_name: String,
    pub user_name: String,
    pub total_memory_mb: u64,
    pub available_memory_mb: u64,
    pub cpu_count: usize,
    pub cpu_brand: String,
    pub disks: Vec<DiskTelemetry>,
    pub hyperv: HyperVStatus,
    pub recommendation: VmAllocationRecommendation,
}
