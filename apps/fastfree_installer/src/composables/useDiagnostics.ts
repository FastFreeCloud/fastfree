import { ref, computed } from 'vue';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface DiagnosticEntry {
  id: number;
  timestamp: string;
  timeFormatted: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
  count: number;
}

let nextId = 1;
const MAX_DIAGNOSTIC_LOGS = 300;

export const diagnosticLogs = ref<DiagnosticEntry[]>([
  {
    id: nextId++,
    timestamp: new Date().toISOString(),
    timeFormatted: new Date().toLocaleTimeString(),
    level: 'info',
    source: 'Installer',
    message: 'FastFree Node Companion booted (v26.05).',
    details: 'Runtime target: Windows x86_64 Hyper-V Core Engine v26.05',
    count: 1,
  },
]);

export const isDiagnosticOpen = ref<boolean>(false);
export const activeFilter = ref<'all' | 'error' | 'warn' | 'info'>('all');
export const searchQuery = ref<string>('');

export function addDiagnosticLog(
  level: LogLevel,
  source: string,
  message: string,
  details?: string
): DiagnosticEntry {
  // Deduplicate consecutive identical entries
  const top = diagnosticLogs.value[0];
  if (
    top &&
    top.level === level &&
    top.source === source &&
    top.message === message &&
    top.details === details
  ) {
    top.count = (top.count || 1) + 1;
    top.timestamp = new Date().toISOString();
    top.timeFormatted = new Date().toLocaleTimeString();
    return top;
  }

  const entry: DiagnosticEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    timeFormatted: new Date().toLocaleTimeString(),
    level,
    source,
    message,
    details,
    count: 1,
  };
  diagnosticLogs.value.unshift(entry); // newest first

  if (diagnosticLogs.value.length > MAX_DIAGNOSTIC_LOGS) {
    diagnosticLogs.value.length = MAX_DIAGNOSTIC_LOGS;
  }

  return entry;
}

export function logInfo(source: string, message: string, details?: string) {
  return addDiagnosticLog('info', source, message, details);
}

export function logWarn(source: string, message: string, details?: string) {
  return addDiagnosticLog('warn', source, message, details);
}

export function logError(source: string, message: string, details?: string) {
  return addDiagnosticLog('error', source, message, details);
}

export function logSuccess(source: string, message: string, details?: string) {
  return addDiagnosticLog('success', source, message, details);
}

export function clearDiagnosticLogs() {
  diagnosticLogs.value = [];
}

export const totalErrors = computed(() => {
  return diagnosticLogs.value.filter(l => l.level === 'error').length;
});

export const totalWarnings = computed(() => {
  return diagnosticLogs.value.filter(l => l.level === 'warn').length;
});

export function exportLogsText(): string {
  const header = `FastFree Node Installer - Diagnostic Forensic Log\nGenerated: ${new Date().toISOString()}\n======================================================\n\n`;
  const entries = diagnosticLogs.value
    .map(
      l =>
        `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}]${
          (l.count || 1) > 1 ? ` (x${l.count})` : ''
        }: ${l.message}${l.details ? `\n  Details: ${l.details}` : ''}`
    )
    .join('\n');
  return header + entries;
}

export function buildUnifiedDiagnosticReport(auditReport: any, hwid?: string): string {
  const ts = new Date().toISOString();
  let text = `================================================================================\n`;
  text += `FASTFREE NODE COMPANION - UNIFIED FORENSIC DIAGNOSTIC & AUDIT BUNDLE\n`;
  text += `Generated: ${ts}\n`;
  if (hwid) text += `Host Hardware ID: ${hwid}\n`;
  text += `================================================================================\n\n`;

  if (auditReport) {
    text += `[OVERALL STATUS]: ${String(auditReport.overall_status || 'UNKNOWN').toUpperCase()} ` +
      `(${auditReport.total_passed || 0} Passed, ${auditReport.total_warnings || 0} Warnings, ${auditReport.total_errors || 0} Action Required)\n`;
    text += `All Steps Completed: ${auditReport.all_steps_completed}\n\n`;
    text += `--- STEP AUDIT MATRIX ---\n`;
    if (Array.isArray(auditReport.items)) {
      for (const item of auditReport.items) {
        text += `[${String(item.status).toUpperCase()}] Step ${item.step_number}: ${item.title_en} / ${item.title_ar}\n`;
        text += `  Message: ${item.message_en}\n`;
        text += `  رسالة: ${item.message_ar}\n`;
        if (item.details) text += `  Telemetry: ${item.details}\n`;
        text += `\n`;
      }
    }
  }

  text += `============================== RECENT SYSTEM LOGS ==============================\n`;
  text += exportLogsText();
  text += `\n========================== END OF DIAGNOSTIC REPORT ===========================\n`;

  return text;
}

export async function copyDiagnosticLogs(): Promise<boolean> {
  try {
    const text = exportLogsText();
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy diagnostic logs:', err);
    return false;
  }
}

export function openLogFile(): void {
  try {
    const text = exportLogsText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fastfree-diagnostic-${Date.now()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export log file:', err);
  }
}

export function useDiagnostics() {
  return {
    logs: diagnosticLogs,
    isDiagnosticOpen,
    activeFilter,
    searchQuery,
    totalErrors,
    totalWarnings,
    addDiagnosticLog,
    logInfo,
    logWarn,
    logError,
    logSuccess,
    clearDiagnosticLogs,
    exportLogsText,
    buildUnifiedDiagnosticReport,
    copyDiagnosticLogs,
    openLogFile,
  };
}
