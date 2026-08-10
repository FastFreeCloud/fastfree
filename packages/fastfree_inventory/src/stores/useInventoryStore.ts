// ============================================================
// FastFree Inventory — Pinia Store
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, Category, Warehouse, StockEntry, Supplier, StockBalance } from '../types'
import {
  getProducts, getCategories, getWarehouses, getStockEntries, getSuppliers, getStockBalance,
} from '../services'
import { getCached, setCached } from 'fastfree-auth'

export const useInventoryStore = defineStore('fastfree-inventory', () => {
  // ── State ──
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const warehouses = ref<Warehouse[]>([])
  const stockEntries = ref<StockEntry[]>([])
  const suppliers = ref<Supplier[]>([])
  const stockBalances = ref<StockBalance[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)

  function setLoading(val: boolean) { loading.value = val }
  function setError(e: unknown) { error.value = e instanceof Error ? e.message : e != null ? String(e) : null }

  // ── Computed ──
  const activeProducts = computed(() => products.value.filter(p => p.status === 'Active'))
  const lowStockProducts = computed(() => products.value.filter(p => p.currentStock <= p.minimumStock))
  const draftEntries = computed(() => stockEntries.value.filter(e => e.status === 'Draft'))
  const totalStockValue = computed(() => products.value.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0))

  // ── Actions ──
  async function fetchProducts(filters?: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `products-${JSON.stringify(filters || {})}`
      const cached = await getCached<Product[]>(cacheKey)
      if (cached) products.value = cached

      const result = await getProducts(filters)
      if (result.success) {
        products.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch products')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories(filters?: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `categories-${JSON.stringify(filters || {})}`
      const cached = await getCached<Category[]>(cacheKey)
      if (cached) categories.value = cached

      const result = await getCategories(filters)
      if (result.success) {
        categories.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch categories')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchWarehouses(filters?: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `warehouses-${JSON.stringify(filters || {})}`
      const cached = await getCached<Warehouse[]>(cacheKey)
      if (cached) warehouses.value = cached

      const result = await getWarehouses(filters)
      if (result.success) {
        warehouses.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch warehouses')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStockEntries(filters?: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `stockEntries-${JSON.stringify(filters || {})}`
      const cached = await getCached<StockEntry[]>(cacheKey)
      if (cached) stockEntries.value = cached

      const result = await getStockEntries(filters)
      if (result.success) {
        stockEntries.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch stock entries')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSuppliers(filters?: Record<string, unknown>) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `suppliers-${JSON.stringify(filters || {})}`
      const cached = await getCached<Supplier[]>(cacheKey)
      if (cached) suppliers.value = cached

      const result = await getSuppliers(filters)
      if (result.success) {
        suppliers.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch suppliers')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStockBalances(warehouse?: string, product?: string) {
    setLoading(true)
    setError(null)
    try {
      const cacheKey = `stockBalances-${warehouse ?? ''}-${product ?? ''}`
      const cached = await getCached<StockBalance[]>(cacheKey)
      if (cached) stockBalances.value = cached

      const result = await getStockBalance(warehouse, product)
      if (result.success) {
        stockBalances.value = result.data ?? []
        await setCached(cacheKey, result.data)
      } else if (!cached) {
        setError(result.error?.message ?? 'Failed to fetch stock balance')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  function $reset() {
    products.value = []
    categories.value = []
    warehouses.value = []
    stockEntries.value = []
    suppliers.value = []
    stockBalances.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    products, categories, warehouses, stockEntries, suppliers, stockBalances,
    loading, error,
    // Computed
    activeProducts, lowStockProducts, draftEntries, totalStockValue,
    // Actions
    fetchProducts, fetchCategories, fetchWarehouses, fetchStockEntries,
    fetchSuppliers, fetchStockBalances,
    $reset,
  }
})
