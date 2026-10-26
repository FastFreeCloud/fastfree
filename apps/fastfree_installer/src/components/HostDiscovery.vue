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
        <div class="diag-card">
          <div class="card-header">
            <span class="icon">💻</span>
            <span class="label">{{ t('discovery.hostIdentity') }}</span>
          </div>
          <div class="metric-value text-accent">{{ discoveryReport.host_name }}</div>
          <div class="metric-sub">
            {{ t('discovery.loggedUser') }}: <strong>{{ discoveryReport.user_name }}</strong> {{ t('discovery.adminPriv') }}
          </div>
        </div>

        <!-- CPU Card -->
        <div class="diag-card">
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
          <div class="metric-value">{{ t('discovery.logicalCores', { count: discoveryReport.cpu_count }) }}</div>
          <div class="metric-sub truncate" :title="discoveryReport.cpu_brand">
            {{ discoveryReport.cpu_brand }}
          </div>
        </div>

        <!-- RAM Card -->
        <div class="diag-card">
          <div class="card-header">
            <span class="icon">🧠</span>
            <span class="label">{{ t('discovery.physicalMemory') }}</span>
          </div>
          <div class="metric-value">{{ t('discovery.totalMemory', { val: (discoveryReport.total_memory_mb / 1024).toFixed(1) }) }}</div>
          <div class="metric-sub">
            {{ t('discovery.availableHeadroom') }}: <strong>{{ (discoveryReport.available_memory_mb / 1024).toFixed(1) }} {{ t('common.gb') }}</strong>
          </div>
        </div>

        <!-- Hyper-V Engine Card -->
        <div
          class="diag-card"
          :class="{
            'border-ok': discoveryReport.hyperv.ready_for_hyperv,
            'border-warn': !discoveryReport.hyperv.ready_for_hyperv,
          }"
        >
          <div class="card-header">
            <span class="icon">🛡️</span>
            <span class="label">{{ t('discovery.hypervEngine') }}</span>
          </div>
          <div
            class="metric-value"
            :class="discoveryReport.hyperv.ready_for_hyperv ? 'text-emerald' : 'text-amber'"
          >
            {{ discoveryReport.hyperv.ready_for_hyperv ? t('discovery.hypervReady') : t('discovery.hypervNotice') }}
          </div>
          <div class="metric-sub">{{ discoveryReport.hyperv.status_reason }}</div>
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
            <strong>{{ isRtl ? 'محرك Hyper-V غير مفعّل على هذا النظام حالياً' : 'Hyper-V is not active on this Windows machine' }}</strong>
            <p>{{ isRtl ? 'لتشغيل العقدة، يجب تفعيل ميزة Hyper-V في ويندوز. يمكنك تثبيتها وتفعيلها الآن بنقرة واحدة.' : 'FastFree node requires Hyper-V feature. Click below to install and enable it automatically.' }}</p>
          </div>
        </div>
        <button class="btn btn-hyperv-act" :disabled="isEnablingHyperV" @click="handleEnableHyperV">
          <span v-if="isEnablingHyperV" class="spinner-sm"></span>
          <span v-else>{{ isRtl ? 'تثبيت وتفعيل Hyper-V الآن' : 'Install & Enable Hyper-V Now' }}</span>
        </button>
      </div>

      <!-- Disks Table -->
      <div class="disks-section">
        <div class="section-title">
          <span>{{ t('discovery.targetStorageDrives') }}</span>
          <span class="disks-count">{{ t('discovery.drivesDetected', { count: discoveryReport.disks.length }) }}</span>
        </div>
        <div class="table-wrapper">
          <table class="disks-table">
            <thead>
              <tr>
                <th>{{ t('discovery.colDrive') }}</th>
                <th>{{ t('discovery.colMount') }}</th>
                <th>{{ t('discovery.colFs') }}</th>
                <th>{{ t('discovery.colTotal') }}</th>
                <th>{{ t('discovery.colFree') }}</th>
                <th>{{ t('discovery.colStatus') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="disk in discoveryReport.disks"
                :key="disk.mount_point"
                :class="{ 'recommended-row': disk.mount_point === discoveryReport.recommendation.target_disk_drive }"
              >
                <td><strong>{{ disk.name || disk.mount_point }}</strong></td>
                <td><code>{{ disk.mount_point }}</code></td>
                <td>{{ disk.file_system }}</td>
                <td>{{ disk.total_space_gb.toFixed(1) }} {{ t('common.gb') }}</td>
                <td>
                  <span :class="disk.available_space_gb >= 30 ? 'text-emerald' : 'text-amber'">
                    {{ disk.available_space_gb.toFixed(1) }} {{ t('common.gb') }} {{ t('common.free') }}
                  </span>
                </td>
                <td>
                  <span
                    v-if="disk.mount_point === discoveryReport.recommendation.target_disk_drive"
                    class="badge-pill badge-primary"
                  >
                    {{ t('discovery.recommendedVhdx') }}
                  </span>
                  <span v-else class="badge-pill badge-neutral">{{ t('common.available') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Error or Fallback -->
    <div v-else class="error-state">
      <p class="error-msg">{{ t('discovery.errorReport') }}</p>
      <button class="btn btn-secondary" @click="fetchSystemDiscovery">{{ t('discovery.retryDiscovery') }}</button>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="diag-summary-pill">
        <span class="dot-live"></span>
        <span>{{ t('discovery.envCompatible') }}</span>
      </div>
      <button
        class="btn btn-primary"
        :disabled="loadingDiscovery || !discoveryReport"
        @click="goToNextStep"
      >
        {{ t('discovery.proceedToLicense') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import {
  currentStep,
  loadingDiscovery,
  discoveryReport,
  fetchSystemDiscovery,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

const isEnablingHyperV = ref(false);

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
</script>

<style scoped>
.screen-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-box {
  margin-bottom: 16px;
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

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #1976D2;
  border-radius: 50%;
  animation: spin 0.9s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-msg {
  color: var(--text-muted, #94A3B8);
  font-size: 13px;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: hidden;
  padding-right: 2px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 960px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.diag-card {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.diag-card:hover {
  transform: translateY(-2px);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: var(--card-hover-shadow, 0 8px 25px -4px rgba(0, 0, 0, 0.45));
}

.diag-card.border-ok {
  border-inline-start: 4px solid #10B981;
}

.diag-card.border-warn {
  border-inline-start: 4px solid #F59E0B;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.card-header .icon {
  font-size: 14px;
}

.card-header .label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted, #A1A1AA);
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main, #F8FAFC);
  margin-bottom: 4px;
}

.text-accent {
  color: var(--accent-sky, #38BDF8);
}

.text-emerald {
  color: #34D399;
}

.text-amber {
  color: #FBBF24;
}

.metric-sub {
  font-size: 11px;
  color: var(--text-muted, #71717A);
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hyperv-enable-banner {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: var(--radius-card, 14px);
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.15);
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-svg {
  width: 17px;
  height: 17px;
  stroke: #38BDF8;
}

.banner-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-svg {
  width: 22px;
  height: 22px;
  stroke: #FBBF24;
}

.banner-desc strong {
  display: block;
  font-size: 12px;
  color: #FBBF24;
}

.banner-desc p {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: #FCD34D;
}

.btn-hyperv-act {
  background: #D97706;
  color: #FFFFFF;
  padding: 6px 14px;
  font-size: 11px;
  border-radius: var(--radius-inner, 10px);
  white-space: nowrap;
}

.btn-hyperv-act:hover:not(:disabled) {
  background: #B45309;
}

.disks-section {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 12px 14px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #D4D4D8);
  margin-bottom: 8px;
}

.disks-count {
  font-size: 11px;
  color: var(--text-muted, #71717A);
}

.table-wrapper {
  overflow-x: auto;
}

.disks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.disks-table th {
  text-align: start;
  padding: 6px 10px;
  color: var(--text-muted, #71717A);
  font-weight: 600;
  border-bottom: 1px solid var(--border-color, #27272A);
}

.disks-table td {
  padding: 6px 10px;
  color: var(--text-secondary, #D4D4D8);
  border-bottom: 1px solid var(--border-color, #27272A);
}

.recommended-row {
  background: rgba(25, 118, 210, 0.08);
}

.badge-pill {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
}

.badge-primary {
  background: rgba(25, 118, 210, 0.2);
  color: var(--accent-sky, #38BDF8);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.badge-neutral {
  background: var(--bg-sub, #27272A);
  color: var(--text-muted, #A1A1AA);
}

.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
}

.diag-summary-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted, #A1A1AA);
}

.dot-live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #E4E4E7);
}

.btn-secondary:hover {
  background: var(--border-color, #3F3F46);
}
</style>
