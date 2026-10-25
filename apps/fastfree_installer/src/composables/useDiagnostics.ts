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
}

let nextId = 1;
export const diagnosticLogs = ref<DiagnosticEntry[]>([
  {
    id: nextId++,
    timestamp: new Date().toISOString(),
    timeFormatted: new Date().toLocaleTimeString(),
    level: 'info',
    source: 'Installer',
    message: 'FastFree Sovereign Companion booted (v26.05).',
    details: 'Runtime target: Windows x86_64 Hyper-V / Tauri 2.0 Webview.',
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
  const entry: DiagnosticEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    timeFormatted: new Date().toLocaleTimeString(),
    level,
    source,
    message,
    details,
  };
  diagnosticLogs.value.unshift(entry); // newest first
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
  const header = `FastFree Sovereign Node Installer - Diagnostic Forensic Log\nGenerated: ${new Date().toISOString()}\n======================================================\n\n`;
  const entries = diagnosticLogs.value
    .map(
      l =>
        `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}]: ${l.message}${
          l.details ? `\n  Details: ${l.details}` : ''
        }`
    )
    .join('\n');
  return header + entries;
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
    copyDiagnosticLogs,
    openLogFile,
  };
}
