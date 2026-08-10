// ============================================================
// FastFree Accounting — Financial Report Service
// ============================================================

import { callGet } from 'fastfree-auth'
import type { FinancialReport, ReportFilter, ReportRow, ApiResponse } from '../types'

const REPORT_ENDPOINTS: Record<string, string> = {
  trial_balance: 'accounts.report.trial_balance.trial_balance.execute',
  profit_and_loss: 'accounts.report.profit_and_loss.profit_and_loss.execute',
  balance_sheet: 'accounts.report.balance_sheet.balance_sheet.execute',
  general_ledger: 'accounts.report.general_ledger.general_ledger.execute',
  accounts_receivable: 'accounts.report.accounts_receivable.accounts_receivable.execute',
  accounts_payable: 'accounts.report.accounts_payable.accounts_payable.execute',
}

export async function generateReport(filter: ReportFilter): Promise<ApiResponse<FinancialReport>> {
  const endpoint = REPORT_ENDPOINTS[filter.reportType]
  if (!endpoint) {
    return {
      success: false,
      error: { code: 'INVALID_REPORT_TYPE', message: `Unknown report type: ${filter.reportType}` },
    }
  }

  const params: Record<string, unknown> = {
    from_date: filter.fromDate,
    to_date: filter.toDate,
  }
  if (filter.costCenter) params.cost_center = filter.costCenter
  if (filter.fiscalYear) params.fiscal_year = filter.fiscalYear

  const result = await callGet<{ rows: ReportRow[]; total_debit: number; total_credit: number }>(endpoint, params)

  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? { code: 'UNKNOWN', message: 'Failed to generate report' } }
  }

  const report: FinancialReport = {
    reportType: filter.reportType,
    filter,
    rows: result.data.rows ?? [],
    totalDebit: result.data.total_debit ?? 0,
    totalCredit: result.data.total_credit ?? 0,
    generatedAt: new Date().toISOString(),
  }

  return { success: true, data: report }
}
