// ============================================================
// FastFree Sales — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeSales } from 'fastfree-sales'

export default async () => {
  try {
    await initFastFreeSales()
  } catch (err) {
    console.warn('[FastFree Sales] Initialization failed:', err)
  }
}
