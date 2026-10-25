<template>
  <div class="screen-container">
    <div class="header-box">
      <div class="step-tag">Step 3 of 6</div>
      <h2>Sovereign Node Sizing & Hyper-V Resource Allocation</h2>
      <p class="subtitle">
        Assign dedicated virtual hardware resources clamped safely within host headroom limits.
      </p>
    </div>

    <div class="content-body">
      <!-- Target Node Appliance Selector -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label" for="client-select">Target Sovereign Appliance Identity:</label>
          <span class="topology-badge">Fleet Topology: Hyper-V Guest</span>
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
            {{ client }} (FastFree Sovereign Appliance Node — Hyper-V)
          </option>
        </select>
        <p class="hint-text">
          `client1` operates as the central VPS WireGuard controller. Client nodes <code>client2</code> through <code>client11</code> connect as isolated enterprise peers.
        </p>
      </div>

      <!-- CPU Sizing Slider -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label">
            Assigned vCPU Cores: <strong class="text-accent">{{ assignedCpuCores }} Cores</strong>
          </label>
          <span class="sub-stat">Host: {{ totalHostCores }} Physical/Logical Cores</span>
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
            <span>{{ minCores }} Cores (Min)</span>
            <span class="text-accent font-semibold">Recommended: {{ recommendedCores }} Cores</span>
            <span>{{ maxCores }} Cores (Max Clamped)</span>
          </div>
        </div>
      </div>

      <!-- RAM Sizing Slider -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label">
            Assigned Memory (RAM):
            <strong class="text-accent">{{ (assignedRamMb / 1024).toFixed(1) }} GB</strong>
            <span class="text-muted">({{ assignedRamMb }} MB)</span>
          </label>
          <span class="sub-stat">Host Total: {{ (totalHostRamMb / 1024).toFixed(1) }} GB</span>
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
            <span>{{ (minRamMb / 1024).toFixed(0) }} GB (Min)</span>
            <span class="text-accent font-semibold">Recommended: {{ (recommendedRamMb / 1024).toFixed(0) }} GB</span>
            <span>{{ (maxRamMb / 1024).toFixed(0) }} GB (Max Clamped)</span>
          </div>
        </div>
      </div>

      <!-- Storage Destination -->
      <div class="config-card">
        <div class="card-title-row">
          <label class="config-label" for="drive-select">Destination Storage Drive for VHDX:</label>
          <span class="sub-stat">Dynamic VHDX (Min 30 GB Free)</span>
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
            {{ disk.name || disk.mount_point }} ({{ disk.mount_point }}) — {{ disk.available_space_gb.toFixed(1) }} GB Free ({{ disk.file_system }})
          </option>
        </select>
      </div>

      <!-- Allocation Summary Pill -->
      <div class="allocation-summary-box">
        <div class="summary-item">
          <span class="sum-label">Host RAM Preserved</span>
          <span class="sum-val text-emerald">{{ ((totalHostRamMb - assignedRamMb) / 1024).toFixed(1) }} GB</span>
        </div>
        <div class="summary-item">
          <span class="sum-label">Workload Class</span>
          <span class="sum-val text-accent">
            {{ assignedRamMb >= 8192 ? 'High-Performance Production ERP' : 'Standard Enterprise Sovereign' }}
          </span>
        </div>
        <div class="summary-item">
          <span class="sum-label">Virtual Switch</span>
          <span class="sum-val">FastFree-Default-Switch (NAT + WG)</span>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="currentStep = 2">
        ← Back to License
      </button>
      <button class="btn btn-primary" @click="currentStep = 4">
        Inspect WireGuard Mesh Topology →
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
  margin-bottom: 16px;
}

.step-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #38BDF8;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.header-box h2 {
  font-size: 22px;
  font-weight: 700;
  color: #F8FAFC;
  margin: 0;
}

.subtitle {
  color: #94A3B8;
  font-size: 13px;
  margin-top: 4px;
  margin-bottom: 0;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.config-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-label {
  font-size: 13px;
  font-weight: 600;
  color: #E4E4E7;
}

.topology-badge {
  font-size: 10px;
  font-weight: 600;
  background: rgba(56, 189, 248, 0.15);
  color: #38BDF8;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.sub-stat {
  font-size: 11px;
  color: #71717A;
}

.custom-select {
  width: 100%;
  background: #09090B;
  border: 1px solid #3F3F46;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #F8FAFC;
  outline: none;
}

.custom-select:focus {
  border-color: #38BDF8;
}

.hint-text {
  font-size: 11px;
  color: #71717A;
  margin: 0;
}

.hint-text code {
  color: #38BDF8;
}

.slider-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.range-slider {
  width: 100%;
  height: 6px;
  background: #27272A;
  border-radius: 3px;
  outline: none;
  accent-color: #1976D2;
  cursor: pointer;
}

.slider-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #71717A;
}

.allocation-summary-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: #09090B;
  border: 1px solid #27272A;
  border-radius: 8px;
  padding: 10px 14px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sum-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #71717A;
}

.sum-val {
  font-size: 12px;
  font-weight: 600;
  color: #E4E4E7;
}

.text-accent {
  color: #38BDF8;
}

.text-emerald {
  color: #34D399;
}

.text-muted {
  font-size: 11px;
  color: #71717A;
  font-weight: normal;
}

.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #27272A;
}

.btn {
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #1976D2;
  color: #FFFFFF;
}

.btn-primary:hover {
  background: #1565C0;
  box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
}

.btn-secondary {
  background: #27272A;
  color: #E4E4E7;
}

.btn-secondary:hover {
  background: #3F3F46;
}
</style>
