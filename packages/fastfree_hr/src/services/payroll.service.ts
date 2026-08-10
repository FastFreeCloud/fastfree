import { callPost, callGet } from 'fastfree-auth'

export async function processPayroll(company: string, postingDate: string, payrollCostCenter: string) {
  return callPost('payroll.process_payroll', {
    company,
    posting_date: postingDate,
    payroll_cost_center: payrollCostCenter,
  })
}

export async function getPayrollSettings() {
  return callGet('payroll.get_settings')
}
