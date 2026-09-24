<template>
  <div class="lc-base-form-totals" :class="{ 'text-primary': showGrandTotal }">
    <div class="q-gutter-xs">
      <!-- Subtotal -->
      <q-item v-if="showSubtotal" class="lc-base-form-totals__row" :clickable="false">
        <q-item-section side class="lc-base-form-totals__label">
          {{ t('common.subtotal') }}
        </q-item-section>
        <q-item-section side class="lc-base-form-totals__value">
          {{ formatCurrency(subtotal, currency) }}
        </q-item-section>
      </q-item>

      <!-- Discount -->
      <q-item
        v-if="showDiscount && discount > 0"
        class="lc-base-form-totals__row"
        :clickable="false"
      >
        <q-item-section side class="lc-base-form-totals__label">
          {{ t('common.discount') }}
        </q-item-section>
        <q-item-section side class="lc-base-form-totals__value text-negative">
          - {{ formatCurrency(discount, currency) }}
        </q-item-section>
      </q-item>

      <!-- Taxable Amount -->
      <q-item v-if="showTax" class="lc-base-form-totals__row" :clickable="false">
        <q-item-section side class="lc-base-form-totals__label">
          {{ t('common.taxable') }}
        </q-item-section>
        <q-item-section side class="lc-base-form-totals__value">
          {{ formatCurrency(taxable, currency) }}
        </q-item-section>
      </q-item>

      <!-- Tax -->
      <q-item v-if="showTax && tax > 0" class="lc-base-form-totals__row" :clickable="false">
        <q-item-section side class="lc-base-form-totals__label">
          {{ t('common.tax') }} ({{ formatNumber(taxRate * 100, 2) }}%)
        </q-item-section>
        <q-item-section side class="lc-base-form-totals__value">
          {{ formatCurrency(tax, currency) }}
        </q-item-section>
      </q-item>

      <!-- Grand Total -->
      <q-item
        v-if="showGrandTotal"
        class="lc-base-form-totals__row lc-base-form-totals__grand-total"
        :clickable="false"
      >
        <q-item-section side class="lc-base-form-totals__label text-h6 text-weight-bold">
          {{ t('common.grandTotal') }}
        </q-item-section>
        <q-item-section side class="lc-base-form-totals__value text-h6 text-weight-bold">
          {{ formatCurrency(grandTotal, currency) }}
        </q-item-section>
      </q-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLcI18n } from '../i18n'
import { useFormatNumber } from '../composables/useFormatNumber'

// ============ Types ============

export interface FormItem {
  qty: number
  rate: number
  discount_amount?: number
  discount_percentage?: number
}

export interface Props {
  items: FormItem[]
  taxRate?: number
  currency?: string
  taxInclusive?: boolean
  showSubtotal?: boolean
  showTax?: boolean
  showDiscount?: boolean
  showGrandTotal?: boolean
}

// ============ Props & Defaults ============

const props = withDefaults(defineProps<Props>(), {
  items: () => [] as FormItem[],
  taxRate: 0.15,
  currency: 'EGP',
  taxInclusive: false,
  showSubtotal: true,
  showTax: true,
  showDiscount: true,
  showGrandTotal: true,
})

// ============ Composables ============

const { t } = useLcI18n()
const { formatCurrency, formatNumber } = useFormatNumber()

// ============ Computed ============

const subtotal = computed((): number => {
  return props.items.reduce((sum, item) => sum + item.qty * item.rate, 0)
})

const discount = computed((): number => {
  return props.items.reduce((sum, item) => {
    const itemDiscount =
      item.discount_amount ?? (item.qty * item.rate * (item.discount_percentage ?? 0)) / 100
    return sum + itemDiscount
  }, 0)
})

const taxable = computed((): number => {
  return subtotal.value - discount.value
})

const tax = computed((): number => {
  return taxable.value * props.taxRate
})

const showSubtotal = computed((): boolean => props.showSubtotal ?? true)
const showTax = computed((): boolean => props.showTax ?? true)
const showDiscount = computed((): boolean => props.showDiscount ?? true)
const showGrandTotal = computed((): boolean => props.showGrandTotal ?? true)

const grandTotal = computed((): number => {
  return props.taxInclusive ? taxable.value : taxable.value + tax.value
})
</script>

<style lang="scss" scoped>
.lc-base-form-totals {
  background: var(--lc-surface, #fff);
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.06));
  border-radius: 12px;
  padding: 16px;

  body.body--dark & {
    background: var(--lc-surface, #2d2d2d);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.lc-base-form-totals__row {
  padding: 4px 0;
  align-items: center;

  &:not(:last-child) {
    border-bottom: 1px solid var(--lc-border, rgba(0, 0, 0, 0.06));

    body.body--dark & {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }
  }
}

.lc-base-form-totals__label {
  color: var(--lc-on-surface-variant, #666);
  font-size: 0.9rem;
  margin-inline-end: 16px;
  min-width: 140px;
  flex-shrink: 0;

  body.body--dark & {
    color: var(--lc-on-surface-variant, #aaa);
  }
}

.lc-base-form-totals__value {
  color: var(--lc-on-surface, #1a1a1a);
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  text-align: end;
  flex-grow: 1;

  body.body--dark & {
    color: var(--lc-on-surface, #fff);
  }
}

.lc-base-form-totals__grand-total {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 2px solid var(--lc-primary, #1565c0);

  .lc-base-form-totals__label,
  .lc-base-form-totals__value {
    color: var(--lc-primary, #1565c0);
  }
}

/* RTL adjustments */
body.rtl .lc-base-form-totals__label {
  text-align: right;
}

body.rtl .lc-base-form-totals__value {
  text-align: left;
}
</style>
