// ============================================================
// FastFree Sales — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeSales } from 'fastfree-sales'

export default async () => {
  await initFastFreeSales()
}
