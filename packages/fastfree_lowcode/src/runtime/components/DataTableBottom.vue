<template>
  <div ref="barRef" class="bottom-bar" :class="sizeClass" :aria-busy="loading ? 'true' : 'false'">
    <div class="bottom-bar__side bottom-bar__side--start">
      <div v-if="displayWidth >= 480" class="bottom-bar__rows-per-page">
        <q-btn-dropdown
          dense
          no-caps
          outline
          color="primary"
          :label="rowsPerPageLabel"
          :class="{ 'rows-per-page-trigger--wide': displayWidth >= 800 }"
          icon="mdi-table-row"
          dropdown-icon="mdi-chevron-up"
          menu-anchor="top start"
          menu-self="bottom start"
          :menu-offset="[0, 8]"
          :disable="loading"
          :toggle-aria-label="t('pagination.rowsPerPage')"
          aria-haspopup="menu"
          class="rows-per-page-trigger"
          :aria-label="`${t('pagination.rowsPerPage')}: ${rowsPerPage}`"
          :title="t('pagination.rowsPerPage')"
        >
          <q-list dense class="rows-per-page-menu" role="menu">
            <q-item
              v-for="option in rowsPerPageOptions"
              :key="option"
              clickable
              v-close-popup
              role="menuitemradio"
              :active="option === rowsPerPage"
              :aria-checked="option === rowsPerPage ? 'true' : 'false'"
              @click="onRowsPerPageChange(option)"
            >
              <q-item-section avatar>
                <q-icon v-if="option === rowsPerPage" name="mdi-check" size="18px" />
              </q-item-section>
              <q-item-section>{{ option }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
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
const { containerRef: barRef, containerWidth } = useContainerWidth()
const displayWidth = computed(() => containerWidth.value || props.width || 0)
const rowsPerPageLabel = computed(() =>
  displayWidth.value >= 800
    ? `${props.rowsPerPage} / ${t('pagination.rowsPerPage')}`
    : String(props.rowsPerPage),
)
const pagesNumber = computed(() => {
  if (props.rowsPerPage <= 0) return 1
  return Math.max(1, Math.ceil((props.rowsNumber ?? 0) / props.rowsPerPage))
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
  display: flex;
  flex: 0 0 auto;
  min-width: 0;
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
.bottom-bar__total {
  color: var(--lc-on-surface, #263238);
  font-size: 0.78rem;
  font-weight: 600;
}

.bottom-bar__summary,
.bottom-bar__total {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.bottom-bar__total strong {
  color: var(--lc-primary, #1565c0);
  font-size: 0.84rem;
}
.rows-per-page-trigger {
  width: 82px;
  min-width: 82px;
  height: 36px;
  border: 1px solid currentColor;
  border-radius: 10px;
  font-weight: 600;
}

.rows-per-page-trigger--wide {
  width: 132px;
  min-width: 132px;
}

.rows-per-page-trigger :deep(.q-btn__content) {
  gap: 4px;
}

.rows-per-page-menu {
  min-width: 112px;
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
