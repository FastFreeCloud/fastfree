import { getDocList, getDoc, createDoc, updateDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'

const BATCH_DOCTYPE = 'Batch'

export interface Batch {
  name: string
  batchId: string
  itemCode: string
  itemName: string
  manufacturingDate?: string
  expiryDate?: string
  batchQty: number
  stockUom: string
}

export async function getBatches(itemCode: string): Promise<ApiResponse<Batch[]>> {
  const filters: Record<string, unknown>[] = [{ item_code: itemCode }]
  return getDocList<Batch>(BATCH_DOCTYPE, { filters })
}

export async function getBatch(name: string): Promise<ApiResponse<Batch>> {
  return getDoc<Batch>(BATCH_DOCTYPE, name)
}

export async function createBatch(data: Partial<Batch>): Promise<ApiResponse<Batch>> {
  return createDoc<Batch>(BATCH_DOCTYPE, data)
}

export async function updateBatch(name: string, data: Partial<Batch>): Promise<ApiResponse<Batch>> {
  return updateDoc<Batch>(BATCH_DOCTYPE, name, data)
}
