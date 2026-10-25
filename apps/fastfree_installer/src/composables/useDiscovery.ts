import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface DiskTelemetry {
  name: string;
  mount_point: string;
  file_system: string;
  total_space_gb: number;
  available_space_gb: number;
  is_system_drive: boolean;
}

export interface HyperVStatus {
  hardware_virt_enabled: boolean;
  hypervisor_present: boolean;
  vmms_running: boolean;
  ready_for_hyperv: boolean;
  status_reason: string;
}

export interface VmAllocationRecommendation {
  recommended_ram_mb: number;
  min_ram_mb: number;
  max_ram_mb: number;
  recommended_cores: number;
  min_cores: number;
  target_disk_drive: string;
}

export interface SystemDiscoveryReport {
  host_name: string;
  user_name: string;
  total_memory_mb: number;
  available_memory_mb: number;
  cpu_count: number;
  cpu_brand: string;
  disks: DiskTelemetry[];
  hyperv: HyperVStatus;
  recommendation: VmAllocationRecommendation;
}

export interface LicenseVerificationResult {
  is_valid: boolean;
  key: string;
  tier: 'enterprise' | 'standard' | 'trial' | string;
  tier_name: string;
  company_name: string;
  expires_at: string | null;
  max_users: number;
  max_nodes: number;
  eligible_clients: string[];
  unlocked_features: string[];
  message: string;
}

export interface WireGuardPeerConfig {
  client_id: string;
  controller_endpoint: string;
  listen_port: number;
  controller_port: number;
  interface_name: string;
  client_tunnel_ip: string;
  controller_tunnel_ip: string;
  mesh_subnet: string;
  keepalive_seconds: number;
  public_key: string;
  controller_public_key: string;
  cipher: string;
  mtu: number;
  status: string;
  latency_ms: number;
}

export interface VmActionStatus {
  success: boolean;
  client_id: string;
  state: string;
  message: string;
}

// Global reactive wizard state
export const currentStep = ref<number>(1);
export const loadingDiscovery = ref<boolean>(true);
export const discoveryReport = ref<SystemDiscoveryReport | null>(null);

// Configuration state
export const licenseState = ref<LicenseVerificationResult | null>(null);
export const selectedClientId = ref<string>('client2');
export const assignedCpuCores = ref<number>(4);
export const assignedRamMb = ref<number>(4096);
export const targetDiskDrive = ref<string>('C:\\');
export const wireGuardConfig = ref<WireGuardPeerConfig | null>(null);

// Provisioning state
export const provisioningProgress = ref<number>(0);
export const provisioningPhase = ref<string>('Ready');
export const provisioningLogs = ref<string[]>([]);
export const isProvisioningDone = ref<boolean>(false);

// Tauri Invocations
export async function fetchSystemDiscovery(): Promise<SystemDiscoveryReport> {
  const result = await invoke<SystemDiscoveryReport>('get_system_discovery_report');
  discoveryReport.value = result;
  if (result.recommendation) {
    assignedCpuCores.value = result.recommendation.recommended_cores;
    assignedRamMb.value = result.recommendation.recommended_ram_mb;
    targetDiskDrive.value = result.recommendation.target_disk_drive;
  }
  return result;
}

export async function dismissSplash(): Promise<void> {
  try {
    await invoke('close_splashscreen');
  } catch (err) {
    console.warn('Splashscreen dismiss warning:', err);
  }
}

export async function verifyLicense(key: string, onlineCheck: boolean = true): Promise<LicenseVerificationResult> {
  const result = await invoke<LicenseVerificationResult>('verify_license_key', {
    key,
    onlineCheck,
  });
  licenseState.value = result;
  if (result.eligible_clients.length > 0 && !result.eligible_clients.includes(selectedClientId.value)) {
    selectedClientId.value = result.eligible_clients[0];
  }
  return result;
}

export async function fetchWireGuardConfig(clientId: string): Promise<WireGuardPeerConfig> {
  const result = await invoke<WireGuardPeerConfig>('get_wireguard_status', {
    clientId,
  });
  wireGuardConfig.value = result;
  return result;
}

export async function executeVmCommand(action: 'start' | 'stop' | 'restart', clientId: string): Promise<VmActionStatus> {
  return await invoke<VmActionStatus>('manage_vm', {
    action,
    clientId,
  });
}

export async function minimizeToTray(): Promise<void> {
  try {
    await invoke('minimize_to_tray');
  } catch (err) {
    console.error('Minimize to tray failed:', err);
  }
}

export async function showMainWindow(): Promise<void> {
  try {
    await invoke('show_main_window');
  } catch (err) {
    console.error('Show main window failed:', err);
  }
}
