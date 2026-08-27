// ============================================================
// FastFree CRM — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeCrm } from 'fastfree-crm'

export default async () => {
  try {
    await initFastFreeCrm()
  } catch (err) {
    console.warn('[FastFree CRM] Initialization failed:', err)
  }
}
