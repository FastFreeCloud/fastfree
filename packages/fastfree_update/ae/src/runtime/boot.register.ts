import { defineBoot } from '#q-app';
import UpdateDialog from './UpdateDialog.vue';
import { useAppUpdate } from './useAppUpdate';
import type { AppUpdateApi } from './useAppUpdate';
import { APP_UPDATE_KEY } from './types';

export { APP_UPDATE_KEY };

// Debounce window for foreground re-checks (ms).
const FOREGROUND_DEBOUNCE_MS = 5000;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export default defineBoot(({ app }) => {
  try {
    // SSR guard: DOM APIs (document/window/localStorage) don't exist server-side.
    if (!isBrowser()) {
      return;
    }

    app.component('UpdateDialog', UpdateDialog);

    const appUpdate: AppUpdateApi = useAppUpdate();
    app.provide(APP_UPDATE_KEY, appUpdate);

    // Debounced foreground re-check: when the app returns to the foreground
    // (or comes back online), refresh availability state after a short delay.
    // This RESPECTS the snooze cooldown and NEVER starts an update on its own
    // — starting an update requires a user tap on UpdateDialog.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRecheck = (): void => {
      try {
        if (timer !== undefined) {
          return; // debounce: at most one pending re-check
        }
        timer = setTimeout(() => {
          timer = undefined;
          try {
            if (document.visibilityState !== 'visible') {
              return;
            }
            if (appUpdate.isSnoozed()) {
              return;
            }
            void appUpdate.checkForUpdate();
          } catch {
            // Silent: re-checks are best-effort.
          }
        }, FOREGROUND_DEBOUNCE_MS);
      } catch {
        // Silent: scheduling must never crash the host app.
      }
    };

    document.addEventListener('visibilitychange', scheduleRecheck);
    window.addEventListener('online', scheduleRecheck);
  } catch {
    // Boot must never crash the host app.
  }
});
