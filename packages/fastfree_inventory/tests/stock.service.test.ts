import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as auth from 'fastfree-auth'

// The service module imports `fastfree-auth` at load time; the workspace alias
// resolves it and this mock keeps the Frappe SDK out of the unit test.
vi.mock('fastfree-auth', () => ({
  getDoc: vi.fn(),
  getDocList: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  callGet: vi.fn(),
  callPost: vi.fn(),
}))

import {
  getStockEntries,
  getStockEntry,
  createStockEntry,
  updateStockEntry,
  deleteStockEntry,
  submitStockEntry,
  cancelStockEntry,
  getStockBalance,
} from '../src/services/stock.service'

const mockGetDoc = vi.mocked(auth.getDoc)
const mockGetDocList = vi.mocked(auth.getDocList)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)

describe('stock.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getStockEntries returns the rows', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [{ name: 'SE-1' }] } as never)
    await expect(getStockEntries()).resolves.toEqual({ success: true, data: [{ name: 'SE-1' }] })
    expect(mockGetDocList).toHaveBeenCalledWith('Stock Entry', undefined, undefined, undefined, 500)
  })

  it('getStockEntries passes filters', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getStockEntries({ entry_type: 'Receipt' })
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Stock Entry',
      { entry_type: 'Receipt' },
      undefined,
      undefined,
      500,
    )
  })

  it('getStockEntries returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getStockEntries()).resolves.toEqual({ success: true, data: [] })
  })

  it('getStockEntries synthesises FETCH_FAILED', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getStockEntries()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch stock entries' },
    })
  })

  it('getStockEntry delegates to getDoc', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: { name: 'SE-1' } } as never)
    await expect(getStockEntry('SE-1')).resolves.toEqual({ success: true, data: { name: 'SE-1' } })
    expect(mockGetDoc).toHaveBeenCalledWith('Stock Entry', 'SE-1')
  })

  it('createStockEntry delegates to createDoc', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'SE-1' } } as never)
    await expect(createStockEntry({ entryType: 'Receipt' })).resolves.toEqual({
      success: true,
      data: { name: 'SE-1' },
    })
    expect(mockCreateDoc).toHaveBeenCalledWith('Stock Entry', { entryType: 'Receipt' })
  })

  it('updateStockEntry delegates to updateDoc', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'SE-1' } } as never)
    await expect(updateStockEntry('SE-1', { remarks: 'x' })).resolves.toEqual({
      success: true,
      data: { name: 'SE-1' },
    })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Stock Entry', 'SE-1', { remarks: 'x' })
  })

  it('deleteStockEntry delegates to deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deleteStockEntry('SE-1')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Stock Entry', 'SE-1')
  })

  it('submitStockEntry sets the status to Submitted', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'SE-1' } } as never)
    await expect(submitStockEntry('SE-1')).resolves.toEqual({ success: true, data: { name: 'SE-1' } })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Stock Entry', 'SE-1', { status: 'Submitted' })
  })

  it('cancelStockEntry sets the status to Cancelled', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'SE-1' } } as never)
    await expect(cancelStockEntry('SE-1')).resolves.toEqual({ success: true, data: { name: 'SE-1' } })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Stock Entry', 'SE-1', { status: 'Cancelled' })
  })

  it('getStockBalance passes no filter when called bare', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getStockBalance()
    expect(mockGetDocList).toHaveBeenCalledWith('Stock Balance', undefined, undefined, undefined, 500)
  })

  it('getStockBalance filters by warehouse only', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getStockBalance('WH-1')
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Stock Balance',
      { warehouse: 'WH-1' },
      undefined,
      undefined,
      500,
    )
  })

  it('getStockBalance filters by product only', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getStockBalance(undefined, 'ITEM-1')
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Stock Balance',
      { product: 'ITEM-1' },
      undefined,
      undefined,
      500,
    )
  })

  it('getStockBalance filters by both warehouse and product', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [{ product: 'ITEM-1' }] } as never)
    await expect(getStockBalance('WH-1', 'ITEM-1')).resolves.toEqual({
      success: true,
      data: [{ product: 'ITEM-1' }],
    })
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Stock Balance',
      { warehouse: 'WH-1', product: 'ITEM-1' },
      undefined,
      undefined,
      500,
    )
  })

  it('getStockBalance synthesises FETCH_FAILED', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getStockBalance()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch stock balance' },
    })
  })
})
