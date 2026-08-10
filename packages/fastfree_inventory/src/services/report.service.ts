import { getDocList } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'

const STOCK_LEDGER_DOCTYPE = 'Stock Ledger Entry'
const STOCK_BALANCE_DOCTYPE = 'Stock Balance'

export interface StockBalanceReport {
  itemCode: string
  itemName: string
  warehouse: string
  qty: number
  valuationRate: number
  stockValue: number
}

export interface StockAgeReport {
  itemCode: string
  itemName: string
  warehouse: string
  qty: number
  ageInDays: number
  stockValue: number
}

export async function getStockBalanceReport(warehouse?: string): Promise<ApiResponse<StockBalanceReport[]>> {
  const filters: Record<string, unknown>[] = []
  if (warehouse) filters.push({ warehouse })
  return getDocList<StockBalanceReport>(STOCK_BALANCE_DOCTYPE, { filters })
}

export async function getStockAgeReport(warehouse?: string): Promise<ApiResponse<StockAgeReport[]>> {
  const filters: Record<string, unknown>[] = []
  if (warehouse) filters.push({ warehouse })
  return getDocList<StockAgeReport>('Stock Ageing Report', { filters })
}

export async function getWarehouseSummary(): Promise<ApiResponse<{ warehouse: string; totalItems: number; totalValue: number }[]>> {
  const result = await getDocList<StockBalanceReport>(STOCK_BALANCE_DOCTYPE, {})
  if (!result.success || !result.data) return { success: true, data: [] }

  const summary = new Map<string, { warehouse: string; totalItems: number; totalValue: number }>()
  for (const entry of result.data) {
    const existing = summary.get(entry.warehouse) || { warehouse: entry.warehouse, totalItems: 0, totalValue: 0 }
    existing.totalItems += entry.qty
    existing.totalValue += entry.stockValue
    summary.set(entry.warehouse, existing)
  }
  return { success: true, data: Array.from(summary.values()) }
}
