import { ref, computed } from 'vue'

export interface LogEntry {
  id: string | number
  createdAt: string
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
  details: string
  component?: string | undefined
  stack?: string | undefined
}

export interface ErrorStats {
  error: number
  warning: number
  info: number
  total: number
}

const entries = ref<LogEntry[]>([])
const STORAGE_KEY = 'fastfree-error-logs'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      entries.value = JSON.parse(raw)
    }
  } catch { /* ignore */ }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value.slice(0, 500)))
  } catch { /* ignore */ }
}

// Initial load
if (typeof window !== 'undefined') {
  loadFromStorage()
}

export function useErrorLogStore() {
  const stats = computed<ErrorStats>(() => {
    let error = 0
    let warning = 0
    let info = 0
    for (const e of entries.value) {
      if (e.level === 'error') error++
      else if (e.level === 'warning') warning++
      else if (e.level === 'info') info++
    }
    return { error, warning, info, total: entries.value.length }
  })

  function addEntry(entry: Omit<LogEntry, 'id' | 'createdAt'>) {
    const newEntry: LogEntry = {
      ...entry,
      id: Date.now() + Math.random(),
      createdAt: new Date().toISOString(),
    }
    entries.value.unshift(newEntry)
    if (entries.value.length > 500) {
      entries.value = entries.value.slice(0, 500)
    }
    saveToStorage()
  }

  function clearAll() {
    entries.value = []
    saveToStorage()
  }

  function removeEntry(id: string | number) {
    entries.value = entries.value.filter((e) => e.id !== id)
    saveToStorage()
  }

  function exportToJSON() {
    const data = JSON.stringify(entries.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    a.download = `error_logs_${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    entries,
    stats,
    addEntry,
    clearAll,
    removeEntry,
    exportToJSON,
  }
}
