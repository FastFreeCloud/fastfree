<template>
  <div class="screen-container">
    <div class="header-box">
      <div class="step-tag">Step 1 of 6</div>
      <h2>Host Discovery & System Diagnostics</h2>
      <p class="subtitle">
        Probing local hardware capabilities, virtualization extensions, and NVMe/SSD storage.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loadingDiscovery" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-msg">Probing low-level system telemetry via Windows Win32 API & Sysinfo...</p>
    </div>

    <!-- Discovery Data Grid -->
    <div v-else-if="discoveryReport" class="content-body">
      <div class="cards-grid">
        <!-- Identity Card -->
        <div class="diag-card">
          <div class="card-header">
            <span class="icon">💻</span>
            <span class="label">Host Machine Identity</span>
          </div>
          <div class="metric-value text-accent">{{ discoveryReport.host_name }}</div>
          <div class="metric-sub">
            Logged User: <strong>{{ discoveryReport.user_name }}</strong> (Administrator Privileges)
          </div>
        </div>

        <!-- CPU Card -->
        <div class="diag-card">
          <div class="card-header">
            <span class="icon">⚡</span>
            <span class="label">Processor Topology</span>
          </div>
          <div class="metric-value">{{ discoveryReport.cpu_count }} Logical Cores</div>
          <div class="metric-sub truncate" :title="discoveryReport.cpu_brand">
            {{ discoveryReport.cpu_brand }}
          </div>
        </div>

        <!-- RAM Card -->
        <div class="diag-card">
          <div class="card-header">
            <span class="icon">🧠</span>
            <span class="label">Physical Memory (RAM)</span>
          </div>
          <div class="metric-value">{{ (discoveryReport.total_memory_mb / 1024).toFixed(1) }} GB Total</div>
          <div class="metric-sub">
            Available Headroom: <strong>{{ (discoveryReport.available_memory_mb / 1024).toFixed(1) }} GB</strong>
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
            <span class="label">Hyper-V Hypervisor</span>
          </div>
          <div
            class="metric-value"
            :class="discoveryReport.hyperv.ready_for_hyperv ? 'text-emerald' : 'text-amber'"
          >
            {{ discoveryReport.hyperv.ready_for_hyperv ? 'Operational & Ready' : 'Configuration Notice' }}
          </div>
          <div class="metric-sub">{{ discoveryReport.hyperv.status_reason }}</div>
        </div>
      </div>

      <!-- Disks Table -->
      <div class="disks-section">
        <div class="section-title">
          <span>Target Storage Drives</span>
          <span class="disks-count">{{ discoveryReport.disks.length }} Drives Detected</span>
        </div>
        <div class="table-wrapper">
          <table class="disks-table">
            <thead>
              <tr>
                <th>Drive</th>
                <th>Mount</th>
                <th>File System</th>
                <th>Total Capacity</th>
                <th>Free Space</th>
                <th>Status</th>
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
                <td>{{ disk.total_space_gb.toFixed(1) }} GB</td>
                <td>
                  <span :class="disk.available_space_gb >= 30 ? 'text-emerald' : 'text-amber'">
                    {{ disk.available_space_gb.toFixed(1) }} GB Free
                  </span>
                </td>
                <td>
                  <span
                    v-if="disk.mount_point === discoveryReport.recommendation.target_disk_drive"
                    class="badge-pill badge-primary"
                  >
                    Recommended for VHDX
                  </span>
                  <span v-else class="badge-pill badge-neutral">Available</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Error or Fallback -->
    <div v-else class="error-state">
      <p class="error-msg">Failed to retrieve host diagnostic report.</p>
      <button class="btn btn-secondary" @click="fetchSystemDiscovery">Retry Discovery</button>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="diag-summary-pill">
        <span class="dot-live"></span>
        <span>Host Environment Compatible</span>
      </div>
      <button
        class="btn btn-primary"
        :disabled="loadingDiscovery || !discoveryReport"
        @click="goToNextStep"
      >
        Proceed to License Activation →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  currentStep,
  loadingDiscovery,
  discoveryReport,
  fetchSystemDiscovery,
} from '../composables/useDiscovery';

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
  margin-bottom: 20px;
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
  color: #94A3B8;
  font-size: 13px;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  padding-right: 4px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.diag-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;
}

.diag-card:hover {
  border-color: #3F3F46;
}

.diag-card.border-ok {
  border-left: 4px solid #10B981;
}

.diag-card.border-warn {
  border-left: 4px solid #F59E0B;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.card-header .icon {
  font-size: 15px;
}

.card-header .label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #A1A1AA;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 19px;
  font-weight: 700;
  color: #F8FAFC;
  margin-bottom: 4px;
}

.text-accent {
  color: #38BDF8;
}

.text-emerald {
  color: #34D399;
}

.text-amber {
  color: #FBBF24;
}

.metric-sub {
  font-size: 11px;
  color: #71717A;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disks-section {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 12px 16px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #D4D4D8;
  margin-bottom: 10px;
}

.disks-count {
  font-size: 11px;
  color: #71717A;
}

.table-wrapper {
  overflow-x: auto;
}

.disks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.disks-table th {
  text-align: left;
  padding: 8px 10px;
  color: #71717A;
  font-weight: 600;
  border-bottom: 1px solid #27272A;
}

.disks-table td {
  padding: 8px 10px;
  color: #D4D4D8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
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
  color: #38BDF8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.badge-neutral {
  background: #27272A;
  color: #A1A1AA;
}

.action-bar {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #27272A;
}

.diag-summary-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #A1A1AA;
}

.dot-live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
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

.btn-primary:hover:not(:disabled) {
  background: #1565C0;
  box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #27272A;
  color: #E4E4E7;
}

.btn-secondary:hover {
  background: #3F3F46;
}
</style>
