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

export async function fetchSystemDiscovery(): Promise<SystemDiscoveryReport> {
  return await invoke<SystemDiscoveryReport>('get_system_discovery_report');
}

export async function dismissSplash(): Promise<void> {
  return await invoke('close_splashscreen');
}
