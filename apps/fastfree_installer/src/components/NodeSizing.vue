<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('sizing.stepTag') }}</div>
      <h2>{{ t('sizing.title') }}</h2>
      <p class="subtitle">{{ t('sizing.subtitle') }}</p>
    </div>

    <div class="content-body">
      <div class="sizing-grid">
        <!-- Left Column: All Hardware Resource Allocations & Progress Sliders Under Each Other -->
        <div class="sizing-col">
          <!-- 1. CPU Sizing Slider Progress -->
          <div class="config-card">
            <div class="card-title-row">
              <div class="title-with-icon">
                <svg class="title-svg-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <rect x="9" y="9" width="6" height="6"/>
                  <line x1="9" y1="1" x2="9" y2="4"/>
                  <line x1="15" y1="1" x2="15" y2="4"/>
                  <line x1="9" y1="20" x2="9" y2="23"/>
                  <line x1="15" y1="20" x2="15" y2="23"/>
                  <line x1="20" y1="9" x2="23" y2="9"/>
                  <line x1="20" y1="14" x2="23" y2="14"/>
                  <line x1="1" y1="9" x2="4" y2="9"/>
                  <line x1="1" y1="14" x2="4" y2="14"/>
                </svg>
                <label class="config-label">
                  {{ t('sizing.assignedCpu') }} <strong class="text-accent">{{ assignedCpuCores }} {{ t('common.cores') }}</strong>
                </label>
              </div>
              <span class="sub-stat">{{ t('sizing.hostCpu', { count: totalHostCores }) }} ({{ cpuHostPercent }}%)</span>
            </div>
            <div class="slider-wrapper">
              <input
                v-model.number="assignedCpuCores"
                type="range"
                :min="minCores"
                :max="maxCores"
                step="1"
                class="range-slider"
                :style="{ '--slider-fill': `${cpuSliderFillPercent}%` }"
              />
              <div class="slider-ticks">
                <button type="button" class="preset-tick-btn" @click="assignedCpuCores = minCores">
                  {{ t('sizing.minCores', { min: minCores }) }}
                </button>
                <button
                  type="button"
                  class="preset-tick-btn text-accent font-semibold is-rec"
                  @click="assignedCpuCores = recommendedCores"
                >
                  â˜… {{ t('sizing.recommendedCores', { count: recommendedCores }) }}
                </button>
                <button type="button" class="preset-tick-btn" @click="assignedCpuCores = maxCores">
                  {{ t('sizing.maxCores', { max: maxCores }) }}
                </button>
              </div>
            </div>
          </div>

          <!-- 2. RAM Sizing Slider Progress -->
          <div class="config-card">
            <div class="card-title-row">
              <div class="title-with-icon">
                <svg class="title-svg-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 19v-3"/>
                  <path d="M10 19v-3"/>
                  <path d="M14 19v-3"/>
                  <path d="M18 19v-3"/>
                  <rect x="2" y="5" width="20" height="11" rx="2"/>
                </svg>
                <label class="config-label">
                  {{ t('sizing.assignedRam') }}
                  <strong class="text-accent">{{ (assignedRamMb / 1024).toFixed(1) }} {{ t('common.gb') }}</strong>
                </label>
              </div>
              <span class="sub-stat">{{ t('sizing.hostTotalRam', { val: (totalHostRamMb / 1024).toFixed(1) }) }} ({{ ramHostPercent }}%)</span>
            </div>
            <div class="slider-wrapper">
              <input
                v-model.number="assignedRamMb"
                type="range"
                :min="minRamMb"
                :max="maxRamMb"
                step="1024"
                class="range-slider"
                :style="{ '--slider-fill': `${ramSliderFillPercent}%` }"
              />
              <div class="slider-ticks">
                <button type="button" class="preset-tick-btn" @click="assignedRamMb = minRamMb">
                  {{ t('sizing.minRam', { min: (minRamMb / 1024).toFixed(0) }) }}
                </button>
                <button
                  type="button"
                  class="preset-tick-btn text-accent font-semibold is-rec"
                  @click="assignedRamMb = recommendedRamMb"
                >
                  â˜… {{ t('sizing.recommendedRam', { val: (recommendedRamMb / 1024).toFixed(0) }) }}
                </button>
                <button type="button" class="preset-tick-btn" @click="assignedRamMb = maxRamMb">
                  {{ t('sizing.maxRam', { max: (maxRamMb / 1024).toFixed(0) }) }}
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Storage Destination & Disk Gauge Progress (Stacked Under RAM Progress) -->
          <div class="config-card">
            <div class="card-title-row">
              <div class="title-with-icon">
                <svg class="title-svg-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="12" x2="2" y2="12"></line>
                  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                  <line x1="6" y1="16" x2="6.01" y2="16"></line>
                  <line x1="10" y1="16" x2="10.01" y2="16"></line>
                </svg>
                <label class="config-label" for="drive-select">{{ t('sizing.storageDest') }}</label>
              </div>
              <span class="sub-stat">{{ t('sizing.dynamicVhdxHint') }}</span>
            </div>
            <select
              id="drive-select"
              v-model="targetDiskDrive"
              class="custom-select"
              dir="ltr"
            >
              <option
                v-for="disk in disksList"
                :key="disk.mount_point"
                :value="disk.mount_point"
              >
                {{ formatDiskOption(disk) }}
              </option>
            </select>

            <!-- Visual Drive Capacity & Space Gauge Progress -->
            <div v-if="selectedDiskInfo" class="disk-gauge-container">
              <div class="disk-gauge-bar">
                <div
                  class="disk-gauge-fill"
                  :style="{ width: `${diskUsedPercent}%` }"
                  :class="{ 'gauge-warn': diskUsedPercent > 85 }"
                ></div>
              </div>
              <div class="disk-gauge-meta">
                <span class="disk-meta-text">
                  {{ isRtl ? 'Ø§Ù„Ù…Ø³Ø§Ø­Ø© Ø§Ù„Ù…ØªÙˆÙØ±Ø©:' : 'Free Space:' }}
                  <strong class="text-emerald">{{ selectedDiskInfo.available_space_gb.toFixed(1) }} {{ t('common.gb') }}</strong>
                  <span class="text-muted"> / {{ selectedDiskInfo.total_space_gb.toFixed(0) }} {{ t('common.gb') }}</span>
                </span>
                <span class="disk-meta-badge font-mono">{{ selectedDiskInfo.file_system }}</span>
              </div>
            </div>

            <div class="vhdx-path-pill" dir="ltr">
              <span class="vhdx-tag">VHDX</span>
              <code class="vhdx-code font-mono" :title="vhdxFullPath">{{ vhdxFullPath }}</code>
              <button
                type="button"
                class="btn-copy-path"
                :title="isRtl ? 'Ù†Ø³Ø® Ù…Ø³Ø§Ø± Ø§Ù„Ù‚Ø±Øµ' : 'Copy VHDX Path'"
                @click="copyVhdxPath"
              >
                <svg v-if="!isPathCopied" class="copy-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg v-else class="copy-svg text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{{ isPathCopied ? (isRtl ? 'ØªÙ… Ø§Ù„Ù†Ø³Ø®!' : 'Copied!') : (isRtl ? 'Ù†Ø³Ø®' : 'Copy') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Node Identity, Security Isolation & Architecture Bento Grid -->
        <div class="sizing-col">
          <!-- Target Node Appliance Selector -->
          <div class="config-card">
            <div class="card-title-row">
              <label class="config-label" for="client-select">{{ t('sizing.targetAppliance') }}</label>
              <span class="topology-badge">{{ t('sizing.topologyBadge') }}</span>
            </div>
            <!-- Licensed Node Appliance Lock -->
            <div v-if="!hasMultipleEligibleNodes" class="locked-node-card">
              <div class="locked-node-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="locked-svg">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div class="locked-node-info">
                <span class="locked-node-title font-mono">FastFree-{{ selectedClientId }}</span>
                <span class="locked-node-sub">{{ isRtl ? 'Ø¹Ù‚Ø¯Ø© Ø³ÙŠØ§Ø¯ÙŠØ© Ù…Ø¹ØªÙ…Ø¯Ø© ÙˆÙ…Ù‚ØªØ±Ù†Ø© Ø¨Ø§Ù„ØªØ±Ø®ÙŠØµ Ø§Ù„Ø±Ù‚Ù…ÙŠ' : 'Licensed & cryptographically bound appliance node' }}</span>
              </div>
              <span class="locked-status-pill">
                <span class="dot-green"></span>
                {{ isRtl ? 'Ù…Ø±Ø®Øµ' : 'Licensed' }}
              </span>
            </div>
            <select
              v-else
              id="client-select"
              v-model="selectedClientId"
              class="custom-select"
            >
              <option
                v-for="client in availableClients"
                :key="client"
                :value="client"
              >
                {{ client }} (FastFree Appliance Node â€” Hyper-V)
              </option>
            </select>
            <p class="hint-text" v-html="t('sizing.clientHint')"></p>
          </div>

          <!-- Sovereign Security & Service Account Isolation Card -->
          <div class="config-card">
            <div class="card-title-row">
              <div class="security-title-wrap">
                <span class="security-icon-shield">
                  <svg class="sec-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                </span>
                <label class="config-label" for="hardened-security-toggle">
                  {{ t('sizing.hardenedSecurityTitle') }}
                </label>
              </div>
              <label class="fluent-toggle" for="hardened-security-toggle">
                <input
                  id="hardened-security-toggle"
                  v-model="hardenedSecurityEnabled"
                  type="checkbox"
                />
                <span class="fluent-toggle-track">
                  <span class="fluent-toggle-thumb"></span>
                </span>
              </label>
            </div>
            <p class="hint-text" v-html="t('sizing.hardenedSecurityHint', { account: `fastfree_${selectedClientId}` })"></p>
          </div>

          <!-- Unified Appliance Architecture & Headroom Bento Grid -->
          <div class="config-card hyperv-firmware-card">
            <div class="card-title-row">
              <div class="title-with-icon">
                <svg class="title-svg-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                  <line x1="6" y1="6" x2="6.01" y2="6"/>
                  <line x1="6" y1="18" x2="6.01" y2="18"/>
                </svg>
                <span class="config-label">{{ isRtl ? 'Ù…ÙˆØ§ØµÙØ§Øª FastOS ÙˆØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ Ø§Ù„Ø­ÙŠØ©' : 'FastOS Architecture & Live Telemetry' }}</span>
              </div>
              <span class="gen2-badge">Gen 2 UEFI</span>
            </div>

            <div class="bento-telemetry-grid">
              <div class="bento-cell">
                <span class="bento-key">{{ t('sizing.hostRamPreserved') }}</span>
                <span class="bento-val text-emerald font-semibold">{{ ((totalHostRamMb - assignedRamMb) / 1024).toFixed(1) }} {{ t('common.gb') }}</span>
              </div>
              <div class="bento-cell">
                <span class="bento-key">{{ isRtl ? 'Ø§Ù„Ø£Ù…Ø§Ù† ÙˆØªØ´ÙÙŠØ± TPM' : 'Firmware Security' }}</span>
                <span class="bento-val text-emerald">
                  <span class="dot-green-micro"></span>
                  UEFI + TPM 2.0
                </span>
              </div>
              <div class="bento-cell">
                <span class="bento-key">{{ t('sizing.workloadClass') }}</span>
                <span class="bento-val text-accent">
                  {{ assignedRamMb >= 8192 ? t('sizing.prodErp') : t('sizing.stdEnterprise') }}
                </span>
              </div>
              <div class="bento-cell">
                <span class="bento-key">{{ isRtl ? 'Ù†Ø¸Ø§Ù… Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ø³ÙŠØ§Ø¯ÙŠ' : 'Sovereign OS' }}</span>
                <span class="bento-val font-mono text-cyan">NixOS Clan 26.05</span>
              </div>
              <div class="bento-cell span-2">
                <span class="bento-key">{{ t('sizing.vswitch') }}</span>
                <span class="bento-val font-mono text-xs">{{ t('sizing.vswitchName') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="action-bar-start">
        <button class="btn btn-secondary" @click="currentStep = 2">
          <span class="btn-flex">
            <svg class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
            </svg>
            <span>{{ t('sizing.backToLicense') }}</span>
          </span>
        </button>
      </div>

      <!-- CENTER: Persistent FastFree 3D Precision Timepiece -->
      <div class="action-bar-center">
        <FastFreeTimepiece />
      </div>

      <div class="action-bar-end">
        <button class="btn btn-primary btn-next" @click="currentStep = 4">
          <span class="btn-flex">
            <span>{{ t('sizing.inspectWireguard') }}</span>
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
import { ref, computed, watch } from 'vue';
import FastFreeTimepiece from './FastFreeTimepiece.vue';
import {
  currentStep,
  discoveryReport,
  licenseState,
  selectedClientId,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  hardenedSecurityEnabled,
  saveUserPreferences,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

const isPathCopied = ref(false);
async function copyVhdxPath() {
  try {
    await navigator.clipboard.writeText(vhdxFullPath.value);
    isPathCopied.value = true;
    setTimeout(() => {
      isPathCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy path', err);
  }
}

// Automatically persist user choices whenever modified
watch([assignedCpuCores, assignedRamMb, targetDiskDrive], () => {
  saveUserPreferences();
});

function formatDiskOption(disk: { name?: string; mount_point: string; available_space_gb: number; file_system: string }) {
  const mountLetter = disk.mount_point.replace(/[\\\/]+$/, '');
  let label = disk.name || '';
  label = label.replace(/\s*\([A-Za-z]:[\\\/]*\)\s*/g, '').trim();
  if (!label || label === disk.mount_point) {
    label = isRtl.value ? 'Ù‚Ø±Øµ Ù…Ø­Ù„ÙŠ' : 'Local Disk';
  }
  const freeText = `${disk.available_space_gb.toFixed(1)} ${t('common.gb')} ${t('common.free')}`;
  return `${mountLetter} [${label}] â€” ${freeText} (${disk.file_system})`;
}

const totalHostCores = computed(() => discoveryReport.value?.cpu_count || 8);
const totalHostRamMb = computed(() => discoveryReport.value?.total_memory_mb || 16384);

const minCores = computed(() => 2);
const maxCores = computed(() => Math.max(2, (discoveryReport.value?.cpu_count || 8) - 1));
const recommendedCores = computed(() => discoveryReport.value?.recommendation?.recommended_cores || 4);

const minRamMb = computed(() => 2048);
const maxRamMb = computed(() => {
  const total = discoveryReport.value?.total_memory_mb || 16384;
  // Always reserve at least 4 GB (4096 MB) for Windows host OS
  return Math.max(4096, total - 4096);
});
const recommendedRamMb = computed(() => discoveryReport.value?.recommendation?.recommended_ram_mb || 4096);

const disksList = computed(() => discoveryReport.value?.disks || []);

const selectedDiskInfo = computed(() => {
  const current = (targetDiskDrive.value || '').toLowerCase();
  return disksList.value.find((d) => d.mount_point.toLowerCase() === current)
    || disksList.value[0]
    || null;
});

const diskUsedPercent = computed(() => {
  if (!selectedDiskInfo.value || selectedDiskInfo.value.total_space_gb <= 0) return 0;
  const used = selectedDiskInfo.value.total_space_gb - selectedDiskInfo.value.available_space_gb;
  return Math.min(100, Math.max(0, Math.round((used / selectedDiskInfo.value.total_space_gb) * 100)));
});

const vhdxFullPath = computed(() => {
  const letter = (targetDiskDrive.value || 'C:').replace(/[\\\/]+$/, '');
  return `${letter}\\FastFree\\Disks\\fastfree_${selectedClientId.value || 'client1'}.vhdx`;
});

const cpuHostPercent = computed(() => {
  if (totalHostCores.value <= 0) return 0;
  return Math.round((assignedCpuCores.value / totalHostCores.value) * 100);
});

const cpuSliderFillPercent = computed(() => {
  const span = maxCores.value - minCores.value;
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((assignedCpuCores.value - minCores.value) / span) * 100)));
});

const ramHostPercent = computed(() => {
  if (totalHostRamMb.value <= 0) return 0;
  return Math.round((assignedRamMb.value / totalHostRamMb.value) * 100);
});

const ramSliderFillPercent = computed(() => {
  const span = maxRamMb.value - minRamMb.value;
  if (span <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((assignedRamMb.value - minRamMb.value) / span) * 100)));
});

const hasMultipleEligibleNodes = computed(() => {
  return (licenseState.value?.eligible_clients?.length || 0) > 1;
});

const availableClients = computed(() => {
  if (licenseState.value && licenseState.value.eligible_clients.length > 0) {
    return licenseState.value.eligible_clients;
  }
  const boundNode = licenseState.value?.node_id || selectedClientId.value;
  return boundNode ? [boundNode] : ['client2'];
});
</script>


<style scoped>
@import '../assets/styles/node-sizing.css';
</style>
