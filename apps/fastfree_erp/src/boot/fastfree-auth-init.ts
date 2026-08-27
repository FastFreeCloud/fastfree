// ============================================================
// FastFree Auth — Boot Initialization
// This boot file must be registered FIRST in quasar.config.ts
// ============================================================

import { initFastFreeAuth } from 'fastfree-auth'

export default async ({ app }: { app: { provide: (key: string, value: unknown) => void } }) => {
  try {
    const envUrl = import.meta.env.VITE_API_BASE_URL
    const storedUrl = localStorage.getItem('fastfree_base_url')
    const baseUrl = envUrl || storedUrl || window.location.origin

    await initFastFreeAuth({
      baseUrl,
      app: app as never,
      persistUrl: !!envUrl || !!storedUrl,
    })
  } catch (err) {
    console.warn('[FastFree Auth] Initialization failed:', err)
  }
}
