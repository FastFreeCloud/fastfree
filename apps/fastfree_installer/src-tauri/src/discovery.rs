use crate::dto::*;
use std::env;
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};

#[cfg(windows)]
use windows::Win32::System::Threading::{IsProcessorFeaturePresent, PROCESSOR_FEATURE_ID};

#[cfg(windows)]
const PF_VIRT_FIRMWARE_ENABLED: PROCESSOR_FEATURE_ID = PROCESSOR_FEATURE_ID(21);

pub struct HostDiscoveryPipeline;

impl HostDiscoveryPipeline {
    pub fn collect_report() -> Result<SystemDiscoveryReport, String> {
        let mut sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        sys.refresh_memory();
        sys.refresh_cpu_all();

        let host_name = System::host_name()
            .or_else(|| env::var("COMPUTERNAME").ok())
            .unwrap_or_else(|| "WINDOWS-HOST".to_string());

        let user_name = env::var("USERNAME")
            .or_else(|_| env::var("USER"))
            .unwrap_or_else(|| "User".to_string());

        let total_memory_mb = sys.total_memory() / (1024 * 1024);
        let available_memory_mb = sys.available_memory() / (1024 * 1024);

        let cpu_count = sys.cpus().len().max(1);
        let cpu_brand = sys
            .cpus()
            .first()
            .map(|c| c.brand().trim().to_string())
            .filter(|b| !b.is_empty())
            .unwrap_or_else(|| "x86_64 Processor".to_string());

        let disks_engine = Disks::new_with_refreshed_list();
        let system_drive = env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());

        let mut disks: Vec<DiskTelemetry> = disks_engine
            .list()
            .iter()
            .map(|d| {
                let mount = d.mount_point().to_string_lossy().to_string();
                let is_system = mount.starts_with(&system_drive);
                DiskTelemetry {
                    name: d.name().to_string_lossy().to_string(),
                    mount_point: mount,
                    file_system: d.file_system().to_string_lossy().to_string(),
                    total_space_gb: (d.total_space() as f64) / (1024.0 * 1024.0 * 1024.0),
                    available_space_gb: (d.available_space() as f64) / (1024.0 * 1024.0 * 1024.0),
                    is_system_drive: is_system,
                }
            })
            .collect();

        disks.sort_by(|a, b| b.available_space_gb.partial_cmp(&a.available_space_gb).unwrap());

        let hyperv = Self::probe_hyperv_status();
        let recommendation = Self::calculate_recommendations(total_memory_mb, cpu_count, &disks);

        Ok(SystemDiscoveryReport {
            host_name,
            user_name,
            total_memory_mb,
            available_memory_mb,
            cpu_count,
            cpu_brand,
            disks,
            hyperv,
            recommendation,
        })
    }

    pub fn probe_hyperv_status() -> HyperVStatus {
        let hardware_virt_enabled = {
            #[cfg(windows)]
            unsafe {
                IsProcessorFeaturePresent(PF_VIRT_FIRMWARE_ENABLED)
            }
            #[cfg(not(windows))]
            false
        };

        let hypervisor_present = Self::check_hypervisor_cpuid();
        let vmms_running = Self::check_vmms_service();

        let ready_for_hyperv = (hardware_virt_enabled || hypervisor_present) && vmms_running;

        let status_reason = if ready_for_hyperv {
            "Hyper-V is operational and ready for deployment.".to_string()
        } else if !hardware_virt_enabled && !hypervisor_present {
            "Virtualization is disabled in BIOS/UEFI firmware.".to_string()
        } else if !vmms_running {
            "Hyper-V Virtual Machine Management Service is not running.".to_string()
        } else {
            "Hyper-V status requires verification.".to_string()
        };

        HyperVStatus {
            hardware_virt_enabled,
            hypervisor_present,
            vmms_running,
            ready_for_hyperv,
            status_reason,
        }
    }

    #[inline]
    fn check_hypervisor_cpuid() -> bool {
        #[cfg(target_arch = "x86_64")]
        {
            use std::arch::x86_64::__cpuid;
            unsafe {
                let res = __cpuid(1);
                (res.ecx & (1 << 31)) != 0
            }
        }
        #[cfg(not(target_arch = "x86_64"))]
        {
            false
        }
    }

    fn check_vmms_service() -> bool {
        #[cfg(windows)]
        {
            use windows::core::w;
            use windows::Win32::System::Services::*;

            unsafe {
                let scm = OpenSCManagerW(None, None, SC_MANAGER_CONNECT);
                if let Ok(scm_handle) = scm {
                    let svc = OpenServiceW(scm_handle, w!("vmms"), SERVICE_QUERY_STATUS);
                    if let Ok(svc_handle) = svc {
                        let mut status = SERVICE_STATUS_PROCESS::default();
                        let mut bytes_needed = 0;
                        let query = QueryServiceStatusEx(
                            svc_handle,
                            SC_STATUS_PROCESS_INFO,
                            Some(&mut status as *mut _ as *mut u8),
                            std::mem::size_of::<SERVICE_STATUS_PROCESS>() as u32,
                            &mut bytes_needed,
                        );
                        let is_running = query.is_ok() && status.dwCurrentState == SERVICE_RUNNING;
                        let _ = CloseServiceHandle(svc_handle);
                        let _ = CloseServiceHandle(scm_handle);
                        return is_running;
                    }
                    let _ = CloseServiceHandle(scm_handle);
                }
            }
            false
        }
        #[cfg(not(windows))]
        {
            false
        }
    }

    fn calculate_recommendations(
        host_ram_mb: u64,
        host_cores: usize,
        disks: &[DiskTelemetry],
    ) -> VmAllocationRecommendation {
        let min_ram_mb: u64 = 4096;
        let host_headroom_mb: u64 = 4096;

        let target_half = host_ram_mb / 2;
        let max_allocatable = host_ram_mb.saturating_sub(host_headroom_mb);

        let recommended_ram_mb = target_half
            .max(min_ram_mb)
            .min(max_allocatable)
            .max(2048);

        let min_cores: usize = 2;
        let recommended_cores = (host_cores / 2).max(min_cores).min(host_cores.saturating_sub(1).max(1));

        let primary_disk = disks
            .iter()
            .find(|d| d.available_space_gb >= 30.0)
            .or_else(|| disks.first());

        let target_disk_drive = primary_disk
            .map(|d| d.mount_point.clone())
            .unwrap_or_else(|| "C:\\".to_string());

        VmAllocationRecommendation {
            recommended_ram_mb,
            min_ram_mb,
            max_ram_mb: max_allocatable,
            recommended_cores,
            min_cores,
            target_disk_drive,
        }
    }
}
