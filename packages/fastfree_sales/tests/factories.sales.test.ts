import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as auth from 'fastfree-auth'

vi.mock('fastfree-auth', () => ({
  getDocList: vi.fn(),
  getDoc: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  callGet: vi.fn(),
  callPost: vi.fn(),
}))

import { createSalesInvoice } from '../src/services/salesInvoice.service'
import { apiFailure, apiSuccess, overdueSalesInvoice, sales } from '../../../tests/fixtures/index'

const mockCreateDoc = vi.mocked(auth.createDoc)

describe('sales factories used by services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a factory-built sales invoice', async () => {
    const invoice = sales.salesInvoice()
    mockCreateDoc.mockResolvedValue(apiSuccess(invoice) as never)

    const result = await createSalesInvoice(invoice)

    expect(result.success).toBe(true)
    expect(mockCreateDoc).toHaveBeenCalledWith('Sales Invoice', invoice)
  })

  it('maps a backend failure onto the error envelope', async () => {
    mockCreateDoc.mockResolvedValue(
      apiFailure('CREATE_FAILED', 'Duplicate invoice') as never,
    )

    const result = await createSalesInvoice(sales.salesInvoice())

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('CREATE_FAILED')
  })

  it('marks an overdue invoice edge case', () => {
    expect(overdueSalesInvoice().status).toBe('Overdue')
  })
})
