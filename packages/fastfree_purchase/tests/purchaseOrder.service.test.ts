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
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  submitPurchaseOrder,
  cancelPurchaseOrder,
} from '../src/services/purchaseOrder.service'

const mockGetDoc = vi.mocked(auth.getDoc)
const mockGetDocList = vi.mocked(auth.getDocList)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)
const mockCallPost = vi.mocked(auth.callPost)

describe('purchaseOrder.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getPurchaseOrders returns the rows', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [{ name: 'PO-1' }] } as never)
    await expect(getPurchaseOrders()).resolves.toEqual({ success: true, data: [{ name: 'PO-1' }] })
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Purchase Order',
      undefined,
      ['name', 'supplier', 'transaction_date', 'grand_total', 'status'],
      'transaction_date',
      500,
    )
  })

  it('getPurchaseOrders returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getPurchaseOrders()).resolves.toEqual({ success: true, data: [] })
  })

  it('getPurchaseOrders synthesises FETCH_FAILED', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getPurchaseOrders()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch purchase orders' },
    })
  })

  it('getPurchaseOrder delegates to getDoc', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: { name: 'PO-1' } } as never)
    await expect(getPurchaseOrder('PO-1')).resolves.toEqual({ success: true, data: { name: 'PO-1' } })
    expect(mockGetDoc).toHaveBeenCalledWith('Purchase Order', 'PO-1')
  })

  it('createPurchaseOrder delegates to createDoc', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'PO-1' } } as never)
    await expect(createPurchaseOrder({ supplier: 'S-1' })).resolves.toEqual({
      success: true,
      data: { name: 'PO-1' },
    })
    expect(mockCreateDoc).toHaveBeenCalledWith('Purchase Order', { supplier: 'S-1' })
  })

  it('updatePurchaseOrder delegates to updateDoc', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'PO-1' } } as never)
    await expect(updatePurchaseOrder('PO-1', { status: 'Submitted' })).resolves.toEqual({
      success: true,
      data: { name: 'PO-1' },
    })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Purchase Order', 'PO-1', { status: 'Submitted' })
  })

  it('deletePurchaseOrder delegates to deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deletePurchaseOrder('PO-1')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Purchase Order', 'PO-1')
  })

  it('submitPurchaseOrder posts to the submit RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true } as never)
    await submitPurchaseOrder('PO-1')
    expect(mockCallPost).toHaveBeenCalledWith('frappe.client.submit_single', {
      doctype: 'Purchase Order',
      docname: 'PO-1',
    })
  })

  it('cancelPurchaseOrder posts to the cancel RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true } as never)
    await cancelPurchaseOrder('PO-1')
    expect(mockCallPost).toHaveBeenCalledWith('frappe.client.cancel', {
      doctype: 'Purchase Order',
      docname: 'PO-1',
    })
  })
})
