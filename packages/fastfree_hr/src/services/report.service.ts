import { callGet } from 'fastfree-auth'

export async function getAttendanceReport(fromDate: string, toDate: string, employee?: string) {
  const params: Record<string, unknown> = { from_date: fromDate, to_date: toDate }
  if (employee) params.employee = employee
  return callGet('attendance.report.attendance', params)
}

export async function getLeaveReport(fromDate: string, toDate: string, employee?: string) {
  const params: Record<string, unknown> = { from_date: fromDate, to_date: toDate }
  if (employee) params.employee = employee
  return callGet('leave_application.report.leave', params)
}

export async function getPayrollReport(fromDate: string, toDate: string) {
  return callGet('payroll.report.payroll', { from_date: fromDate, to_date: toDate })
}
