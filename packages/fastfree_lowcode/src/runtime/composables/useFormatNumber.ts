import { getLcI18nStore } from './useLcI18nStore'

/**
 * Locale-aware number formatting composable.
 * Replaces repeated `formatNumber` functions across packages.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useFormatNumber } from 'fastfree-lowcode'
 * const { formatNumber, formatCurrency } = useFormatNumber()
 * </script>
 * <template>
 *   <span>{{ formatNumber(1234567) }}</span>       <!-- 1,234,567 -->
 *   <span>{{ formatCurrency(99.5) }}</span>         <!-- 99.50 -->
 * </template>
 * ```
 */
export function useFormatNumber() {
  const store = getLcI18nStore()

  function getLocale(): string {
    return store.locale.value === 'ar' ? 'ar-SA' : 'en-US'
  }

  function formatNumber(value: number | undefined | null, decimals = 0): string {
    if (value == null || isNaN(value)) return '0'
    return new Intl.NumberFormat(getLocale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  function formatCurrency(value: number | undefined | null, currency = 'SAR'): string {
    if (value == null || isNaN(value)) return '0.00'
    return new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  function formatPercent(value: number | undefined | null): string {
    if (value == null || isNaN(value)) return '0%'
    return new Intl.NumberFormat(getLocale(), {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  return { formatNumber, formatCurrency, formatPercent }
}
