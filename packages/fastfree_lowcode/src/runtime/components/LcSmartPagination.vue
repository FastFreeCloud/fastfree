<template>
  <div class="lc-smart-pagination row items-center q-gutter-sm" :class="sizeClass">
    <div v-if="showInfo" class="lc-pagination-info text-caption text-grey-7">
      <span class="lc-info-badge">{{ total }}</span>
      {{ t('common.total') }}
      <span class="lc-sep">|</span>
      {{ t('common.page') }}
      <strong class="lc-page-num">{{ page }}</strong>
      {{ t('common.of') }}
      <strong class="lc-page-num">{{ totalPages }}</strong>
    </div>

    <q-space />

    <div v-if="showSizeSelector" class="row items-center q-gutter-xs">
      <span class="text-caption text-grey-6">{{ t('common.rows') }}:</span>
      <q-select
        :model-value="rowsPerPage"
        :options="sizeOptions"
        dense
        outlined
        emit-value
        map-options
        class="lc-size-select"
        :style="{ width: '80px' }"
        @update:model-value="$emit('update:rowsPerPage', $event)"
      />
    </div>

    <q-pagination
      :model-value="page"
      :max="totalPages"
      :max-pages="maxVisiblePages"
      :size="paginationSize"
      boundary-links
      direction-links
      :disable="totalPages <= 1"
      @update:model-value="$emit('update:page', $event)"
    />

    <div v-if="showGoToPage" class="row items-center q-gutter-xs">
      <span class="text-caption text-grey-6">→</span>
      <q-input
        :model-value="goToPageValue"
        dense
        outlined
        :placeholder="t('common.page')"
        class="lc-goto-input"
        :style="{ width: '60px' }"
        @keyup.enter="goToPage"
        @update:model-value="goToPageValue = String($event ?? '')"
      />
      <q-btn
        flat
        dense
        round
        icon="mdi-arrow-right"
        size="xs"
        color="primary"
        :disable="!goToPageValue || Number(goToPageValue) < 1 || Number(goToPageValue) > totalPages"
        @click="goToPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLcI18n } from '../i18n'

interface Props {
  page: number
  rowsPerPage: number
  total: number
  showInfo?: boolean
  showSizeSelector?: boolean
  showGoToPage?: boolean
  maxVisiblePages?: number
  size?: 'sm' | 'md' | 'lg'
  sizeOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  showInfo: true,
  showSizeSelector: true,
  showGoToPage: false,
  maxVisiblePages: 7,
  size: 'sm',
  sizeOptions: () => [10, 25, 50, 100],
})

const { t } = useLcI18n()

const goToPageValue = ref<string>('')

const totalPages = computed(() =>
  Math.ceil(props.total / props.rowsPerPage) || 1
)

const sizeClass = computed(() => `lc-pagination-${props.size}`)
const paginationSize = computed(() => props.size === 'sm' ? 'sm' : props.size === 'lg' ? 'md' : 'sm')

const emit = defineEmits<{
  'update:page': [value: number]
  'update:rowsPerPage': [value: number]
}>()

function goToPage() {
  const num = Number(goToPageValue.value)
  if (num >= 1 && num <= totalPages.value) {
    emit('update:page', num)
    goToPageValue.value = ''
  }
}
</script>

<style lang="scss" scoped>
.lc-smart-pagination {
  padding: 8px 16px;
  border-top: 1px solid var(--lc-outline-variant, #e5e7eb);
  min-height: 48px;
}

.lc-pagination-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.lc-info-badge {
  background: var(--lc-primary, #0d47a1);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 12px;
}

.lc-sep {
  color: var(--lc-outline, #ccc);
  margin: 0 2px;
}

.lc-page-num {
  color: var(--lc-primary, #0d47a1);
}

.lc-size-select {
  min-width: 80px;
}

.lc-goto-input {
  min-width: 60px;
}
</style>
