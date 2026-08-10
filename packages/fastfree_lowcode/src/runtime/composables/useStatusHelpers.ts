import { computed } from 'vue'
import { useLcI18n } from '../i18n'

/**
 * Shared status helpers composable.
 * Replaces repeated `translateStatus`, `statusColor`, and `statusOptions` across packages.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useStatusHelpers } from 'fastfree-lowcode'
 * const { translateStatus, statusColor, statusOptions } = useStatusHelpers()
 * </script>
 * <template>
 *   <q-badge :color="statusColor(item.status)">{{ translateStatus(item.status) }}</q-badge>
 * </template>
 * ```
 */

/** Known status → color mapping */
const STATUS_COLORS: Record<string, string> = {
  draft: 'grey',
  'to deliver and bill': 'orange',
  'to bill': 'orange',
  'to deliver': 'orange',
  submitted: 'blue',
  active: 'green',
  inactive: 'red',
  cancelled: 'red',
  closed: 'grey',
  open: 'blue',
  paid: 'green',
  unpaid: 'red',
  'partially paid': 'orange',
  overdued: 'red',
  overdue: 'red',
  returned: 'purple',
  completed: 'green',
  pending: 'orange',
  confirmed: 'blue',
  rejected: 'red',
  approved: 'green',
  expired: 'red',
  saved: 'green',
}

/** Fallback color for unknown statuses */
const FALLBACK_COLORS: Record<string, string> = {
  draft: 'grey',
  pending: 'orange',
  active: 'green',
  inactive: 'red',
  completed: 'green',
  cancelled: 'red',
  closed: 'grey',
  default: 'grey',
}

/**
 * @param namespace - i18n namespace prefix (e.g. 'sales', 'purchase', 'hr', 'crm', 'accounting', 'inventory')
 */
export function useStatusHelpers(namespace: string) {
  const { t } = useLcI18n()

  /**
   * Translate a status string to i18n key.
   * Handles multi-word statuses like "Partially Paid" → "partially_paid"
   */
  function translateStatus(status: string | undefined | null): string {
    if (!status) return ''
    const key = `${namespace}.status.${status.toLowerCase().replace(/\s+/g, '_')}`
    const translated = t(key)
    // If key not found, return the original status
    return translated === key ? status : translated
  }

  /**
   * Get Quasar badge color for a status.
   */
  function statusColor(status: string | undefined | null): string {
    if (!status) return 'grey'
    const normalized = status.toLowerCase()
    return STATUS_COLORS[normalized] ?? FALLBACK_COLORS[normalized] ?? 'grey'
  }

  /**
   * Get all possible status keys for a namespace (for filter dropdowns).
   */
  function statusOptions(statuses: string[]) {
    return computed(() =>
      statuses.map((s) => ({
        label: translateStatus(s),
        value: s,
        color: statusColor(s),
      })),
    )
  }

  return { translateStatus, statusColor, statusOptions }
}
