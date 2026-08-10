import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'lc-groups'

export interface GroupPage {
  id: string
  screenType: string
  label: string
  icon: string
  pinned?: boolean
}

export interface Group {
  id: string
  name: string
  icon: string
  pages: GroupPage[]
}

export const SYSTEM_GROUP_ID = 'system'
export const FAVORITES_GROUP_ID = 'favorites'

const OLD_LABEL_MAP: Record<string, string> = {
  'Settings': 'screens.settings',
  'Error Log': 'screens.errorLogs',
  'About': 'screens.about',
  'Translation Editor': 'screens.translationEditor',
  'Theme': 'screens.theme',
  'PWA Update': 'screens.pwaUpdate',
  'Shortcuts': 'screens.shortcuts',
  'Pinia Debugger': 'screens.piniaDebugger',
}

const OLD_GROUP_NAME_MAP: Record<string, string> = {
  'Authentication': 'groups.authentication',
  'Accounting': 'accounting.accounting',
  'المحاسبة': 'accounting.accounting',
  'accounting': 'accounting.accounting',
  'groups.accounting': 'accounting.accounting',
}

const DEFAULT_SYSTEM_PAGES: GroupPage[] = [
  { id: 'settings', screenType: 'settings', label: 'screens.settings', icon: 'mdi-cog-outline' },
  { id: 'error-logs', screenType: 'error-logs', label: 'screens.errorLogs', icon: 'mdi-bug-outline' },
  { id: 'about', screenType: 'about', label: 'screens.about', icon: 'mdi-information-outline' },
  { id: 'translation-editor', screenType: 'translation-editor', label: 'screens.translationEditor', icon: 'mdi-translate' },
  { id: 'theme', screenType: 'theme', label: 'screens.theme', icon: 'mdi-palette-outline' },
  { id: 'pwa-update', screenType: 'pwa-update', label: 'screens.pwaUpdate', icon: 'mdi-cellphone-arrow-down' },
  { id: 'shortcuts', screenType: 'shortcuts', label: 'screens.shortcuts', icon: 'mdi-keyboard-outline' },
  { id: 'structure-inspector', screenType: 'structure-inspector', label: 'screens.structureInspector', icon: 'mdi-file-tree-outline' },
  { id: 'pinia-debugger', screenType: 'pinia-debugger', label: 'screens.piniaDebugger', icon: 'mdi-database-outline' },
]

let groupIdCounter = 0

export const useGroupsStore = defineStore('lc-groups', () => {
  const groups = ref<Group[]>([])
  const activeGroupId = ref<string>(SYSTEM_GROUP_ID)

  const activeGroup = computed(() => groups.value.find(g => g.id === activeGroupId.value) || null)
  const systemGroup = computed(() => groups.value.find(g => g.id === SYSTEM_GROUP_ID) || null)
  const favoritesGroup = computed(() => groups.value.find(g => g.id === FAVORITES_GROUP_ID) || null)

  function cleanupStaleGroups() {
    const STALE_ID_PATTERN = /^group-\d+-\d+$/
    const builtinIds = new Set([SYSTEM_GROUP_ID, FAVORITES_GROUP_ID])
    const staleGroups = groups.value.filter(g => !builtinIds.has(g.id) && STALE_ID_PATTERN.test(g.id))
    if (staleGroups.length > 0) {
      groups.value = groups.value.filter(g => !staleGroups.includes(g))
      save()
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          groups.value = parsed
          ensureBuiltinGroups()
          cleanupStaleGroups()
          return
        }
        if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.groups)) {
          groups.value = parsed.groups
          if (parsed.activeGroupId) {
            activeGroupId.value = parsed.activeGroupId
          }
          ensureBuiltinGroups()
          cleanupStaleGroups()
          return
        }
      }
    } catch (e) {
      console.warn('[lc-groups] Corrupt localStorage data, resetting to defaults:', e)
    }
    initDefaults()
  }

  function initDefaults() {
    groups.value = [
      { id: SYSTEM_GROUP_ID, name: 'System', icon: 'mdi-home', pages: [...DEFAULT_SYSTEM_PAGES] },
      { id: FAVORITES_GROUP_ID, name: 'Favorites', icon: 'mdi-star', pages: [] },
    ]
    activeGroupId.value = SYSTEM_GROUP_ID
    save()
  }

  function ensureBuiltinGroups() {
    let systemGroup = groups.value.find(g => g.id === SYSTEM_GROUP_ID)
    if (!systemGroup) {
      systemGroup = { id: SYSTEM_GROUP_ID, name: 'System', icon: 'mdi-home', pages: [...DEFAULT_SYSTEM_PAGES] }
      groups.value.unshift(systemGroup)
    } else if (!Array.isArray(systemGroup.pages)) {
      systemGroup.pages = [...DEFAULT_SYSTEM_PAGES]
    } else {
      systemGroup.pages = systemGroup.pages.filter(p => p && typeof p === 'object' && p.id && p.screenType && p.label && p.icon)
      systemGroup.pages.forEach(p => {
        const mapped = OLD_LABEL_MAP[p.label]
        if (mapped) {
          p.label = mapped
        }
      })
      const existingTypes = new Set(systemGroup.pages.map(p => p.screenType))
      for (const defaultPage of DEFAULT_SYSTEM_PAGES) {
        if (!existingTypes.has(defaultPage.screenType)) {
          systemGroup.pages.push({ ...defaultPage })
        }
      }
    }

    let favoritesGroup = groups.value.find(g => g.id === FAVORITES_GROUP_ID)
    if (!favoritesGroup) {
      const sysIdx = groups.value.findIndex(g => g.id === SYSTEM_GROUP_ID)
      favoritesGroup = { id: FAVORITES_GROUP_ID, name: 'Favorites', icon: 'mdi-star', pages: [] }
      groups.value.splice(sysIdx + 1, 0, favoritesGroup)
    } else if (!Array.isArray(favoritesGroup.pages)) {
      favoritesGroup.pages = []
    } else {
      favoritesGroup.pages = favoritesGroup.pages.filter(p => p && typeof p === 'object' && p.id && p.screenType && p.label && p.icon)
    }

    // Migrate old group names to translation keys
    let migrated = false
    for (const group of groups.value) {
      const mapped = OLD_GROUP_NAME_MAP[group.name]
      if (mapped) {
        group.name = mapped
        // Also update the ID to match the new name (lowercase, no spaces)
        const newId = mapped.toLowerCase().replace(/\s+/g, '-')
        if (group.id !== newId) {
          group.id = newId
        }
        migrated = true
      }
    }

    // Deduplicate groups with same ID or same name (merge pages)
    const seen = new Map<string, Group>()
    const deduped: Group[] = []
    for (const group of groups.value) {
      const existing = seen.get(group.id) || seen.get(group.name)
      if (existing) {
        // Merge pages from duplicate into the first one
        for (const page of group.pages) {
          if (!existing.pages.some(p => p.screenType === page.screenType)) {
            existing.pages.push(page)
          }
        }
        migrated = true
      } else {
        seen.set(group.id, group)
        seen.set(group.name, group)
        deduped.push(group)
      }
    }
    if (migrated) {
      groups.value = deduped
      save()
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups: groups.value, activeGroupId: activeGroupId.value }))
    } catch { /* ignore */ }
  }

  function createGroup(name: string, icon: string, id?: string): Group {
    const groupId = id || name.toLowerCase().replace(/\s+/g, '-')
    const existing = groups.value.find(g => g.id === groupId)
    if (existing) return existing
    const group: Group = { id: groupId, name, icon, pages: [] }
    groups.value.push(group)
    save()
    return group
  }

  function updateGroup(id: string, data: Partial<{ name: string; icon: string }>) {
    const group = groups.value.find(g => g.id === id)
    if (!group) return
    if (data.name !== undefined) group.name = data.name
    if (data.icon !== undefined) group.icon = data.icon
    save()
  }

  function deleteGroup(id: string) {
    if (id === SYSTEM_GROUP_ID || id === FAVORITES_GROUP_ID) return
    groups.value = groups.value.filter(g => g.id !== id)
    if (activeGroupId.value === id) {
      activeGroupId.value = SYSTEM_GROUP_ID
    }
    save()
  }

  function reorderGroups(fromIdx: number, toIdx: number) {
    const order = [...groups.value]
    const moved = order.splice(fromIdx, 1)[0]
    if (!moved) return
    if (moved.id === SYSTEM_GROUP_ID || moved.id === FAVORITES_GROUP_ID) return
    order.splice(toIdx, 0, moved)
    groups.value = order
    save()
  }

  function addPage(groupId: string, page: Omit<GroupPage, 'id'>): GroupPage | null {
    const group = groups.value.find(g => g.id === groupId)
    if (!group) return null
    const existingPage = group.pages.find(p => p.screenType === page.screenType)
    if (existingPage) return existingPage
    const id = `page-${Date.now()}-${groupIdCounter++}`
    const newPage: GroupPage = { id, ...page }
    group.pages.push(newPage)
    save()
    return newPage
  }

  function removePage(groupId: string, pageId: string) {
    const group = groups.value.find(g => g.id === groupId)
    if (!group) return
    group.pages = group.pages.filter(p => p.id !== pageId)
    save()
  }

  function reorderPages(groupId: string, fromIdx: number, toIdx: number) {
    const group = groups.value.find(g => g.id === groupId)
    if (!group) return
    const order = [...group.pages]
    const moved = order.splice(fromIdx, 1)[0]
    if (!moved) return
    order.splice(toIdx, 0, moved)
    group.pages = order
    save()
  }

  function setActiveGroup(id: string) {
    activeGroupId.value = id
    save()
  }

  function toggleFavoritePage(screenType: string, label: string, icon: string) {
    const fav = favoritesGroup.value
    if (!fav) return
    const existing = fav.pages.find(p => p.screenType === screenType)
    if (existing) {
      fav.pages = fav.pages.filter(p => p.screenType !== screenType)
    } else {
      fav.pages.push({ id: `fav-${screenType}`, screenType, label, icon })
    }
    save()
  }

  function isFavoritePage(screenType: string): boolean {
    const fav = favoritesGroup.value
    if (!fav) return false
    return fav.pages.some(p => p.screenType === screenType)
  }

  function togglePinnedPage(screenType: string) {
    const group = activeGroup.value
    if (!group) return
    const page = group.pages.find(p => p.screenType === screenType)
    if (page) {
      page.pinned = !page.pinned
      save()
    }
  }

  function isPinnedPage(screenType: string): boolean {
    const group = activeGroup.value
    if (!group) return false
    return group.pages.some(p => p.screenType === screenType && p.pinned)
  }

  /**
   * Register a page in the system group.
   * Used by external packages (e.g. fastfree_auth) to add their screens.
   */
  function registerSystemPage(page: Omit<GroupPage, 'id'>): GroupPage | null {
    return addPage(SYSTEM_GROUP_ID, page)
  }

  const pinnedPages = computed(() => {
    const group = activeGroup.value
    if (!group) return []
    return group.pages.filter(p => p.pinned)
  })

  load()

  return {
    groups,
    activeGroupId,
    activeGroup,
    systemGroup,
    favoritesGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    addPage,
    removePage,
    reorderPages,
    setActiveGroup,
    toggleFavoritePage,
    isFavoritePage,
    togglePinnedPage,
    isPinnedPage,
    pinnedPages,
    registerSystemPage,
  }
})

/**
 * Standalone helper to create a new group.
 * Returns the group if created, or the existing group if name already exists.
 * @param id Optional custom ID for the group (e.g. 'auth')
 */
export function registerGroup(name: string, icon: string, id?: string): Group {
  const store = useGroupsStore()
  const groupId = id || name.toLowerCase().replace(/\s+/g, '-')
  const existing = store.groups.find(g => g.id === groupId || g.name === name)
  if (existing) return existing
  return store.createGroup(name, icon, groupId)
}

/**
 * Standalone helper to add a page to any group.
 * Finds the group by name. If not found, creates it.
 * Always ensures the page is added (handles groups loaded from localStorage with empty pages).
 */
export function registerGroupPage(groupName: string, page: Omit<GroupPage, 'id'>): GroupPage | null {
  const store = useGroupsStore()
  // Find group by name or ID, create if not found
  let group = store.groups.find(g => g.name === groupName || g.id === groupName)
  if (!group) {
    group = store.createGroup(groupName, 'mdi-folder')
  }
  const existingPage = group.pages.find(p => p.screenType === page.screenType)
  if (existingPage) return existingPage
  return store.addPage(group.id, page)
}
