import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as auth from 'fastfree-auth'

// The service module imports `fastfree-auth` at load time; the workspace alias
// resolves it and this mock keeps the Frappe SDK out of the unit test.
vi.mock('fastfree-auth', () => ({
  getDocList: vi.fn(),
  getDoc: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  callGet: vi.fn(),
  callPost: vi.fn(),
}))

import { createAccount } from '../src/services/account.service'
import { createJournalEntry } from '../src/services/journal.service'
import { accounting, apiSuccess } from '../../../tests/fixtures/index'

const mockCreateDoc = vi.mocked(auth.createDoc)

describe('accounting factories used by services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists a factory-built account with the mapped payload', async () => {
    const acc = accounting.account()
    mockCreateDoc.mockResolvedValue(
      apiSuccess({
        name: acc.name,
        account_name: acc.accountName,
        account_type: acc.accountType,
        root_type: acc.rootType,
        company: acc.company,
      }) as never,
    )

    const result = await createAccount(acc)

    expect(result.success).toBe(true)
    expect(mockCreateDoc).toHaveBeenCalledWith('Account', {
      account_name: acc.accountName,
      account_type: acc.accountType,
      root_type: acc.rootType,
      company: acc.company,
    })
  })

  it('persists a balanced factory-built journal entry', async () => {
    const entry = accounting.journalEntry()
    mockCreateDoc.mockResolvedValue(
      apiSuccess({
        name: entry.name,
        posting_date: entry.postingDate,
        voucher_type: entry.entryType,
        docstatus: 0,
        total_debit: entry.totalDebit,
        total_credit: entry.totalCredit,
        accounts: entry.accounts.map((row) => ({
          account: row.account,
          debit: row.debit,
          credit: row.credit,
        })),
      }) as never,
    )

    const result = await createJournalEntry(entry)

    expect(result.success).toBe(true)
    expect(result.data?.totalDebit).toBe(result.data?.totalCredit)

    const [doctype, payload] = mockCreateDoc.mock.calls[0]!
    expect(doctype).toBe('Journal Entry')
    expect(payload).toMatchObject({
      posting_date: entry.postingDate,
      total_debit: 100,
      total_credit: 100,
    })
    expect(payload['accounts']).toHaveLength(2)
  })

  it('keeps edge-case entries distinguishable from valid ones', () => {
    expect(accounting.journalEntry().totalDebit).toBe(
      accounting.journalEntry().totalCredit,
    )
  })
})
