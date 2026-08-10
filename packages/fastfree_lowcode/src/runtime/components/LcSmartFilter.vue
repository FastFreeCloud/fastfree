<template>
  <div class="lc-smart-filter">
    <div class="row items-center q-gutter-sm">
      <q-input
        v-model="searchText"
        dense
        outlined
        :placeholder="t('common.search')"
        class="lc-search-input"
        style="min-width: 200px"
        @update:model-value="onSearchChange"
      >
        <template #prepend>
          <q-icon name="mdi-magnify" size="18px" />
        </template>
        <template v-if="searchText" #append>
          <q-icon name="mdi-close" size="16px" class="cursor-pointer" @click="clearSearch" />
        </template>
      </q-input>

      <q-btn
        v-if="activeFilters.length > 0"
        flat
        dense
        round
        icon="mdi-filter-off"
        size="sm"
        color="negative"
        @click="clearFilters"
      >
        <q-tooltip>{{ t('common.clearFilters') }}</q-tooltip>
      </q-btn>

      <q-btn
        v-for="filter in activeFilters"
        :key="filter.field"
        dense
        flat
        color="primary"
        size="sm"
        :label="`${filter.label}: ${filter.value}`"
        icon-right="mdi-close"
        @click="removeFilter(filter.field)"
      />

      <q-space />

      <q-btn flat round dense icon="mdi-sort" size="sm" v-if="columns.length > 0">
        <q-menu>
          <q-list style="min-width: 200px">
            <q-item-label header class="text-weight-bold">{{ t('common.sort') }}</q-item-label>
            <q-item
              v-for="col in columns"
              :key="col.name"
              clickable
              @click="toggleSort(col.name)"
            >
              <q-item-section side>
                <q-icon
                  :name="sortField === col.name ? (sortDirection === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending') : 'mdi-sort'"
                  :color="sortField === col.name ? 'primary' : 'grey'"
                  size="18px"
                />
              </q-item-section>
              <q-item-section>{{ col.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <q-btn flat round dense icon="mdi-table-column" size="sm">
        <q-menu>
          <q-list style="min-width: 200px">
            <q-item-label header class="text-weight-bold">{{ t('common.showHide') }}</q-item-label>
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

interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

interface Props {
  columns: FilterColumn[]
  visibleColumns?: string[]
  searchDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  searchDelay: 300,
})

const { t } = useLcI18n()

const emit = defineEmits<{
  search: [value: string]
  'update:visibleColumns': [columns: string[]]
  'filter-change': [filters: ActiveFilter[]]
  sort: [state: SortState]
}>()

const searchText = ref('')
const activeFilters = ref<ActiveFilter[]>([])
const sortField = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const hasActiveFilters = computed(() => activeFilters.value.length > 0 || searchText.value.length > 0)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

function onSearchChange(val: string | number | null) {
  const value = String(val ?? '')
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    emit('search', value)
  }, props.searchDelay)
}

function clearSearch() {
  searchText.value = ''
  emit('search', '')
}

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

function clearFilters() {
  searchText.value = ''
  activeFilters.value = []
  sortField.value = ''
  sortDirection.value = 'asc'
  emit('search', '')
  emit('filter-change', [])
  emit('update:visibleColumns', props.columns.map(c => c.name))
}

function toggleSort(field: string) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
  emit('sort', { field: sortField.value, direction: sortDirection.value })
}
</script>

<style lang="scss" scoped>
.lc-smart-filter {
  padding: 8px 0;
}

.lc-search-input {
  :deep(.q-field__control) {
    border-radius: 20px;
  }
}
</style>
