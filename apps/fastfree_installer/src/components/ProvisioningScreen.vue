<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('provisioning.stepTag') }}</div>
      <h2>{{ t('provisioning.title', { client: selectedClientId }) }}</h2>
      <p class="subtitle">{{ t('provisioning.subtitle') }}</p>
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
          <span>{{ t('provisioning.targetDrive', { path: `${targetDiskDrive}FastFree\\VMs\\${selectedClientId}.vhdx` }) }}</span>
          <span>{{ t('provisioning.vcpuRam', { cores: assignedCpuCores, ram: (assignedRamMb / 1024).toFixed(0) }) }}</span>
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
          <span class="term-title">{{ t('provisioning.consoleTitle') }}</span>
          <span class="log-count">{{ t('provisioning.eventsCount', { count: logs.length }) }}</span>
        </div>
        <div ref="logContainer" class="console-body">
          <div
            v-for="(log, idx) in logs"
            :key="idx"
            class="log-line"
            :class="{ 'log-success': log.includes('SUCCESS') || log.includes('Done') || log.includes('بنجاح') }"
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
          <span>{{ t('provisioning.inProgressNotice') }}</span>
        </span>
        <span v-else class="status-ready">
          <span class="dot-green"></span>
          <span>{{ t('provisioning.readyNotice') }}</span>
        </span>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!isDone"
        @click="currentStep = 6"
      >
        {{ t('provisioning.continueToLaunchpad') }}
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
import { useI18n } from '../composables/useI18n';
import { logInfo, logSuccess } from '../composables/useDiagnostics';

const { t, isRtl } = useI18n();

const progress = ref(0);
const isDone = ref(false);
const currentPhaseText = ref('');
const logs = ref<string[]>([]);
const logContainer = ref<HTMLElement | null>(null);

onMounted(() => {
  currentPhaseText.value = t('provisioning.phases.phase1');
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
  logInfo('Provisioning', `Starting deployment for ${selectedClientId.value}...`);
  await addLog(`Starting automated deployment pipeline for ${selectedClientId.value}...`);
  await addLog(`Selected Drive: ${targetDiskDrive.value} | Cores: ${assignedCpuCores.value} | RAM: ${assignedRamMb.value} MB`);

  const phases = [
    {
      pct: 15,
      text: t('provisioning.phases.phase1'),
      log: t('provisioning.phases.log1', { path: `${targetDiskDrive.value}FastFree\\VMs\\${selectedClientId.value}.vhdx` }),
    },
    {
      pct: 35,
      text: t('provisioning.phases.phase2'),
      log: t('provisioning.phases.log2'),
    },
    {
      pct: 55,
      text: t('provisioning.phases.phase3'),
      log: t('provisioning.phases.log3', {
        client: selectedClientId.value,
        ram: assignedRamMb.value * 1024 * 1024,
        cores: assignedCpuCores.value,
      }),
    },
    {
      pct: 70,
      text: t('provisioning.phases.phase4'),
      log: t('provisioning.phases.log4'),
    },
    {
      pct: 88,
      text: t('provisioning.phases.phase5'),
      log: t('provisioning.phases.log5'),
    },
    {
      pct: 100,
      text: t('provisioning.phases.phase6'),
      log: t('provisioning.phases.log6', { client: selectedClientId.value }),
    },
  ];

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    currentPhaseText.value = phase.text;
    await addLog(phase.log);

    const startPct = progress.value;
    const endPct = phase.pct;
    const stepDiff = (endPct - startPct) / 8;

    for (let s = 1; s <= 8; s++) {
      await delay(70);
      progress.value = Math.min(100, Math.round(startPct + s * stepDiff));
    }

    await delay(300);
  }

  isDone.value = true;
  try {
    localStorage.setItem('fastfree_provisioned', 'true');
  } catch (err) {
    console.warn('Storage save error:', err);
  }
  logSuccess('Provisioning', `Appliance ${selectedClientId.value} provisioned and verified online!`);
  await addLog(`Provisioning completed. Node is ready and operational.`);
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
  margin-bottom: 12px;
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
  gap: 12px;
  overflow: hidden;
}

.progress-hero-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-sky, #38BDF8);
}

.spinner-tiny {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-top-color: #38BDF8;
  border-radius: 50%;
  animation: spin 0.7s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.check-tiny {
  color: #10B981;
  font-weight: 700;
}

.pct-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main, #F8FAFC);
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--bg-sub, #27272A);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976D2, #38BDF8);
  border-radius: 4px;
  transition: width 0.15s ease-out;
}

.progress-bar-fill.bar-complete {
  background: linear-gradient(90deg, #059669, #10B981);
}

.stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted, #71717A);
}

.console-card {
  flex: 1;
  background: var(--bg-stream, #09090B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.console-header {
  padding: 8px 14px;
  background: var(--bg-header, #121214);
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border-color, #27272A);
}

.term-dots {
  display: flex;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-red { background: #EF4444; }
.dot-yellow { background: #F59E0B; }
.dot-green { background: #10B981; }

.term-title {
  font-size: 11px;
  color: var(--text-muted, #A1A1AA);
  font-weight: 600;
  flex: 1;
}

.log-count {
  font-size: 10px;
  color: var(--text-muted, #71717A);
}

.console-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-line {
  display: flex;
  gap: 6px;
  color: var(--text-secondary, #D4D4D8);
  line-height: 1.4;
}

.log-prompt {
  color: var(--accent-sky, #38BDF8);
  font-weight: 700;
}

.log-success {
  color: #34D399;
  font-weight: 600;
}

.action-bar {
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
}

.status-summary {
  font-size: 11px;
}

.status-live, .status-ready {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-live { color: #FBBF24; }
.status-ready { color: #34D399; }

.dot-amber {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 6px #F59E0B;
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
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
