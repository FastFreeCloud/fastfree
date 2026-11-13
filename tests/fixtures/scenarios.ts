/**
 * Composed scenarios and edge cases.
 *
 * Individual factories produce one valid record; this module combines them
 * into the states tests actually need — a full chart of accounts, a sales
 * pipeline, a stock run — plus deliberate edge cases (unbalanced journal,
 * expired licence, negative stock, over-budget cost centre) so failure paths
 * are exercised with realistic data instead of hand-written literals.
 */
import type { Lead } from '../../packages/fastfree_crm/src/types'
import { buildList, daysFromNow, millisFromNow, sumBy } from './core'
import { license, session } from './auth'
import {
  account,
  costCenter,
  fiscalYear,
  journalEntry,
  journalEntryAccount,
  paymentEntry,
} from './accounting'
import { lead, opportunity } from './crm'
import { department, designation, employee, leaveApplication } from './hr'
import { product, stockEntry, stockEntryItem } from './inventory'
import { purchaseInvoice, purchaseOrder } from './purchase'
import { customer, salesInvoice } from './sales'

// ------------------------------------------------------------
// Common scenarios
// ------------------------------------------------------------

/** A draft, balanced journal entry ready for submission. */
export function balancedJournalEntry(overrides: Parameters<typeof journalEntry>[0] = {}) {
  return journalEntry({ status: 'Draft', ...overrides })
}

/** A journal entry with `lineCount` paired lines (always balanced). */
export function multiLineJournalEntry(lineCount = 4) {
  const accounts = Array.from({ length: lineCount }, (_, index) =>
    journalEntryAccount(
      index % 2 === 0
        ? { account: `Expense - ${index} - FF`, debit: 100, credit: 0 }
        : { account: `Bank - ${index} - FF`, debit: 0, credit: 100 },
    ),
  )
  return journalEntry({
    accounts,
    totalDebit: sumBy(accounts, (row) => row.debit),
    totalCredit: sumBy(accounts, (row) => row.credit),
  })
}

/** A closed prior year plus the current open fiscal year. */
export function fiscalYearSet() {
  return [
    fiscalYear({
      name: 'FY-2024',
      yearStartDate: '2024-01-01',
      yearEndDate: '2024-12-31',
      status: 'Closed',
      isCurrent: false,
    }),
    fiscalYear({
      name: 'FY-2025',
      yearStartDate: '2025-01-01',
      yearEndDate: '2025-12-31',
      status: 'Open',
      isCurrent: true,
    }),
  ]
}

/** A two-level chart of accounts tree (groups with children). */
export function chartOfAccountsTree() {
  const assets = account({
    name: 'Assets - FF',
    accountName: 'Assets',
    accountType: 'Asset',
    rootType: 'Balance Sheet',
    isGroup: true,
  })
  const expenses = account({
    name: 'Expenses - FF',
    accountName: 'Expenses',
    accountType: 'Expense',
    rootType: 'Profit and Loss',
    isGroup: true,
  })
  const cash = account({
    name: 'Cash - FF',
    accountName: 'Cash',
    accountType: 'Asset',
    rootType: 'Balance Sheet',
    parentAccount: assets.name,
  })
  const bank = account({
    name: 'Bank - FF',
    accountName: 'Bank',
    accountType: 'Asset',
    rootType: 'Balance Sheet',
    parentAccount: assets.name,
  })
  return [{ ...assets, children: [cash, bank] }, expenses]
}

/** A department with a designation and N employees assigned to both. */
export function employeeDirectory(employeeCount = 3) {
  const dept = department()
  const desig = designation({ department: dept.name })
  const staff = buildList(employee, employeeCount, (index) => ({
    department: dept.name,
    designation: desig.designation_name,
    employee_name: `Employee ${index + 1}`,
  }))
  return { department: dept, designation: desig, employees: staff }
}

/** Leads across every pipeline status plus matching opportunities. */
export function salesPipeline() {
  const statuses: Lead['lead_status'][] = [
    'New',
    'Contacted',
    'Qualified',
    'Unqualified',
    'Interested',
    'Not Interested',
    'Lost',
    'Converted',
  ]
  const leads = statuses.map((status, index) =>
    lead({ name: `LEAD-${index + 1}`, lead_status: status }),
  )
  const opportunities = [
    opportunity({ status: 'Open', stage: 'Prospecting' }),
    opportunity({ status: 'Won', stage: 'Closed Won' }),
  ]
  return { leads, opportunities, customer: customer() }
}

/** A product with a receipt and an issue stock entry. */
export function stockMovementRun() {
  const item = product()
  const receiptLine = stockEntryItem({
    product: item.name,
    quantity: 50,
    rate: item.buyingPrice,
    targetWarehouse: item.warehouse,
  })
  const issueLine = stockEntryItem({
    product: item.name,
    quantity: 10,
    rate: item.buyingPrice,
    sourceWarehouse: item.warehouse,
  })
  return {
    product: item,
    receipt: stockEntry({ items: [receiptLine] }),
    issue: stockEntry({
      entryType: 'Issue',
      remarks: 'Issued to production',
      items: [issueLine],
    }),
  }
}

/** A minimal but complete accounting dataset. */
export function accountingSeed(journalCount = 2) {
  return {
    accounts: chartOfAccountsTree(),
    journalEntries: buildList(balancedJournalEntry, journalCount),
    paymentEntries: [paymentEntry()],
    fiscalYears: fiscalYearSet(),
  }
}

/** A purchase-to-pay dataset. */
export function purchaseSeed() {
  const order = purchaseOrder()
  return {
    order,
    invoice: purchaseInvoice({ supplier: order.supplier, supplierName: order.supplierName }),
  }
}

// ------------------------------------------------------------
// Edge cases
// ------------------------------------------------------------

/** Debit does not equal credit — invalid for submission. */
export function unbalancedJournalEntry() {
  const accounts = [
    journalEntryAccount({ account: 'Debtors - FF', debit: 120, credit: 0 }),
    journalEntryAccount({ account: 'Sales - FF', debit: 0, credit: 100 }),
  ]
  return journalEntry({
    accounts,
    totalDebit: sumBy(accounts, (row) => row.debit),
    totalCredit: sumBy(accounts, (row) => row.credit),
  })
}

/** A licence that expired yesterday. */
export function expiredLicense() {
  return license({ status: 'expired', expiresAt: millisFromNow(-24 * 60 * 60 * 1000) })
}

/** A trial licence already at its user ceiling. */
export function licenseAtUserLimit() {
  return license({
    type: 'trial',
    maxUsers: 3,
    activatedDevices: ['device-1', 'device-2', 'device-3'],
  })
}

/** A session that lapsed a minute ago. */
export function expiredSession() {
  return session({ expiresAt: millisFromNow(-60 * 1000) })
}

/** Stock below the reorder point. */
export function lowStockProduct() {
  return product({ currentStock: 5, minimumStock: 10 })
}

/** Negative stock (oversold) — needs an adjustment entry. */
export function negativeStockProduct() {
  return product({ currentStock: -3, minimumStock: 10 })
}

/** A cost center whose spend exceeded its budget. */
export function overBudgetCostCenter(spend = 150_000) {
  const center = costCenter({ budget: 100_000 })
  return { costCenter: center, spend, overBudget: spend > center.budget }
}

/** An invoice past its due date and still unpaid. */
export function overdueSalesInvoice() {
  return salesInvoice({ due_date: daysFromNow(-15), status: 'Overdue' })
}

/** A leave application spanning zero days. */
export function zeroDayLeaveApplication() {
  return leaveApplication({ from_date: '2026-02-01', to_date: '2026-02-01', total_days: 0 })
}
