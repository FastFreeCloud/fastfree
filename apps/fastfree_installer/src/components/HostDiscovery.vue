<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('discovery.stepTag') }}</div>
      <h2>{{ t('discovery.title') }}</h2>
      <p class="subtitle">{{ t('discovery.subtitle') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loadingDiscovery" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-msg">{{ t('discovery.loadingMsg') }}</p>
    </div>

    <!-- Discovery Data Grid -->
    <div v-else-if="discoveryReport" class="content-body">
      <div class="cards-grid">
        <!-- Identity Card -->
        <div class="diag-card card-identity">
          <div class="card-header">
            <span class="icon">
              <svg class="card-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </span>
            <span class="label">{{ t('discovery.hostIdentity') }}</span>
          </div>
          <div class="metric-value text-accent font-mono" dir="ltr">{{ discoveryReport.host_name }}</div>
          <div class="card-meta-line">
            <span class="meta-label">{{ isRtl ? 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…:' : 'User:' }}</span>
            <span class="meta-user font-mono" dir="ltr">{{ discoveryReport.user_name }}</span>
            <span class="meta-badge-admin">{{ isRtl ? 'Ù…Ø³Ø¤ÙˆÙ„' : 'Admin' }}</span>
          </div>
        </div>

        <!-- CPU Card -->
        <div class="diag-card card-cpu">
          <div class="card-header">
            <span class="icon">
              <svg class="card-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
                <line x1="20" y1="9" x2="23" y2="9"></line>
                <line x1="20" y1="15" x2="23" y2="15"></line>
                <line x1="1" y1="9" x2="4" y2="9"></line>
                <line x1="1" y1="15" x2="4" y2="15"></line>
              </svg>
            </span>
            <span class="label">{{ t('discovery.processorTopology') }}</span>
          </div>
          <div class="metric-value font-mono">{{ t('discovery.logicalCores', { count: discoveryReport.cpu_count }) }}</div>
          <div class="card-meta-line truncate" :title="discoveryReport.cpu_brand">
            <span class="meta-cpu-brand" dir="ltr">{{ discoveryReport.cpu_brand }}</span>
          </div>
        </div>

        <!-- RAM Card -->
        <div class="diag-card card-ram">
          <div class="card-header">
            <span class="icon">
              <svg class="card-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="6" y1="19" x2="6" y2="21"></line>
                <line x1="10" y1="19" x2="10" y2="21"></line>
                <line x1="14" y1="19" x2="14" y2="21"></line>
                <line x1="18" y1="19" x2="18" y2="21"></line>
                <circle cx="7" cy="12" r="1.5"></circle>
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="17" cy="12" r="1.5"></circle>
              </svg>
            </span>
            <span class="label">{{ t('discovery.physicalMemory') }}</span>
          </div>
          <div class="metric-value font-mono">{{ (discoveryReport.total_memory_mb / 1024).toFixed(1) }} <span class="metric-unit font-mono">{{ t('common.gb') }}</span></div>
          <div class="card-meta-line">
            <span class="meta-label">{{ isRtl ? 'Ø§Ù„Ù…ØªØ§Ø­:' : 'Free:' }}</span>
            <strong class="text-emerald font-mono">{{ (discoveryReport.available_memory_mb / 1024).toFixed(1) }} {{ t('common.gb') }}</strong>
          </div>
        </div>

        <!-- Hyper-V Engine Card -->
        <div
          class="diag-card card-hyperv"
          :class="{
            'border-ok': discoveryReport.hyperv.ready_for_hyperv,
            'border-warn': !discoveryReport.hyperv.ready_for_hyperv,
          }"
        >
          <div class="card-header">
            <span class="icon">
              <svg class="card-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </span>
            <span class="label">{{ t('discovery.hypervEngine') }}</span>
          </div>
          <div
            class="metric-value metric-hyperv-row"
            :class="discoveryReport.hyperv.ready_for_hyperv ? 'text-emerald' : 'text-amber'"
          >
            <span class="status-dot-mini" :class="discoveryReport.hyperv.ready_for_hyperv ? 'dot-emerald' : 'dot-amber'"></span>
            <span>{{ discoveryReport.hyperv.ready_for_hyperv ? (isRtl ? 'Ø¬Ø§Ù‡Ø² ÙˆÙŠØ¹Ù…Ù„' : 'Operational') : (isRtl ? 'ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„ØªÙƒÙˆÙŠÙ†' : 'Config Required') }}</span>
          </div>
          <div class="card-meta-line truncate" :title="discoveryReport.hyperv.status_reason">
            <span class="meta-desc">{{ discoveryReport.hyperv.status_reason }}</span>
          </div>
        </div>
      </div>

      <!-- Hyper-V Enable / Install Action Banner (If not ready) -->
      <div v-if="!discoveryReport.hyperv.ready_for_hyperv" class="hyperv-enable-banner">
        <div class="banner-left">
          <span class="banner-icon">
            <svg class="banner-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </span>
          <div class="banner-desc">
            <strong>{{ isRtl ? 'Ù…Ø­Ø±Ùƒ Hyper-V ØºÙŠØ± Ù…ÙØ¹Ù‘Ù„ Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ù†Ø¸Ø§Ù… Ø­Ø§Ù„ÙŠØ§Ù‹' : 'Hyper-V is not active on this Windows machine' }}</strong>
            <p>{{ isRtl ? 'Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ø¹Ù‚Ø¯Ø©ØŒ ÙŠØ¬Ø¨ ØªÙØ¹ÙŠÙ„ Ù…ÙŠØ²Ø© Hyper-V ÙÙŠ ÙˆÙŠÙ†Ø¯ÙˆØ². ÙŠÙ…ÙƒÙ†Ùƒ ØªØ«Ø¨ÙŠØªÙ‡Ø§ ÙˆØªÙØ¹ÙŠÙ„Ù‡Ø§ Ø§Ù„Ø¢Ù† Ø¨Ù†Ù‚Ø±Ø© ÙˆØ§Ø­Ø¯Ø©.' : 'FastFree node requires Hyper-V feature. Click below to install and enable it automatically.' }}</p>
          </div>
        </div>
        <button class="btn btn-hyperv-act" :disabled="isEnablingHyperV" @click="handleEnableHyperV">
          <span v-if="isEnablingHyperV" class="spinner-sm"></span>
          <span v-else>{{ isRtl ? 'ØªØ«Ø¨ÙŠØª ÙˆØªÙØ¹ÙŠÙ„ Hyper-V Ø§Ù„Ø¢Ù†' : 'Install & Enable Hyper-V Now' }}</span>
        </button>
      </div>

      <!-- Disks Table Section -->
      <div class="disks-section">
        <div class="section-title">
          <div class="title-left">
            <svg class="section-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="18" rx="2"></rect>
              <line x1="2" y1="9" x2="22" y2="9"></line>
              <line x1="2" y1="15" x2="22" y2="15"></line>
            </svg>
            <span>{{ t('discovery.targetStorageDrives') }}</span>
          </div>
          <span class="disks-count">{{ t('discovery.drivesDetected', { count: suitableDisks.length }) }}</span>
        </div>
        <div class="table-wrapper">
          <table class="disks-table">
            <thead>
              <tr>
                <th class="th-drive-radio"></th>
                <th class="th-drive-mount">{{ t('discovery.colMount') }}</th>
                <th class="th-drive-name">{{ t('discovery.colDrive') }}</th>
                <th class="th-drive-fs">{{ t('discovery.colFs') }}</th>
                <th class="th-drive-total">{{ t('discovery.colTotal') }}</th>
                <th class="th-drive-free">{{ t('discovery.colFree') }}</th>
                <th class="th-drive-status">{{ t('discovery.colStatus') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="disk in suitableDisks"
                :key="disk.mount_point"
                class="disk-row-clickable"
                :class="{
                  'selected-target-row': disk.mount_point === targetDiskDrive,
                  'recommended-row': disk.mount_point === discoveryReport.recommendation.target_disk_drive
                }"
                @click="selectTargetDrive(disk.mount_point)"
              >
                <!-- Radio Selection Indicator -->
                <td class="td-drive-radio">
                  <div class="fluent-radio-circle" :class="{ 'is-selected': disk.mount_point === targetDiskDrive }">
                    <div class="fluent-radio-dot"></div>
                  </div>
                </td>
                <!-- 1. Drive Letter / Mount Point -->
                <td class="td-drive-mount">
                  <span class="drive-badge-letter font-mono" dir="ltr">{{ getDriveLetter(disk.mount_point) }}</span>
                </td>
                <!-- 2. Disk Volume Name -->
                <td class="td-drive-name">
                  <div class="drive-name-group">
                    <svg class="drive-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                      <line x1="6" y1="15" x2="6.01" y2="15"></line>
                      <line x1="10" y1="15" x2="10.01" y2="15"></line>
                    </svg>
                    <span class="drive-name">{{ getCleanDriveLabel(disk) }}</span>
                  </div>
                </td>
                <td class="td-drive-fs">
                  <span class="fs-badge">{{ disk.file_system }}</span>
                </td>
                <td class="td-drive-total">
                  <span class="font-mono text-secondary">{{ disk.total_space_gb.toFixed(1) }} {{ t('common.gb') }}</span>
                </td>
                <td class="td-drive-free">
                  <!-- Storage Space with Visual Progress Bar -->
                  <div class="storage-meter-cell">
                    <div class="storage-text-row">
                      <span :class="disk.available_space_gb >= 30 ? 'text-emerald' : 'text-amber'" class="font-semibold font-mono">
                        {{ disk.available_space_gb.toFixed(1) }} {{ t('common.gb') }} {{ t('common.free') }}
                      </span>
                      <span class="storage-used-hint font-mono">
                        {{ getDiskUsedPercent(disk.total_space_gb, disk.available_space_gb) }}% {{ isRtl ? 'Ù…Ø³ØªØ®Ø¯Ù…' : 'used' }}
                      </span>
                    </div>
                    <div class="fluent-progress-track">
                      <div
                        class="fluent-progress-fill"
                        :class="getDiskProgressClass(disk.available_space_gb)"
                        :style="{ width: `${getDiskUsedPercent(disk.total_space_gb, disk.available_space_gb)}%` }"
                      ></div>
                    </div>
                  </div>
                </td>
                <!-- 3. Fixed-width Status Column (Zero text expansion or shifting) -->
                <td class="td-drive-status">
                  <div class="status-action-cell">
                    <span
                      v-if="disk.mount_point === discoveryReport.recommendation.target_disk_drive"
                      class="badge-pill badge-recommended"
                      :title="isRtl ? 'Ø§Ù„Ù‚Ø±Øµ Ø§Ù„Ø£Ù†Ø³Ø¨ Ù„ØªØ«Ø¨ÙŠØª Ù…Ù„ÙØ§Øª Ø§Ù„Ù†Ø¸Ø§Ù… ÙˆØ§Ù„Ù€ VHDX' : 'Recommended disk for FastFree VHDX'"
                    >
                      <svg class="badge-icon star-svg" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      <span>{{ isRtl ? 'Ù…ÙˆØµÙ‰ Ø¨Ù‡' : 'Recommended' }}</span>
                    </span>
                    <span
                      v-else-if="disk.available_space_gb >= 30"
                      class="badge-pill badge-compatible"
                    >
                      <svg viewBox="0 0 24 24" class="badge-mini-check" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{{ isRtl ? 'Ù…ØªÙˆØ§ÙÙ‚' : 'Compatible' }}</span>
                    </span>
                    <span
                      v-else
                      class="badge-pill badge-tight"
                    >
                      <span>{{ isRtl ? 'Ù…Ø³Ø§Ø­Ø© Ø­Ø±Ø¬Ø©' : 'Low Space' }}</span>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sleek, Compact Active Target Drive Confirmation Bar (Single-line zero scroll) -->
        <div v-if="selectedDiskInfo" class="target-drive-bar">
          <div class="target-bar-left">
            <span class="target-pulse-dot"></span>
            <span class="target-lead-label">{{ isRtl ? 'Ø§Ù„Ù‚Ø±Øµ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ù„ØªØ«Ø¨ÙŠØª FastOS:' : 'Active Installation Target:' }}</span>
            <strong class="target-mount-badge font-mono" dir="ltr">{{ selectedDiskInfo.mount_point }}</strong>
            <span class="target-name-text">{{ getCleanDriveLabel(selectedDiskInfo) }}</span>
            <span class="target-space-meta font-mono">
              ({{ selectedDiskInfo.available_space_gb.toFixed(1) }} {{ t('common.gb') }} {{ t('common.free') }})
            </span>
          </div>
          <div class="target-bar-right">
            <span v-if="selectedDiskInfo.mount_point === discoveryReport.recommendation.target_disk_drive" class="target-rec-tag">
              â˜… {{ isRtl ? 'Ù…ÙˆØµÙ‰ Ø¨Ù‡ Ù…Ù† Ø§Ù„Ù†Ø¸Ø§Ù…' : 'System Recommended' }}
            </span>
            <span
              class="target-readiness-pill"
              :class="selectedDiskInfo.available_space_gb >= 30 ? 'pill-ready' : 'pill-warn'"
            >
              {{ selectedDiskInfo.available_space_gb >= 30 ? (isRtl ? 'Ø§Ù„Ù…Ø³Ø§Ø­Ø© Ù…Ø³ØªÙˆÙÙŠØ© Ù„Ù„Ø´Ø±ÙˆØ· âœ“' : 'Requirements Met âœ“') : (isRtl ? 'Ù…Ø³Ø§Ø­Ø© ØªØ®Ø²ÙŠÙ† Ù…Ù†Ø®ÙØ¶Ø© âš ' : 'Low Headroom âš ') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Error or Fallback -->
    <div v-else class="error-state">
      <p class="error-msg">{{ t('discovery.errorReport') }}</p>
      <button class="btn btn-secondary" @click="fetchSystemDiscovery">{{ t('discovery.retryDiscovery') }}</button>
    </div>

    <!-- Action Bar with Strict 3-Column Mathematically Centered FastFree Timepiece -->
    <div class="action-bar">
      <div class="action-bar-start">
        <div class="diag-summary-pill">
          <span class="dot-live"></span>
          <span>{{ t('discovery.envCompatible') }}</span>
        </div>
      </div>

      <div class="action-bar-center">
        <FastFreeTimepiece />
      </div>

      <div class="action-bar-end">
        <button
          class="btn btn-primary btn-next"
          :disabled="loadingDiscovery || !discoveryReport"
          @click="goToNextStep"
        >
          <span class="btn-flex">
            <span>{{ t('discovery.proceedToLicense') }}</span>
            <svg class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
            </svg>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import FastFreeTimepiece from './FastFreeTimepiece.vue';
import {
  currentStep,
  loadingDiscovery,
  discoveryReport,
  fetchSystemDiscovery,
  targetDiskDrive,
  saveUserPreferences,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

// Stable disk list: filter tiny/EFI partitions (<2GB).
// Recommended drive is listed first, then other drives in fixed alphabetical order (C:\, D:\, etc.)
// Notice: targetDiskDrive is NEVER compared here, ensuring the list order remains 100% stationary when clicking rows!
const suitableDisks = computed(() => {
  const all = discoveryReport.value?.disks || [];
  const valid = all.filter((d) => d.total_space_gb >= 2 && d.available_space_gb > 0.05);
  const rec = discoveryReport.value?.recommendation?.target_disk_drive;

  const sorted = [...valid].sort((a, b) => {
    if (a.mount_point === rec) return -1;
    if (b.mount_point === rec) return 1;
    return a.mount_point.localeCompare(b.mount_point);
  });

  return sorted.slice(0, 4);
});

// Currently selected target disk info for clear user confirmation
const selectedDiskInfo = computed(() => {
  const disks = discoveryReport.value?.disks || [];
  return disks.find((d) => d.mount_point === targetDiskDrive.value) || suitableDisks.value[0] || null;
});

const isEnablingHyperV = ref(false);

function selectTargetDrive(mountPoint: string) {
  targetDiskDrive.value = mountPoint;
  saveUserPreferences();
}

async function handleEnableHyperV() {
  isEnablingHyperV.value = true;
  try {
    await invoke<string>('install_hyperv_feature');
    await fetchSystemDiscovery();
  } catch (err) {
    console.error('Failed to enable Hyper-V:', err);
  } finally {
    isEnablingHyperV.value = false;
  }
}

function goToNextStep() {
  currentStep.value = 2;
}

function getDiskProgressClass(freeGb: number) {
  if (freeGb >= 40) return 'progress-emerald';
  if (freeGb >= 20) return 'progress-amber';
  return 'progress-rose';
}

function getDiskUsedPercent(totalGb: number, freeGb: number) {
  if (!totalGb || totalGb <= 0) return 0;
  const used = Math.max(0, totalGb - freeGb);
  return Math.min(100, Math.max(2, Math.round((used / totalGb) * 100)));
}

function getDriveLetter(mount: string): string {
  if (!mount) return '';
  const match = mount.match(/^([A-Za-z]:)/);
  return match ? match[1] : mount;
}

function getCleanDriveLabel(disk: { name?: string; mount_point: string }): string {
  const mount = disk.mount_point || '';
  let label = disk.name || '';
  label = label.replace(/\s*\([A-Za-z]:[\\\/]*\)\s*/g, '').trim();
  if (!label || label === mount) {
    return isRtl.value ? 'Ù‚Ø±Øµ Ù…Ø­Ù„ÙŠ' : 'Local Drive';
  }
  return label;
}
</script>


<style scoped>
@import '../assets/styles/host-discovery.css';
</style>
