import { getDocList, getDoc, createDoc, updateDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'

const SERIAL_DOCTYPE = 'Serial No'

export interface SerialNo {
  name: string
  serialNo: string
  itemCode: string
  itemName: string
  warehouse?: string
  status: 'Available' | 'Issued' | 'Transferred' | 'Expired' | 'Scrapped'
  purchaseDate?: string
  deliveryDate?: string
  batchNo?: string
}

export async function getSerialNumbers(itemCode: string, status?: string): Promise<ApiResponse<SerialNo[]>> {
  const filters: Record<string, unknown>[] = [{ item_code: itemCode }]
  if (status) filters.push({ status })
  return getDocList<SerialNo>(SERIAL_DOCTYPE, { filters })
}

export async function getSerialNumber(name: string): Promise<ApiResponse<SerialNo>> {
  return getDoc<SerialNo>(SERIAL_DOCTYPE, name)
}

export async function createSerialNumber(data: Partial<SerialNo>): Promise<ApiResponse<SerialNo>> {
  return createDoc<SerialNo>(SERIAL_DOCTYPE, data)
}

export async function updateSerialNumber(name: string, data: Partial<SerialNo>): Promise<ApiResponse<SerialNo>> {
  return updateDoc<SerialNo>(SERIAL_DOCTYPE, name, data)
}
