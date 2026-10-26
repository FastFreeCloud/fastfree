import { ref, shallowRef, toRaw, markRaw } from 'vue';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getVersion } from '@tauri-apps/api/app';
import { logInfo, logWarn, logError, logSuccess } from './useDiagnostics';

export const isCheckingUpdate = ref(false);
export const updateAvailable = ref(false);
export const updateVersion = ref('');
export const updateNotes = ref('');
export const isDownloadingUpdate = ref(false);
export const downloadProgress = ref(0);
export const updateError = ref('');
export const manualDownloadUrl = ref('');

// Maintain unproxied raw native Update instance outside Vue reactivity to prevent:
// "TypeError: Cannot read private member from an object whose class did not declare it"
let rawNativeUpdate: Update | null = null;
export const currentUpdateObj = shallowRef<Update | null>(null);

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
    updateError.value = '';

    logInfo('Updater', `Starting download for FastFree v${update.version}...`);

    try {
      let downloadedBytes = 0;
      let totalBytes = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalBytes = event.data.contentLength || 0;
            logInfo('Updater', `Update download started. Content size: ${totalBytes} bytes`);
            break;
          case 'Progress':
            downloadedBytes += event.data.chunkLength;
            if (totalBytes > 0) {
              downloadProgress.value = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
            } else {
              downloadProgress.value = Math.min(99, downloadProgress.value + 5);
            }
            break;
          case 'Finished':
            downloadProgress.value = 100;
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
