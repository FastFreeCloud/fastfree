// ============================================================
// FastFree Accounting — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeAccounting } from 'fastfree-accounting'

export default async () => {
  try {
    await initFastFreeAccounting()
  } catch (err) {
    console.warn('[FastFree Accounting] Initialization failed:', err)
  }
}
