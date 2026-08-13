// ============================================================
// FastFree CRM — Boot Initialization
// Must be registered AFTER fastfree-auth-init
// ============================================================

import { initFastFreeCrm } from 'fastfree-crm'

export default async () => {
  await initFastFreeCrm()
}
