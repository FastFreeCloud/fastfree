import { computed, ref, type Ref, type ComputedRef } from 'vue'
import type { DockItem } from '../types'

/**
 * Options for creating a screen access guard.
 *
 * The consumer can provide either:
 * - a static list of allowed screen IDs, OR
 * - a reactive Ref that the consumer updates from their auth store
 * - a custom `canAccess` function for full control
 */
export interface ScreenAccessOptions {
  /**
   * Static or reactive list of screen IDs the current user may access.
   * When the user has a "super-admin" role, pass `'*'` to grant access to all screens.
   */
  allowedScreens?: string[] | Ref<string[] | '*'>

  /**
   * Custom function evaluated per screen ID.
   * Takes precedence over `allowedScreens` when provided.
   */
  canAccess?: (screenId: string) => boolean
}

export interface ScreenAccessReturn {
  /**
   * Returns `true` when the current user may open the given screen.
   */
  canAccessScreen: (screenId: string) => boolean

  /**
   * Convenience helper — filters a DockItem[] array keeping only those the user can access.
   */
  filterDockItems: (items: DockItem[]) => DockItem[]

  /**
   * Computed list of allowed screens (empty when using a custom `canAccess` fn).
   */
  allowedScreenIds: ComputedRef<string[] | '*'>
}

/**
 * Composable that provides screen-level access control.
 *
 * ### Usage (with auth store)
 * ```ts
 * import { useScreenAccess } from 'quasar-app-extension-fastfree-lowcode'
 * import { useAuthStore } from 'src/stores/auth-store'
 *
 * const auth = useAuthStore()
 *
 * const { canAccessScreen, filterDockItems } = useScreenAccess({
 *   canAccess: (id) => auth.canAccessScreen(id),
 * })
 * ```
 *
 * ### Usage (with a reactive list)
 * ```ts
 * const screens = ref(['invoices', 'companies'])
 *
 * const { filterDockItems } = useScreenAccess({
 *   allowedScreens: screens,
 * })
 * ```
 *
 * ### Usage (super-admin — all screens)
 * ```ts
 * const { filterDockItems } = useScreenAccess({
 *   allowedScreens: '*',
 * })
 * ```
 */
export function useScreenAccess(options: ScreenAccessOptions = {}): ScreenAccessReturn {
  const { canAccess, allowedScreens } = options

  // Normalise the allowed screens into a reactive Ref
  const _allowed = computed<string[] | '*'>(() => {
    if (allowedScreens === undefined || allowedScreens === null) return '*'
    if (typeof allowedScreens === 'string') return allowedScreens // '*'
    if (Array.isArray(allowedScreens)) return allowedScreens
    // Ref
    return allowedScreens.value
  })

  function canAccessScreen(screenId: string): boolean {
    // Custom function takes priority
    if (canAccess) return canAccess(screenId)

    const allowed = _allowed.value
    if (allowed === '*') return true
    return allowed.includes(screenId)
  }

  function filterDockItems(items: DockItem[]): DockItem[] {
    return items.filter((item) => canAccessScreen(item.id))
  }

  return {
    canAccessScreen,
    filterDockItems,
    allowedScreenIds: _allowed,
  }
}
