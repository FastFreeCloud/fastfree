// Service Worker Registration - Quasar PWA support

function init(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker.ready
    .then((registration: ServiceWorkerRegistration) => {
      console.log('[PWA] Service worker ready:', registration.scope);

      setInterval(
        () => {
          void registration.update();
        },
        1000 * 60 * 60,
      );

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      if (registration.waiting) {
        console.log('[PWA] New version available, waiting to activate');
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
    console.log('[PWA] All caches deleted:', cacheNames);

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      console.log('[PWA] All SW registrations unregistered');
    }

    window.location.href = window.location.origin + '?pwa-cleared=1';
  } catch {
    window.location.reload();
  }
}

if (typeof window !== 'undefined') {
  init();
}
