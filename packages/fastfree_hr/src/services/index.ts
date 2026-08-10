// ============================================================
// FastFree HR — Services Barrel Export
// ============================================================

export {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from './employee.service'

export {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from './department.service'

export {
  getDesignations,
  getDesignation,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from './designation.service'

export {
  getAttendance,
  getAttendanceForEmployee,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  submitAttendance,
  cancelAttendance,
} from './attendance.service'

export {
  getLeaveApplications,
  getLeaveApplication,
  createLeaveApplication,
  updateLeaveApplication,
  deleteLeaveApplication,
  submitLeaveApplication,
  cancelLeaveApplication,
} from './leaveApplication.service'

export {
  getHolidayLists,
  getHolidayList,
  createHolidayList,
  updateHolidayList,
  deleteHolidayList,
} from './holidayList.service'

export {
  getSalarySlips,
  getSalarySlip,
  createSalarySlip,
  updateSalarySlip,
  deleteSalarySlip,
  submitSalarySlip,
  cancelSalarySlip,
} from './salarySlip.service'

export { processPayroll, getPayrollSettings } from './payroll.service'

export {
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
} from './report.service'
