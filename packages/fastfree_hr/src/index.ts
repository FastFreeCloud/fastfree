// ============================================================
// FastFree HR — Main Entry Point
// ============================================================

// Initialization
export { initFastFreeHr } from './init'

// Store
export { useHrStore } from './stores/useHrStore'

// Screens
export { registerHrScreens } from './screens'

// Services — Employee
export {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from './services'

// Services — Department
export {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './services'

// Services — Designation
export {
  getDesignations,
  getDesignation,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from './services'

// Services — Attendance
export {
  getAttendance,
  getAttendanceForEmployee,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  submitAttendance,
  cancelAttendance,
} from './services'

// Services — Leave Application
export {
  getLeaveApplications,
  getLeaveApplication,
  createLeaveApplication,
  updateLeaveApplication,
  deleteLeaveApplication,
  submitLeaveApplication,
  cancelLeaveApplication,
} from './services'

// Services — Holiday List
export {
  getHolidayLists,
  getHolidayList,
  createHolidayList,
  updateHolidayList,
  deleteHolidayList,
} from './services'

// Services — Salary Slip
export {
  getSalarySlips,
  getSalarySlip,
  createSalarySlip,
  updateSalarySlip,
  deleteSalarySlip,
  submitSalarySlip,
  cancelSalarySlip,
} from './services'

// Services — Payroll
export {
  processPayroll,
  getPayrollSettings,
} from './services'

// Services — Report
export {
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
} from './services'

// Types
export type {
  ApiResponse,
  EmployeeStatus,
  Employee,
  Department,
  Designation,
  AttendanceStatus,
  Attendance,
  LeaveStatus,
  LeaveApplication,
  LeaveType,
  Holiday,
  HolidayList,
  SalarySlipStatus,
  SalarySlip,
  HrSummary,
} from './types'
