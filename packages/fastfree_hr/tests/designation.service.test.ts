import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDesignations, getDesignation, createDesignation, updateDesignation, deleteDesignation } from '../src/services/designation.service'
import * as auth from 'fastfree-auth'

vi.mock('fastfree-auth', () => ({
  getDocList: vi.fn(),
  getDoc: vi.fn(),
  createDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}))

const mockGetDocList = vi.mocked(auth.getDocList)
const mockGetDoc = vi.mocked(auth.getDoc)
const mockCreateDoc = vi.mocked(auth.createDoc)
const mockUpdateDoc = vi.mocked(auth.updateDoc)
const mockDeleteDoc = vi.mocked(auth.deleteDoc)

const sampleDesignation = {
  name: 'Software Engineer',
  designation_name: 'Software Engineer',
  department: 'Engineering',
  is_line_manager: false,
}

const DESIGNATION_FIELDS = ['name', 'designation_name', 'department', 'description', 'is_line_manager']

describe('designation.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getDesignations', () => {
    it('returns list on success', async () => {
      mockGetDocList.mockResolvedValue({ success: true, data: [sampleDesignation] } as any)
      const res = await getDesignations()
      expect(res.success).toBe(true)
      expect(res.data).toEqual([sampleDesignation])
      expect(mockGetDocList).toHaveBeenCalledWith('Designation', undefined, DESIGNATION_FIELDS, 'designation_name', 500)
    })

    it('returns empty array when data missing', async () => {
      mockGetDocList.mockResolvedValue({ success: true } as any)
      const res = await getDesignations()
      expect(res.data).toEqual([])
    })

    it('returns error on failure', async () => {
      mockGetDocList.mockResolvedValue({ success: false, error: { code: 'X', message: 'boom' } } as any)
      const res = await getDesignations()
      expect(res.success).toBe(false)
      expect(res.error?.code).toBe('X')
    })

    it('falls back to FETCH_FAILED error', async () => {
      mockGetDocList.mockResolvedValue({ success: false } as any)
      const res = await getDesignations()
      expect(res.error?.code).toBe('FETCH_FAILED')
    })
  })

  describe('getDesignation', () => {
    it('returns doc on success', async () => {
      mockGetDoc.mockResolvedValue({ success: true, data: sampleDesignation } as any)
      const res = await getDesignation('Software Engineer')
      expect(res.success).toBe(true)
      expect(res.data).toEqual(sampleDesignation)
      expect(mockGetDoc).toHaveBeenCalledWith('Designation', 'Software Engineer')
    })
  })

  describe('createDesignation', () => {
    it('creates and returns doc', async () => {
      mockCreateDoc.mockResolvedValue({ success: true, data: sampleDesignation } as any)
      const res = await createDesignation({ designation_name: 'Software Engineer' })
      expect(res.success).toBe(true)
      expect(mockCreateDoc).toHaveBeenCalledWith('Designation', { designation_name: 'Software Engineer' })
    })
  })

  describe('updateDesignation', () => {
    it('updates and returns doc', async () => {
      mockUpdateDoc.mockResolvedValue({ success: true, data: { ...sampleDesignation, is_line_manager: true } } as any)
      const res = await updateDesignation('Software Engineer', { is_line_manager: true })
      expect(res.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith('Designation', 'Software Engineer', { is_line_manager: true })
    })
  })

  describe('deleteDesignation', () => {
    it('deletes successfully', async () => {
      mockDeleteDoc.mockResolvedValue({ success: true } as any)
      const res = await deleteDesignation('Software Engineer')
      expect(res.success).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalledWith('Designation', 'Software Engineer')
    })

    it('returns error on failure', async () => {
      mockDeleteDoc.mockResolvedValue({ success: false, error: { code: 'DELETE_FAILED', message: 'nope' } } as any)
      const res = await deleteDesignation('Software Engineer')
      expect(res.success).toBe(false)
    })
  })
})