import { getDocList, getDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'

const STOCK_LEDGER_DOCTYPE = 'Stock Ledger Entry'

export interface StockLedgerEntry {
  name: string
  itemCode: string
  itemName: string
  warehouse: string
  postingDate: string
  postingTime: string
  voucherType: string
  voucherNo: string
  actualQty: number
  qtyAfterTransaction: number
  stockValue: number
  stockValueAfterTransaction: number
  batchNo?: string
  serialNo?: string
}

export async function getStockLedgerEntries(itemCode: string, warehouse?: string): Promise<ApiResponse<StockLedgerEntry[]>> {
  const filters: Record<string, unknown> = { item_code: itemCode }
  if (warehouse) filters.warehouse = warehouse
  return getDocList<StockLedgerEntry>(STOCK_LEDGER_DOCTYPE, filters, undefined, 'posting_date desc')
}

export async function getStockBalance(itemCode: string, warehouse: string): Promise<ApiResponse<{ qty: number; value: number }>> {
  const result = await getDocList<StockLedgerEntry>(
    STOCK_LEDGER_DOCTYPE,
    { item_code: itemCode, warehouse },
    undefined,
    'posting_date desc',
    1,
  )
  if (result.success && result.data?.length) {
    const latest = result.data[0]!
    return { success: true, data: { qty: latest.qtyAfterTransaction, value: latest.stockValueAfterTransaction } }
  }
  return { success: true, data: { qty: 0, value: 0 } }
}
