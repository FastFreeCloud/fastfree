<template>
  <div class="telemetry-grid">
    <div class="telem-card">
      <h5>{{ t('auto.hyper_v_subsystem') }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ t('telemetry.vmms_service') }}</span>
          <strong class="text-emerald">Running (Auto)</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.group_membership') }}</span>
          <strong class="text-truncate">Hyper-V Administrators</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.target_node') }}</span>
          <strong class="text-sky">{{ selectedClientId || 'client1' }}</strong>
        </div>
      </div>
    </div>

    <div class="telem-card">
      <h5>{{ t('auto.storage_volumes') }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ t('telemetry.target_drive') }}</span>
          <strong>{{ targetDiskDrive || 'G:\\' }}</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.vm_directory') }}</span>
          <strong class="text-truncate">{{ targetDiskDrive || 'G:' }}\FastFree\VMs</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.boot_disk_format') }}</span>
          <strong>Dynamic VHDX (Gen 2)</strong>
        </div>
      </div>
    </div>

    <div class="telem-card">
      <h5>{{ t('auto.overlay_network') }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ t('telemetry.virtual_switch') }}</span>
          <strong class="text-sky">Default Switch / NAT</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.udp_listen_port') }}</span>
          <strong>51820</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.firewall_scope') }}</span>
          <strong>UDP 51820-51835 Inbound</strong>
        </div>
      </div>
    </div>

    <div class="telem-card">
      <h5>{{ t('auto.security_license') }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ t('telemetry.hardware_protection') }}</span>
          <strong class="text-emerald">Windows DPAPI</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.secure_boot') }}</span>
          <strong>Disabled (NixOS GRUB)</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.ntfs_dacl') }}</span>
          <strong>Hardened (SYSTEM/Admins)</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import { useDiagnosticAudit } from '../../composables/useDiagnosticAudit';
import { selectedClientId, targetDiskDrive } from '../../composables/useDiscovery';

const { isRtl } = useDiagnosticAudit();
const { t } = useI18n();
</script>
