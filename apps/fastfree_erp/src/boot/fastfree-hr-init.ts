// ============================================================
// FastFree HR — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeHr } from 'fastfree-hr'

export default async () => {
  await initFastFreeHr()
}
