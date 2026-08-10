// ============================================================
// FastFree Purchase — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreePurchase } from 'fastfree-purchase'

export default async () => {
  await initFastFreePurchase()
}
