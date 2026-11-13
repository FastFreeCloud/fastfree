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

import { createPurchaseOrder } from '../src/services/purchaseOrder.service'
import { apiSuccess, purchase, purchaseSeed } from '../../../tests/fixtures/index'

const mockCreateDoc = vi.mocked(auth.createDoc)

describe('purchase factories used by services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a factory-built purchase order', async () => {
    const order = purchase.purchaseOrder()
    mockCreateDoc.mockResolvedValue(apiSuccess(order) as never)

    const result = await createPurchaseOrder(order)

    expect(result.success).toBe(true)
    expect(mockCreateDoc).toHaveBeenCalledWith('Purchase Order', order)
  })

  it('derives the order total from its lines', () => {
    const order = purchase.purchaseOrder()
    expect(order.total).toBe(order.items.reduce((sum, item) => sum + item.amount, 0))
  })

  it('builds a purchase-to-pay seed dataset', () => {
    const seed = purchaseSeed()
    expect(seed.invoice.supplier).toBe(seed.order.supplier)
    expect(seed.invoice.total).toBeGreaterThan(0)
  })
})
