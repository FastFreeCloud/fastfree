// ============================================================
// FastFree Inventory — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeInventory } from 'fastfree-inventory'

export default async () => {
  try {
    await initFastFreeInventory()
  } catch (err) {
    console.warn('[FastFree Inventory] Initialization failed:', err)
  }
}
