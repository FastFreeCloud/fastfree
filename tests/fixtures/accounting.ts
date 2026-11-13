/**
 * Accounting fixtures — chart of accounts, journal/payment entries, ledger,
 * cost centers, fiscal years, taxes and financial reports.
 *
 * Totals are derived from line items so a factory-built document is internally
 * consistent (balanced journal, order totals, etc.). Edge cases that must be
 * inconsistent live in `scenarios.ts`.
 */
import type {
  Account,
  CostCenter,
  FinancialReport,
  FiscalYear,
  JournalEntry,
  JournalEntryAccount,
  LedgerEntry,
  PaymentEntry,
  ReportFilter,
  TaxRule,
  TaxTemplate,
} from '../../packages/fastfree_accounting/src/types'
import { defineFactory, seq as seqYear, sumBy, unique } from './core'

// ------------------------------------------------------------
// Chart of accounts
// ------------------------------------------------------------

export const account = defineFactory<Account>(() => ({
  name: unique('ACC'),
  accountName: 'Cash on Hand',
  accountType: 'Asset',
  rootType: 'Balance Sheet',
  isGroup: false,
  company: 'FastFree',
  openingBalance: 0,
  disabled: false,
}))

export const journalEntryAccount = defineFactory<JournalEntryAccount>(() => ({
  account: unique('ACC'),
  debit: 100,
  credit: 0,
  remark: 'Factory line',
}))

// ------------------------------------------------------------
// Journal entries
// ------------------------------------------------------------

export const journalEntry = defineFactory<JournalEntry>(() => ({
  name: unique('JV'),
  postingDate: '2026-01-15',
  entryType: 'Journal Entry',
  status: 'Draft',
  accounts: [
    journalEntryAccount({ account: 'Debtors - FF', debit: 100, credit: 0 }),
    journalEntryAccount({ account: 'Sales - FF', debit: 0, credit: 100 }),
  ],
  totalDebit: 100,
  totalCredit: 100,
  company: 'FastFree',
  remark: 'Opening adjustment',
}))

// ------------------------------------------------------------
// Payments
// ------------------------------------------------------------

export const paymentEntry = defineFactory<PaymentEntry>(() => ({
  name: unique('PAY'),
  paymentType: 'Pay',
  partyType: 'Supplier',
  party: 'Test Supplier',
  postingDate: '2026-01-15',
  modeOfPayment: 'Bank',
  partyAccount: 'Creditors - FF',
  paidFrom: 'Bank - FF',
  paidAmount: 250,
  receivedAmount: 0,
  status: 'Draft',
  company: 'FastFree',
}))

// ------------------------------------------------------------
// General ledger
// ------------------------------------------------------------

export const ledgerEntry = defineFactory<LedgerEntry>(() => ({
  date: '2026-01-15',
  voucherType: 'Journal Entry',
  voucherNumber: unique('JV'),
  account: 'Cash on Hand - FF',
  debit: 250,
  credit: 0,
  balance: 250,
}))

// ------------------------------------------------------------
// Cost centers
// ------------------------------------------------------------

export const costCenter = defineFactory<CostCenter>(() => ({
  name: unique('CC'),
  costCenterName: 'Operations',
  costCenterCode: unique('cc').toUpperCase(),
  company: 'FastFree',
  budget: 100_000,
  disabled: false,
}))

// ------------------------------------------------------------
// Fiscal years
// ------------------------------------------------------------

export const fiscalYear = defineFactory<FiscalYear>(() => {
  const year = 2024 + seqYear()
  return {
    name: `FY-${year}`,
    yearStartDate: `${year}-01-01`,
    yearEndDate: `${year}-12-31`,
    status: 'Open',
    isCurrent: seqYear() === 1,
  }
})

// Local sequence so fiscal-year names stay unique but deterministic.

// ------------------------------------------------------------
// Taxes
// ------------------------------------------------------------

export const taxTemplate = defineFactory<TaxTemplate>(() => ({
  name: unique('TAX'),
  templateName: 'VAT 14%',
  taxType: 'Value Added Tax',
  rate: 14,
  account: 'VAT Payable - FF',
  description: 'Standard value added tax',
  company: 'FastFree',
}))

export const taxRule = defineFactory<TaxRule>(() => ({
  name: unique('TR'),
  ruleName: 'Standard VAT',
  taxTemplate: 'VAT 14%',
  priority: 1,
}))

// ------------------------------------------------------------
// Financial reports
// ------------------------------------------------------------

export const reportFilter = defineFactory<ReportFilter>(() => ({
  reportType: 'profit_and_loss',
  fromDate: '2026-01-01',
  toDate: '2026-12-31',
}))

export const financialReport = defineFactory<FinancialReport>(() => {
  const rows = [
    { label: 'Revenue', debit: 0, credit: 1000, balance: -1000, indent: 0 },
    { label: 'Expenses', debit: 400, credit: 0, balance: 400, indent: 0 },
  ]
  return {
    reportType: 'profit_and_loss',
    filter: reportFilter(),
    rows,
    totalDebit: sumBy(rows, (row) => row.debit),
    totalCredit: sumBy(rows, (row) => row.credit),
    generatedAt: '2026-01-31T12:00:00.000Z',
  }
})
