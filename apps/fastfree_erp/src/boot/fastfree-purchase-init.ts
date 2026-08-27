// ============================================================
// FastFree Purchase — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreePurchase } from 'fastfree-purchase'

export default async () => {
  try {
    await initFastFreePurchase()
  } catch (err) {
    console.warn('[FastFree Purchase] Initialization failed:', err)
  }
}
