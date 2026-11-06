import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useI18n } from './useI18n';
import {
  diagnosticLogs,
  openLogFile,
  buildUnifiedDiagnosticReport,
  copyTextToClipboard,
  logInfo,
  logWarn,
  logError,
  logSuccess,
} from './useDiagnostics';
import {
  selectedClientId,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  provisionNode,
  classifyRuntime,
  browserPreviewMode,
} from './useDiscovery';

export interface StepAuditItem {
  step_id: string;
  step_number: number;
  category: string;
  title_en: string;
  title_ar: string;
  status: 'pass' | 'warn' | 'fail';
  message_en: string;
  message_ar: string;
  details?: string;
  can_auto_fix: boolean;
}

export interface SystemAuditReport {
  client_id: string;
  overall_status: 'healthy' | 'warning' | 'error';
  all_steps_completed: boolean;
  total_passed: number;
  total_warnings: number;
  total_errors: number;
  items: StepAuditItem[];
  timestamp: string;
}

// Module-level shared singleton reactive state
const activeTab = ref<'audit' | 'logs' | 'telemetry'>('audit');
const isLoadingAudit = ref(true);
const isAutoFixing = ref(false);
const fixProgressPct = ref(0);
const currentFixPhase = ref('');
const auditError = ref<string | null>(null);
const report = ref<SystemAuditReport | null>(null);
const copyNotice = ref(false);
/** True in browser preview: the deep audit pipeline is desktop-only. */
const auditUnavailable = ref(false);

const logsFilter = ref<'all' | 'error' | 'warn' | 'info'>('all');
const logsSearchQuery = ref('');

let unlistenProgress: UnlistenFn | null = null;
let unlistenStep: UnlistenFn | null = null;
let unlistenFailed: UnlistenFn | null = null;

export function useDiagnosticAudit() {
  const { isRtl } = useI18n();

  const filteredLogs = computed(() => {
    return diagnosticLogs.value.filter(log => {
      if (logsFilter.value !== 'all' && log.level !== logsFilter.value) {
        return false;
      }
      if (logsSearchQuery.value) {
        const q = logsSearchQuery.value.toLowerCase();
        const m = log.message.toLowerCase().includes(q);
        const s = log.source.toLowerCase().includes(q);
        const d = log.details ? log.details.toLowerCase().includes(q) : false;
        return m || s || d;
      }
      return true;
    });
  });

  const headerBadgeClass = computed(() => {
    if (!report.value) return '';
    if (report.value.overall_status === 'healthy') return 'badge-healthy';
    if (report.value.overall_status === 'warning') return 'badge-warning';
    return 'badge-error';
  });

  async function setupEventListeners() {
    // IPC event listeners exist only inside the desktop webview window.
    if (classifyRuntime() === 'browser-preview') {
      return;
    }
    unlistenProgress = await listen<{ percent?: number; phase?: string }>('provision-download-progress', evt => {
      if (evt.payload && typeof evt.payload.percent === 'number') {
        fixProgressPct.value = evt.payload.percent;
        if (evt.payload.phase) {
          currentFixPhase.value = `${evt.payload.phase}: ${evt.payload.percent}%`;
        }
      }
    });

    unlistenStep = await listen<{ message?: string; phase?: string }>('provision-step', evt => {
      if (evt.payload && evt.payload.phase) {
        currentFixPhase.value = evt.payload.message || evt.payload.phase;
      }
    });

    unlistenFailed = await listen<string>('provision-failed', evt => {
      auditError.value = evt.payload;
      isAutoFixing.value = false;
    });
  }

  function cleanupEventListeners() {
    if (unlistenProgress) {
      unlistenProgress();
      unlistenProgress = null;
    }
    if (unlistenStep) {
      unlistenStep();
      unlistenStep = null;
    }
    if (unlistenFailed) {
      unlistenFailed();
      unlistenFailed = null;
    }
  }

  async function runAudit() {
    // The deep audit invokes the desktop pipeline; in browser preview
    // classify honestly and show the neutral note instead of a raw error.
    if (classifyRuntime() === 'browser-preview') {
      isLoadingAudit.value = false;
      auditError.value = null;
      auditUnavailable.value = true;
      logWarn('Audit', 'Deep audit runs inside the desktop window only.', 'Showing local diagnostics in browser preview.');
      return;
    }
    isLoadingAudit.value = true;
    auditError.value = null;
    auditUnavailable.value = false;
    try {
      const res = await invoke<SystemAuditReport>('audit_system_steps', {
        clientId: selectedClientId.value || 'client1',
      });
      report.value = res;
      logInfo('Audit', `Audit executed: status=${res.overall_status}, passed=${res.total_passed}, errors=${res.total_errors}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      auditError.value = e?.message || String(err);
      logError('Audit', 'Audit execution failed', auditError.value || '');
    } finally {
      isLoadingAudit.value = false;
    }
  }

  async function handleAutoFixAll() {
    if (isAutoFixing.value) return;
    if (classifyRuntime() === 'browser-preview') {
      logWarn('AutoFix', 'Self-healing is unavailable outside the desktop window.', 'Run the auto-fix inside the desktop app.');
      return;
    }
    isAutoFixing.value = true;
    fixProgressPct.value = 5;
    currentFixPhase.value = isRtl.value ? 'بدء فحص وتصحيح المكونات...' : 'Initiating self-healing pipeline...';
    auditError.value = null;

    try {
      try {
        await invoke('enable_wireguard_firewall_rule');
      } catch {}

      const preferredDrive = (report.value?.items.find(i => i.step_id === 'step_3_storage')?.details?.includes('G:') || targetDiskDrive.value?.includes('G'))
        ? 'G:\\'
        : (targetDiskDrive.value || 'C:\\');

      const safeRam = Math.max(1024, Math.floor(((assignedRamMb.value || 8192) + 64) / 128) * 128);
      const cid = selectedClientId.value || 'client1';

      logInfo('AutoFix', `Running self-healing node provisioning on drive ${preferredDrive} for ${cid}...`);
      currentFixPhase.value = isRtl.value ? 'تنزيل أو فحص صورة NixOS وضبط Hyper-V...' : 'Resolving bootable NixOS appliance image & Hyper-V...';

      await provisionNode(
        cid,
        assignedCpuCores.value || 4,
        safeRam,
        preferredDrive
      );

      fixProgressPct.value = 100;
      currentFixPhase.value = isRtl.value ? 'اكتمل الإصلاح بنجاح!' : 'Healing completed successfully!';
      logSuccess('AutoFix', 'All issues resolved automatically.');

      await runAudit();
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message || String(err);
      auditError.value = msg;
      logError('AutoFix', 'Self-healing failed', msg);
    } finally {
      isAutoFixing.value = false;
    }
  }

  async function handleSingleFix(item: StepAuditItem) {
    if (item.step_number === 4) {
      try {
        await invoke('enable_wireguard_firewall_rule');
        logSuccess('Security', 'Windows Firewall rule enabled for WireGuard UDP 51820.');
        await runAudit();
      } catch (err: unknown) {
        logError('Security', 'Firewall fix failed', String(err));
      }
    } else {
      await handleAutoFixAll();
    }
  }

  async function handleCopyFullReport() {
    let hwid = '';
    if (classifyRuntime() !== 'browser-preview') {
      try {
        hwid = await invoke<string>('get_machine_hwid');
      } catch {
        hwid = '';
      }
    }

    const fullReport = buildUnifiedDiagnosticReport(report.value, hwid);
    const copied = await copyTextToClipboard(fullReport);
    if (copied) {
      copyNotice.value = true;
      logSuccess('Copy', 'Unified diagnostic bundle copied to the clipboard.');
      setTimeout(() => {
        copyNotice.value = false;
      }, 2800);
    } else {
      logError('Copy', 'Clipboard copy failed', 'Clipboard access was refused in this environment.');
    }
  }

  function handleExportLogFile() {
    openLogFile();
  }

  return {
    isRtl,
    activeTab,
    isLoadingAudit,
    isAutoFixing,
    fixProgressPct,
    currentFixPhase,
    auditError,
    report,
    copyNotice,
    logsFilter,
    logsSearchQuery,
    filteredLogs,
    headerBadgeClass,
    auditUnavailable,
    setupEventListeners,
    cleanupEventListeners,
    runAudit,
    handleAutoFixAll,
    handleSingleFix,
    handleCopyFullReport,
    handleExportLogFile,
    browserPreviewMode,
  };
}
