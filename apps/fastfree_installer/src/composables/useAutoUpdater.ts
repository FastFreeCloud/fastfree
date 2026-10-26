import { ref } from 'vue';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { logInfo, logWarn, logError, logSuccess } from './useDiagnostics';

export const isCheckingUpdate = ref(false);
export const updateAvailable = ref(false);
export const updateVersion = ref('');
export const updateNotes = ref('');
export const isDownloadingUpdate = ref(false);
export const downloadProgress = ref(0);
export const updateError = ref('');
export const currentUpdateObj = ref<Update | null>(null);

/**
 * Checks for updates against the GitHub Releases manifest (latest.json).
 * Can be run silently on startup or interactively on user request.
 */
export async function checkForUpdates(silent: boolean = true): Promise<boolean> {
  if (isCheckingUpdate.value) return false;
  isCheckingUpdate.value = true;
  updateError.value = '';

  logInfo('Updater', `Checking for sovereign updates (silent=${silent})...`);

  try {
    const update = await check();
    if (update) {
      currentUpdateObj.value = update;
      updateAvailable.value = true;
      updateVersion.value = update.version;
      updateNotes.value = update.body || 'FastFree Sovereign Appliance Performance & Security Update';
      logSuccess(
        'Updater',
        `New update found: v${update.version}`,
        `Published: ${update.date}, Manifest URL: ${update.downloadUrl || 'GitHub'}`
      );
      return true;
    } else {
      updateAvailable.value = false;
      currentUpdateObj.value = null;
      logInfo('Updater', 'FastFree Companion is up to date (Latest Version).');
      return false;
    }
  } catch (err: unknown) {
    const msg = String(err || 'Failed to check for updates');
    updateError.value = msg;
    logWarn('Updater', 'Update check notice:', msg);
    return false;
  } finally {
    isCheckingUpdate.value = false;
  }
}

/**
 * Downloads and installs the pending update, then relaunches the companion cleanly.
 */
export async function installPendingUpdate(): Promise<void> {
  const update = currentUpdateObj.value;
  if (!update) return;

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
  } catch (err: unknown) {
    const msg = String(err || 'Failed to download and install update');
    updateError.value = msg;
    logError('Updater', 'Update installation failed', msg);
    isDownloadingUpdate.value = false;
  }
}
