// ============================================================
// FastFree Auth — Boot Initialization
// This boot file must be registered FIRST in quasar.config.ts
// ============================================================

import { initFastFreeAuth } from 'fastfree-auth'

export default async ({ app }: { app: { provide: (key: string, value: unknown) => void } }) => {
  // Get base URL from env or localStorage
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    localStorage.getItem('fastfree_base_url') ||
    window.location.origin

  // Initialize FastFree Auth
  await initFastFreeAuth({
    baseUrl,
    app: app as never,
  })

}
