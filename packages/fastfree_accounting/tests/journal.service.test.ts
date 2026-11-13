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
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  submitJournalEntry,
  cancelJournalEntry,
} from '../src/services/journal.service'

const mockGetDoc = vi.mocked(auth.getDoc)
const mockGetDocList = vi.mocked(auth.getDocList)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)
const mockCallPost = vi.mocked(auth.callPost)

/** A backend row carrying every optional field. */
function fullRaw() {
  return {
    name: 'JV-001',
    title: 'Opening',
    voucher_type: 'Bank Entry',
    company: 'FastFree',
    posting_date: '2026-01-01',
    user_remark: 'user note',
    remark: 'system note',
    total_debit: 100,
    total_credit: 100,
    docstatus: 1,
    accounts: [
      {
        account: 'Cash',
        debit: 100,
        credit: 0,
        cost_center: 'Main',
        reference_type: 'Sales Invoice',
        reference_name: 'INV-1',
        remark: 'line note',
      },
      { account: 'Sales', debit: 0, credit: '100' },
    ],
  }
}

describe('journal.service — mapping', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps a complete backend row', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: fullRaw() } as never)
    const result = await getJournalEntry('JV-001')
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      name: 'JV-001',
      title: 'Opening',
      entryType: 'Bank Entry',
      company: 'FastFree',
      postingDate: '2026-01-01',
      status: 'Submitted',
      totalDebit: 100,
      totalCredit: 100,
      remark: 'user note',
    })
    expect(result.data?.accounts).toHaveLength(2)
    expect(result.data?.accounts[0]).toEqual({
      account: 'Cash',
      debit: 100,
      credit: 0,
      costCenter: 'Main',
      referenceType: 'Sales Invoice',
      referenceName: 'INV-1',
      remark: 'line note',
    })
  })

  it('coerces numeric strings and falls back on junk', async () => {
    mockGetDoc.mockResolvedValue({
      success: true,
      data: fullRaw(),
    } as never)
    const result = await getJournalEntry('JV-001')
    expect(result.data?.accounts[1].credit).toBe(100)

    mockGetDoc.mockResolvedValue({
      success: true,
      data: {
        name: 'JV-002',
        accounts: [
          { account: 42, debit: 'abc', credit: Number.NaN, cost_center: 7 },
        ],
      },
    } as never)
    const junk = await getJournalEntry('JV-002')
    expect(junk.data?.accounts[0]).toEqual({ account: '', debit: 0, credit: 0 })
  })

  it('handles a non-array accounts field', async () => {
    mockGetDoc.mockResolvedValue({
      success: true,
      data: { name: 'JV-003', accounts: 'nope' },
    } as never)
    const result = await getJournalEntry('JV-003')
    expect(result.data?.accounts).toEqual([])
  })

  it('handles a null account row', async () => {
    mockGetDoc.mockResolvedValue({
      success: true,
      data: { name: 'JV-004', accounts: [null] },
    } as never)
    const result = await getJournalEntry('JV-004')
    expect(result.data?.accounts[0]).toEqual({ account: '', debit: 0, credit: 0 })
  })

  it('maps docstatus 2 to Cancelled and anything else to Draft', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: { docstatus: 2 } } as never)
    expect((await getJournalEntry('A')).data?.status).toBe('Cancelled')

    mockGetDoc.mockResolvedValue({ success: true, data: { docstatus: 0 } } as never)
    expect((await getJournalEntry('A')).data?.status).toBe('Draft')

    mockGetDoc.mockResolvedValue({ success: true, data: { docstatus: '1' } } as never)
    expect((await getJournalEntry('A')).data?.status).toBe('Submitted')

    mockGetDoc.mockResolvedValue({ success: true, data: {} } as never)
    expect((await getJournalEntry('A')).data?.status).toBe('Draft')
  })

  it('maps known voucher types and defaults the rest', async () => {
    for (const voucherType of ['Bank Entry', 'Cash Entry', 'Journal Entry']) {
      mockGetDoc.mockResolvedValue({ success: true, data: { voucher_type: voucherType } } as never)
      expect((await getJournalEntry('A')).data?.entryType).toBe(voucherType)
    }
    mockGetDoc.mockResolvedValue({ success: true, data: { voucher_type: 'Other' } } as never)
    expect((await getJournalEntry('A')).data?.entryType).toBe('Journal Entry')
  })

  it('prefers the user remark and falls back to the system remark', async () => {
    mockGetDoc.mockResolvedValue({
      success: true,
      data: { user_remark: 'user', remark: 'system' },
    } as never)
    expect((await getJournalEntry('A')).data?.remark).toBe('user')

    mockGetDoc.mockResolvedValue({ success: true, data: { remark: 'system' } } as never)
    expect((await getJournalEntry('A')).data?.remark).toBe('system')

    mockGetDoc.mockResolvedValue({ success: true, data: {} } as never)
    expect((await getJournalEntry('A')).data).not.toHaveProperty('remark')
  })

  it('omits optional fields that are absent', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: { name: 'JV-005' } } as never)
    const entry = (await getJournalEntry('JV-005')).data
    expect(entry).not.toHaveProperty('title')
    expect(entry).not.toHaveProperty('company')
    expect(entry).toMatchObject({ name: 'JV-005', postingDate: '', totalDebit: 0, totalCredit: 0 })
  })
})

describe('journal.service — list', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps every row', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [fullRaw(), { name: 'JV-002' }] } as never)
    const result = await getJournalEntries()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].name).toBe('JV-001')
    expect(result.data?.[1].name).toBe('JV-002')
  })

  it('passes filters and the default sort', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getJournalEntries({ status: 'Draft' })
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Journal Entry',
      { status: 'Draft' },
      expect.any(Array),
      'posting_date desc',
    )
  })

  it('returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getJournalEntries()).resolves.toEqual({ success: true, data: [] })
  })

  it('propagates a backend error', async () => {
    const error = { code: 'TIMEOUT', message: 'slow' }
    mockGetDocList.mockResolvedValue({ success: false, error } as never)
    await expect(getJournalEntries()).resolves.toEqual({ success: false, error })
  })

  it('synthesises FETCH_FAILED when no error is supplied', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getJournalEntries()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch journal entries' },
    })
  })
})

describe('journal.service — write operations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createJournalEntry maps the payload both ways', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: fullRaw() } as never)
    const result = await createJournalEntry({
      title: 'Opening',
      postingDate: '2026-01-01',
      entryType: 'Bank Entry',
      company: 'FastFree',
      remark: 'note',
      totalDebit: 100,
      totalCredit: 100,
      accounts: [
        {
          account: 'Cash',
          debit: 100,
          credit: 0,
          costCenter: 'Main',
          referenceType: 'Sales Invoice',
          referenceName: 'INV-1',
          remark: 'line',
        },
      ],
    })

    expect(mockCreateDoc).toHaveBeenCalledWith('Journal Entry', {
      title: 'Opening',
      posting_date: '2026-01-01',
      voucher_type: 'Bank Entry',
      company: 'FastFree',
      user_remark: 'note',
      remark: 'note',
      total_debit: 100,
      total_credit: 100,
      accounts: [
        {
          account: 'Cash',
          debit: 100,
          credit: 0,
          cost_center: 'Main',
          reference_type: 'Sales Invoice',
          reference_name: 'INV-1',
          remark: 'line',
        },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('JV-001')
  })

  it('createJournalEntry omits undefined fields', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'JV-001' } } as never)
    await createJournalEntry({ postingDate: '2026-01-01' })
    expect(mockCreateDoc).toHaveBeenCalledWith('Journal Entry', { posting_date: '2026-01-01' })
  })

  it('createJournalEntry synthesises CREATE_FAILED', async () => {
    mockCreateDoc.mockResolvedValue({ success: false } as never)
    await expect(createJournalEntry({})).resolves.toEqual({
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Failed to create journal entry' },
    })
  })

  it('updateJournalEntry maps the payload and result', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: fullRaw() } as never)
    const result = await updateJournalEntry('JV-001', { title: 'Updated' })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Journal Entry', 'JV-001', { title: 'Updated' })
    expect(result.success).toBe(true)
    expect(result.data?.title).toBe('Opening')
  })

  it('updateJournalEntry synthesises UPDATE_FAILED', async () => {
    mockUpdateDoc.mockResolvedValue({ success: false } as never)
    await expect(updateJournalEntry('JV-001', {})).resolves.toEqual({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Failed to update journal entry' },
    })
  })

  it('deleteJournalEntry delegates to deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deleteJournalEntry('JV-001')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Journal Entry', 'JV-001')
  })

  it('submitJournalEntry posts to the backend RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true, data: { name: 'JV-001' } } as never)
    await submitJournalEntry('JV-001')
    expect(mockCallPost).toHaveBeenCalledWith(
      'accounts.doctype.journal_entry.journal_entry.submit_journal_entry',
      { name: 'JV-001' },
    )
  })

  it('cancelJournalEntry posts to the backend RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true, data: { name: 'JV-001' } } as never)
    await cancelJournalEntry('JV-001')
    expect(mockCallPost).toHaveBeenCalledWith(
      'accounts.doctype.journal_entry.journal_entry.cancel_journal_entry',
      { name: 'JV-001' },
    )
  })
})
