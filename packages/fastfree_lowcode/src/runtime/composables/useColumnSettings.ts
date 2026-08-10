import { ref, computed, watch, onMounted } from 'vue'
import { LocalStorage } from 'quasar'

export interface ColumnDef {
  name: string
  label: string
  field?: string | ((row: Record<string, unknown>) => unknown)
  required?: boolean
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

export interface ColumnDefaults {
  order: string[]
  visibility: Record<string, boolean>
  widths: Record<string, number>
}

export interface ColumnSettingsOptions {
  storageKey: string
  columns: ColumnDef[]
  defaults: ColumnDefaults
  columnWidths?: Record<string, number>
}

export function useColumnSettings(options: ColumnSettingsOptions) {
  const { storageKey, columns, defaults } = options

  const STORAGE_KEY_ORDER = `${storageKey}-order`
  const STORAGE_KEY_VIS = `${storageKey}-visibility`
  const STORAGE_KEY_WIDTHS = `${storageKey}-widths`

  const columnOrder = ref<string[]>([])
  const columnVisibility = ref<Record<string, boolean>>({})
  const columnWidths = ref<Record<string, number>>({})
  const hasChanges = ref(false)

  const allColumnNames = computed(() => columns.map(c => c.name))

  const orderedColumns = computed(() => {
    return columnOrder.value
      .map(name => columns.find(c => c.name === name))
      .filter(Boolean) as ColumnDef[]
  })

  const visibleColumnNames = computed(() => {
    return columnOrder.value.filter(name => columnVisibility.value[name] !== false)
  })

  function loadFromStorage() {
    const savedOrder = LocalStorage.getItem<string[]>(STORAGE_KEY_ORDER)
    const savedVis = LocalStorage.getItem<Record<string, boolean>>(STORAGE_KEY_VIS)
    const savedWidths = LocalStorage.getItem<Record<string, number>>(STORAGE_KEY_WIDTHS)

    if (savedOrder && savedOrder.length > 0) {
      const valid = savedOrder.filter(n => allColumnNames.value.includes(n))
      const missing = allColumnNames.value.filter(n => !valid.includes(n))
      columnOrder.value = [...valid, ...missing]
    } else {
      columnOrder.value = [...defaults.order]
    }

    if (savedVis && Object.keys(savedVis).length > 0) {
      columnVisibility.value = { ...savedVis }
    } else {
      columnVisibility.value = { ...defaults.visibility }
    }

    if (savedWidths && Object.keys(savedWidths).length > 0) {
      columnWidths.value = { ...savedWidths }
    } else {
      columnWidths.value = { ...defaults.widths }
    }

    hasChanges.value = !!(savedOrder || savedVis || savedWidths)
  }

  function saveToStorage() {
    LocalStorage.set(STORAGE_KEY_ORDER, columnOrder.value)
    LocalStorage.set(STORAGE_KEY_VIS, columnVisibility.value)
    LocalStorage.set(STORAGE_KEY_WIDTHS, columnWidths.value)
    hasChanges.value = true
  }

  function resetToDefaults() {
    columnOrder.value = [...defaults.order]
    columnVisibility.value = { ...defaults.visibility }
    columnWidths.value = { ...defaults.widths }
    LocalStorage.remove(STORAGE_KEY_ORDER)
    LocalStorage.remove(STORAGE_KEY_VIS)
    LocalStorage.remove(STORAGE_KEY_WIDTHS)
    hasChanges.value = false
  }

  function toggleColumnVisibility(name: string) {
    if (columns.find(c => c.name === name)?.required) return
    columnVisibility.value = {
      ...columnVisibility.value,
      [name]: columnVisibility.value[name] === false ? true : false,
    }
    saveToStorage()
  }

  function setColumnVisibility(vis: Record<string, boolean>) {
    columnVisibility.value = { ...vis }
    saveToStorage()
  }

  function reorderColumns(newOrder: string[]) {
    columnOrder.value = [...newOrder]
    saveToStorage()
  }

  function setColumnWidth(name: string, width: number) {
    const minW = getMinWidth(name)
    columnWidths.value = {
      ...columnWidths.value,
      [name]: Math.max(minW, width),
    }
    saveToStorage()
  }

  function getMinWidth(name: string): number {
    return options?.columnWidths?.[name] ?? 120
  }

  function getDefaultWidth(name: string): number {
    return defaults.widths[name] ?? 120
  }

  function getColumnStyle(name: string): string {
    const w = columnWidths.value[name] ?? getDefaultWidth(name)
    return `width: ${w}px; min-width: ${getMinWidth(name)}px;`
  }

  function adaptWidthsToScreen(screenWidth: number) {
    const totalDefined = Object.values(columnWidths.value).reduce((s, w) => s + w, 0)
    if (totalDefined <= screenWidth) return

    const scale = screenWidth / totalDefined
    const newWidths: Record<string, number> = {}
    for (const name of columnOrder.value) {
      const current = columnWidths.value[name] ?? getDefaultWidth(name)
      newWidths[name] = Math.max(getMinWidth(name), Math.round(current * scale))
    }
    columnWidths.value = newWidths
  }

  onMounted(() => {
    loadFromStorage()
  })

  watch(columnOrder, () => {
    saveToStorage()
  }, { deep: true })

  return {
    columnOrder,
    columnVisibility,
    columnWidths,
    hasChanges,
    orderedColumns,
    visibleColumnNames,
    allColumnNames,
    resetToDefaults,
    toggleColumnVisibility,
    setColumnVisibility,
    reorderColumns,
    setColumnWidth,
    getMinWidth,
    getDefaultWidth,
    getColumnStyle,
    adaptWidthsToScreen,
    loadFromStorage,
  }
}
