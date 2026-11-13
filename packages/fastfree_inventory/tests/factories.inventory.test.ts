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

import { createStockEntry, getStockEntries } from '../src/services/stock.service'
import { apiSuccess, buildList, inventory } from '../../../tests/fixtures/index'

const mockCreateDoc = vi.mocked(auth.createDoc)
const mockGetDocList = vi.mocked(auth.getDocList)

describe('inventory factories used by services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a factory-built stock entry', async () => {
    const entry = inventory.stockEntry()
    mockCreateDoc.mockResolvedValue(apiSuccess(entry) as never)

    const result = await createStockEntry(entry)

    expect(result.success).toBe(true)
    expect(mockCreateDoc).toHaveBeenCalledWith('Stock Entry', entry)
  })

  it('fetches factory-built stock entries', async () => {
    const entries = buildList(inventory.stockEntry, 4)
    mockGetDocList.mockResolvedValue(apiSuccess(entries) as never)

    const result = await getStockEntries()

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(4)
  })

  it('derives stock-entry totals from the line items', () => {
    const entry = inventory.stockEntry()
    expect(entry.totalAmount).toBe(
      entry.items.reduce((sum, item) => sum + item.amount, 0),
    )
  })
})
