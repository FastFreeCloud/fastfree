import { ref } from 'vue'

export function usePWACache() {
  const isChecking = ref(false)
  const isClearing = ref(false)

  function toError(e: unknown): Error {
    return e instanceof Error ? e : new Error(String(e))
  }

  async function checkForUpdate(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false

    try {
      isChecking.value = true
      const registrations = await navigator.serviceWorker.getRegistrations()

      for (const registration of registrations) {
        await registration.update()
        if (registration.waiting) {
          return true
        }
      }
      return false
    } catch (e) {
      console.error('[PWA] Update check failed:', e instanceof Error ? e : new Error(String(e)))
      return false
    } finally {
      isChecking.value = false
    }
  }

  async function forceSWUpdate(): Promise<void> {
    if (!('serviceWorker' in navigator)) return

    try {
      const registrations = await navigator.serviceWorker.getRegistrations()

      for (const registration of registrations) {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
        await registration.update()
      }
      window.location.reload()
    } catch (e) {
      console.error('[PWA] Force update failed:', e instanceof Error ? e : new Error(String(e)))
    }
  }

  async function clearAllCaches(): Promise<void> {
    isClearing.value = true
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    } catch (e) {
      console.error('[PWA] Cache clear failed:', e instanceof Error ? e : new Error(String(e)))
    } finally {
      isClearing.value = false
    }
  }

  async function nuclearClear(): Promise<void> {
    isClearing.value = true
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
      }

      window.location.href = window.location.origin + '?pwa-cleared=1'
    } catch (e) {
      console.error('[PWA] Nuclear clear failed:', e instanceof Error ? e : new Error(String(e)))
      isClearing.value = false
      window.location.reload()
    }
  }

  async function clearCacheByPattern(pattern: RegExp): Promise<void> {
    try {
      const cacheNames = await caches.keys()
      const matching = cacheNames.filter((name) => pattern.test(name))
      await Promise.all(matching.map((name) => caches.delete(name)))
    } catch (e) {
      console.error('[PWA] Pattern cache clear failed:', e instanceof Error ? e : new Error(String(e)))
    }
  }

  return {
    isChecking,
    isClearing,
    checkForUpdate,
    forceSWUpdate,
    clearAllCaches,
    nuclearClear,
    clearCacheByPattern
  }
}