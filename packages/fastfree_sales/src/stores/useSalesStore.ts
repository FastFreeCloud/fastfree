import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Customer, Quotation, SalesOrder, SalesInvoice, DeliveryNote } from '../types'
import { getCustomers, getQuotations, getSalesOrders, getSalesInvoices, getDeliveryNotes, getSalesSummary } from '../services'

export interface SalesSummary {
  totalCustomers: number
  totalSales: number
  totalInvoices: number
  outstandingAmount: number
}

export const useSalesStore = defineStore('fastfree-sales', () => {
  const customers = ref<Customer[]>([])
  const quotations = ref<Quotation[]>([])
  const salesOrders = ref<SalesOrder[]>([])
  const salesInvoices = ref<SalesInvoice[]>([])
  const deliveryNotes = ref<DeliveryNote[]>([])
  const summary = ref<SalesSummary | null>(null)

  const loading = ref(false)
  const error = ref<string | null>(null)

  function setLoading(val: boolean) { loading.value = val }
  function setError(e: unknown) { error.value = e instanceof Error ? e.message : e != null ? String(e) : null }

  async function fetchCustomers() {
    setLoading(true)
    setError(null)
    try {
      const res = await getCustomers()
      customers.value = res.data ?? []
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchQuotations() {
    setLoading(true)
    setError(null)
    try {
      const res = await getQuotations()
      quotations.value = res.data ?? []
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSalesOrders() {
    setLoading(true)
    setError(null)
    try {
      const res = await getSalesOrders()
      salesOrders.value = res.data ?? []
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSalesInvoices() {
    setLoading(true)
    setError(null)
    try {
      const res = await getSalesInvoices()
      salesInvoices.value = res.data ?? []
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDeliveryNotes() {
    setLoading(true)
    setError(null)
    try {
      const res = await getDeliveryNotes()
      deliveryNotes.value = res.data ?? []
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSalesSummary() {
    setLoading(true)
    setError(null)
    try {
      const res = await getSalesSummary()
      summary.value = {
        totalCustomers: customers.value.length,
        totalSales: (res.data as Record<string, unknown>)?.total_sales as number ?? 0,
        totalInvoices: (res.data as Record<string, unknown>)?.total_invoices as number ?? 0,
        outstandingAmount: (res.data as Record<string, unknown>)?.outstanding_amount as number ?? 0,
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  function $reset() {
    customers.value = []
    quotations.value = []
    salesOrders.value = []
    salesInvoices.value = []
    deliveryNotes.value = []
    summary.value = null
    loading.value = false
    error.value = null
  }

  return {
    customers, quotations, salesOrders, salesInvoices, deliveryNotes, summary,
    loading, error,
    fetchCustomers, fetchQuotations, fetchSalesOrders, fetchSalesInvoices,
    fetchDeliveryNotes, fetchSalesSummary, $reset,
  }
})
