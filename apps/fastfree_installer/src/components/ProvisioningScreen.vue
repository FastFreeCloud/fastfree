<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('provisioning.stepTag') }}</div>
      <h2>{{ t('provisioning.title', { client: selectedClientId }) }}</h2>
      <p class="subtitle">{{ t('provisioning.subtitle') }}</p>
    </div>

    <div class="content-body">
      <!-- Big Progress Card -->
      <div class="progress-hero-card" :class="{ 'is-failed': isFailed }">
        <div class="hero-top">
          <div class="phase-badge">
            <span v-if="!isDone && !isFailed" class="spinner-tiny"></span>
            <span v-else-if="isFailed" class="fail-tiny">✕</span>
            <span v-else class="check-tiny">✓</span>
            <span :class="{ 'text-red': isFailed }">{{ currentPhaseText }}</span>
          </div>
          <span class="pct-text" :class="{ 'text-red': isFailed }">{{ isFailed ? '!' : `${progress}%` }}</span>
        </div>

        <div class="progress-track">
          <div
            class="progress-bar-fill"
            :style="{ width: `${progress}%` }"
            :class="{ 'bar-complete': isDone && !isFailed, 'bar-failed': isFailed }"
          ></div>
        </div>

        <div class="stats-row">
          <span>{{ t('provisioning.targetDrive', { path: `${targetDiskDrive}FastFree\\VMs\\${selectedClientId}.vhdx` }) }}</span>
          <span>{{ t('provisioning.vcpuRam', { cores: assignedCpuCores, ram: (assignedRamMb / 1024).toFixed(0) }) }}</span>
        </div>
      </div>

      <!-- Real Error Banner if Provisioning Fails -->
      <div v-if="isFailed" class="error-banner">
        <div class="error-banner-icon">⚠️</div>
        <div class="error-banner-content">
          <div class="error-banner-title">
            {{ isRtl ? 'تعذر إتمام تهيئة وتثبيت الآلة في Hyper-V' : 'Hyper-V Appliance Provisioning Failed' }}
          </div>
          <div class="error-banner-msg font-mono text-xs">{{ errorMessage }}</div>
          <div class="error-banner-actions">
            <button class="btn-retry" @click="retryProvisioning">
              🔄 {{ isRtl ? 'إعادة المحاولة' : 'Retry Provisioning' }}
            </button>
            <button class="btn-back-sizing" @click="currentStep = 3">
              ⚙️ {{ isRtl ? 'تعديل موارد العتاد (الأنوية والرام)' : 'Adjust Hardware Sizing' }}
            </button>
          </div>
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
        <span v-if="isFailed" class="status-failed">
          <span class="dot-red-pulse"></span>
          <span>{{ isRtl ? 'فشل التثبيت — انظر التقرير أعلاه' : 'Provisioning Failed — Check Details' }}</span>
        </span>
        <span v-else-if="!isDone" class="status-live">
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
        :disabled="!isDone || isFailed"
        @click="currentStep = 6"
      >
        {{ t('provisioning.continueToLaunchpad') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  currentStep,
  selectedClientId,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';
import { logInfo, logError, logSuccess } from '../composables/useDiagnostics';

const { t, isRtl } = useI18n();

const progress = ref(5);
const isDone = ref(false);
const isFailed = ref(false);
const errorMessage = ref('');
const currentPhaseText = ref('');
const logs = ref<string[]>([]);
const logContainer = ref<HTMLElement | null>(null);

let unlistenStep: UnlistenFn | null = null;
let unlistenFail: UnlistenFn | null = null;

onMounted(async () => {
  currentPhaseText.value = isRtl.value ? 'بدء تجهيز البيئة...' : 'Initializing environment...';
  await setupEventListeners();
  await runProvisioning();
});

onUnmounted(() => {
  if (unlistenStep) unlistenStep();
  if (unlistenFail) unlistenFail();
});

async function setupEventListeners() {
  try {
    unlistenStep = await listen<{ step: number; phase: string; message: string; success: boolean }>(
      'provision-step',
      async (event) => {
        const payload = event.payload;
        if (payload.step === 1) {
          progress.value = 25;
          currentPhaseText.value = payload.phase;
        } else if (payload.step === 2) {
          progress.value = 50;
          currentPhaseText.value = payload.phase;
        } else if (payload.step === 3) {
          progress.value = 75;
          currentPhaseText.value = payload.phase;
        } else if (payload.step === 4) {
          progress.value = 100;
          currentPhaseText.value = payload.phase;
        }
        await addLog(`[${payload.phase}] ${payload.message}`);
      }
    );

    unlistenFail = await listen<string>('provision-failed', async (event) => {
      isFailed.value = true;
      isDone.value = false;
      errorMessage.value = event.payload;
      currentPhaseText.value = isRtl.value ? 'فشل التثبيت في Hyper-V' : 'Hyper-V Provisioning Failed';
      await addLog(`[ERROR] ${event.payload}`);
    });
  } catch (err) {
    console.warn('Could not register Tauri provision event listeners:', err);
  }
}

async function addLog(text: string) {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${text}`);
  await nextTick();
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
}

async function retryProvisioning() {
  isFailed.value = false;
  errorMessage.value = '';
  progress.value = 5;
  isDone.value = false;
  logs.value = [];
  await runProvisioning();
}

async function runProvisioning() {
  isFailed.value = false;
  errorMessage.value = '';
  isDone.value = false;
  progress.value = 10;

  const safeAlignedRam = Math.max(1024, Math.floor(((assignedRamMb.value || 8192) + 64) / 128) * 128);

  logInfo('Provisioning', `Starting deployment for ${selectedClientId.value}...`);
  await addLog(`Starting automated deployment pipeline for ${selectedClientId.value}...`);
  await addLog(`Selected Drive: ${targetDiskDrive.value} | Cores: ${assignedCpuCores.value} | Aligned RAM: ${safeAlignedRam} MB`);
  currentPhaseText.value = isRtl.value ? 'جارٍ تهيئة قرص التخزين ومحول الشبكة...' : 'Configuring storage and virtual switch...';

  try {
    const realLogs = await invoke<Array<{ step: number; phase: string; message: string; success: boolean }>>(
      'provision_node',
      {
        clientId: selectedClientId.value,
        cores: assignedCpuCores.value || 4,
        ramMb: safeAlignedRam,
        targetDrive: targetDiskDrive.value || 'C:\\',
      }
    );

    // If events weren't already printed, ensure returned logs are logged
    for (const r of realLogs) {
      const exists = logs.value.some((l) => l.includes(r.message));
      if (!exists) {
        await addLog(`[${r.phase}] ${r.message}`);
      }
    }

    progress.value = 100;
    isDone.value = true;
    currentPhaseText.value = isRtl.value ? 'تم التثبيت والتحقق بنجاح!' : 'Provisioning Completed & Verified!';

    try {
      localStorage.setItem('fastfree_provisioned', 'true');
    } catch (err) {
      console.warn('Storage save error:', err);
    }
    logSuccess('Provisioning', `Appliance ${selectedClientId.value} provisioned and verified in Hyper-V Running state!`);
    await addLog(`Provisioning verified. Virtual machine is Running and ready.`);
  } catch (err: any) {
    const msg = String(err?.message || err);
    console.warn('Real Hyper-V provisioning error:', err);
    isFailed.value = true;
    isDone.value = false;
    errorMessage.value = msg;
    currentPhaseText.value = isRtl.value ? 'فشل التثبيت في Hyper-V' : 'Hyper-V Provisioning Failed';
    logError('Provisioning', `Failed to deploy appliance ${selectedClientId.value}`, msg);
    await addLog(`[ERROR] Hyper-V Provisioning Error: ${msg}`);
  }
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
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
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
  border-radius: var(--radius-pill, 9999px);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976D2, #38BDF8);
  border-radius: var(--radius-pill, 9999px);
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
  min-height: 0;
  background: var(--bg-stream, #09090B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
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

.status-failed {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #EF4444;
  font-weight: 600;
}

.dot-red-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #EF4444;
  box-shadow: 0 0 8px #EF4444;
  animation: pulse-red 1.5s infinite;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.fail-tiny {
  color: #EF4444;
  font-weight: 700;
}

.text-red {
  color: #EF4444 !important;
}

.bar-failed {
  background: linear-gradient(90deg, #EF4444, #DC2626) !important;
}

.progress-hero-card.is-failed {
  border-color: rgba(239, 68, 68, 0.4);
}

.error-banner {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.error-banner-icon {
  font-size: 20px;
}

.error-banner-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-banner-title {
  color: #F87171;
  font-size: 13px;
  font-weight: 700;
}

.error-banner-msg {
  color: var(--text-secondary, #D4D4D8);
  font-size: 11px;
  line-height: 1.4;
  word-break: break-all;
}

.error-banner-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.btn-retry {
  background: #DC2626;
  color: #FFFFFF;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-retry:hover {
  background: #B91C1C;
}

.btn-back-sizing {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main, #F8FAFC);
  border: 1px solid var(--border-color, #3F3F46);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-back-sizing:hover {
  background: rgba(255, 255, 255, 0.15);
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
