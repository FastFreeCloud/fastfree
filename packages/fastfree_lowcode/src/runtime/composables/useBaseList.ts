import { computed, ref, shallowRef, type Ref, type ComputedRef } from 'vue'
import type { QTableColumn } from 'quasar'
import { useLcI18n } from '../i18n'
import { useFormatNumber } from './useFormatNumber'
import { useStatusHelpers } from './useStatusHelpers'

export interface ColumnDef<T extends Record<string, unknown>> extends QTableColumn {
  statusField?: keyof T
  format?: (value: unknown, row: T) => string
}

export interface RowAction<T extends Record<string, unknown>> {
  label: string
  icon?: string
  color?: string
  handler: (row: T) => void | Promise<void>
  visible?: (row: T) => boolean
  disable?: (row: T) => boolean
}

export interface BaseListStore<T extends Record<string, unknown>> {
  items: Ref<Array<T>>
  loading: Ref<boolean>
  error: Ref<string | null>
  fetchItems: () => Promise<void>
}

export interface BaseListOptions<T extends Record<string, unknown>> {
  store: BaseListStore<T>
  columns: ColumnDef<T>[]
  namespace: string
  searchFields: (keyof T)[]
  rowKey?: string
  defaultSort?: { field: string; order: 'asc' | 'desc' }
  actions?: RowAction<T>[]
  selection?: 'single' | 'multiple' | 'none'
}

export interface BaseListReturn<T extends Record<string, unknown>> {
  filteredRows: ComputedRef<Array<T>>
  search: Ref<string>
  sorting: Ref<{ field: string; order: 'asc' | 'desc' }>
  pagination: Ref<{ page: number; rowsPerPage: number; rowsNumber: number }>
  selectedRows: Ref<Array<T>>
  toggleRowSelection: (row: T) => void
  toggleAllSelection: () => void
  clearSelection: () => void
  onRequest: (props: {
    pagination?: { page: number; rowsPerPage: number; sortBy: string; descending: boolean }
    filter?: string
  }) => void
  onFilter: () => void
  getStatusBadge: (row: T) => { label: string; color: string }
  formatNumber: (value: number | undefined | null, decimals?: number) => string
  formatCurrency: (value: number | undefined | null, currency?: string) => string
  formatPercent: (value: number | undefined | null) => string
  translate: (key: string, params?: Record<string, string | number>) => string
}

function getNestedValue<T extends Record<string, unknown>>(
  obj: T,
  path: keyof T | string,
): unknown {
  const keys = String(path).split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function matchesSearch<T extends Record<string, unknown>>(
  row: T,
  search: string,
  searchFields: (keyof T)[],
): boolean {
  if (!search.trim()) return true
  const normalizedSearch = search.toLowerCase()
  for (const field of searchFields) {
    const value = getNestedValue(row, field)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const strValue = String(value).toLowerCase()
      if (strValue.includes(normalizedSearch)) return true
    }
  }
  return false
}

function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  field: string,
  order: 'asc' | 'desc',
): T[] {
  if (!field) return rows
  return [...rows].sort((a, b) => {
    const valA = getNestedValue(a, field)
    const valB = getNestedValue(b, field)
    if (valA === valB) return 0
    if (valA === null || valA === undefined) return order === 'asc' ? 1 : -1
    if (valB === null || valB === undefined) return order === 'asc' ? -1 : 1
    const strA =
      typeof valA === 'string' || typeof valA === 'number' || typeof valA === 'boolean'
        ? String(valA).toLowerCase()
        : ''
    const strB =
      typeof valB === 'string' || typeof valB === 'number' || typeof valB === 'boolean'
        ? String(valB).toLowerCase()
        : ''
    const result = strA < strB ? -1 : 1
    return order === 'asc' ? result : -result
  })
}

export function useBaseList<T extends Record<string, unknown>>(
  options: BaseListOptions<T>,
): BaseListReturn<T> {
  const {
    store,
    columns,
    namespace,
    searchFields,
    rowKey = 'name',
    defaultSort = { field: 'name', order: 'asc' },
    selection = 'none',
  } = options

  const { t } = useLcI18n()
  const { formatNumber, formatCurrency, formatPercent } = useFormatNumber()
  const { translateStatus, statusColor } = useStatusHelpers(namespace)

  const search = ref('')
  const sorting = ref<{ field: string; order: 'asc' | 'desc' }>({ ...defaultSort })
  const pagination = ref({
    page: 1,
    rowsPerPage: 25,
    rowsNumber: 0,
  })
  const selectedRows = shallowRef<Array<T>>([])

  const filteredRows = computed<T[]>(() => {
    const filtered = store.items.value.filter((row) =>
      matchesSearch(row, search.value, searchFields),
    )
    return sortRows(filtered, sorting.value.field, sorting.value.order)
  })

  function toggleRowSelection(row: T): void {
    if (selection === 'none') return
    const key = String(getNestedValue(row, rowKey))
    const existingIndex = selectedRows.value.findIndex(
      (r) => String(getNestedValue(r, rowKey)) === key,
    )
    if (existingIndex >= 0) {
      selectedRows.value.splice(existingIndex, 1)
    } else {
      if (selection === 'single') {
        selectedRows.value = [row]
      } else {
        selectedRows.value.push(row)
      }
    }
  }

  function toggleAllSelection(): void {
    if (selection === 'none') return
    if (selectedRows.value.length === filteredRows.value.length) {
      selectedRows.value = []
    } else {
      selectedRows.value = [...filteredRows.value]
    }
  }

  function clearSelection(): void {
    selectedRows.value = []
  }

  function onRequest(props: {
    pagination?: { page: number; rowsPerPage: number; sortBy: string; descending: boolean }
    filter?: string
  }): void {
    if (props.pagination) {
      pagination.value.page = props.pagination.page
      pagination.value.rowsPerPage = props.pagination.rowsPerPage
      if (props.pagination.sortBy) {
        sorting.value = {
          field: props.pagination.sortBy,
          order: props.pagination.descending ? 'desc' : 'asc',
        }
      }
    }
    if (props.filter !== undefined) {
      search.value = props.filter
    }
  }

  function onFilter(): void {
    pagination.value.page = 1
  }

  function getStatusBadge(row: T): { label: string; color: string } {
    for (const col of columns) {
      if (col.statusField) {
        const statusValue = getNestedValue(row, col.statusField)
        if (
          typeof statusValue === 'string' ||
          typeof statusValue === 'number' ||
          typeof statusValue === 'boolean'
        ) {
          const status = String(statusValue)
          return {
            label: translateStatus(status),
            color: statusColor(status),
          }
        }
      }
    }
    return { label: '', color: 'grey' }
  }

  return {
    filteredRows,
    search,
    sorting,
    pagination,
    selectedRows,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
    onRequest,
    onFilter,
    getStatusBadge,
    formatNumber,
    formatCurrency,
    formatPercent,
    translate: t,
  }
}
