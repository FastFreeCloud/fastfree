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

import { createLead } from '../src/services/lead.service'
import { apiSuccess, crm, salesPipeline } from '../../../tests/fixtures/index'

const mockCreateDoc = vi.mocked(auth.createDoc)

describe('crm factories used by services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a factory-built lead', async () => {
    const lead = crm.lead()
    mockCreateDoc.mockResolvedValue(apiSuccess(lead) as never)

    const result = await createLead(lead)

    expect(result.success).toBe(true)
    expect(mockCreateDoc).toHaveBeenCalledWith('Lead', lead)
  })

  it('builds a pipeline whose leads use every status', () => {
    const pipeline = salesPipeline()
    expect(new Set(pipeline.leads.map((lead) => lead.lead_status)).size).toBe(8)
  })
})
