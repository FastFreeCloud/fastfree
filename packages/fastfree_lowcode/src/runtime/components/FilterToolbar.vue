<template>
  <div class="lc-filter-toolbar">
    <div class="row items-center q-gutter-sm">
      <q-input
        v-model="search"
        dense
        outlined
        :placeholder="t('common.search')"
        class="col-auto"
        style="min-width: 180px"
        @update:model-value="$emit('search', String($event ?? ''))"
      >
        <template #append>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-btn
        v-for="filter in activeFilters"
        :key="filter.field"
        dense
        flat
        color="primary"
        size="sm"
        :label="`${filter.label}: ${filter.value}`"
        icon-right="close"
        @click="removeFilter(filter.field)"
      />

      <q-space />

      <q-btn flat round dense icon="filter_list" size="sm">
        <q-menu>
          <q-list style="min-width: 200px">
            <q-item-label header>{{ t('common.showHide') }}</q-item-label>
            <q-item
              v-for="col in columns"
              :key="col.name"
              tag="label"
              dense
            >
              <q-item-section side>
                <q-checkbox :model-value="isVisible(col.name)" @update:model-value="toggleVisibility(col.name)" />
              </q-item-section>
              <q-item-section>{{ col.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <q-btn
        v-if="hasActiveFilters"
        flat
        round
        dense
        icon="clear_all"
        size="sm"
        color="negative"
        @click="resetAll"
      >
        <q-tooltip>{{ t('common.clearFilters') }}</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLcI18n } from '../i18n'

interface FilterColumn {
  name: string
  label: string
}

interface ActiveFilter {
  field: string
  label: string
  value: string
}

const props = defineProps<{
  columns: FilterColumn[]
  visibleColumns?: string[]
}>()

const { t } = useLcI18n()

const emit = defineEmits<{
  search: [value: string]
  'update:visibleColumns': [columns: string[]]
  'filter-change': [filters: ActiveFilter[]]
}>()

const search = ref('')
const activeFilters = ref<ActiveFilter[]>([])

const hasActiveFilters = computed(() => activeFilters.value.length > 0)

function isVisible(name: string): boolean {
  return props.visibleColumns ? props.visibleColumns.includes(name) : true
}

function toggleVisibility(name: string) {
  const current = props.visibleColumns ? [...props.visibleColumns] : props.columns.map(c => c.name)
  const index = current.indexOf(name)
  if (index > -1) {
    current.splice(index, 1)
  } else {
    current.push(name)
  }
  emit('update:visibleColumns', current)
}

function removeFilter(field: string) {
  activeFilters.value = activeFilters.value.filter(f => f.field !== field)
  emit('filter-change', activeFilters.value)
}

function resetAll() {
  search.value = ''
  activeFilters.value = []
  emit('search', '')
  emit('filter-change', [])
  emit('update:visibleColumns', props.columns.map(c => c.name))
}
</script>

<style lang="scss" scoped>
.lc-filter-toolbar {
  padding: 8px 0;
}
</style>
