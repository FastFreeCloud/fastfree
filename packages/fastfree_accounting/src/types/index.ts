// ============================================================
// FastFree Accounting — TypeScript Types
// ============================================================

// ------------------------------------------------------------
// Account (Chart of Accounts)
// ------------------------------------------------------------
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
export type AccountRootType = 'Balance Sheet' | 'Profit and Loss'

export interface Account {
  name: string
  accountName: string
  accountType: AccountType
  rootType: AccountRootType
  parentAccount?: string
  isGroup: boolean
  company?: string
  costCenter?: string
  openingBalance: number
  accountCurrency?: string
  disabled: boolean
  children?: Account[]
}

// ------------------------------------------------------------
// Journal Entry
// ------------------------------------------------------------
export type JournalEntryStatus = 'Draft' | 'Submitted' | 'Cancelled'

export interface JournalEntryAccount {
  account: string
  debit: number
  credit: number
  costCenter?: string
  referenceType?: string
  referenceName?: string
  remark?: string
}

export interface JournalEntry {
  name: string
  title?: string
  postingDate: string
  entryType: 'Journal Entry' | 'Bank Entry' | 'Cash Entry'
  status: JournalEntryStatus
  accounts: JournalEntryAccount[]
  totalDebit: number
  totalCredit: number
  company?: string
  remark?: string
  amendedFrom?: string
}

// ------------------------------------------------------------
// Payment Entry
// ------------------------------------------------------------
export type PaymentType = 'Pay' | 'Receive' | 'Internal Transfer'
export type PaymentStatus = 'Draft' | 'Submitted' | 'Cancelled'

export interface PaymentEntry {
  name: string
  paymentType: PaymentType
  partyType: 'Customer' | 'Supplier' | 'Employee'
  party: string
  postingDate: string
  modeOfPayment: string
  partyAccount: string
  paidFrom?: string
  paidTo?: string
  paidAmount: number
  receivedAmount: number
  referenceName?: string
  referenceType?: string
  status: PaymentStatus
  company?: string
  remarks?: string
}

// ------------------------------------------------------------
// General Ledger
// ------------------------------------------------------------
export interface LedgerEntry {
  date: string
  voucherType: string
  voucherNumber: string
  account: string
  debit: number
  credit: number
  balance: number
  party?: string
  costCenter?: string
  remarks?: string
}

// ------------------------------------------------------------
// Cost Center
// ------------------------------------------------------------
export interface CostCenter {
  name: string
  costCenterName: string
  costCenterCode: string
  parent?: string
  company?: string
  budget: number
  disabled: boolean
}

// ------------------------------------------------------------
// Fiscal Year
// ------------------------------------------------------------
export type FiscalYearStatus = 'Open' | 'Closed'

export interface FiscalYear {
  name: string
  yearStartDate: string
  yearEndDate: string
  status: FiscalYearStatus
  isCurrent: boolean
}

// ------------------------------------------------------------
// Financial Reports
// ------------------------------------------------------------
export type ReportType =
  | 'trial_balance'
  | 'profit_and_loss'
  | 'balance_sheet'
  | 'general_ledger'
  | 'accounts_receivable'
  | 'accounts_payable'

export interface ReportFilter {
  reportType: ReportType
  fromDate: string
  toDate: string
  costCenter?: string
  fiscalYear?: string
}

export interface ReportRow {
  account?: string
  label: string
  debit: number
  credit: number
  balance: number
  indent: number
}

export interface FinancialReport {
  reportType: ReportType
  filter: ReportFilter
  rows: ReportRow[]
  totalDebit: number
  totalCredit: number
  generatedAt: string
}

// ------------------------------------------------------------
// Tax
// ------------------------------------------------------------
export type TaxType = 'Value Added Tax' | 'Withholding Tax' | 'Custom'

export interface TaxTemplate {
  name: string
  templateName: string
  taxType: TaxType
  rate: number
  account: string
  description?: string
  company?: string
}

export interface TaxRule {
  name: string
  ruleName: string
  taxTemplate: string
  itemGroup?: string
  customer?: string
  supplier?: string
  priority: number
  validFrom?: string
  validTo?: string
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
