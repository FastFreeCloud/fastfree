import { getDocList, getDoc, createDoc, updateDoc, deleteDoc } from 'fastfree-auth'
import type { ApiResponse } from 'fastfree-auth'
import type { HolidayList } from '../types'

const DOCTYPE = 'Holiday List'
const HOLIDAY_LIST_FIELDS = ['name', 'holiday_list_name', 'holidays']

export async function getHolidayLists(): Promise<ApiResponse<HolidayList[]>> {
  const result = await getDocList<HolidayList>(DOCTYPE, undefined, HOLIDAY_LIST_FIELDS, 'holiday_list_name', 500)
  if (!result.success) return { success: false, error: result.error ?? { code: 'FETCH_FAILED', message: 'Failed to fetch holiday lists' } }
  return { success: true, data: result.data ?? [] }
}

export async function getHolidayList(name: string): Promise<ApiResponse<HolidayList>> {
  return getDoc<HolidayList>(DOCTYPE, name)
}

export async function createHolidayList(data: Partial<HolidayList>): Promise<ApiResponse<HolidayList>> {
  return createDoc<HolidayList>(DOCTYPE, data)
}

export async function updateHolidayList(name: string, data: Partial<HolidayList>): Promise<ApiResponse<HolidayList>> {
  return updateDoc<HolidayList>(DOCTYPE, name, data)
}

export async function deleteHolidayList(name: string): Promise<ApiResponse<void>> {
  return deleteDoc(DOCTYPE, name)
}
