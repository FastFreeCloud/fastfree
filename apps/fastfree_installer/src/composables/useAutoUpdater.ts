import { ref, shallowRef, computed, toRaw, markRaw } from 'vue';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getVersion } from '@tauri-apps/api/app';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { logInfo, logWarn, logError, logSuccess } from './useDiagnostics';

export const isCheckingUpdate = ref(false);
export const updateAvailable = ref(false);
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

// Maintain unproxied raw native Update instance outside Vue reactivity to prevent:
// "TypeError: Cannot read private member from an object whose class did not declare it"
let rawNativeUpdate: Update | null = null;
export const currentUpdateObj = shallowRef<Update | null>(null);

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
 * Checks for updates against the GitHub Releases manifest (latest.json)
 * and falls back to querying the GitHub Releases API directly.
 * Can be run silently on startup or interactively on user request.
 */
export async function checkForUpdates(silent: boolean = true): Promise<boolean> {
  if (isCheckingUpdate.value) return false;
  isCheckingUpdate.value = true;
  updateError.value = '';

  await initAppVersion();
  logInfo('Updater', `Checking for updates (current: v${currentAppVersion.value}, silent=${silent})...`);

  // 1. First: Try native Tauri plugin updater
  try {
    const update = await check();
    if (update) {
      rawNativeUpdate = markRaw(update);
      currentUpdateObj.value = rawNativeUpdate;
      updateAvailable.value = true;
      updateVersion.value = update.version;
      updateNotes.value = update.body || 'FastFree Appliance Performance & Security Update';
      manualDownloadUrl.value = `https://github.com/FastFreeCloud/fastfree/releases/download/installer-v${update.version}/FastFree-Node-Setup.exe`;
      logSuccess(
        'Updater',
        `New update found: v${update.version}`,
        `Published: ${update.date || 'latest'}, Channel: Production Release`
      );

      // Notify the user via Windows desktop toast if this version hasn't been notified yet
      if (lastNotifiedVersion !== update.version) {
        lastNotifiedVersion = update.version;
        await dispatchDesktopNotification(
          '⚡ تحديث جديد متوفر لـ FastFree',
          `تم إصدار النسخة الجديدة v${update.version}. افتح التطبيق لتثبيت التحديث بنقرة واحدة.`
        );
      }
      return true;
    }
  } catch (err: unknown) {
    logWarn('Updater', 'Native updater check notice:', String(err));
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
        rawNativeUpdate = null;
        currentUpdateObj.value = null;
        updateAvailable.value = true;
        updateVersion.value = remoteVer;
        updateNotes.value = release.body || 'FastFree Appliance Performance & Security Update';
        manualDownloadUrl.value = asset?.browser_download_url
          || `https://github.com/FastFreeCloud/fastfree/releases/download/${rawTag}/FastFree-Node-Setup.exe`;
        logSuccess(
          'Updater',
          `New release detected via GitHub API: v${remoteVer} (${rawTag})`,
          `Asset: ${manualDownloadUrl.value}`
        );

        if (lastNotifiedVersion !== remoteVer) {
          lastNotifiedVersion = remoteVer;
          await dispatchDesktopNotification(
            '⚡ تحديث جديد متوفر لـ FastFree',
            `تم إصدار النسخة الجديدة v${remoteVer}. انقر لفتح التطبيق وتثبيت التحديث بنقرة واحدة.`
          );
        }
        return true;
      }
    }
  } catch (ghErr: unknown) {
    logWarn('Updater', 'GitHub Releases API fallback notice:', String(ghErr));
  }

  updateAvailable.value = false;
  rawNativeUpdate = null;
  currentUpdateObj.value = null;
  manualDownloadUrl.value = '';
  logInfo('Updater', 'FastFree Companion is up to date (Latest Version).');
  return false;
}

/**
 * Downloads and installs the pending update, then relaunches the companion cleanly.
 * If native installer plugin is active, installs automatically using unproxied instance.
 * Otherwise, launches the direct installer download.
 */
export async function installPendingUpdate(): Promise<void> {
  const update = rawNativeUpdate || (currentUpdateObj.value ? toRaw(currentUpdateObj.value) : null);

  // Case A: Native updater object available
  if (update) {
    isDownloadingUpdate.value = true;
    downloadProgress.value = 0;
    downloadedBytes.value = 0;
    totalBytes.value = 0;
    updateError.value = '';

    logInfo('Updater', `Starting download for FastFree v${update.version}...`);

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalBytes.value = event.data.contentLength || 0;
            downloadedBytes.value = 0;
            logInfo('Updater', `Update download started. Content size: ${totalBytes.value} bytes`);
            break;
          case 'Progress':
            downloadedBytes.value += event.data.chunkLength;
            if (totalBytes.value > 0) {
              downloadProgress.value = Math.min(99, Math.round((downloadedBytes.value / totalBytes.value) * 100));
            } else {
              downloadProgress.value = Math.min(99, downloadProgress.value + 5);
            }
            break;
          case 'Finished':
            downloadProgress.value = 100;
            downloadedBytes.value = totalBytes.value;
            logSuccess('Updater', 'Update downloaded and verified. Relaunching application...');
            break;
        }
      });

      logSuccess('Updater', 'Installation complete. Relaunching...');
      await relaunch();
      return;
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
    }
    return;
  }

  // Case B: Direct installer download
  if (manualDownloadUrl.value) {
    logInfo('Updater', `Opening direct installer download: ${manualDownloadUrl.value}`);
    try {
      await openUrl(manualDownloadUrl.value);
    } catch {
      window.open(manualDownloadUrl.value, '_blank');
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
