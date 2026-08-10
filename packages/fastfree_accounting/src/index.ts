// ============================================================
// FastFree Accounting — Main Entry Point
// ============================================================

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------

export { initFastFreeAccounting } from './init'

// ------------------------------------------------------------
// Services
// ------------------------------------------------------------

export {
  getAccounts, getAccount, createAccount, updateAccount, deleteAccount, getAccountChildren,
} from './services'

export {
  getJournalEntries, getJournalEntry, createJournalEntry, updateJournalEntry,
  deleteJournalEntry, submitJournalEntry, cancelJournalEntry,
} from './services'

export {
  getPaymentEntries, getPaymentEntry, createPaymentEntry, updatePaymentEntry,
  deletePaymentEntry, submitPaymentEntry,
} from './services'

export { getGeneralLedger } from './services'

export {
  getCostCenters, getCostCenter, createCostCenter, updateCostCenter, deleteCostCenter,
} from './services'

export {
  getFiscalYears, getFiscalYear, createFiscalYear, closeFiscalYear,
} from './services'

export { generateReport } from './services'

// ------------------------------------------------------------
// Stores
// ------------------------------------------------------------

export { useAccountingStore } from './stores/useAccountingStore'

// ------------------------------------------------------------
// Screens
// ------------------------------------------------------------

export { registerAccountingScreens } from './screens'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type {
  Account, AccountType, AccountRootType,
  JournalEntry, JournalEntryAccount, JournalEntryStatus,
  PaymentEntry, PaymentType, PaymentStatus,
  LedgerEntry,
  CostCenter,
  FiscalYear, FiscalYearStatus,
  ReportType, ReportFilter, ReportRow, FinancialReport,
  ApiResponse,
} from './types'
