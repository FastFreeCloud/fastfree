// ============================================================
// FastFree Accounting — Pinia Store
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Account, JournalEntry, PaymentEntry, LedgerEntry, CostCenter, FiscalYear, FinancialReport, ReportFilter } from '../types'
import {
  getAccounts,
  getJournalEntries,
  getPaymentEntries,
  getGeneralLedger,
  getCostCenters,
  getFiscalYears,
  generateReport,
} from '../services'
import { getCached, setCached } from 'fastfree-auth'

export const useAccountingStore = defineStore('fastfree-accounting', () => {
  // ── State ──
  const accounts = ref<Account[]>([])
  const journalEntries = ref<JournalEntry[]>([])
  const paymentEntries = ref<PaymentEntry[]>([])
  const ledgerEntries = ref<LedgerEntry[]>([])
  const costCenters = ref<CostCenter[]>([])
  const fiscalYears = ref<FiscalYear[]>([])
  const currentReport = ref<FinancialReport | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)

  function setLoading(val: boolean) { loading.value = val }
  function setError(e: unknown) { error.value = e instanceof Error ? e.message : e != null ? String(e) : null }

  // ── Computed ──
  const accountTree = computed(() => buildTree(accounts.value))
  const currentFiscalYear = computed(() => fiscalYears.value.find(fy => fy.isCurrent))
  const openFiscalYears = computed(() => fiscalYears.value.filter(fy => fy.status === 'Open'))
  const totalDebit = computed(() => journalEntries.value.reduce((sum, je) => sum + je.totalDebit, 0))
  const totalCredit = computed(() => journalEntries.value.reduce((sum, je) => sum + je.totalCredit, 0))

  // ── Actions ──
  async function fetchAccounts(company?: string) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `accounts-${company || 'all'}`
      const cached = await getCached<Account[]>(cacheKey)
      if (cached) accounts.value = cached

      const result = await getAccounts(company)
      if (result.success) {
        accounts.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch accounts')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchJournalEntries(filters?: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `journal-${JSON.stringify(filters || {})}`
      const cached = await getCached<JournalEntry[]>(cacheKey)
      if (cached) journalEntries.value = cached

      const result = await getJournalEntries(filters)
      if (result.success) {
        journalEntries.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch journal entries')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPaymentEntries(filters?: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `payments-${JSON.stringify(filters || {})}`
      const cached = await getCached<PaymentEntry[]>(cacheKey)
      if (cached) paymentEntries.value = cached

      const result = await getPaymentEntries(filters)
      if (result.success) {
        paymentEntries.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch payment entries')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchLedger(account: string, fromDate: string, toDate: string, costCenter?: string) {
    setLoading(true)
    setError(null)
    try {
      const result = await getGeneralLedger(account, fromDate, toDate, costCenter)
      if (result.success) ledgerEntries.value = result.data ?? []
      else setError(result.error?.message ?? 'Failed to fetch ledger')
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCostCenters(company?: string) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `cost-centers-${company || 'all'}`
      const cached = await getCached<CostCenter[]>(cacheKey)
      if (cached) costCenters.value = cached

      const result = await getCostCenters(company)
      if (result.success) {
        costCenters.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch cost centers')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFiscalYears() {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = 'fiscal-years'
      const cached = await getCached<FiscalYear[]>(cacheKey)
      if (cached) fiscalYears.value = cached

      const result = await getFiscalYears()
      if (result.success) {
        fiscalYears.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch fiscal years')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchReport(filter: ReportFilter) {
    setLoading(true)
    setError(null)
    try {
      const result = await generateReport(filter)
      if (result.success) currentReport.value = result.data ?? null
      else setError(result.error?.message ?? 'Failed to generate report')
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  function $reset() {
    accounts.value = []
    journalEntries.value = []
    paymentEntries.value = []
    ledgerEntries.value = []
    costCenters.value = []
    fiscalYears.value = []
    currentReport.value = null
    loading.value = false
    error.value = null
  }

  return {
    // State
    accounts, journalEntries, paymentEntries, ledgerEntries,
    costCenters, fiscalYears, currentReport,
    loading, error,
    // Computed
    accountTree, currentFiscalYear, openFiscalYears, totalDebit, totalCredit,
    // Actions
    fetchAccounts, fetchJournalEntries, fetchPaymentEntries,
    fetchLedger, fetchCostCenters, fetchFiscalYears, fetchReport,
    $reset,
  }
})

// ── Helpers ──
function buildTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account & { children: Account[] }>()
  const roots: (Account & { children: Account[] })[] = []

  for (const acc of accounts) {
    map.set(acc.name, { ...acc, children: [] })
  }

  for (const acc of accounts) {
    const node = map.get(acc.name)!
    if (acc.parentAccount && map.has(acc.parentAccount)) {
      map.get(acc.parentAccount)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
