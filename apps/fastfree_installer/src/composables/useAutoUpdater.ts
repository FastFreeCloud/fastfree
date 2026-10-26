import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getVersion } from '@tauri-apps/api/app';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { logInfo, logWarn, logError, logSuccess } from './useDiagnostics';

export interface UpdateInfo {
  available: boolean;
  current_version: string;
  version: string;
  date: string | null;
  body: string | null;
}

export interface UpdateProgressPayload {
  chunk_length: number;
  downloaded_bytes: number;
  total_bytes: number | null;
  progress_pct: number;
}

export const isCheckingUpdate = ref(false);
export const updateAvailable = ref(false);
export const isMandatoryUpdate = ref(true); // Mandatory by default
export const updateVersion = ref('');
export const updateNotes = ref('');
export const isDownloadingUpdate = ref(false);
export const downloadProgress = ref(0);
export const downloadedBytes = ref(0);
export const totalBytes = ref(0);
export const updateError = ref('');
export const manualDownloadUrl = ref('');

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const downloadedBytesFormatted = computed(() => formatBytes(downloadedBytes.value));
export const totalBytesFormatted = computed(() => formatBytes(totalBytes.value));

// Track last notified version to prevent repetitive desktop notifications
let lastNotifiedVersion = '';

// Background periodic timer
let autoUpdateTimer: ReturnType<typeof setInterval> | null = null;

// Current local running version (initialized dynamically)
export const currentAppVersion = ref('26.5.0');

export async function initAppVersion(): Promise<string> {
  try {
    const ver = await getVersion();
    if (ver) {
      currentAppVersion.value = ver;
    }
  } catch (err) {
    console.warn('Failed to retrieve runtime app version:', err);
  }
  return currentAppVersion.value;
}

function compareSemver(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = v2.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Dispatches an official native Windows desktop notification toast above the taskbar clock.
 */
export async function dispatchDesktopNotification(title: string, body: string): Promise<void> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    if (granted) {
      sendNotification({
        title,
        body,
      });
      logSuccess('Notification', `Desktop notification dispatched: ${title}`);
    }
  } catch (err) {
    logWarn('Notification', 'Desktop notification notice:', String(err));
  }
}

/**
 * Checks for updates using native Rust Tauri updater command (zero JS Proxy/private member issues)
 * and falls back to querying the GitHub Releases API directly.
 */
export async function checkForUpdates(silent: boolean = true): Promise<boolean> {
  if (isCheckingUpdate.value) return false;
  isCheckingUpdate.value = true;
  updateError.value = '';

  await initAppVersion();
  logInfo('Updater', `Checking for updates (current: v${currentAppVersion.value}, silent=${silent})...`);

  // 1. Primary: Native Rust Tauri Updater command (Type-safe & Zero Private-field errors)
  try {
    const update = await invoke<UpdateInfo | null>('check_app_update');
    if (update && update.available) {
      updateAvailable.value = true;
      isMandatoryUpdate.value = true;
      updateVersion.value = update.version;
      updateNotes.value = update.body || 'FastFree Appliance Mandatory Engine & Security Update';
      manualDownloadUrl.value = `https://github.com/FastFreeCloud/fastfree/releases/download/installer-v${update.version}/FastFree-Node-Setup.exe`;
      logSuccess(
        'Updater',
        `Mandatory update found: v${update.version}`,
        `Published: ${update.date || 'latest'}, Channel: Production Release`
      );

      if (lastNotifiedVersion !== update.version) {
        lastNotifiedVersion = update.version;
        await dispatchDesktopNotification(
          'تحديث إلزامي متوفر لـ FastFree',
          `تم إصدار النسخة الإلزامية v${update.version}. يتطلب النظام التحديث للاستمرار.`
        );
      }
      return true;
    }
  } catch (err: unknown) {
    logWarn('Updater', 'Native Rust updater check notice:', String(err));
  }

  // 2. Fallback: Query GitHub Releases API directly for live releases
  try {
    const res = await fetch('https://api.github.com/repos/FastFreeCloud/fastfree/releases/latest', {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (res.ok) {
      const release = await res.json();
      const rawTag = String(release.tag_name || '');
      const remoteVer = rawTag.replace(/^installer-v/, '').replace(/^v/, '');
      const asset = release.assets?.find((a: { name?: string }) => a.name?.endsWith('.exe'));

      if (remoteVer && compareSemver(remoteVer, currentAppVersion.value) > 0) {
        updateAvailable.value = true;
        isMandatoryUpdate.value = true;
        updateVersion.value = remoteVer;
        updateNotes.value = release.body || 'FastFree Appliance Mandatory Engine & Security Update';
        manualDownloadUrl.value = asset?.browser_download_url
          || `https://github.com/FastFreeCloud/fastfree/releases/download/${rawTag}/FastFree-Node-Setup.exe`;
        logSuccess(
          'Updater',
          `Mandatory release detected via GitHub API: v${remoteVer} (${rawTag})`,
          `Asset: ${manualDownloadUrl.value}`
        );

        if (lastNotifiedVersion !== remoteVer) {
          lastNotifiedVersion = remoteVer;
          await dispatchDesktopNotification(
            'تحديث إلزامي متوفر لـ FastFree',
            `تم إصدار النسخة الإلزامية v${remoteVer}. يتطلب النظام التحديث للاستمرار.`
          );
        }
        return true;
      }
    }
  } catch (ghErr: unknown) {
    logWarn('Updater', 'GitHub Releases API fallback notice:', String(ghErr));
  }

  updateAvailable.value = false;
  manualDownloadUrl.value = '';
  logInfo('Updater', 'FastFree Companion is up to date (Latest Version).');
  return false;
}

/**
 * Downloads and installs the pending update natively via Rust.
 * Streams real download byte progress via the 'updater-progress' Tauri event.
 */
export async function installPendingUpdate(): Promise<void> {
  if (isDownloadingUpdate.value) return;

  isDownloadingUpdate.value = true;
  downloadProgress.value = 0;
  downloadedBytes.value = 0;
  totalBytes.value = 0;
  updateError.value = '';

  logInfo('Updater', `Starting native download for FastFree v${updateVersion.value}...`);

  let unlistenProgress: UnlistenFn | null = null;
  try {
    unlistenProgress = await listen<UpdateProgressPayload>('updater-progress', (event) => {
      const payload = event.payload;
      downloadedBytes.value = payload.downloaded_bytes;
      if (payload.total_bytes && payload.total_bytes > 0) {
        totalBytes.value = payload.total_bytes;
      }
      downloadProgress.value = payload.progress_pct;
    });

    await invoke('install_app_update');
    logSuccess('Updater', 'Installation complete. Application is restarting...');
  } catch (err: unknown) {
    const msg = String(err || 'Failed to download and install update');
    logError('Updater', 'Native update installation failed, triggering fallback', msg);

    // Graceful fallback to direct installer URL if native plugin fails
    if (manualDownloadUrl.value) {
      logInfo('Updater', `Opening direct installer download: ${manualDownloadUrl.value}`);
      try {
        await openUrl(manualDownloadUrl.value);
      } catch {
        window.open(manualDownloadUrl.value, '_blank');
      }
    } else {
      updateError.value = msg;
    }
    isDownloadingUpdate.value = false;
  } finally {
    if (unlistenProgress) {
      unlistenProgress();
    }
  }
}

/**
 * Opens manual installer download URL directly in browser.
 */
export async function openManualDownload(): Promise<void> {
  if (manualDownloadUrl.value) {
    logInfo('Updater', `Manual installer download triggered: ${manualDownloadUrl.value}`);
    try {
      await openUrl(manualDownloadUrl.value);
    } catch {
      window.open(manualDownloadUrl.value, '_blank');
    }
  }
}

/**
 * Starts automatic background polling for updates at specified intervals (default 30 mins).
 */
export function startAutoUpdatePolling(intervalMinutes: number = 30): void {
  if (autoUpdateTimer) return;
  logInfo('Updater', `Auto-update background polling initialized (every ${intervalMinutes} min).`);

  autoUpdateTimer = setInterval(async () => {
    try {
      await checkForUpdates(true);
    } catch (err) {
      console.warn('Background periodic update check error:', err);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stops background update polling.
 */
export function stopAutoUpdatePolling(): void {
  if (autoUpdateTimer) {
    clearInterval(autoUpdateTimer);
    autoUpdateTimer = null;
  }
}
