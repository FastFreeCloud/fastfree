// ============================================================
// FastFree Purchase — Report Service
// ============================================================

import { callGet } from 'fastfree-auth'

export async function getPurchaseSummary() {
  return callGet('purchase.report.purchase_summary')
}
