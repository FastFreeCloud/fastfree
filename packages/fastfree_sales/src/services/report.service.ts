import { callGet } from 'fastfree-auth'

export async function getSalesSummary(params?: { from_date?: string; to_date?: string; customer?: string }) {
  return callGet('sales.report.sales_summary', params)
}

export async function getTopSellingItems(params?: { limit?: number; from_date?: string; to_date?: string }) {
  return callGet('sales.report.top_selling_items', params)
}

export async function getCustomerReceivables(params?: { customer?: string }) {
  return callGet('sales.report.customer_receivables', params)
}
