<template>
  <div class="lc-pagination-bar row items-center q-gutter-sm">
    <span class="text-caption">
      {{ t('common.total') }}: {{ total }} |
      {{ t('common.page') }} {{ page }} {{ t('common.of') }} {{ totalPages }}
    </span>

    <q-space />

    <q-select
      :model-value="rowsPerPage"
      :options="[10, 25, 50, 100]"
      dense
      outlined
      emit-value
      map-options
      class="col-auto"
      style="min-width: 100px"
      @update:model-value="$emit('update:rowsPerPage', $event)"
    >
      <template #prepend>
        <span class="text-caption">{{ t('common.rows') }}:</span>
      </template>
    </q-select>

    <q-pagination
      :model-value="page"
      :max="totalPages"
      :max-pages="7"
      boundary-links
      direction-links
      size="sm"
      @update:model-value="$emit('update:page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLcI18n } from '../i18n'

const props = defineProps<{
  page: number
  rowsPerPage: number
  total: number
}>()

const { t } = useLcI18n()

defineEmits<{
  'update:page': [value: number]
  'update:rowsPerPage': [value: number]
}>()

const totalPages = computed(() =>
  Math.ceil(props.total / props.rowsPerPage) || 1
)
</script>

<style lang="scss" scoped>
.lc-pagination-bar {
  padding: 8px 16px;
  border-top: 1px solid var(--lc-outline-variant, #e5e7eb);
}
</style>
