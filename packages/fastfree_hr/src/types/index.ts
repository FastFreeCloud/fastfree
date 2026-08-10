// ============================================================
// FastFree HR — TypeScript Types
// Frappe/ERPNext doctype field names (snake_case)
// ============================================================

export type { ApiResponse } from 'fastfree-auth'

// ------------------------------------------------------------
// Employee
// ------------------------------------------------------------
export type EmployeeStatus = 'Active' | 'Left' | 'Inactive' | 'Suspended' | 'Terminated' | 'Retired'

export interface Employee {
  employee_id: string
  employee_name: string
  department?: string
  designation?: string
  company?: string
  status: EmployeeStatus
  date_of_joining: string
  personal_email?: string
  company_email?: string
  phone?: string
  gender?: string
  blood_group?: string
  birth_date?: string
  current_address?: string
  permanent_address?: string
  user?: string
  holiday_list?: string
}

// ------------------------------------------------------------
// Department
// ------------------------------------------------------------
export interface Department {
  name: string
  department_name: string
  company?: string
  parent_department?: string
  description?: string
  disabled?: boolean
  branch?: string
}

// ------------------------------------------------------------
// Designation
// ------------------------------------------------------------
export interface Designation {
  name: string
  designation_name: string
  department?: string
  description?: string
  is_line_manager?: boolean
}

// ------------------------------------------------------------
// Attendance
// ------------------------------------------------------------
export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Weekly Off' | 'Holiday'

export interface Attendance {
  name: string
  employee: string
  employee_name?: string
  attendance_date: string
  status: AttendanceStatus
  company?: string
  posting_date?: string
  in_time?: string
  out_time?: string
  hours?: number
}

// ------------------------------------------------------------
// Leave Application
// ------------------------------------------------------------
export type LeaveStatus = 'Open' | 'Submitted' | 'Approved' | 'Rejected' | 'Cancelled' | 'Closed'

export interface LeaveApplication {
  name: string
  employee: string
  employee_name?: string
  company?: string
  from_date: string
  to_date: string
  total_days: number
  status: LeaveStatus
  leave_type?: string
  reason?: string
  half_day?: boolean
  posting_date?: string
}

// ------------------------------------------------------------
// Leave Type
// ------------------------------------------------------------
export interface LeaveType {
  name: string
  leave_type_name: string
  max_days?: number
  require_sandwich?: boolean
  allow_encashment?: boolean
  include_holidays?: boolean
}

// ------------------------------------------------------------
// Holiday List
// ------------------------------------------------------------
export interface Holiday {
  holiday_date: string
  description?: string
  weekly_off?: boolean
}

export interface HolidayList {
  name: string
  holiday_list_name: string
  holidays?: Holiday[]
}

// ------------------------------------------------------------
// Salary Slip
// ------------------------------------------------------------
export type SalarySlipStatus = 'Draft' | 'Submitted' | 'Cancelled' | 'Paid'

export interface SalarySlip {
  name: string
  employee: string
  employee_name?: string
  company?: string
  net_pay?: number
  net_total?: number
  total_incentives?: number
  total_deductions?: number
  gross_pay?: number
  start_date?: string
  end_date?: string
  posting_date?: string
  status?: SalarySlipStatus
  payment_period?: string
}

// ------------------------------------------------------------
// HR Summary
// ------------------------------------------------------------
export interface HrSummary {
  total_employees: number
  active_employees: number
  present_today: number
  absent_today: number
  on_leave_today: number
  half_day_today: number
  total_attendance_today: number
  pending_leave_applications: number
  total_leave_applications: number
  upcoming_holidays: number
}
