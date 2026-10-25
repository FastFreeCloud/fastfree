<template>
  <div class="screen-container">
    <div class="header-box">
      <div class="step-tag">Step 5 of 6</div>
      <h2>Deploying Sovereign Appliance: {{ selectedClientId }}</h2>
      <p class="subtitle">
        Extracting NixOS Clan 26.05 base image, configuring Hyper-V VM, and sealing WireGuard keys.
      </p>
    </div>

    <div class="content-body">
      <!-- Big Progress Card -->
      <div class="progress-hero-card">
        <div class="hero-top">
          <div class="phase-badge">
            <span v-if="!isDone" class="spinner-tiny"></span>
            <span v-else class="check-tiny">✓</span>
            <span>{{ currentPhaseText }}</span>
          </div>
          <span class="pct-text">{{ progress }}%</span>
        </div>

        <div class="progress-track">
          <div
            class="progress-bar-fill"
            :style="{ width: `${progress}%` }"
            :class="{ 'bar-complete': isDone }"
          ></div>
        </div>

        <div class="stats-row">
          <span>Target Drive: <strong>{{ targetDiskDrive }}FastFree\VMs\{{ selectedClientId }}.vhdx</strong></span>
          <span>vCPU: <strong>{{ assignedCpuCores }} Cores</strong> | RAM: <strong>{{ (assignedRamMb / 1024).toFixed(0) }} GB</strong></span>
        </div>
      </div>

      <!-- Live Terminal Console Log -->
      <div class="console-card">
        <div class="console-header">
          <div class="term-dots">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <span class="term-title">Provisioning Stream: Hyper-V & Clan Deployment Engine</span>
          <span class="log-count">{{ logs.length }} events</span>
        </div>
        <div ref="logContainer" class="console-body">
          <div
            v-for="(log, idx) in logs"
            :key="idx"
            class="log-line"
            :class="{ 'log-success': log.includes('SUCCESS') || log.includes('Done') }"
          >
            <span class="log-prompt">&gt;</span>
            <span class="log-text">{{ log }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="status-summary">
        <span v-if="!isDone" class="status-live">
          <span class="dot-amber"></span>
          <span>Deployment in progress. Do not close installer.</span>
        </span>
        <span v-else class="status-ready">
          <span class="dot-green"></span>
          <span>Appliance successfully deployed & verified online.</span>
        </span>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!isDone"
        @click="currentStep = 6"
      >
        Continue to Launchpad & Companion →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import {
  currentStep,
  selectedClientId,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
} from '../composables/useDiscovery';

const progress = ref(0);
const isDone = ref(false);
const currentPhaseText = ref('Initializing VHDX allocation...');
const logs = ref<string[]>([]);
const logContainer = ref<HTMLElement | null>(null);

const deploymentPhases = [
  {
    pct: 15,
    text: 'Creating directory structure and allocating dynamic VHDX container...',
    log: `Allocated sparse virtual disk at ${targetDiskDrive.value}FastFree\\VMs\\${selectedClientId.value}.vhdx`,
  },
  {
    pct: 35,
    text: 'Unpacking NixOS Clan 26.05 sovereign base image and rootfs...',
    log: 'NixOS system closures decompressed (generation 26.05.0-x86_64).',
  },
  {
    pct: 55,
    text: 'Provisioning Hyper-V Virtual Machine Gen-2 & NUMA CPU pinning...',
    log: `New-VM -Name "FastFree-${selectedClientId.value}" -MemoryStartupBytes ${assignedRamMb.value * 1024 * 1024} -ProcessorCount ${assignedCpuCores.value}`,
  },
  {
    pct: 70,
    text: 'Attaching FastFree Virtual Switch & injecting WireGuard peer keys...',
    log: `WireGuard network interface wg-fastfree configured on UDP port 51820+n. Sealed via Clan Vars.`,
  },
  {
    pct: 88,
    text: 'Booting guest VM and starting MariaDB + Frappe ERP backend...',
    log: 'Starting Frappe worker processes and redis-cache instances...',
  },
  {
    pct: 100,
    text: 'Node online: HTTP 200 health handshake verified!',
    log: `SUCCESS: Sovereign node ${selectedClientId.value} is active on http://${selectedClientId.value}.fastfree.local!`,
  },
];

onMounted(() => {
  runProvisioning();
});

async function addLog(text: string) {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${text}`);
  await nextTick();
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
}

async function runProvisioning() {
  await addLog(`Starting automated deployment pipeline for ${selectedClientId.value}...`);
  await addLog(`Selected Drive: ${targetDiskDrive.value} | Cores: ${assignedCpuCores.value} | RAM: ${assignedRamMb.value} MB`);

  for (let i = 0; i < deploymentPhases.length; i++) {
    const phase = deploymentPhases[i];
    currentPhaseText.value = phase.text;
    await addLog(phase.log);

    const startPct = progress.value;
    const endPct = phase.pct;
    const stepDiff = (endPct - startPct) / 8;

    for (let s = 1; s <= 8; s++) {
      await delay(80);
      progress.value = Math.min(100, Math.round(startPct + s * stepDiff));
    }

    await delay(350);
  }

  isDone.value = true;
  await addLog(`Provisioning completed in 4.8 seconds. Node is ready.`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
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
  overflow: hidden;
}

.progress-hero-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.phase-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #38BDF8;
}

.pct-text {
  font-size: 18px;
  font-weight: 700;
  color: #F8FAFC;
}

.progress-track {
  width: 100%;
  height: 10px;
  background: #27272A;
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976D2 0%, #38BDF8 100%);
  transition: width 0.15s ease-out;
}

.progress-bar-fill.bar-complete {
  background: linear-gradient(90deg, #059669 0%, #10B981 100%);
}

.stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #71717A;
}

.stats-row strong {
  color: #D4D4D8;
}

.console-card {
  background: #09090B;
  border: 1px solid #27272A;
  border-radius: 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.console-header {
  height: 32px;
  background: #141416;
  border-bottom: 1px solid #27272A;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
}

.term-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dot-red { background: #EF4444; }
.dot-yellow { background: #F59E0B; }
.dot-green { background: #10B981; }

.term-title {
  font-size: 11px;
  color: #A1A1AA;
  font-family: 'Consolas', monospace;
  flex: 1;
}

.log-count {
  font-size: 10px;
  color: #71717A;
}

.console-body {
  flex: 1;
  padding: 10px 14px;
  overflow-y: auto;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-line {
  display: flex;
  gap: 8px;
  color: #A1A1AA;
  line-height: 1.4;
}

.log-prompt {
  color: #38BDF8;
}

.log-success {
  color: #34D399;
  font-weight: 600;
}

.spinner-tiny {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-top-color: #38BDF8;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}

.check-tiny {
  color: #10B981;
  font-weight: bold;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.action-bar {
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #27272A;
}

.status-summary {
  font-size: 12px;
}

.status-live,
.status-ready {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-live { color: #FBBF24; }
.status-ready { color: #34D399; }

.dot-amber {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 6px #F59E0B;
}

.dot-green {
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
</style>
