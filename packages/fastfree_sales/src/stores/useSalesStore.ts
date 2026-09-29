import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ApiResponse } from 'fastfree-auth'
import type { Customer, Quotation, SalesOrder, SalesInvoice, DeliveryNote } from '../types'
import {
  getCustomers,
  getQuotations,
  getSalesOrders,
  getSalesInvoices,
  getDeliveryNotes,
  getSalesSummary,
} from '../services'
import type { QuotationFilters } from '../services'

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
  const quotationLoading = ref(false)
  const quotationError = ref<string | null>(null)
  const quotationHasLoaded = ref(false)
  let quotationRequestId = 0

  function setLoading(val: boolean) {
    loading.value = val
  }
  function setError(cause: unknown) {
    if (cause instanceof Error) {
      error.value = cause.message
      return
    }
    if (typeof cause === 'string') {
      error.value = cause
      return
    }
    if (cause !== null && typeof cause === 'object' && 'message' in cause) {
      const message = cause.message
      if (typeof message === 'string') {
        error.value = message
        return
      }
    }
    error.value = null
  }

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

  async function fetchQuotations(filters?: QuotationFilters): Promise<ApiResponse<Quotation[]>> {
    const requestId = ++quotationRequestId
    setLoading(true)
    setError(null)
    quotationLoading.value = true
    quotationError.value = null

    try {
      const res = await getQuotations(filters)
      if (requestId !== quotationRequestId) {
        return {
          success: false,
          error: { code: 'STALE_REQUEST', message: 'Stale quotation request' },
        }
      }
      if (!res.success) {
        const message = res.error?.message ?? 'Failed to fetch quotations'
        quotationError.value = message
        setError(message)
        return res
      }
      quotations.value = res.data ?? []
      return { success: true, data: quotations.value }
    } catch (cause) {
      if (requestId !== quotationRequestId) {
        return {
          success: false,
          error: { code: 'STALE_REQUEST', message: 'Stale quotation request' },
        }
      }
      const message = cause instanceof Error ? cause.message : 'Failed to fetch quotations'
      quotationError.value = message
      setError(cause)
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message },
      }
    } finally {
      if (requestId === quotationRequestId) {
        quotationHasLoaded.value = true
        quotationLoading.value = false
        setLoading(false)
      }
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
        totalSales: ((res.data as Record<string, unknown>)?.total_sales as number) ?? 0,
        totalInvoices: ((res.data as Record<string, unknown>)?.total_invoices as number) ?? 0,
        outstandingAmount:
          ((res.data as Record<string, unknown>)?.outstanding_amount as number) ?? 0,
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
    quotationLoading.value = false
    quotationError.value = null
    quotationHasLoaded.value = false
    quotationRequestId += 1
  }

  return {
    customers,
    quotations,
    salesOrders,
    salesInvoices,
    deliveryNotes,
    summary,
    loading,
    error,
    quotationLoading,
    quotationError,
    quotationHasLoaded,
    fetchCustomers,
    fetchQuotations,
    fetchSalesOrders,
    fetchSalesInvoices,
    fetchDeliveryNotes,
    fetchSalesSummary,
    $reset,
  }
})
