import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as auth from 'fastfree-auth'

// The service module imports `fastfree-auth` at load time; the workspace alias
// in the root vitest.config.ts resolves it to packages/fastfree_auth/src, and
// the mock below replaces it so no Frappe SDK / IndexedDB code is pulled in.
vi.mock('fastfree-auth', () => ({
  getDoc: vi.fn(),
  getDocList: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}))

import {
  calculateTax,
  calculateTaxInclusive,
  getTaxTemplates,
  getTaxTemplate,
  createTaxTemplate,
  updateTaxTemplate,
  deleteTaxTemplate,
  getTaxRules,
  createTaxRule,
  deleteTaxRule,
} from '../src/services/tax.service'

const mockGetDoc = vi.mocked(auth.getDoc)
const mockGetDocList = vi.mocked(auth.getDocList)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)

describe('tax.service calculations', () => {
  describe('calculateTax', () => {
    it('computes amount * rate / 100', () => {
      expect(calculateTax(100, 10)).toBe(10)
      expect(calculateTax(1000, 14.5)).toBe(145)
    })

    it('rounds to 2 decimals', () => {
      expect(calculateTax(33.33, 7.5)).toBe(2.5)
    })

    it('returns 0 for a zero amount', () => {
      expect(calculateTax(0, 10)).toBe(0)
    })
  })

  describe('calculateTaxInclusive', () => {
    it('extracts tax from a tax-inclusive amount', () => {
      expect(calculateTaxInclusive(114.5, 14.5)).toBe(100)
      expect(calculateTaxInclusive(100, 10)).toBeCloseTo(90.91, 2)
    })

    it('returns 0 for a zero amount', () => {
      expect(calculateTaxInclusive(0, 10)).toBe(0)
    })
  })
})

describe('tax.service CRUD', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getTaxTemplates returns the rows', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [{ name: 'VAT' }] } as never)
    await expect(getTaxTemplates()).resolves.toEqual({ success: true, data: [{ name: 'VAT' }] })
    expect(mockGetDocList).toHaveBeenCalledWith('Tax Template', undefined, undefined, 'templateName')
  })

  it('getTaxTemplates passes a company filter', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getTaxTemplates('FastFree')
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Tax Template',
      { company: 'FastFree' },
      undefined,
      'templateName',
    )
  })

  it('getTaxTemplates returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getTaxTemplates()).resolves.toEqual({ success: true, data: [] })
  })

  it('getTaxTemplates synthesises FETCH_FAILED', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getTaxTemplates()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch tax templates' },
    })
  })

  it('getTaxTemplate delegates to getDoc', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: { name: 'VAT' } } as never)
    await expect(getTaxTemplate('VAT')).resolves.toEqual({ success: true, data: { name: 'VAT' } })
    expect(mockGetDoc).toHaveBeenCalledWith('Tax Template', 'VAT')
  })

  it('createTaxTemplate delegates to createDoc', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'VAT' } } as never)
    await expect(createTaxTemplate({ templateName: 'VAT' })).resolves.toEqual({
      success: true,
      data: { name: 'VAT' },
    })
    expect(mockCreateDoc).toHaveBeenCalledWith('Tax Template', { templateName: 'VAT' })
  })

  it('updateTaxTemplate delegates to updateDoc', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'VAT' } } as never)
    await expect(updateTaxTemplate('VAT', { rate: 15 })).resolves.toEqual({
      success: true,
      data: { name: 'VAT' },
    })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Tax Template', 'VAT', { rate: 15 })
  })

  it('deleteTaxTemplate delegates to deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deleteTaxTemplate('VAT')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Tax Template', 'VAT')
  })

  it('getTaxRules returns the rows', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [{ name: 'R1' }] } as never)
    await expect(getTaxRules()).resolves.toEqual({ success: true, data: [{ name: 'R1' }] })
    expect(mockGetDocList).toHaveBeenCalledWith('Tax Rule', undefined, undefined, 'priority')
  })

  it('getTaxRules returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getTaxRules()).resolves.toEqual({ success: true, data: [] })
  })

  it('getTaxRules synthesises FETCH_FAILED', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getTaxRules()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch tax rules' },
    })
  })

  it('createTaxRule delegates to createDoc', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'R1' } } as never)
    await expect(createTaxRule({ ruleName: 'Standard' })).resolves.toEqual({
      success: true,
      data: { name: 'R1' },
    })
    expect(mockCreateDoc).toHaveBeenCalledWith('Tax Rule', { ruleName: 'Standard' })
  })

  it('deleteTaxRule delegates to deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deleteTaxRule('R1')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Tax Rule', 'R1')
  })
})
