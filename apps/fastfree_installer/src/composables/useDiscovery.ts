import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { logInfo, logWarn, logError, logSuccess } from './useDiagnostics';

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

export interface VmRealState {
  exists: boolean;
  state: string;
  uptime_seconds: number;
  memory_mb: number;
  cpu_cores: number;
  ip_addresses: string[];
}

export interface ProvisioningStepLog {
  step: number;
  phase: string;
  message: string;
  success: boolean;
}

export const liveVmState = ref<VmRealState | null>(null);

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
  logInfo('Discovery', 'Initiating system telemetry and hardware discovery...');
  try {
    const result = await invoke<SystemDiscoveryReport>('get_system_discovery_report');
    discoveryReport.value = result;
    if (result.recommendation) {
      assignedCpuCores.value = result.recommendation.recommended_cores;
      const rawRam = result.recommendation.recommended_ram_mb;
      assignedRamMb.value = Math.round(rawRam / 1024) * 1024 || 8192;
      targetDiskDrive.value = result.recommendation.target_disk_drive;
    }
    logSuccess(
      'Discovery',
      `Hardware detected: ${result.cpu_count} vCPUs, ${(result.total_memory_mb / 1024).toFixed(1)} GB RAM, Hyper-V: ${
        result.hyperv.ready_for_hyperv ? 'Ready' : 'Notice'
      }`,
      `Host: ${result.host_name}, Recommended: ${result.recommendation.recommended_cores} Cores / ${(
        result.recommendation.recommended_ram_mb / 1024
      ).toFixed(0)} GB RAM on ${result.recommendation.target_disk_drive}`
    );
    return result;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('Discovery', 'Hardware discovery failed', msg);
    throw err;
  }
}

export async function dismissSplash(): Promise<void> {
  try {
    await invoke('close_splashscreen');
    logInfo('Window', 'Splashscreen closed, main installer view presented.');
  } catch (err) {
    console.warn('Splashscreen dismiss warning:', err);
  }
}

export async function fetchMachineHwid(): Promise<string> {
  try {
    return await invoke<string>('get_machine_hwid');
  } catch (err) {
    console.warn('Failed to fetch HWID:', err);
    return 'UNKNOWN-HWID';
  }
}

export async function verifyLicense(key: string, onlineCheck: boolean = true): Promise<LicenseVerificationResult> {
  logInfo('Licensing', `Validating license key: ${key.substring(0, 10)}... (Online: ${onlineCheck})`);
  try {
    const result = await invoke<LicenseVerificationResult>('verify_license_key', {
      key,
      onlineCheck,
    });
    licenseState.value = result;
    if (result.eligible_clients.length > 0 && !result.eligible_clients.includes(selectedClientId.value)) {
      selectedClientId.value = result.eligible_clients[0];
    }
    if (result.is_valid) {
      logSuccess(
        'Licensing',
        `License valid: ${result.tier_name} (${result.company_name})`,
        `Max nodes: ${result.max_nodes}, Max users: ${result.max_users}, Eligible: [${result.eligible_clients.join(', ')}]`
      );
    } else {
      logWarn('Licensing', `License verification notice: ${result.message}`);
    }
    return result;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('Licensing', 'License verification error', msg);
    throw err;
  }
}

export async function fetchWireGuardConfig(clientId: string): Promise<WireGuardPeerConfig> {
  logInfo('WireGuard', `Querying WireGuard configuration for ${clientId}...`);
  try {
    const result = await invoke<WireGuardPeerConfig>('get_wireguard_status', {
      clientId,
    });
    wireGuardConfig.value = result;
    logSuccess(
      'WireGuard',
      `WireGuard topology ready: UDP Port ${result.listen_port}, Overlay ${result.client_tunnel_ip}`,
      `Interface: ${result.interface_name}, Controller: ${result.controller_endpoint}:${result.controller_port}`
    );
    return result;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('WireGuard', `Failed to load WireGuard configuration for ${clientId}`, msg);
    throw err;
  }
}

export async function executeVmCommand(action: 'start' | 'stop' | 'restart', clientId: string): Promise<VmActionStatus> {
  logInfo('Hyper-V', `Executing VM power command: ${action} on ${clientId}...`);
  try {
    const res = await invoke<VmActionStatus>('manage_vm', {
      action,
      clientId,
    });
    logSuccess('Hyper-V', `VM ${clientId} state changed: ${res.state}`);
    return res;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('Hyper-V', `Failed executing ${action} on ${clientId}`, msg);
    throw err;
  }
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

export async function checkVmExists(clientId: string): Promise<boolean> {
  try {
    return await invoke<boolean>('check_vm_exists', { clientId });
  } catch (err) {
    console.warn('check_vm_exists failed:', err);
    return false;
  }
}

export async function getVmRealState(clientId: string): Promise<VmRealState> {
  try {
    return await invoke<VmRealState>('get_vm_real_state', { clientId });
  } catch (err: any) {
    const msg = String(err?.message || err);
    logWarn('Hyper-V', `Live VM telemetry query notice: ${msg}`);
    return {
      exists: false,
      state: 'NotFound',
      uptime_seconds: 0,
      memory_mb: 0,
      cpu_cores: 0,
      ip_addresses: [],
    };
  }
}

export async function provisionNode(
  clientId: string,
  cores: number,
  ramMb: number,
  targetDrive: string
): Promise<Array<{ step: number; phase: string; message: string; success: boolean }>> {
  const safeAlignedRam = Math.max(1024, Math.floor((ramMb + 64) / 128) * 128);
  logInfo('Hyper-V', `Provisioning VM FastFree-${clientId} (Cores: ${cores}, Aligned RAM: ${safeAlignedRam}MB, Drive: ${targetDrive})...`);
  try {
    const logs = await invoke<Array<{ step: number; phase: string; message: string; success: boolean }>>(
      'provision_node',
      {
        clientId,
        cores,
        ramMb: safeAlignedRam,
        targetDrive,
      }
    );
    logSuccess('Hyper-V', `Appliance FastFree-${clientId} provisioned successfully in Hyper-V.`);
    return logs;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('Hyper-V', `Provisioning failed for ${clientId}`, msg);
    throw err;
  }
}

export interface WireGuardApplyResult {
  success: boolean;
  conf_path: string;
  message: string;
}

export async function applyWireGuardConfig(clientId: string): Promise<WireGuardApplyResult> {
  logInfo('WireGuard', `Applying WireGuard config for '${clientId}'...`);
  try {
    const result = await invoke<WireGuardApplyResult>('apply_wireguard_config', { clientId });
    if (result.success) {
      logSuccess('WireGuard', `Config written to: ${result.conf_path}`, result.message);
    } else {
      logError('WireGuard', `Failed to write config for '${clientId}'`, result.message);
    }
    return result;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('WireGuard', `apply_wireguard_config invocation error for '${clientId}'`, msg);
    throw err;
  }
}
