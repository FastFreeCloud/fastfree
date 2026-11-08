import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment } from '../src/services/department.service'
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

const sampleDepartment = {
  name: 'Engineering',
  department_name: 'Engineering',
  company: 'FastFree',
}

const DEPARTMENT_FIELDS = ['name', 'department_name', 'company', 'parent_department', 'description', 'disabled', 'branch']

describe('department.service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getDepartments', () => {
    it('returns list on success', async () => {
      mockGetDocList.mockResolvedValue({ success: true, data: [sampleDepartment] } as any)
      const res = await getDepartments()
      expect(res.success).toBe(true)
      expect(res.data).toEqual([sampleDepartment])
      expect(mockGetDocList).toHaveBeenCalledWith('Department', undefined, DEPARTMENT_FIELDS, 'department_name', 500)
    })

    it('returns empty array when data missing', async () => {
      mockGetDocList.mockResolvedValue({ success: true } as any)
      const res = await getDepartments()
      expect(res.data).toEqual([])
    })

    it('returns error on failure', async () => {
      mockGetDocList.mockResolvedValue({ success: false, error: { code: 'X', message: 'boom' } } as any)
      const res = await getDepartments()
      expect(res.success).toBe(false)
      expect(res.error?.code).toBe('X')
    })

    it('falls back to FETCH_FAILED error', async () => {
      mockGetDocList.mockResolvedValue({ success: false } as any)
      const res = await getDepartments()
      expect(res.error?.code).toBe('FETCH_FAILED')
    })
  })

  describe('getDepartment', () => {
    it('returns doc on success', async () => {
      mockGetDoc.mockResolvedValue({ success: true, data: sampleDepartment } as any)
      const res = await getDepartment('Engineering')
      expect(res.success).toBe(true)
      expect(res.data).toEqual(sampleDepartment)
      expect(mockGetDoc).toHaveBeenCalledWith('Department', 'Engineering')
    })
  })

  describe('createDepartment', () => {
    it('creates and returns doc', async () => {
      mockCreateDoc.mockResolvedValue({ success: true, data: sampleDepartment } as any)
      const res = await createDepartment({ department_name: 'Engineering' })
      expect(res.success).toBe(true)
      expect(mockCreateDoc).toHaveBeenCalledWith('Department', { department_name: 'Engineering' })
    })
  })

  describe('updateDepartment', () => {
    it('updates and returns doc', async () => {
      mockUpdateDoc.mockResolvedValue({ success: true, data: { ...sampleDepartment, disabled: true } } as any)
      const res = await updateDepartment('Engineering', { disabled: true })
      expect(res.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith('Department', 'Engineering', { disabled: true })
    })
  })

  describe('deleteDepartment', () => {
    it('deletes successfully', async () => {
      mockDeleteDoc.mockResolvedValue({ success: true } as any)
      const res = await deleteDepartment('Engineering')
      expect(res.success).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalledWith('Department', 'Engineering')
    })

    it('returns error on failure', async () => {
      mockDeleteDoc.mockResolvedValue({ success: false, error: { code: 'DELETE_FAILED', message: 'nope' } } as any)
      const res = await deleteDepartment('Engineering')
      expect(res.success).toBe(false)
    })
  })
})