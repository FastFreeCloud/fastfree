// ============================================================
// FastFree Inventory — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeInventory } from 'fastfree-inventory'

export default async () => {
  await initFastFreeInventory()
}
