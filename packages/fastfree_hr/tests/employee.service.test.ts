import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } from '../src/services/employee.service'
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

const sampleEmployee = {
  employee_id: 'EMP-001',
  employee_name: 'John Doe',
  department: 'Engineering',
  designation: 'Developer',
  status: 'Active' as const,
  date_of_joining: '2026-01-01',
}

describe('employee.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEmployees', () => {
    it('returns list on success', async () => {
      mockGetDocList.mockResolvedValue({ success: true, data: [sampleEmployee] } as any)
      const res = await getEmployees()
      expect(res.success).toBe(true)
      expect(res.data).toEqual([sampleEmployee])
      expect(mockGetDocList).toHaveBeenCalledWith('Employee', undefined, expect.any(Array), 'employee_name', 500)
    })

    it('returns empty array when data missing', async () => {
      mockGetDocList.mockResolvedValue({ success: true } as any)
      const res = await getEmployees()
      expect(res.success).toBe(true)
      expect(res.data).toEqual([])
    })

    it('returns error on failure', async () => {
      mockGetDocList.mockResolvedValue({ success: false, error: { code: 'X', message: 'boom' } } as any)
      const res = await getEmployees()
      expect(res.success).toBe(false)
      expect(res.error?.code).toBe('X')
    })

    it('falls back to FETCH_FAILED error', async () => {
      mockGetDocList.mockResolvedValue({ success: false } as any)
      const res = await getEmployees()
      expect(res.success).toBe(false)
      expect(res.error?.code).toBe('FETCH_FAILED')
    })
  })

  describe('getEmployee', () => {
    it('returns doc on success', async () => {
      mockGetDoc.mockResolvedValue({ success: true, data: sampleEmployee } as any)
      const res = await getEmployee('EMP-001')
      expect(res.success).toBe(true)
      expect(res.data).toEqual(sampleEmployee)
      expect(mockGetDoc).toHaveBeenCalledWith('Employee', 'EMP-001')
    })

    it('returns error on failure', async () => {
      mockGetDoc.mockResolvedValue({ success: false, error: { code: 'NOT_FOUND', message: 'nope' } } as any)
      const res = await getEmployee('EMP-999')
      expect(res.success).toBe(false)
    })
  })

  describe('createEmployee', () => {
    it('creates and returns doc', async () => {
      mockCreateDoc.mockResolvedValue({ success: true, data: sampleEmployee } as any)
      const res = await createEmployee({ employee_name: 'John Doe' })
      expect(res.success).toBe(true)
      expect(mockCreateDoc).toHaveBeenCalledWith('Employee', { employee_name: 'John Doe' })
    })
  })

  describe('updateEmployee', () => {
    it('updates and returns doc', async () => {
      mockUpdateDoc.mockResolvedValue({ success: true, data: { ...sampleEmployee, status: 'Left' } } as any)
      const res = await updateEmployee('EMP-001', { status: 'Left' })
      expect(res.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith('Employee', 'EMP-001', { status: 'Left' })
    })
  })

  describe('deleteEmployee', () => {
    it('deletes successfully', async () => {
      mockDeleteDoc.mockResolvedValue({ success: true } as any)
      const res = await deleteEmployee('EMP-001')
      expect(res.success).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalledWith('Employee', 'EMP-001')
    })

    it('returns error on failure', async () => {
      mockDeleteDoc.mockResolvedValue({ success: false, error: { code: 'DELETE_FAILED', message: 'nope' } } as any)
      const res = await deleteEmployee('EMP-001')
      expect(res.success).toBe(false)
    })
  })
})