<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('sizing.stepTag') }}</div>
      <h2>{{ t('sizing.title') }}</h2>
      <p class="subtitle">{{ t('sizing.subtitle') }}</p>
    </div>

    <div class="content-body">
      <!-- Target Node Appliance Selector -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label" for="client-select">{{ t('sizing.targetAppliance') }}</label>
          <span class="topology-badge">{{ t('sizing.topologyBadge') }}</span>
        </div>
        <select
          id="client-select"
          v-model="selectedClientId"
          class="custom-select"
        >
          <option
            v-for="client in availableClients"
            :key="client"
            :value="client"
          >
            {{ client }} (FastFree Appliance Node — Hyper-V)
          </option>
        </select>
        <p class="hint-text" v-html="t('sizing.clientHint')"></p>
      </div>

      <!-- CPU Sizing Slider -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label">
            {{ t('sizing.assignedCpu') }} <strong class="text-accent">{{ assignedCpuCores }} {{ t('common.cores') }}</strong>
          </label>
          <span class="sub-stat">{{ t('sizing.hostCpu', { count: totalHostCores }) }}</span>
        </div>
        <div class="slider-wrapper">
          <input
            v-model.number="assignedCpuCores"
            type="range"
            :min="minCores"
            :max="maxCores"
            step="1"
            class="range-slider"
          />
          <div class="slider-ticks">
            <span>{{ t('sizing.minCores', { min: minCores }) }}</span>
            <span class="text-accent font-semibold">{{ t('sizing.recommendedCores', { count: recommendedCores }) }}</span>
            <span>{{ t('sizing.maxCores', { max: maxCores }) }}</span>
          </div>
        </div>
      </div>

      <!-- RAM Sizing Slider -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label">
            {{ t('sizing.assignedRam') }}
            <strong class="text-accent">{{ (assignedRamMb / 1024).toFixed(1) }} {{ t('common.gb') }}</strong>
            <span class="text-muted">({{ assignedRamMb }} {{ t('common.mb') }})</span>
          </label>
          <span class="sub-stat">{{ t('sizing.hostTotalRam', { val: (totalHostRamMb / 1024).toFixed(1) }) }}</span>
        </div>
        <div class="slider-wrapper">
          <input
            v-model.number="assignedRamMb"
            type="range"
            :min="minRamMb"
            :max="maxRamMb"
            step="1024"
            class="range-slider"
          />
          <div class="slider-ticks">
            <span>{{ t('sizing.minRam', { min: (minRamMb / 1024).toFixed(0) }) }}</span>
            <span class="text-accent font-semibold">{{ t('sizing.recommendedRam', { val: (recommendedRamMb / 1024).toFixed(0) }) }}</span>
            <span>{{ t('sizing.maxRam', { max: (maxRamMb / 1024).toFixed(0) }) }}</span>
          </div>
        </div>
      </div>

      <!-- Storage Destination -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label" for="drive-select">{{ t('sizing.storageDest') }}</label>
          <span class="sub-stat">{{ t('sizing.dynamicVhdxHint') }}</span>
        </div>
        <select
          id="drive-select"
          v-model="targetDiskDrive"
          class="custom-select"
        >
          <option
            v-for="disk in disksList"
            :key="disk.mount_point"
            :value="disk.mount_point"
          >
            {{ disk.name || disk.mount_point }} ({{ disk.mount_point }}) — {{ disk.available_space_gb.toFixed(1) }} {{ t('common.gb') }} {{ t('common.free') }} ({{ disk.file_system }})
          </option>
        </select>
      </div>

      <!-- Allocation Summary Pill -->
      <div class="allocation-summary-box">
        <div class="summary-item">
          <span class="sum-label">{{ t('sizing.hostRamPreserved') }}</span>
          <span class="sum-val text-emerald">{{ ((totalHostRamMb - assignedRamMb) / 1024).toFixed(1) }} {{ t('common.gb') }}</span>
        </div>
        <div class="summary-item">
          <span class="sum-label">{{ t('sizing.workloadClass') }}</span>
          <span class="sum-val text-accent">
            {{ assignedRamMb >= 8192 ? t('sizing.prodErp') : t('sizing.stdEnterprise') }}
          </span>
        </div>
        <div class="summary-item">
          <span class="sum-label">{{ t('sizing.vswitch') }}</span>
          <span class="sum-val">{{ t('sizing.vswitchName') }}</span>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="currentStep = 2">
        {{ t('sizing.backToLicense') }}
      </button>
      <button class="btn btn-primary" @click="currentStep = 4">
        {{ t('sizing.inspectWireguard') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  currentStep,
  discoveryReport,
  licenseState,
  selectedClientId,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

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

const availableClients = computed(() => {
  if (licenseState.value && licenseState.value.eligible_clients.length > 0) {
    return licenseState.value.eligible_clients;
  }
  return Array.from({ length: 10 }, (_, i) => `client${i + 2}`);
});
</script>

<style scoped>
.screen-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-box {
  margin-bottom: 14px;
}

.step-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-sky, #38BDF8);
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.header-box h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main, #F8FAFC);
  margin: 0;
}

.subtitle {
  color: var(--text-muted, #94A3B8);
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 0;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
}

.config-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #F4F4F5);
}

.topology-badge {
  font-size: 10px;
  color: var(--accent-sky, #38BDF8);
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.sub-stat {
  font-size: 11px;
  color: var(--text-muted, #71717A);
}

.custom-select {
  width: 100%;
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-main, #F8FAFC);
  outline: none;
  cursor: pointer;
  font-family: inherit;
}

.custom-select:focus {
  border-color: var(--accent-sky, #38BDF8);
}

.hint-text {
  font-size: 11px;
  color: var(--text-muted, #71717A);
  margin: 2px 0 0 0;
  line-height: 1.4;
}

.hint-text code {
  color: var(--accent-sky, #38BDF8);
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 3px;
}

.slider-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.range-slider {
  width: 100%;
  height: 6px;
  accent-color: #1976D2;
  cursor: pointer;
}

.slider-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted, #71717A);
}

.allocation-summary-box {
  background: var(--bg-sub, #141416);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 8px;
  padding: 8px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sum-label {
  font-size: 10px;
  color: var(--text-muted, #71717A);
  text-transform: uppercase;
}

.sum-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #F8FAFC);
}

.text-accent {
  color: var(--accent-sky, #38BDF8);
}

.text-emerald {
  color: #34D399;
}

.text-muted {
  color: var(--text-muted, #71717A);
  font-weight: normal;
  font-size: 11px;
}

.font-semibold {
  font-weight: 600;
}

.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover, #1565C0);
  box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
}

.btn-secondary {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #E4E4E7);
}

.btn-secondary:hover {
  background: var(--border-color, #3F3F46);
}
</style>
