/**
 * HR fixtures — employees, departments, designations, attendance, leave,
 * holiday lists and salary slips.
 *
 * Field names follow the Frappe/ERPNext snake_case contract the services read.
 */
import type {
  Attendance,
  Department,
  Designation,
  Employee,
  HolidayList,
  LeaveApplication,
  LeaveType,
  SalarySlip,
} from '../../packages/fastfree_hr/src/types'
import { defineFactory, unique } from './core'

export const employee = defineFactory<Employee>(() => ({
  employee_id: unique('EMP'),
  employee_name: 'Test Employee',
  department: 'Engineering',
  designation: 'Engineer',
  company: 'FastFree',
  status: 'Active',
  date_of_joining: '2026-01-01',
  personal_email: `${unique('emp')}@fastfree.test`,
  company_email: `${unique('emp')}@company.fastfree.test`,
  phone: '+201000000002',
  gender: 'Male',
  blood_group: 'O+',
  birth_date: '1995-05-10',
  current_address: '1 Test Street, Cairo',
  user: 'test.user@fastfree.test',
  holiday_list: 'Default',
}))

export const department = defineFactory<Department>(() => ({
  name: unique('DEPT'),
  department_name: 'Engineering',
  company: 'FastFree',
  disabled: false,
}))

export const designation = defineFactory<Designation>(() => ({
  name: unique('DESIG'),
  designation_name: 'Engineer',
  department: 'Engineering',
  is_line_manager: false,
}))

export const attendance = defineFactory<Attendance>(() => ({
  name: unique('ATT'),
  employee: employee().employee_id,
  employee_name: 'Test Employee',
  attendance_date: '2026-01-15',
  status: 'Present',
  company: 'FastFree',
  in_time: '09:00',
  out_time: '17:00',
  hours: 8,
}))

export const leaveType = defineFactory<LeaveType>(() => ({
  name: unique('LT'),
  leave_type_name: 'Annual Leave',
  max_days: 30,
  require_sandwich: false,
  allow_encashment: false,
  include_holidays: true,
}))

export const leaveApplication = defineFactory<LeaveApplication>(() => ({
  name: unique('LV'),
  employee: employee().employee_id,
  employee_name: 'Test Employee',
  company: 'FastFree',
  from_date: '2026-02-01',
  to_date: '2026-02-03',
  total_days: 3,
  status: 'Open',
  leave_type: 'Annual Leave',
  reason: 'Vacation',
}))

export const holidayList = defineFactory<HolidayList>(() => ({
  name: unique('HL'),
  holiday_list_name: 'Default',
  holidays: [{ holiday_date: '2026-01-26', description: 'National Day', weekly_off: false }],
}))

export const salarySlip = defineFactory<SalarySlip>(() => ({
  name: unique('SS'),
  employee: employee().employee_id,
  employee_name: 'Test Employee',
  company: 'FastFree',
  net_pay: 12_000,
  net_total: 12_000,
  total_incentives: 2000,
  total_deductions: 1000,
  gross_pay: 13_000,
  start_date: '2026-01-01',
  end_date: '2026-01-31',
  posting_date: '2026-01-31',
  status: 'Draft',
  payment_period: 'January 2026',
}))
