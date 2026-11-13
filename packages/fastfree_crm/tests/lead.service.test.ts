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
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToOpportunity,
  submitLead,
  cancelLead,
} from '../src/services/lead.service'

const mockGetDoc = vi.mocked(auth.getDoc)
const mockGetDocList = vi.mocked(auth.getDocList)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)
const mockCallPost = vi.mocked(auth.callPost)

describe('lead.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getLeads returns the rows', async () => {
    mockGetDocList.mockResolvedValue({ success: true, data: [{ name: 'L-1' }] } as never)
    await expect(getLeads()).resolves.toEqual({ success: true, data: [{ name: 'L-1' }] })
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Lead',
      undefined,
      expect.any(Array),
      'posting_date',
      500,
    )
  })

  it('getLeads returns an empty list when data is absent', async () => {
    mockGetDocList.mockResolvedValue({ success: true } as never)
    await expect(getLeads()).resolves.toEqual({ success: true, data: [] })
  })

  it('getLeads synthesises FETCH_FAILED', async () => {
    mockGetDocList.mockResolvedValue({ success: false } as never)
    await expect(getLeads()).resolves.toEqual({
      success: false,
      error: { code: 'FETCH_FAILED', message: 'Failed to fetch leads' },
    })
  })

  it('getLead delegates to getDoc', async () => {
    mockGetDoc.mockResolvedValue({ success: true, data: { name: 'L-1' } } as never)
    await expect(getLead('L-1')).resolves.toEqual({ success: true, data: { name: 'L-1' } })
    expect(mockGetDoc).toHaveBeenCalledWith('Lead', 'L-1')
  })

  it('createLead delegates to createDoc', async () => {
    mockCreateDoc.mockResolvedValue({ success: true, data: { name: 'L-1' } } as never)
    await expect(createLead({ lead_name: 'Acme' })).resolves.toEqual({
      success: true,
      data: { name: 'L-1' },
    })
    expect(mockCreateDoc).toHaveBeenCalledWith('Lead', { lead_name: 'Acme' })
  })

  it('updateLead delegates to updateDoc', async () => {
    mockUpdateDoc.mockResolvedValue({ success: true, data: { name: 'L-1' } } as never)
    await expect(updateLead('L-1', { lead_status: 'Qualified' })).resolves.toEqual({
      success: true,
      data: { name: 'L-1' },
    })
    expect(mockUpdateDoc).toHaveBeenCalledWith('Lead', 'L-1', { lead_status: 'Qualified' })
  })

  it('deleteLead returns success', async () => {
    mockDeleteDoc.mockResolvedValue({ success: true } as never)
    await expect(deleteLead('L-1')).resolves.toEqual({ success: true })
    expect(mockDeleteDoc).toHaveBeenCalledWith('Lead', 'L-1')
  })

  it('deleteLead propagates a backend error', async () => {
    const error = { code: 'LINKED', message: 'cannot delete' }
    mockDeleteDoc.mockResolvedValue({ success: false, error } as never)
    await expect(deleteLead('L-1')).resolves.toEqual({ success: false, error })
  })

  it('deleteLead synthesises DELETE_FAILED', async () => {
    mockDeleteDoc.mockResolvedValue({ success: false } as never)
    await expect(deleteLead('L-1')).resolves.toEqual({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to delete lead' },
    })
  })

  it('convertLeadToOpportunity posts to the conversion RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true, data: { name: 'OPP-1' } } as never)
    await expect(convertLeadToOpportunity('L-1', { customer: 'Acme' })).resolves.toEqual({
      success: true,
      data: { name: 'OPP-1' },
    })
    expect(mockCallPost).toHaveBeenCalledWith('frappe.client.convert_to_opportunity', {
      customer: 'Acme',
      lead: 'L-1',
    })
  })

  it('submitLead posts to the submit RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true } as never)
    await submitLead('L-1')
    expect(mockCallPost).toHaveBeenCalledWith('frappe.client.submit_single', {
      doctype: 'Lead',
      docname: 'L-1',
    })
  })

  it('cancelLead posts to the cancel RPC', async () => {
    mockCallPost.mockResolvedValue({ success: true } as never)
    await cancelLead('L-1')
    expect(mockCallPost).toHaveBeenCalledWith('frappe.client.cancel', {
      doctype: 'Lead',
      docname: 'L-1',
    })
  })
})
