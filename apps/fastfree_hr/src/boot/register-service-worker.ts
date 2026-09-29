// Service Worker Registration - Simplified without virtual module dependency
// Works with Quasar's built-in PWA support

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined
  try {
    return await navigator.serviceWorker.getRegistration()
  } catch {
    return undefined
  }
}

function registerServiceWorker(): void {
  void getServiceWorkerRegistration().then((registration) => {
    if (!registration) return

    const refreshRegistration = () => {
      void registration.update().catch(() => undefined)
    }
    refreshRegistration()
    window.setInterval(refreshRegistration, 1000 * 60 * 60)

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  })
}

export function forceSWUpdate(): void {
  if (!('serviceWorker' in navigator)) return
  const reload = () => {
    window.location.reload()
  }
  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.allSettled(
        registrations.map((registration) => {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
          return registration.update()
        }),
      ),
    )
    .then(reload, reload)
}

export async function checkForUpdate(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return false

  try {
    await registration.update()
    return registration.waiting !== null
  } catch {
    return false
  }
}

export async function nuclearClear(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }

    window.location.href = `${window.location.origin}?pwa-cleared=1`
  } catch {
    window.location.reload()
  }
}

if (typeof window !== 'undefined') {
  void registerServiceWorker()
}
