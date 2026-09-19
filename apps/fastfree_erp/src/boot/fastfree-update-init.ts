import { boot } from 'quasar/wrappers';
import type { App } from 'vue';
import UpdateDialog from 'quasar-app-extension-fastfree_update/src/runtime/UpdateDialog.vue';
import { useAppUpdate } from 'quasar-app-extension-fastfree_update/src/runtime/useAppUpdate';
import type { AppUpdateApi } from 'quasar-app-extension-fastfree_update/src/runtime/useAppUpdate';
import { APP_UPDATE_KEY } from 'quasar-app-extension-fastfree_update/src/runtime/types';

export { APP_UPDATE_KEY };

const FOREGROUND_DEBOUNCE_MS = 5000;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export default boot(({ app }: { app: App }) => {
  try {
    if (!isBrowser()) return;

    app.component('UpdateDialog', UpdateDialog);

    const appUpdate: AppUpdateApi = useAppUpdate();
    app.provide(APP_UPDATE_KEY, appUpdate);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRecheck = (): void => {
      try {
        if (timer !== undefined) return;
        timer = setTimeout(() => {
          timer = undefined;
          try {
            if (document.visibilityState !== 'visible') return;
            if (appUpdate.isSnoozed()) return;
            void appUpdate.checkForUpdate();
          } catch (e) { console.warn('[fastfree-update] recheck failed:', e); }
        }, FOREGROUND_DEBOUNCE_MS);
      } catch (e) { console.warn('[fastfree-update] scheduleRecheck failed:', e); }
    };

    document.addEventListener('visibilitychange', scheduleRecheck);
    window.addEventListener('online', scheduleRecheck);

    // Initial check on cold start (after a short delay to let the app settle)
    // v2: added logging for debugging
    setTimeout(() => {
      try {
        if (appUpdate.isSnoozed()) {
          console.warn('[fastfree-update] snoozed, skipping check');
          return;
        }
        console.warn('[fastfree-update] running initial checkForUpdate()');
        void appUpdate.checkForUpdate().then((result) => {
          console.warn('[fastfree-update] checkForUpdate result:', JSON.stringify(result));
        });
      } catch (e) { console.warn('[fastfree-update] initial check failed:', e); }
    }, 3000);
  } catch (e) { console.warn('[fastfree-update] boot failed:', e); }
});
