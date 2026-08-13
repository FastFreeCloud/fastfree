// Service Worker Registration - Simplified without virtual module dependency
// Works with Quasar's built-in PWA support

function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker.ready
    .then((registration: ServiceWorkerRegistration) => {
      setInterval(
        () => {
          void registration.update();
        },
        1000 * 60 * 60,
      );

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    })
    .catch((error: Error) => {
      console.error('[PWA] Service Worker registration failed:', error);
    });
}

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

export async function nuclearClear(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    window.location.href = window.location.origin + '?pwa-cleared=1';
  } catch {
    window.location.reload();
  }
}

if (typeof window !== 'undefined') {
  void registerServiceWorker();
}
