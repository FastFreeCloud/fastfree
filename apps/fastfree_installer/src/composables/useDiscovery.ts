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
  node_id?: string;
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
  heartbeat: string;
  secure_boot_enabled: boolean;
  nested_virt_enabled: boolean;
  switch_name: string;
  checkpoint_type: string;
  vhdx_path: string;
  vhdx_size_bytes: number;
  is_empty_disk: boolean;
  guest_status: string;
  guest_status_message: string;
  service_account: string;
  is_account_cloaked: boolean;
  is_storage_hardened: boolean;
  hardened_account_configured: boolean;
  service_account_name: string;
}

export interface ServiceAccountResult {
  success: boolean;
  account_name: string;
  sid: string;
  cloaked: boolean;
  hyperv_admin: boolean;
  dpapi_path: string;
  vm_dir: string;
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

// Persistent User Preferences Cache (LocalStorage Key)
const STORAGE_PREF_PREFIX = 'fastfree_wizard_';

export function saveUserPreferences() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREF_PREFIX}target_drive`, targetDiskDrive.value);
      localStorage.setItem(`${STORAGE_PREF_PREFIX}cores`, String(assignedCpuCores.value));
      localStorage.setItem(`${STORAGE_PREF_PREFIX}ram_mb`, String(assignedRamMb.value));
      localStorage.setItem(`${STORAGE_PREF_PREFIX}client_id`, selectedClientId.value);
      if (licenseState.value?.key) {
        localStorage.setItem(`${STORAGE_PREF_PREFIX}license_key`, licenseState.value.key);
      }
      if (licenseState.value) {
        localStorage.setItem(`${STORAGE_PREF_PREFIX}license_data`, JSON.stringify(licenseState.value));
      }
    }
  } catch (e) {
    console.warn('Failed to save user preferences cache:', e);
  }
}

export function loadUserPreferences() {
  try {
    if (typeof localStorage !== 'undefined') {
      const savedDrive = localStorage.getItem(`${STORAGE_PREF_PREFIX}target_drive`);
      const savedCores = localStorage.getItem(`${STORAGE_PREF_PREFIX}cores`);
      const savedRam = localStorage.getItem(`${STORAGE_PREF_PREFIX}ram_mb`);
      const savedClientId = localStorage.getItem(`${STORAGE_PREF_PREFIX}client_id`);
      const savedLicenseData = localStorage.getItem(`${STORAGE_PREF_PREFIX}license_data`);

      if (savedDrive) targetDiskDrive.value = savedDrive;
      if (savedCores && !isNaN(Number(savedCores))) assignedCpuCores.value = Number(savedCores);
      if (savedRam && !isNaN(Number(savedRam))) assignedRamMb.value = Number(savedRam);
      if (savedClientId) selectedClientId.value = savedClientId;
      if (savedLicenseData) {
        try {
          licenseState.value = JSON.parse(savedLicenseData);
        } catch {}
      }
    }
  } catch (e) {
    console.warn('Failed to load user preferences cache:', e);
  }
}

// Configuration state
export const licenseState = ref<LicenseVerificationResult | null>(null);
export const selectedClientId = ref<string>('client2');
export const assignedCpuCores = ref<number>(4);
export const assignedRamMb = ref<number>(4096);
export const targetDiskDrive = ref<string>('C:\\');
export const wireGuardConfig = ref<WireGuardPeerConfig | null>(null);

// Initialize from persistent cache if available
loadUserPreferences();

// Provisioning state
export const provisioningProgress = ref<number>(0);
export const hardenedSecurityEnabled = ref<boolean>(true);
export const provisioningPhase = ref<string>('Ready');
export const provisioningLogs = ref<string[]>([]);
export const isProvisioningDone = ref<boolean>(false);
export const isProvisioningRunning = ref<boolean>(false);

/**
 * Strict Step Prerequisite Validator:
 * Evaluates whether all preceding requirements are fulfilled before a target step can be entered.
 */
export function canEnterStep(targetStep: number): { allowed: boolean; reason?: string } {
  // Step 1: Always accessible unless on Launchpad locked state
  if (targetStep <= 1) {
    if (currentStep.value >= 6) {
      return { allowed: false, reason: 'Wizard is locked while operational in Launchpad mode.' };
    }
    return { allowed: true };
  }

  // Step 2: Requires Host Discovery completion
  if (targetStep === 2) {
    if (loadingDiscovery.value) {
      return { allowed: false, reason: 'Host hardware discovery must finish first.' };
    }
    return { allowed: true };
  }

  // Step 3: FastOS Settings / Sizing - STRICT REQUIREMENT: Verified License
  if (targetStep === 3) {
    if (!licenseState.value || !licenseState.value.is_valid) {
      return { allowed: false, reason: 'A valid verified license key is required.' };
    }
    return { allowed: true };
  }

  // Step 4: FastFree VPN (WireGuard) - Requires Step 3 resource assignment
  if (targetStep === 4) {
    const s3 = canEnterStep(3);
    if (!s3.allowed) return s3;
    if (!assignedCpuCores.value || assignedCpuCores.value < 1 || !assignedRamMb.value || !targetDiskDrive.value) {
      return { allowed: false, reason: 'vCPU, RAM, and target drive must be assigned.' };
    }
    return { allowed: true };
  }

  // Step 5: Provisioning - Requires Step 4 (License + Sizing + VPN Config)
  if (targetStep === 5) {
    const s4 = canEnterStep(4);
    if (!s4.allowed) return s4;
    return { allowed: true };
  }

  // Step 6: Launchpad - Requires VM provisioning complete and verified
  if (targetStep === 6) {
    const isProv = isProvisioningDone.value || (typeof localStorage !== 'undefined' && localStorage.getItem('fastfree_provisioned') === 'true');
    if (!isProv) {
      return { allowed: false, reason: 'Appliance provisioning must complete and be verified in Hyper-V first.' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Invalid target step.' };
}

/**
 * Centralized, guarded navigation helper.
 * Strictly prevents jumping forward past uncompleted steps or skipping prerequisites.
 */
export function navigateToStep(targetStep: number): boolean {
  if (targetStep === currentStep.value) return true;

  // Once on Launchpad (Step 6), wizard navigation is completely locked
  if (currentStep.value >= 6) {
    return false;
  }

  // If currently provisioning in Step 5 and not finished, block leaving
  if (currentStep.value === 5 && !isProvisioningDone.value) {
    return false;
  }

  // Backward navigation: allow going back to any step < currentStep
  if (targetStep < currentStep.value) {
    currentStep.value = targetStep;
    return true;
  }

  // Forward navigation: STRICT INVARIANT - user cannot skip intermediate steps.
  // Must verify all intermediate steps up to targetStep
  for (let s = currentStep.value + 1; s <= targetStep; s++) {
    const check = canEnterStep(s);
    if (!check.allowed) {
      logWarn('Navigation', `Navigation to Step ${targetStep} blocked: ${check.reason}`);
      return false;
    }
  }

  currentStep.value = targetStep;
  return true;
}

// Tauri Invocations
export async function fetchSystemDiscovery(): Promise<SystemDiscoveryReport> {
  logInfo('Discovery', 'Initiating system telemetry and hardware discovery...');
  try {
    const result = await invoke<SystemDiscoveryReport>('get_system_discovery_report');
    discoveryReport.value = result;
    if (result.recommendation) {
      // Prioritize user's saved choice from persistent cache if present
      const savedDrive = typeof localStorage !== 'undefined' ? localStorage.getItem(`${STORAGE_PREF_PREFIX}target_drive`) : null;
      const savedCores = typeof localStorage !== 'undefined' ? localStorage.getItem(`${STORAGE_PREF_PREFIX}cores`) : null;
      const savedRam = typeof localStorage !== 'undefined' ? localStorage.getItem(`${STORAGE_PREF_PREFIX}ram_mb`) : null;

      targetDiskDrive.value = savedDrive || result.recommendation.target_disk_drive;
      assignedCpuCores.value = savedCores ? Number(savedCores) : result.recommendation.recommended_cores;
      const rawRam = result.recommendation.recommended_ram_mb;
      assignedRamMb.value = savedRam ? Number(savedRam) : (Math.round(rawRam / 1024) * 1024 || 8192);
      
      saveUserPreferences();
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
    if (result.node_id) {
      selectedClientId.value = result.node_id;
    } else if (result.eligible_clients.length > 0) {
      selectedClientId.value = result.eligible_clients[0];
    }
    if (result.is_valid) {
      saveUserPreferences();
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

export interface WireguardProbeResult {
  success: boolean;
  reachable: boolean;
  endpoint: string;
  resolved_ip?: string;
  resolvedIp?: string;
  latency_ms?: number;
  latencyMs?: number;
  status: string;
  message: string;
}

export async function probeWireguardEndpoint(endpoint: string, port?: number): Promise<WireguardProbeResult> {
  logInfo('FastFree VPN', `Probing real endpoint connectivity: ${endpoint}...`);
  try {
    const result = await invoke<WireguardProbeResult>('probe_wireguard_endpoint', {
      endpoint,
      port,
    });
    const latency = result.latency_ms ?? result.latencyMs ?? 0;
    const resolved = result.resolved_ip ?? result.resolvedIp ?? endpoint;
    result.latencyMs = latency;
    result.latency_ms = latency;
    result.resolvedIp = resolved;
    result.resolved_ip = resolved;

    if (result.reachable) {
      logSuccess('FastFree VPN', `Real ping verified: ${resolved} (${latency} ms)`);
    } else {
      logWarn('FastFree VPN', `Endpoint probe: ${result.status}`, result.message);
    }
    return result;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('FastFree VPN', `Endpoint probe failed for ${endpoint}`, msg);
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
      heartbeat: 'No Contact',
      secure_boot_enabled: false,
      nested_virt_enabled: false,
      switch_name: 'None',
      checkpoint_type: 'None',
      vhdx_path: '',
      vhdx_size_bytes: 0,
      is_empty_disk: false,
      guest_status: 'NotFound',
      guest_status_message: 'Virtual machine is not registered in Hyper-V.',
      service_account: `fastfree_${clientId}`,
      is_account_cloaked: false,
      is_storage_hardened: false,
      hardened_account_configured: false,
      service_account_name: `fastfree_${clientId}`,
    };
  }
}

export async function reconfigureHyperVVm(
  clientId: string,
  targetDrive: string,
  cores?: number,
  ramMb?: number
): Promise<VmRealState> {
  logInfo('Hyper-V', `Reconfiguring Hyper-V settings for FastFree-${clientId} to optimal preset...`);
  try {
    const res = await invoke<VmRealState>('reconfigure_hyperv_vm', {
      clientId,
      targetDrive,
      cores: cores || 4,
      ramMb: ramMb || 8192,
    });
    logSuccess('Hyper-V', `FastFree-${clientId} Hyper-V settings updated to optimal FastFree NixOS preset.`);
    return res;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('Hyper-V', `Failed to reconfigure Hyper-V settings for ${clientId}`, msg);
    throw err;
  }
}

export async function provisionNode(
  clientId: string,
  cores: number,
  ramMb: number,
  targetDrive: string,
  hardenedSecurity: boolean = true
): Promise<Array<{ step: number; phase: string; message: string; success: boolean }>> {
  const safeAlignedRam = Math.max(1024, Math.floor((ramMb + 64) / 128) * 128);
  logInfo('Hyper-V', `Provisioning VM FastFree-${clientId} (Cores: ${cores}, Aligned RAM: ${safeAlignedRam}MB, Hardened: ${hardenedSecurity})...`);
  try {
    const logs = await invoke<Array<{ step: number; phase: string; message: string; success: boolean }>>(
      'provision_node',
      {
        clientId,
        cores,
        ramMb: safeAlignedRam,
        targetDrive,
        hardenedSecurity,
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

export async function ensureServiceAccount(
  clientId: string,
  targetDrive: string
): Promise<ServiceAccountResult> {
  logInfo('Security', `Configuring sovereign isolated account for ${clientId}...`);
  try {
    const res = await invoke<ServiceAccountResult>('ensure_service_account', {
      clientId,
      targetDrive,
    });
    logSuccess('Security', `Service account ${res.account_name} configured and cloaked.`);
    return res;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('Security', `Failed to configure service account for ${clientId}`, msg);
    throw err;
  }
}

export interface WireGuardApplyResult {
  success: boolean;
  conf_path: string;
  message: string;
}

export interface WireGuardApplyOptions {
  customPort?: number;
  customIp?: string;
  customEndpoint?: string;
  customConf?: string;
}

export async function applyWireGuardConfig(
  clientId: string,
  options?: WireGuardApplyOptions
): Promise<WireGuardApplyResult> {
  logInfo('WireGuard', `Applying WireGuard config for '${clientId}'...`);
  try {
    const result = await invoke<WireGuardApplyResult>('apply_wireguard_config', {
      clientId,
      customPort: options?.customPort ?? null,
      customIp: options?.customIp ?? null,
      customEndpoint: options?.customEndpoint ?? null,
      customConf: options?.customConf ?? null,
    });
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

export interface FirewallRuleStatus {
  rule_exists: boolean;
  enabled: boolean;
  name: string;
  local_ports: string;
  protocol: string;
  action: string;
  is_admin: boolean;
  message: string;
}

export const firewallStatus = ref<FirewallRuleStatus | null>(null);
export const loadingFirewall = ref<boolean>(false);

export async function fetchFirewallStatus(): Promise<FirewallRuleStatus> {
  loadingFirewall.value = true;
  try {
    const status = await invoke<FirewallRuleStatus>('check_wireguard_firewall_rule');
    firewallStatus.value = status;
    return status;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logWarn('Firewall', `Could not query Windows Firewall status: ${msg}`);
    throw err;
  } finally {
    loadingFirewall.value = false;
  }
}

export async function enableFirewallRule(): Promise<FirewallRuleStatus> {
  loadingFirewall.value = true;
  logInfo('Firewall', 'Authorizing Windows Firewall inbound rule for WireGuard (UDP 51820-51835)...');
  try {
    const status = await invoke<FirewallRuleStatus>('enable_wireguard_firewall_rule');
    firewallStatus.value = status;
    if (status.rule_exists && status.enabled) {
      logSuccess('Firewall', 'Windows Firewall rule verified and active', `Ports: ${status.local_ports} (${status.protocol})`);
    } else {
      logWarn('Firewall', 'Firewall configuration notice', status.message);
    }
    return status;
  } catch (err: any) {
    const msg = String(err?.message || err);
    logError('Firewall', 'Failed to configure Windows Firewall rule', msg);
    throw err;
  } finally {
    loadingFirewall.value = false;
  }
}
