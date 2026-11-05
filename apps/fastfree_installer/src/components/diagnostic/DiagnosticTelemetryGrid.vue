<template>
  <div class="telemetry-grid">
    <div class="telem-card">
      <h5>{{ isRtl ? 'المحاكاة الافتراضية Hyper-V' : 'Hyper-V Subsystem' }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>VMMS Service:</span>
          <strong class="text-emerald">Running (Auto)</strong>
        </div>
        <div class="t-row">
          <span>Group Membership:</span>
          <strong class="text-truncate">Hyper-V Administrators</strong>
        </div>
        <div class="t-row">
          <span>Target Node:</span>
          <strong class="text-sky">{{ selectedClientId || 'client1' }}</strong>
        </div>
      </div>
    </div>

    <div class="telem-card">
      <h5>{{ isRtl ? 'بيئة التخزين والأقراص' : 'Storage & Volumes' }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>Target Drive:</span>
          <strong>{{ targetDiskDrive || 'G:\\' }}</strong>
        </div>
        <div class="t-row">
          <span>VM Directory:</span>
          <strong class="text-truncate">{{ targetDiskDrive || 'G:' }}\FastFree\VMs</strong>
        </div>
        <div class="t-row">
          <span>Boot Disk Format:</span>
          <strong>Dynamic VHDX (Gen 2)</strong>
        </div>
      </div>
    </div>

    <div class="telem-card">
      <h5>{{ isRtl ? 'شبكة FastFree VPN' : 'Overlay Network' }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>Virtual Switch:</span>
          <strong class="text-sky">Default Switch / NAT</strong>
        </div>
        <div class="t-row">
          <span>UDP Listen Port:</span>
          <strong>51820</strong>
        </div>
        <div class="t-row">
          <span>Firewall Scope:</span>
          <strong>UDP 51820-51835 Inbound</strong>
        </div>
      </div>
    </div>

    <div class="telem-card">
      <h5>{{ isRtl ? 'الترخيص والأمان' : 'Security & License' }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>Hardware Protection:</span>
          <strong class="text-emerald">Windows DPAPI</strong>
        </div>
        <div class="t-row">
          <span>Secure Boot:</span>
          <strong>Disabled (NixOS GRUB)</strong>
        </div>
        <div class="t-row">
          <span>NTFS DACL:</span>
          <strong>Hardened (SYSTEM/Admins)</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDiagnosticAudit } from '../../composables/useDiagnosticAudit';
import { selectedClientId, targetDiskDrive } from '../../composables/useDiscovery';

const { isRtl } = useDiagnosticAudit();
</script>
