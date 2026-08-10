<template>
  <div class="dynamic-table" tabindex="0" @keydown="onTableKeydown">
    <q-table
      :rows="displayRows"
      :columns="activeColumns"
      :loading="loading"
      :pagination="pagination"
      :filter="search"
      row-key="id"
      flat
      dense
      bordered
      separator="cell"
      binary-state-sort
      :class="tableClass"
      :selected="selectedRows"
      :selection="selectable ? 'multiple' : undefined"
      @request="onRequest"
      @update:selected="onSelectionChange"
    >
      <template #top>
        <div class="row items-center full-width">
          <q-icon :name="icon || 'table_chart'" size="24px" color="primary" class="q-mr-sm" />
          <span class="text-h6">{{ title || t('common.noData') }}</span>
          <q-space />
          <q-btn
            v-if="createItem"
            color="primary"
            dense
            icon="mdi-plus"
            size="sm"
            class="q-mr-sm"
            @click="openCreateDialog"
          >
            <q-tooltip>{{ t('common.add') }}</q-tooltip>
          </q-btn>
          <q-input
            v-model="search"
            dense
            outlined
            :placeholder="t('common.search')"
            :aria-label="t('common.search')"
            class="q-mr-sm"
            style="width: 200px"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn
            v-if="showPrint"
            flat
            dense
            icon="mdi-printer"
            size="sm"
            @click="handlePrint"
          >
            <q-tooltip>{{ t('common.print') }}</q-tooltip>
          </q-btn>
          <q-btn
            v-if="showExport"
            flat
            dense
            icon="mdi-file-excel"
            size="sm"
            @click="handleExport"
          >
            <q-tooltip>{{ t('common.export') }}</q-tooltip>
          </q-btn>
          <q-btn flat round icon="refresh" :aria-label="t('common.refresh')" @click="refresh" />
        </div>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            v-if="updateItem"
            flat
            round
            dense
            size="sm"
            icon="mdi-pencil"
            color="primary"
            @click="openEditDialog(props.row)"
          >
            <q-tooltip>{{ t('common.edit') }}</q-tooltip>
          </q-btn>
          <q-btn
            v-if="deleteItem"
            flat
            round
            dense
            size="sm"
            icon="mdi-delete"
            color="negative"
            @click="confirmDelete(props.row)"
          >
            <q-tooltip>{{ t('common.delete') }}</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template #bottom>
        <div class="row items-center full-width">
          <div v-if="showFooter" class="col-12 q-mb-sm">
            <q-separator class="q-mb-sm" />
            <div class="row items-center q-gutter-x-md">
              <template v-for="col in columns" :key="col.name">
                <div v-if="computedFooterData[col.name] !== undefined" class="text-caption text-weight-medium">
                  {{ col.label }}: <span class="text-weight-bold">{{ computedFooterData[col.name] }}</span>
                </div>
              </template>
            </div>
          </div>
          <div class="row items-center full-width">
            <span class="text-caption q-mr-sm">
              {{ t('common.total') }}: {{ pagination.rowsNumber }} | {{ t('common.page') }} {{ pagination.page }} {{ t('common.of') }} {{ totalPages }}
            </span>
            <q-space />
            <q-pagination
              v-model="pagination.page"
              :max="totalPages"
              :max-pages="5"
              boundary-links
              direction-links
              size="sm"
              @update:model-value="refresh"
            />
          </div>
        </div>
      </template>

      <template #no-data>
        <div class="full-width row flex-center text-grey q-pa-lg">
          <q-icon name="inbox" size="40px" class="q-mr-sm" />
          <span>{{ t('common.noData') }}</span>
        </div>
      </template>
    </q-table>

    <q-dialog v-model="dialogVisible" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ dialogTitle }}</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="closeDialog" />
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleSubmit" class="q-gutter-md">
            <template v-for="col in columns" :key="col.name">
              <q-input
                v-if="!col.options"
                :model-value="String(formData[getFieldString(col.field)] ?? '')"
                @update:model-value="(val: string | number | null) => { formData[getFieldString(col.field)] = val }"
                :label="col.label"
                :type="col.inputType || 'text'"
                outlined
                dense
              />
              <q-select
                v-else
                :model-value="formData[getFieldString(col.field)]"
                @update:model-value="(val: unknown) => { formData[getFieldString(col.field)] = val }"
                :label="col.label"
                :options="col.options"
                outlined
                dense
              />
            </template>

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn v-close-popup flat :label="t('common.cancel')" @click="closeDialog" />
              <q-btn type="submit" color="primary" :label="t('common.confirm')" :loading="submitting" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteConfirmVisible" persistent>
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-alert" color="warning" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>

        <q-card-section class="q-pt-none">
          {{ t('common.deleteMessage') }}
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="t('common.cancel')" @click="deleteConfirmVisible = false" />
          <q-btn
            v-close-popup
            color="negative"
            :label="t('common.confirm')"
            :loading="deleting"
            @click="handleDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useLcI18n } from '../i18n'
import { usePrint, type PrintColumn } from '../composables/usePrint'
import { useExcelExport, type ExcelColumn } from '../composables/useExcelExport'

export interface TableColumn {
  name: string
  label: string
  field: string | ((row: Record<string, unknown>) => unknown)
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  format?: (val: unknown, row: Record<string, unknown>) => string
  style?: string
  classes?: string
  options?: string[]
  inputType?: 'text' | 'number' | 'date' | 'email' | 'password'
}

export type AggregateType = 'sum' | 'avg' | 'count' | 'min' | 'max'

function getFieldString(field: string | ((row: Record<string, unknown>) => unknown)): string {
  return typeof field === 'string' ? field : ''
}

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  fetchUrl?: string
  fetchItems?: () => Promise<{ data: Record<string, unknown>[]; total: number }>
  createItem?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateItem?: (data: Record<string, unknown>) => Promise<void>
  deleteItem?: (data: Record<string, unknown>) => Promise<void>
  title?: string
  icon?: string
  storageKey?: string
  rowsPerPage?: number
  showPrint?: boolean
  showExport?: boolean
  tableClass?: string
  selectable?: boolean
  selectedRows?: Record<string, unknown>[]
  showFooter?: boolean
  footerData?: Record<string, string | number>
  footerAggregates?: Record<string, AggregateType>
}>(), {
  rowsPerPage: 25,
  tableClass: 'lc-data-table',
  selectable: false,
  selectedRows: () => [],
  showFooter: false,
  footerData: () => ({}),
  footerAggregates: () => ({}),
})

const emit = defineEmits<{
  edit: [row: Record<string, unknown>]
  delete: [row: Record<string, unknown>]
  created: [item: Record<string, unknown>]
  updated: [item: Record<string, unknown>]
  deleted: [item: Record<string, unknown>]
  'update:selectedRows': [rows: Record<string, unknown>[]]
  undo: []
  'bulk-delete': [rows: Record<string, unknown>[]]
}>()

const { t } = useLcI18n()
const { printTable } = usePrint()
const { exportTable } = useExcelExport()

function handlePrint() {
  printTable({
    title: props.title || t('common.noData'),
    columns: props.columns as PrintColumn[],
    rows: displayRows.value as Record<string, unknown>[],
    total: { label: t('common.total'), value: pagination.value.rowsNumber },
  })
}

function onSelectionChange(rows: readonly Record<string, unknown>[]) {
  emit('update:selectedRows', [...rows])
}

async function handleExport() {
  await exportTable({
    filename: (props.title || 'data').replace(/\s+/g, '_'),
    title: props.title || t('common.noData'),
    columns: props.columns as ExcelColumn[],
    rows: displayRows.value as Record<string, unknown>[],
    total: { label: t('common.total'), value: pagination.value.rowsNumber },
  })
}

const search = ref('')
const loading = ref(false)
const displayRows = ref<Record<string, unknown>[]>([])
const pagination = ref({
  page: 1,
  rowsPerPage: props.rowsPerPage || 25,
  rowsNumber: 0,
  sortBy: '',
  descending: false,
})

const totalPages = computed(() =>
  Math.ceil(pagination.value.rowsNumber / pagination.value.rowsPerPage) || 1
)

const activeColumns = computed(() => props.columns)

const computedFooterData = computed(() => {
  if (props.footerData && Object.keys(props.footerData).length > 0) {
    return props.footerData
  }
  if (!props.footerAggregates || Object.keys(props.footerAggregates).length === 0) {
    return {}
  }
  const result: Record<string, string | number> = {}
  for (const [field, agg] of Object.entries(props.footerAggregates)) {
    const values = displayRows.value
      .map((r) => Number(r[field]))
      .filter((v) => !isNaN(v))
    if (values.length === 0) continue
    switch (agg) {
      case 'sum':
        result[field] = values.reduce((a, b) => a + b, 0)
        break
      case 'avg':
        result[field] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
        break
      case 'count':
        result[field] = values.length
        break
      case 'min':
        result[field] = Math.min(...values)
        break
      case 'max':
        result[field] = Math.max(...values)
        break
    }
  }
  return result
})

function onTableKeydown(e: KeyboardEvent) {
  if (!props.selectable) return

  if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault()
    emit('undo')
  } else if (e.key === 'Delete' || e.key === 'Del') {
    if (props.selectedRows && props.selectedRows.length > 0) {
      e.preventDefault()
      emit('bulk-delete', props.selectedRows)
    }
  } else if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
    e.preventDefault()
    emit('update:selectedRows', [...displayRows.value])
  }
}

async function onRequest(evt: { pagination: { page: number; rowsPerPage: number; sortBy: string; descending: boolean; rowsNumber?: number } }) {
  pagination.value = { ...pagination.value, ...evt.pagination }
  await fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    if (props.fetchItems) {
      const result = await props.fetchItems()
      displayRows.value = result.data
      pagination.value.rowsNumber = result.total
    } else if (props.fetchUrl) {
      const params = new URLSearchParams({
        page: String(pagination.value.page),
        limit: String(pagination.value.rowsPerPage),
      })
      if (pagination.value.sortBy) {
        params.set('sort', pagination.value.sortBy)
        params.set('order', pagination.value.descending ? 'desc' : 'asc')
      }
      if (search.value) {
        params.set('search', search.value)
      }
      const res = await fetch(`${props.fetchUrl}?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      displayRows.value = data.data || data.items || []
      pagination.value.rowsNumber = data.total || 0
    }
  } catch {
    displayRows.value = []
  } finally {
    loading.value = false
  }
}

function refresh() {
  fetchData()
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    fetchData()
  }, 300)
})

onMounted(() => {
  if (props.fetchItems || props.fetchUrl) fetchData()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

const dialogVisible = ref(false)
const deleteConfirmVisible = ref(false)
const submitting = ref(false)
const deleting = ref(false)
const isEditMode = ref(false)
const editingRow = ref<Record<string, unknown> | null>(null)
const formData = ref<Record<string, unknown>>({})

const dialogTitle = computed(() => {
  return isEditMode.value ? t('common.edit') : t('common.add')
})

function initFormData(row?: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const col of props.columns) {
    const fieldName = getFieldString(col.field) || col.name
    data[fieldName] = row?.[fieldName] ?? ''
  }
  formData.value = data
}

function openCreateDialog() {
  isEditMode.value = false
  editingRow.value = null
  initFormData()
  dialogVisible.value = true
}

function openEditDialog(row: Record<string, unknown>) {
  isEditMode.value = true
  editingRow.value = row
  initFormData(row)
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  formData.value = {}
  editingRow.value = null
}

async function handleSubmit() {
  if (!isEditMode.value && props.createItem) {
    try {
      submitting.value = true
      const result = await props.createItem(formData.value)
      emit('created', result)
      showNotify(t('common.success'), 'positive')
      closeDialog()
      refresh()
    } catch (err) {
      showNotify(t('common.error'), 'negative')
      console.error('Create failed:', err)
    } finally {
      submitting.value = false
    }
  } else if (isEditMode.value && props.updateItem) {
    try {
      submitting.value = true
      await props.updateItem({ ...editingRow.value, ...formData.value })
      emit('updated', { ...editingRow.value, ...formData.value })
      showNotify(t('common.success'), 'positive')
      closeDialog()
      refresh()
    } catch (err) {
      showNotify(t('common.error'), 'negative')
      console.error('Update failed:', err)
    } finally {
      submitting.value = false
    }
  }
}

function confirmDelete(row: Record<string, unknown>) {
  editingRow.value = row
  deleteConfirmVisible.value = true
}

async function handleDelete() {
  if (!props.deleteItem || !editingRow.value) return

  try {
    deleting.value = true
    await props.deleteItem(editingRow.value)
    emit('deleted', editingRow.value)
    showNotify(t('common.success'), 'positive')
    deleteConfirmVisible.value = false
    editingRow.value = null
    refresh()
  } catch (err) {
    showNotify(t('common.error'), 'negative')
    console.error('Delete failed:', err)
  } finally {
    deleting.value = false
  }
}

function showNotify(message: string, type: 'positive' | 'negative') {
  import('quasar').then(({ Notify }) => {
    Notify.create({
      type,
      message,
      position: 'top',
    })
  })
}

defineExpose({ refresh })
</script>
