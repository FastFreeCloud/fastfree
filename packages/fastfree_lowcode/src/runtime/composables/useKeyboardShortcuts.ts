import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useDesktopStore } from './useDesktopStore'

const STORAGE_KEY = 'lc-shortcuts'

const DEFAULT_SHORTCUTS: Record<string, string> = {
  'ctrl+tab': 'nextWindow',
  'ctrl+shift+tab': 'prevWindow',
  'ctrl+w': 'closeWindow',
  'ctrl+n': 'focusFirst',
}

function parseKeys(keys: string): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean; key: string } {
  const parts = keys.toLowerCase().split('+')
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    key: parts.filter(k => !['ctrl', 'shift', 'alt', 'meta', 'cmd', 'command', 'option'].includes(k)).join('+'),
  }
}

function shortcutKeyLabel(s: string): string {
  const parts = s.split('+')
  const modMap: Record<string, string> = { ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt', meta: 'Meta' }
  return parts.map(p => modMap[p.toLowerCase()] || p.charAt(0).toUpperCase() + p.slice(1)).join(' + ')
}



export const useKeyboardShortcuts = defineStore('lc-keyboard', () => {
  const desktop = useDesktopStore()
  const shortcuts = ref<Record<string, string>>({ ...DEFAULT_SHORTCUTS })

  let listener: ((e: KeyboardEvent) => void) | null = null
  let registered = false

  function loadCustom() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>
        shortcuts.value = { ...DEFAULT_SHORTCUTS, ...parsed }
      }
    } catch { /* ignore */ }
  }

  function persistCustom() {
    try {
      const custom: Record<string, string> = {}
      for (const [keys, action] of Object.entries(shortcuts.value)) {
        if (DEFAULT_SHORTCUTS[keys] !== action) {
          custom[keys] = action
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
    } catch { /* ignore */ }
  }

  function matchesKeys(e: KeyboardEvent, shortcutKeys: string): boolean {
    const parsed = parseKeys(shortcutKeys)
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const targetKey = parsed.key.length === 1 ? parsed.key.toLowerCase() : parsed.key
    return (
      e.ctrlKey === parsed.ctrl &&
      e.shiftKey === parsed.shift &&
      e.altKey === parsed.alt &&
      e.metaKey === parsed.meta &&
      (key === targetKey || (!!e.code && e.code.toLowerCase() === targetKey))
    )
  }

  function isTypingInInput(e: KeyboardEvent): boolean {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    return !!(e.target as HTMLElement)?.isContentEditable
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isTypingInInput(e)) return
    for (const [keys, action] of Object.entries(shortcuts.value)) {
      if (matchesKeys(e, keys)) {
        e.preventDefault()
        e.stopPropagation()
        executeAction(action)
        return
      }
    }
  }

  function executeAction(action: string) {
    switch (action) {
      case 'nextWindow': {
        const order = desktop.openedOrder
        const nonMinimized = order.filter(id => {
          const w = desktop.windows[id]
          return w && !w.isMinimized
        })
        if (nonMinimized.length === 0) return
        const activeIdx = nonMinimized.indexOf(desktop.activeWindowId ?? '')
        const nextIdx = (activeIdx + 1) % nonMinimized.length
        const nextId = nonMinimized[nextIdx]
        if (nextId) desktop.bringToFront(nextId)
        break
      }
      case 'prevWindow': {
        const order = desktop.openedOrder
        const nonMinimized = order.filter(id => {
          const w = desktop.windows[id]
          return w && !w.isMinimized
        })
        if (nonMinimized.length === 0) return
        const activeIdx = nonMinimized.indexOf(desktop.activeWindowId ?? '')
        const prevIdx = (activeIdx - 1 + nonMinimized.length) % nonMinimized.length
        const prevId = nonMinimized[prevIdx]
        if (prevId) desktop.bringToFront(prevId)
        break
      }
      case 'closeWindow': {
        const id = desktop.activeWindowId
        if (id) desktop.closeWindow(id)
        break
      }
      case 'focusFirst': {
        const order = desktop.openedOrder
        const nonMinimized = order.filter(id => {
          const w = desktop.windows[id]
          return w && !w.isMinimized
        })
        const first = nonMinimized[0]
        if (first) desktop.bringToFront(first)
        break
      }
    }
  }

  function register() {
    if (registered) return
    loadCustom()
    listener = handleKeydown
    document.addEventListener('keydown', listener as EventListener)
    registered = true
  }

  function destroy() {
    if (!registered || !listener) return
    document.removeEventListener('keydown', listener as EventListener)
    listener = null
    registered = false
  }

  function resetToDefaults() {
    shortcuts.value = { ...DEFAULT_SHORTCUTS }
    localStorage.removeItem(STORAGE_KEY)
  }

  function getDefaultKeys(action: string): string | undefined {
    return Object.entries(DEFAULT_SHORTCUTS).find(([, a]) => a === action)?.[0]
  }

  function updateShortcut(oldKeys: string, newKeys: string): { success: boolean; conflict?: string } {
    const action = shortcuts.value[oldKeys]
    if (!action) return { success: false }
    if (oldKeys === newKeys) return { success: false }
    const existingAction = shortcuts.value[newKeys]
    if (existingAction && existingAction !== action) {
      const copy = { ...shortcuts.value }
      delete copy[oldKeys]
      delete copy[newKeys]
      copy[newKeys] = action
      copy[oldKeys] = existingAction
      shortcuts.value = copy
      persistCustom()
      return { success: true, conflict: existingAction }
    }
    const copy = { ...shortcuts.value }
    delete copy[oldKeys]
    copy[newKeys] = action
    shortcuts.value = copy
    persistCustom()
    return { success: true }
  }

  return {
    shortcuts,
    register,
    destroy,
    resetToDefaults,
    updateShortcut,
    getDefaultKeys,
    shortcutKeyLabel,
  }
})
