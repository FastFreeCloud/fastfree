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
  mapFrappeAccount,
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountChildren,
} from '../src/services/account.service'

const mockGetDoc = vi.mocked(auth.getDoc)
const mockGetDocList = vi.mocked(auth.getDocList)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)

describe('mapFrappeAccount', () => {
  it('maps a complete row', () => {
    const account = mapFrappeAccount({
      name: 'ACC-001',
      account_name: 'Cash',
      account_number: '1000',
      account_type: 'Asset',
      root_type: 'Balance Sheet',
      parent_account: 'Assets',
      company: 'FastFree',
      is_group: 1,
    })
    expect(account).toMatchObject({
      name: 'ACC-001',
      accountName: 'Cash',
      accountType: 'Asset',
      rootType: 'Balance Sheet',
      parentAccount: 'Assets',
      company: 'FastFree',
      isGroup: true,
      openingBalance: 0,
      disabled: false,
    })
  })

  it('falls back to the name when account_name is missing', () => {
    expect(mapFrappeAccount({ name: 'ACC-002' }).accountName).toBe('ACC-002')
  })

  it('defaults an unknown account type to Asset', () => {
    expect(mapFrappeAccount({ name: 'A', account_type: 'Nonsense' }).accountType).toBe('Asset')
    expect(mapFrappeAccount({ name: 'A', account_type: '' }).accountType).toBe('Asset')
    expect(mapFrappeAccount({ name: 'A' }).accountType).toBe('Asset')
  })

  it('defaults an unknown root type to Balance Sheet', () => {
    expect(mapFrappeAccount({ name: 'A', root_type: 'Nonsense' }).rootType).toBe('Balance Sheet')
    expect(mapFrappeAccount({ name: 'A' }).rootType).toBe('Balance Sheet')
  })

  it('blank parent_account becomes an empty string', () => {
    expect(mapFrappeAccount({ name: 'A', parent_account: '' }).parentAccount).toBe('')
    expect(mapFrappeAccount({ name: 'A' }).parentAccount).toBe('')
  })

  it('reads is_group from both number and boolean forms', () => {
    expect(mapFrappeAccount({ name: 'A', is_group: 1 }).isGroup).toBe(true)
    expect(mapFrappeAccount({ name: 'A', is_group: true }).isGroup).toBe(true)
    expect(mapFrappeAccount({ name: 'A', is_group: 0 }).isGroup).toBe(false)
    expect(mapFrappeAccount({ name: 'A' }).isGroup).toBe(false)
  })

  it('omits company when the row has none', () => {
    expect(mapFrappeAccount({ name: 'A' })).not.toHaveProperty('company')
  })
})

describe('getAccounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the fetched rows', async () => {
    mockGetDocList.mockResolvedValue({
      success: true,
      data: [{ name: 'A', account_name: 'Cash', account_type: 'Asset', root_type: 'Balance Sheet' }],
    } as never)

    const result = await getAccounts()
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].accountName).toBe('Cash')
  })

  it('passes a company filter when given', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getAccounts('FastFree')
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Account',
      { company: 'FastFree' },
      expect.any(Array),
      undefined,
      500,
    )
  })

  it('passes no filter when no company is given', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [] } as never)
    await getAccounts()
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Account',
      undefined,
      expect.any(Array),
      undefined,
      500,
    )
  })

  it('returns an empty list when the backend omits data', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getAccounts()).resolves.toEqual({ success: true, data: [] })
  })

  it('propagates a backend error', async () => {
    const error = { code: 'TIMEOUT', message: 'slow' }
    mockGetDocList.mockResolvedValue({ success: false, error } as never)
    await expect(getAccounts()).resolves.toEqual({ success: false, error })
  })

  it('synthesises a FETCH_FAILED error when none is supplied', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    const result = await getAccounts()
    expect(result).toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch accounts' },
    })
  })
})

describe('getAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps a fetched account', async () => {
    mockGetDoc.mockResolvedValue({
      success: true,
      data: { name: 'A', account_name: 'Cash', account_type: 'Asset', root_type: 'Balance Sheet' },
    } as never)
    const result = await getAccount('A')
    expect(result.success).toBe(true)
    expect(result.data?.accountName).toBe('Cash')
  })

  it('fails when the backend returns no data', async () => {
    mockGetDoc.mockResolvedValue({ success: true } as never)
    await expect(getAccount('A')).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch account' },
    })
  })

  it('propagates a backend error', async () => {
    const error = { code: 'NOT_FOUND', message: 'missing' }
    mockGetDoc.mockResolvedValue({ success: false, error } as never)
    await expect(getAccount('A')).resolves.toEqual({ success: false, error })
  })
})

describe('createAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the mapped payload and maps the result', async () => {
    mockCreateDoc.mockResolvedValue({
      success: true,
      data: { name: 'A', account_name: 'Cash', account_type: 'Asset', root_type: 'Balance Sheet' },
    } as never)

    const result = await createAccount({
      accountName: 'Cash',
      accountType: 'Asset',
      rootType: 'Balance Sheet',
      parentAccount: 'Assets',
      company: 'FastFree',
    })

    expect(mockCreateDoc).toHaveBeenCalledWith('Account', {
      account_name: 'Cash',
      account_type: 'Asset',
      root_type: 'Balance Sheet',
      parent_account: 'Assets',
      company: 'FastFree',
    })
    expect(result.success).toBe(true)
    expect(result.data?.accountName).toBe('Cash')
  })

  it('omits optional fields that are absent', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'A' } } as never)
    await createAccount({ accountName: 'Cash', accountType: 'Asset', rootType: 'Balance Sheet' })
    expect(mockCreateDoc).toHaveBeenCalledWith('Account', {
      account_name: 'Cash',
      account_type: 'Asset',
      root_type: 'Balance Sheet',
    })
  })

  it('fails with CREATE_FAILED when the backend returns no data', async () => {
    mockCreateDoc.mockResolvedValue({ success: true } as never)
    await expect(createAccount({ accountName: 'Cash' })).resolves.toEqual({
      success: false,
      error: { code: 'CREATE_FAILED', message: 'Failed to create account' },
    })
  })

  it('propagates a backend error', async () => {
    const error = { code: 'VALIDATION_ERROR', message: 'dup' }
    mockCreateDoc.mockResolvedValue({ success: false, error } as never)
    await expect(createAccount({ accountName: 'Cash' })).resolves.toEqual({ success: false, error })
  })
})

describe('updateAccount / deleteAccount / getAccountChildren', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updateAccount delegates to updateDoc', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'A' } } as never)
    await expect(updateAccount('A', { accountName: 'Renamed' })).resolves.toEqual({
      success: true,
      data: { name: 'A' },
    })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Account', 'A', { accountName: 'Renamed' })
  })

  it('deleteAccount delegates to deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deleteAccount('A')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Account', 'A')
  })

  it('getAccountChildren maps the children', async () => {
    mockGetDocList.mockResolvedValue({
      success: true,
      data: [{ name: 'C', account_name: 'Cash', account_type: 'Asset', root_type: 'Balance Sheet' }],
    } as never)
    const result = await getAccountChildren('A')
    expect(result.success).toBe(true)
    expect(result.data?.[0].accountName).toBe('Cash')
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Account',
      { parent_account: 'A' },
      expect.any(Array),
      undefined,
      200,
    )
  })

  it('getAccountChildren returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getAccountChildren('A')).resolves.toEqual({ success: true, data: [] })
  })

  it('getAccountChildren propagates a backend error', async () => {
    const error = { code: 'TIMEOUT', message: 'slow' }
    mockGetDocList.mockResolvedValue({ success: false, error } as never)
    await expect(getAccountChildren('A')).resolves.toEqual({ success: false, error })
  })

  it('getAccountChildren synthesises FETCH_FAILED when no error is supplied', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getAccountChildren('A')).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch account children' },
    })
  })
})
