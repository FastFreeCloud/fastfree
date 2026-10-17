// ============================================================
// FastFree Auth — Boot File Template
// Apps can use this as a Quasar boot file to initialize auth
// ============================================================

import { initFastFreeAuth } from './init'
import type { App } from 'vue'

export default async function ({ app }: { app: App }) {
  const baseUrl =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
    localStorage.getItem('fastfree_base_url') ||
    window.location.origin

  await initFastFreeAuth({ baseUrl, app })
}
