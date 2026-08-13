// ============================================================
// FastFree Accounting — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeAccounting } from 'fastfree-accounting'

export default async () => {
  await initFastFreeAccounting()
}
