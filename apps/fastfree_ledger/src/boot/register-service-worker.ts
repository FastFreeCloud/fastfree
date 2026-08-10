// Service Worker Registration - Simplified without virtual module dependency
// Works with Quasar's built-in PWA support

function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // Register service worker
  void navigator.serviceWorker.ready
    .then((registration: ServiceWorkerRegistration) => {


      // Check for updates periodically
      setInterval(
        () => {
          void registration.update();
        },
        1000 * 60 * 60,
      );

      // Listen for controller change (new SW activated)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Check for waiting SW (update available)
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    })
    .catch((error: Error) => {
      console.error('[PWA] Service Worker registration failed:', error);
    });
}

// Force SW update and reload
export function forceSWUpdate(): void {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations: ReadonlyArray<ServiceWorkerRegistration>) => {
        for (const reg of registrations) {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          void reg.update();
        }
        window.location.reload();
      });
  }
}

// Check for updates manually
export async function checkForUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return registration.waiting !== null;
  } catch {
    return false;
  }
}

// Nuclear clear: clear all caches + unregister SWs + reload
export async function nuclearClear(): Promise<void> {
  try {
    // 1. Delete all CacheStorage entries
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));


    // 2. Unregister all Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));

    }

    // 3. Force reload to get fresh SW
    window.location.href = window.location.origin + '?pwa-cleared=1';
  } catch {
    window.location.reload();
  }
}

// Auto-register on module load
if (typeof window !== 'undefined') {
  void registerServiceWorker();
}
