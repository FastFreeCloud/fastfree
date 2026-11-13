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

import { createEmployee, getEmployees } from '../src/services/employee.service'
import { apiSuccess, buildList, employeeDirectory, hr } from '../../../tests/fixtures/index'

const mockCreateDoc = vi.mocked(auth.createDoc)
const mockGetDocList = vi.mocked(auth.getDocList)

describe('hr factories used by services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a factory-built employee', async () => {
    const employee = hr.employee()
    mockCreateDoc.mockResolvedValue(apiSuccess(employee) as never)

    const result = await createEmployee(employee)

    expect(result.success).toBe(true)
    expect(mockCreateDoc).toHaveBeenCalledWith('Employee', employee)
  })

  it('fetches factory-built employees', async () => {
    const staff = buildList(hr.employee, 5)
    mockGetDocList.mockResolvedValue(apiSuccess(staff) as never)

    const result = await getEmployees()

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(5)
    expect(mockGetDocList).toHaveBeenCalledWith(
      'Employee',
      undefined,
      expect.any(Array),
      'employee_name',
      500,
    )
  })

  it('builds a directory whose employees reference their department', () => {
    const directory = employeeDirectory(3)
    expect(directory.employees).toHaveLength(3)
    expect(directory.employees.every((employee) => employee.department === directory.department.name)).toBe(
      true,
    )
  })
})
