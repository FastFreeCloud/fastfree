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
  getSalesInvoices,
  getSalesInvoice,
  createSalesInvoice,
  updateSalesInvoice,
  deleteSalesInvoice,
  submitSalesInvoice,
  cancelSalesInvoice,
} from '../src/services/salesInvoice.service'

const mockGetDoc = vi.mocked(auth.getDoc)
const mockGetDocList = vi.mocked(auth.getDocList)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)
const mockCallPost = vi.mocked(auth.callPost)

describe('salesInvoice.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getSalesInvoices returns the rows', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [{ name: 'INV-1' }] } as never)
    await expect(getSalesInvoices()).resolves.toEqual({ success: true, data: [{ name: 'INV-1' }] })
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Sales Invoice',
      undefined,
      [
        'name',
        'customer',
        'customer_name',
        'posting_date',
        'due_date',
        'status',
        'grand_total',
        'outstanding_amount',
        'docstatus',
      ],
      'posting_date desc',
      500,
    )
  })

  it('getSalesInvoices returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getSalesInvoices()).resolves.toEqual({ success: true, data: [] })
  })

  it('getSalesInvoices synthesises FETCH_FAILED', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getSalesInvoices()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch sales invoices' },
    })
  })

  it('getSalesInvoice delegates to getDoc', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: { name: 'INV-1' } } as never)
    await expect(getSalesInvoice('INV-1')).resolves.toEqual({ success: true, data: { name: 'INV-1' } })
    expect(mockGetDoc).toHaveBeenCalledWith('Sales Invoice', 'INV-1')
  })

  it('createSalesInvoice delegates to createDoc', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'INV-1' } } as never)
    await expect(createSalesInvoice({ customer: 'C-1' })).resolves.toEqual({
      success: true,
      data: { name: 'INV-1' },
    })
    expect(mockCreateDoc).toHaveBeenCalledWith('Sales Invoice', { customer: 'C-1' })
  })

  it('updateSalesInvoice delegates to updateDoc', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'INV-1' } } as never)
    await expect(updateSalesInvoice('INV-1', { status: 'Paid' })).resolves.toEqual({
      success: true,
      data: { name: 'INV-1' },
    })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Sales Invoice', 'INV-1', { status: 'Paid' })
  })

  it('deleteSalesInvoice delegates to deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deleteSalesInvoice('INV-1')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Sales Invoice', 'INV-1')
  })

  it('submitSalesInvoice posts to the submit RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true } as never)
    await submitSalesInvoice('INV-1')
    expect(mockCallPost).toHaveBeenCalledWith('frappe.client.submit', {
      doctype: 'Sales Invoice',
      docname: 'INV-1',
    })
  })

  it('cancelSalesInvoice posts to the cancel RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true } as never)
    await cancelSalesInvoice('INV-1')
    expect(mockCallPost).toHaveBeenCalledWith('frappe.client.cancel', {
      doctype: 'Sales Invoice',
      docname: 'INV-1',
    })
  })
})
