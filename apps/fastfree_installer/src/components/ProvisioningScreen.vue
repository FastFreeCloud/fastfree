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
            <span v-else-if="isFailed" class="fail-tiny">
              <svg aria-hidden="true" class="phase-svg-fail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            <span v-else class="check-tiny">
              <svg aria-hidden="true" class="phase-svg-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
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

        <!-- 5-Stage Visual Pipeline Stepper -->
        <div class="pipeline-stepper">
          <div
            v-for="(stage, sIdx) in pipelineStages"
            :key="stage.id"
            class="pipeline-pill"
            :class="{
              'is-active': currentStageNumber === sIdx + 1 && !isDone && !isFailed,
              'is-completed': currentStageNumber > sIdx + 1 || isDone,
              'is-failed': isFailed && currentStageNumber === sIdx + 1
            }"
          >
            <span class="stage-step-num">{{ sIdx + 1 }}</span>
            <span class="stage-name">{{ isRtl ? stage.titleAr : stage.titleEn }}</span>
            <span v-if="currentStageNumber > sIdx + 1 || isDone" class="stage-check">✓</span>
          </div>
        </div>

        <div class="stats-row">
          <span>{{ t('provisioning.targetDrive', { path: `${targetDiskDrive}FastFree\\VMs\\${selectedClientId}.vhdx` }) }}</span>
          <span>{{ t('provisioning.vcpuRam', { cores: assignedCpuCores, ram: (assignedRamMb / 1024).toFixed(0) }) }}</span>
        </div>
      </div>

      <!-- Real Error Banner if Provisioning Fails -->
      <div v-if="isFailed" class="error-banner">
        <div class="error-banner-icon">
          <svg aria-hidden="true" class="err-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="error-banner-content">
          <div class="error-banner-title">
            {{ t('auto.hyper_v_appliance_provisioning_failed') }}
          </div>
          <div class="error-banner-msg font-mono text-xs">{{ errorMessage }}</div>
          <div class="error-banner-actions">
            <button class="btn-retry" @click="retryProvisioning">
              <span class="btn-flex">
                <svg aria-hidden="true" class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>{{ t('auto.retry_provisioning') }}</span>
              </span>
            </button>
            <button class="btn-back-sizing" @click="currentStep = 3">
              <span class="btn-flex">
                <svg aria-hidden="true" class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>{{ t('auto.adjust_hardware_sizing') }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Live Terminal Console Log -->
      <div class="console-card">
        <div class="console-header">
          <div class="win-term-badge">
            <span class="terminal-traffic-lights">
              <span class="term-dot dot-red"></span>
              <span class="term-dot dot-yellow"></span>
              <span class="term-dot dot-green"></span>
            </span>
            <svg aria-hidden="true" class="term-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span class="term-title">{{ t('provisioning.consoleTitle') }}</span>
          </div>
          <div class="header-actions">
            <span class="log-count">{{ t('provisioning.eventsCount', { count: logs.length }) }}</span>
            <button
              type="button"
              class="btn-console-act"
              :title="t('auto.copy_logs')" :aria-label="t('auto.copy_logs')"
              @click="copyAllLogs"
            >
              <svg aria-hidden="true" v-if="!isLogsCopied" class="copy-svg-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg aria-hidden="true" v-else class="copy-svg-mini text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{{ isLogsCopied ? (t('auto.copied')) : (t('auto.copy')) }}</span>
            </button>
            <button
              type="button"
              class="btn-console-act"
              :title="t('auto.clear_terminal')" :aria-label="t('auto.clear_terminal')"
              @click="logs = []"
            >
              <svg aria-hidden="true" class="copy-svg-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>{{ t('auto.clear') }}</span>
            </button>
          </div>
        </div>
        <div ref="logContainer" class="console-body" dir="ltr">
          <div
            v-for="item in parsedLogs"
            :key="item.id"
            class="log-line"
            :class="item.levelClass"
          >
            <span class="log-time font-mono">{{ item.time }}</span>
            <span class="log-prompt">&gt;</span>
            <span v-if="item.phase" class="log-phase-badge font-mono" :class="item.phaseClass">{{ item.phase }}</span>
            <span class="log-msg font-mono">{{ item.message }}</span>
            <span v-if="item.count > 1" class="log-repeat-pill font-mono">x{{ item.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="action-bar-start">
        <button v-if="isFailed" class="btn btn-secondary" @click="currentStep = 4">
          <span class="btn-flex">
            <svg aria-hidden="true" class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
            </svg>
            <span>{{ t('auto.back_to_fastfree_vpn') }}</span>
          </span>
        </button>
        <div v-else class="status-summary">
          <span v-if="!isDone" class="status-live">
            <span class="dot-amber"></span>
            <span>{{ t('provisioning.inProgressNotice') }}</span>
          </span>
          <span v-else class="status-ready">
            <span class="dot-green"></span>
            <span>{{ t('provisioning.readyNotice') }}</span>
          </span>
        </div>
      </div>

      <!-- CENTER: Persistent FastFree 3D Precision Timepiece -->
      <div class="action-bar-center">
        <FastFreeTimepiece />
      </div>

      <div class="action-bar-end">
        <button
          class="btn btn-primary btn-next"
          :disabled="!isDone || isFailed"
          @click="currentStep = 6"
        >
          <span class="btn-flex">
            <span>{{ t('provisioning.continueToLaunchpad') }}</span>
            <svg aria-hidden="true" class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
            </svg>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import FastFreeTimepiece from './FastFreeTimepiece.vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  currentStep,
  selectedClientId,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  hardenedSecurityEnabled,
  getVmRealState,
  provisioningLogs,
  isProvisioningDone,
  isProvisioningRunning,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';
import { logInfo, logError, logSuccess } from '../composables/useDiagnostics';

const { t, isRtl } = useI18n();

const progress = ref(isProvisioningDone.value ? 100 : 5);
const isDone = ref(isProvisioningDone.value);
const isFailed = ref(false);
const errorMessage = ref('');
const currentPhaseText = ref(
  isProvisioningDone.value
    ? (t('auto.provisioning_completed_verified'))
    : (t('auto.initializing_environment'))
);
const logs = provisioningLogs;
const logContainer = ref<HTMLElement | null>(null);

interface ParsedLog {
  id: number;
  time: string;
  phase?: string;
  message: string;
  levelClass: string;
  phaseClass: string;
  count: number;
}

const parsedLogs = computed<ParsedLog[]>(() => {
  return logs.value.map((raw, idx) => {
    let time = '';
    let rest = raw;
    let count = 1;

    // Check for repeat suffix (xN)
    const countMatch = rest.match(/\s\(x(\d+)\)$/);
    if (countMatch) {
      count = parseInt(countMatch[1], 10);
      rest = rest.slice(0, rest.length - countMatch[0].length);
    }

    const timeMatch = rest.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*/i);
    if (timeMatch) {
      time = timeMatch[1];
      rest = rest.slice(timeMatch[0].length);
    } else {
      time = new Date().toLocaleTimeString();
    }

    let phase = '';
    const phaseMatch = rest.match(/^\[([^\]]+)\]\s*/);
    if (phaseMatch) {
      phase = phaseMatch[1];
      rest = rest.slice(phaseMatch[0].length);
    }

    let levelClass = 'level-info';
    let phaseClass = 'phase-default';

    const lower = (phase + ' ' + rest).toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('فشل')) {
      levelClass = 'level-error';
      phaseClass = 'phase-error';
    } else if (
      lower.includes('success') ||
      lower.includes('verified') ||
      lower.includes('done') ||
      lower.includes('ready') ||
      lower.includes('running') ||
      lower.includes('بنجاح')
    ) {
      levelClass = 'level-success';
      phaseClass = 'phase-success';
    } else if (lower.includes('warn') || lower.includes('notice') || lower.includes('تنبيه')) {
      levelClass = 'level-warn';
      phaseClass = 'phase-warn';
    } else if (phase) {
      phaseClass = 'phase-accent';
    }

    return {
      id: idx,
      time,
      phase,
      message: rest,
      levelClass,
      phaseClass,
      count,
    };
  });
});

const pipelineStages = [
  { id: 'storage', titleEn: 'VHDX Disk', titleAr: 'قرص VHDX' },
  { id: 'image', titleEn: 'NixOS Clan 26.05', titleAr: 'نظام Clan 26.05' },
  { id: 'vm', titleEn: 'Gen-2 Hyper-V', titleAr: 'بيئة Hyper-V' },
  { id: 'mesh', titleEn: 'FastFree VPN Mesh', titleAr: 'شبكة FastFree VPN' },
  { id: 'boot', titleEn: 'Frappe ERP Active', titleAr: 'خدمات ERP' },
];

const currentStageNumber = computed(() => {
  if (isDone.value) return 5;
  if (progress.value >= 80) return 5;
  if (progress.value >= 60) return 4;
  if (progress.value >= 40) return 3;
  if (progress.value >= 20) return 2;
  return 1;
});

const isLogsCopied = ref(false);
async function copyAllLogs() {
  try {
    const formatted = parsedLogs.value
      .map((l) => `[${l.time}] > ${l.phase ? `[${l.phase}] ` : ''}${l.message}${l.count > 1 ? ` (x${l.count})` : ''}`)
      .join('\n');
    await navigator.clipboard.writeText(formatted);
    isLogsCopied.value = true;
    setTimeout(() => {
      isLogsCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy logs', err);
  }
}

let unlistenStep: UnlistenFn | null = null;
let unlistenFail: UnlistenFn | null = null;

onMounted(async () => {
  await setupEventListeners();

  // If already provisioned, do not re-provision
  if (isProvisioningDone.value) {
    progress.value = 100;
    isDone.value = true;
    currentPhaseText.value = t('auto.provisioning_completed_verified');
    return;
  }

  await runProvisioning();
});

onUnmounted(() => {
  if (unlistenStep) unlistenStep();
  if (unlistenFail) unlistenFail();
});

async function setupEventListeners() {
  if (unlistenStep || unlistenFail) return;
  try {
    unlistenStep = await listen<{ step: number; phase: string; message: string; success: boolean }>(
      'provision-step',
      async (event) => {
        const payload = event.payload;
        if (payload.step === 1) {
          progress.value = 20;
          currentPhaseText.value = payload.phase;
        } else if (payload.step === 2) {
          progress.value = 40;
          currentPhaseText.value = payload.phase;
        } else if (payload.step === 3) {
          progress.value = 60;
          currentPhaseText.value = payload.phase;
        } else if (payload.step === 4) {
          progress.value = 80;
          currentPhaseText.value = payload.phase;
        } else if (payload.step === 5) {
          progress.value = 100;
          currentPhaseText.value = payload.phase;
        }
        await addLog(`[${payload.phase}] ${payload.message}`);
      }
    );

    unlistenFail = await listen<string>('provision-failed', async (event) => {
      isFailed.value = true;
      isDone.value = false;
      isProvisioningDone.value = false;
      isProvisioningRunning.value = false;
      errorMessage.value = event.payload;
      currentPhaseText.value = t('auto.hyper_v_provisioning_failed');
      await addLog(`[ERROR] ${event.payload}`);
    });
  } catch (err) {
    console.warn('Could not register Tauri provision event listeners:', err);
  }
}

async function addLog(text: string) {
  const timestamp = new Date().toLocaleTimeString();
  const rawText = text.trim();

  // Deduplicate consecutive identical lines
  const lastIndex = logs.value.length - 1;
  if (lastIndex >= 0) {
    const lastEntry = logs.value[lastIndex];
    const lastMsgOnly = lastEntry
      .replace(/^\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?\]\s*/i, '')
      .replace(/\s\(x\d+\)$/, '');
    if (lastMsgOnly === rawText) {
      const match = lastEntry.match(/\s\(x(\d+)\)$/);
      const currentCount = match ? parseInt(match[1], 10) : 1;
      logs.value[lastIndex] = `[${timestamp}] ${rawText} (x${currentCount + 1})`;
      await nextTick();
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
      return;
    }
  }

  logs.value.push(`[${timestamp}] ${rawText}`);
  await nextTick();
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
}

async function retryProvisioning() {
  if (isProvisioningRunning.value) return;
  isFailed.value = false;
  errorMessage.value = '';
  progress.value = 5;
  isDone.value = false;
  isProvisioningDone.value = false;
  logs.value = [];
  await runProvisioning(true);
}

async function runProvisioning(forceRetry: boolean = false) {
  // 1. Guard against concurrent provisioning runs
  if (isProvisioningRunning.value) {
    return;
  }

  // 2. Idempotent check: if VM is already Running, skip deployment entirely!
  if (!forceRetry) {
    try {
      const liveState = await getVmRealState(selectedClientId.value);
      if (liveState.exists && (liveState.state === 'Running' || liveState.state === '2')) {
        progress.value = 100;
        isDone.value = true;
        isProvisioningDone.value = true;
        currentPhaseText.value = t('auto.appliance_is_running_and_verified');
        await addLog(`[Hyper-V] Appliance FastFree-${selectedClientId.value} is already active and Running.`);
        await addLog('Provisioning verified. Virtual machine is Running and ready.');
        return;
      }
    } catch (checkErr) {
      console.warn('Pre-provisioning live check warning:', checkErr);
    }
  }

  isProvisioningRunning.value = true;
  isFailed.value = false;
  errorMessage.value = '';
  isDone.value = false;
  progress.value = 10;

  const safeAlignedRam = Math.max(1024, Math.floor(((assignedRamMb.value || 8192) + 64) / 128) * 128);

  logInfo('Provisioning', `Starting deployment for ${selectedClientId.value}...`);
  await addLog(`Starting automated deployment pipeline for ${selectedClientId.value}...`);
  await addLog(`Selected Drive: ${targetDiskDrive.value} | Cores: ${assignedCpuCores.value} | Aligned RAM: ${safeAlignedRam} MB`);
  currentPhaseText.value = t('auto.configuring_storage_and_virtual_switch');

  try {
    const realLogs = await invoke<Array<{ step: number; phase: string; message: string; success: boolean }>>(
      'provision_node',
      {
        clientId: selectedClientId.value,
        cores: assignedCpuCores.value || 4,
        ramMb: safeAlignedRam,
        targetDrive: targetDiskDrive.value || 'C:\\',
        hardenedSecurity: hardenedSecurityEnabled.value,
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
    isProvisioningDone.value = true;
    currentPhaseText.value = t('auto.provisioning_completed_verified');

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
    isProvisioningDone.value = false;
    errorMessage.value = msg;
    currentPhaseText.value = t('auto.hyper_v_provisioning_failed');
    logError('Provisioning', `Failed to deploy appliance ${selectedClientId.value}`, msg);
    await addLog(`[ERROR] Hyper-V Provisioning Error: ${msg}`);
  } finally {
    isProvisioningRunning.value = false;
  }
}
</script>


<style scoped>
@import '../assets/styles/provisioning-screen.css';
</style>
