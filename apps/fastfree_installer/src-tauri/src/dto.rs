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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseVerificationResult {
    pub is_valid: bool,
    pub key: String,
    pub node_id: String,
    pub tier: String,
    pub tier_name: String,
    pub company_name: String,
    pub expires_at: Option<String>,
    pub max_users: u32,
    pub max_nodes: u32,
    pub eligible_clients: Vec<String>,
    pub unlocked_features: Vec<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WireGuardPeerConfig {
    pub client_id: String,
    pub controller_endpoint: String,
    pub listen_port: u16,
    pub controller_port: u16,
    pub interface_name: String,
    pub client_tunnel_ip: String,
    pub controller_tunnel_ip: String,
    pub mesh_subnet: String,
    pub keepalive_seconds: u32,
    pub public_key: String,
    pub controller_public_key: String,
    pub cipher: String,
    pub mtu: u32,
    pub status: String,
    pub latency_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VmActionStatus {
    pub success: bool,
    pub client_id: String,
    pub state: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceAccountResult {
    pub success: bool,
    pub account_name: String,
    pub sid: String,
    pub cloaked: bool,
    pub hyperv_admin: bool,
    pub dpapi_path: String,
    pub vm_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VmRealState {
    pub exists: bool,
    pub state: String,
    pub uptime_seconds: u64,
    pub memory_mb: u64,
    pub cpu_cores: u32,
    pub ip_addresses: Vec<String>,
    pub heartbeat: String,
    pub secure_boot_enabled: bool,
    pub nested_virt_enabled: bool,
    pub switch_name: String,
    pub checkpoint_type: String,
    pub vhdx_path: String,
    pub vhdx_size_bytes: u64,
    pub is_empty_disk: bool,
    pub guest_status: String,
    pub guest_status_message: String,
    pub service_account: String,
    pub is_account_cloaked: bool,
    pub is_storage_hardened: bool,
    #[serde(default)]
    pub hardened_account_configured: bool,
    #[serde(default)]
    pub service_account_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub version: String,
    pub date: Option<String>,
    pub body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProgressPayload {
    pub chunk_length: usize,
    pub downloaded_bytes: u64,
    pub total_bytes: Option<u64>,
    pub progress_pct: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WireGuardApplyResult {
    pub success: bool,
    pub conf_path: String,
    pub message: String,
}
