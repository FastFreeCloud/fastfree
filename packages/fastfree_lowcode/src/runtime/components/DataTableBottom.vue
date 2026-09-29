<template>
  <div ref="barRef" class="bottom-bar" :class="sizeClass" :aria-busy="loading ? 'true' : 'false'">
    <div class="bottom-bar__side bottom-bar__side--start">
      <q-btn-toggle
        :model-value="rowsPerPage"
        :options="rowsPerPageToggleOptions"
        dense
        unelevated
        rounded
        no-caps
        color="grey-3"
        text-color="grey-8"
        toggle-color="primary"
        toggle-text-color="white"
        :disable="loading"
        class="bottom-bar__rows-per-page"
        :class="{ 'bottom-bar__rows-per-page--rtl': isRtl }"
        :aria-label="t('pagination.rowsPerPage')"
        :title="t('pagination.rowsPerPage')"
        @update:model-value="onRowsPerPageChange(Number($event))"
      />
      <slot name="left" />
    </div>
    <div class="bottom-bar__center">
      <q-btn
        flat
        round
        dense
        class="bottom-bar__previous"
        :icon="previousIcon"
        color="primary"
        :disable="loading || page <= 1"
        :aria-label="t('pagination.prev')"
        @click="emit('prev-page')"
      />
      <span class="bottom-bar__page">{{ page }} / {{ pagesNumber }}</span>
      <div class="bottom-bar__after-page">
        <q-btn
          flat
          round
          dense
          :icon="nextIcon"
          color="primary"
          :disable="loading || page >= pagesNumber"
          :aria-label="t('pagination.next')"
          @click="emit('next-page')"
        />
        <template v-if="!showSummary && displayWidth >= 320">
          <span class="bottom-bar__range">{{ rangeLabel }}</span>
        </template>
        <template v-if="showSummary && displayWidth >= 700">
          <q-separator vertical class="q-mx-sm" />
          <span class="bottom-bar__summary">
            <q-icon :name="summaryIcon" size="15px" />
            {{ summaryLabel }}
          </span>
        </template>
        <template v-if="showTotal && displayWidth >= 900">
          <q-separator vertical class="q-mx-sm" />
          <span class="bottom-bar__total">
            <q-icon name="mdi-cash-multiple" size="15px" />
            {{ t('pagination.total') }}:
            <strong>{{ totalLabel }}</strong>
          </span>
        </template>
      </div>
    </div>
    <div class="bottom-bar__side bottom-bar__side--end">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import { useContainerWidth } from '../composables/useContainerWidth'

interface Props {
  page: number
  rowsPerPage: number
  rowsNumber: number
  width?: number
  summaryLabel?: string
  summaryIcon?: string
  totalLabel?: string
  showSummary?: boolean
  showTotal?: boolean
  loading?: boolean
  rowsPerPageOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  summaryLabel: '',
  summaryIcon: 'mdi-table-row',
  totalLabel: '',
  showSummary: true,
  showTotal: false,
  loading: false,
  rowsPerPageOptions: () => [10, 25, 50],
})

const emit = defineEmits<{
  (e: 'update:rowsPerPage', value: number): void
  (e: 'prev-page'): void
  (e: 'next-page'): void
}>()

const { t } = useLcI18n()
const $q = useQuasar()
const { containerRef: barRef, containerWidth } = useContainerWidth()
const displayWidth = computed(() => containerWidth.value || props.width || 0)
const rowsPerPageToggleOptions = computed(() =>
  props.rowsPerPageOptions.map((option) => ({ label: String(option), value: option })),
)
const pagesNumber = computed(() => {
  if (props.rowsPerPage <= 0) return 1
  return Math.max(1, Math.ceil((props.rowsNumber ?? 0) / props.rowsPerPage))
})
const rangeLabel = computed(() => {
  const total = props.rowsNumber ?? 0
  const formatter = $q.lang.table.pagination
  if (total <= 0) return formatter(0, 0, 0)
  if (props.rowsPerPage <= 0) return formatter(1, total, total)
  const first = (props.page - 1) * props.rowsPerPage + 1
  const last = Math.min(props.page * props.rowsPerPage, total)
  return formatter(first, last, total)
})
const isRtl = computed(
  () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl',
)
const previousIcon = computed(() => (isRtl.value ? 'mdi-chevron-right' : 'mdi-chevron-left'))
const nextIcon = computed(() => (isRtl.value ? 'mdi-chevron-left' : 'mdi-chevron-right'))
const sizeClass = computed(() => {
  if (displayWidth.value < 480) return 'bottom-bar--xs'
  if (displayWidth.value < 700) return 'bottom-bar--sm'
  return ''
})

function onRowsPerPageChange(value: number) {
  if (Number.isFinite(value) && value > 0) emit('update:rowsPerPage', value)
}
</script>

<style lang="scss" scoped>
.bottom-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 48px;
  gap: 10px;
  direction: ltr;
}

.bottom-bar__side {
  display: flex;
  align-items: center;
  min-width: 0;
  direction: rtl;
}

.bottom-bar__side--start {
  flex-direction: row;
  justify-content: flex-start;
  gap: 8px;
}

.bottom-bar__rows-per-page {
  flex: 0 0 auto;
  min-width: 0;
  direction: ltr;
}

.bottom-bar__rows-per-page--rtl {
  direction: rtl;
}

.bottom-bar__rows-per-page :deep(.q-btn) {
  min-width: 38px;
  padding-inline: 10px;
  font-weight: 600;
}

.bottom-bar__side--end {
  justify-content: flex-end;
}

.bottom-bar__center {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 5px;
  direction: ltr;
  white-space: nowrap;
}

.bottom-bar__previous {
  grid-column: 1;
  justify-self: end;
}

.bottom-bar__page {
  grid-column: 2;
  justify-self: center;
  text-align: center;
}

.bottom-bar__after-page {
  display: inline-flex;
  grid-column: 3;
  justify-self: start;
  align-items: center;
  min-width: 0;
  gap: 5px;
}

.bottom-bar__page,
.bottom-bar__summary,
.bottom-bar__range,
.bottom-bar__total {
  color: var(--lc-on-surface, #263238);
  font-size: 0.78rem;
  font-weight: 600;
}

.bottom-bar__summary,
.bottom-bar__range,
.bottom-bar__total {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.bottom-bar__total strong {
  color: var(--lc-primary, #1565c0);
  font-size: 0.84rem;
}

.bottom-bar--sm .bottom-bar__center {
  gap: 2px;
}

.bottom-bar--sm,
.bottom-bar--xs {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 2px;
}

.bottom-bar--sm .bottom-bar__center,
.bottom-bar--xs .bottom-bar__center {
  gap: 0;
}

.bottom-bar--xs .bottom-bar__page {
  font-size: 0.72rem;
}
</style>
