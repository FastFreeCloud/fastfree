import { ref, type Ref } from 'vue'
import { getSharedConfig } from '../shared-config'
import { api } from '../boot/axios'

export interface CrudStoreOptions {
  name: string
  endpoint: string
  storageKey?: string
  optimistic?: boolean
}

export function useCrudStore<T extends Record<string, unknown>>(options: CrudStoreOptions) {
  const items = ref<T[]>([]) as { value: T[] }
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    page: 1,
    rowsPerPage: 25,
    rowsNumber: 0,
  })
  const optimistic = ref(options.optimistic ?? false)
  const snapshot = ref<T[] | null>(null)

  function takeSnapshot() {
    snapshot.value = JSON.parse(JSON.stringify(items.value)) as T[]
  }

  function undo() {
    if (snapshot.value !== null) {
      items.value = snapshot.value as T[]
      snapshot.value = null
    }
  }

  async function withOptimisticUpdate<TResult>(
    optimisticFn: () => void,
    apiCall: () => Promise<TResult>,
    rollbackFn: () => void
  ): Promise<TResult> {
    if (optimistic.value) {
      takeSnapshot()
      optimisticFn()
    }
    try {
      const result = await apiCall()
      return result
    } catch (error) {
      if (optimistic.value) rollbackFn()
      throw error
    }
  }

  async function fetchItems(params?: { page?: number; limit?: number; search?: string; sort?: string; order?: string }) {
    loading.value = true
    error.value = null
    try {
      let url = options.endpoint
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.limit) searchParams.set('limit', String(params.limit))
      if (params?.search) searchParams.set('search', params.search)
      if (params?.sort) searchParams.set('sort', params.sort)
      if (params?.order) searchParams.set('order', params.order)
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`

      const data = await api.get(url)
      if (Array.isArray(data)) {
        items.value = data as T[]
        pagination.value.rowsNumber = data.length
      } else {
        items.value = ((data as Record<string, unknown>).data || (data as Record<string, unknown>).items || []) as T[]
        pagination.value.rowsNumber = ((data as Record<string, unknown>).total as number) || items.value.length
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : getSharedConfig().messages['common.errorOccurred']
    } finally {
      loading.value = false
    }
  }

  async function createItem(data: Partial<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const tempItem = { ...data, id: tempId } as unknown as T
    try {
      const result = await withOptimisticUpdate(
        () => {
          items.value = [...items.value, tempItem]
        },
        () => api.post(options.endpoint, data),
        () => {
          items.value = items.value.filter((item) =>
            (item as unknown as Record<string, unknown>).id !== tempId
          )
        }
      )
      const created = result as T
      if (optimistic.value) {
        items.value = items.value.map((item) =>
          (item as unknown as Record<string, unknown>).id === tempId ? created : item
        )
      } else {
        await fetchItems()
      }
      return created
    } catch (e) {
      error.value = e instanceof Error ? e.message : getSharedConfig().messages['common.errorOccurred']
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateItem(id: string | number, data: Partial<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const result = await withOptimisticUpdate(
        () => {
          items.value = items.value.map((item) =>
            (item as unknown as Record<string, unknown>).id === id
              ? ({ ...item, ...data } as T)
              : item
          )
        },
        () => api.put(`${options.endpoint}/${id}`, data),
        () => {
          if (snapshot.value !== null) {
            items.value = snapshot.value as T[]
            snapshot.value = null
          }
        }
      )
      if (!optimistic.value) await fetchItems()
      return result as T
    } catch (e) {
      error.value = e instanceof Error ? e.message : getSharedConfig().messages['common.errorOccurred']
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteItem(id: string | number): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      await withOptimisticUpdate(
        () => {
          items.value = items.value.filter((item) =>
            (item as unknown as Record<string, unknown>).id !== id
          )
        },
        () => api.delete(`${options.endpoint}/${id}`),
        () => {
          if (snapshot.value !== null) {
            items.value = snapshot.value as T[]
            snapshot.value = null
          }
        }
      )
      if (!optimistic.value) await fetchItems()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : getSharedConfig().messages['common.errorOccurred']
      return false
    } finally {
      loading.value = false
    }
  }

  async function bulkDelete(ids: (string | number)[]): Promise<void> {
    error.value = null
    try {
      await withOptimisticUpdate(
        () => {
          items.value = items.value.filter(
            (item) => !ids.includes((item as unknown as Record<string, unknown>).id as string | number)
          )
        },
        () => Promise.all(ids.map((id) => api.delete(`${options.endpoint}/${id}`))),
        () => {
          if (snapshot.value !== null) {
            items.value = snapshot.value as T[]
            snapshot.value = null
          }
        }
      )
      if (!optimistic.value) await fetchItems()
    } catch (e) {
      error.value = e instanceof Error ? e.message : getSharedConfig().messages['common.errorOccurred']
    }
  }

  async function bulkUpdate(ids: (string | number)[], data: Partial<T>): Promise<void> {
    error.value = null
    try {
      const idSet = new Set(ids.map(String))
      await withOptimisticUpdate(
        () => {
          items.value = items.value.map((item) =>
            idSet.has(String((item as unknown as Record<string, unknown>).id))
              ? ({ ...item, ...data } as T)
              : item
          )
        },
        () => Promise.all(ids.map((id) => api.put(`${options.endpoint}/${id}`, data))),
        () => {
          if (snapshot.value !== null) {
            items.value = snapshot.value as T[]
            snapshot.value = null
          }
        }
      )
      if (!optimistic.value) await fetchItems()
    } catch (e) {
      error.value = e instanceof Error ? e.message : getSharedConfig().messages['common.errorOccurred']
    }
  }

  function getItems() {
    return items.value
  }

  return {
    items,
    loading,
    error,
    pagination,
    optimistic,
    snapshot,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    bulkDelete,
    bulkUpdate,
    getItems,
    takeSnapshot,
    undo,
  }
}
