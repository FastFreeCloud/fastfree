<template>
  <q-page class="q-pa-md">
    <template v-if="breadcrumbItems && breadcrumbItems.length > 0">
      <q-breadcrumbs class="q-mb-md" separator="/">
        <q-breadcrumb v-for="(item, idx) in breadcrumbItems" :key="idx" :label="item.label" :to="item.to" />
      </q-breadcrumbs>
    </template>

    <q-card flat bordered class="w-full">
      <q-card-section class="row items-center q-gutter-sm q-mb-md">
        <q-icon v-if="icon" :name="icon" size="2rem" color="primary" aria-hidden="true" />
        <span class="text-h6">{{ t(title) }}</span>
        <q-space />

        <template v-if="showToolbar !== false">
          <template #default>
            <slot name="toolbar">
              <template v-if="showExport !== false || showPrint !== false || addRoute">
                <q-btn
                  v-if="showExport !== false"
                  flat
                  round
                  dense
                  icon="mdi-file-export"
                  :aria-label="t('common.export')"
                  @click="exportData"
                />
                <q-btn
                  v-if="showPrint !== false"
                  flat
                  round
                  dense
                  icon="mdi-printer"
                  :aria-label="t('common.print')"
                  @click="printData"
                />
                <q-btn
                  v-if="addRoute"
                  color="primary"
                  :icon="addIcon"
                  :label="addLabel ? t(addLabel) : t('common.add')"
                  no-caps
                  @click="navigateToAdd"
                />
              </template>
            </slot>
          </template>
        </template>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-table
          :rows="listReturn.filteredRows"
          :columns="computedColumns"
          :row-key="rowKey"
          :loading="props.store.loading"
          :pagination="listReturn.pagination"
          @request="listReturn.onRequest"
          :filter="listReturn.search"
          flat
          wrap-cells
          :selection="selectionMode"
          :selected-rows="listReturn.selectedRows"
        >
          <template #top-right>
            <q-input
              v-model="listReturn.search"
              :placeholder="t('common.search')"
              dense
              outlined
              clearable
              class="w-64"
              aria-label="search"
            >
              <template #prepend>
                <q-icon name="mdi-magnify" aria-hidden="true" />
              </template>
            </q-input>
          </template>

          <template v-for="col in props.columns" #[`body-cell-${col.name}`]="props">
            <q-td :props="props">
              <slot :name="`body-cell-${col.name}`" :props="props">
                <template v-if="col.format">
                  {{ col.format(getNestedValue(props.row, col.field as string), props.row) }}
                </template>
                <template v-else-if="col.statusField && getNestedValue(props.row, col.statusField as string) !== undefined">
                  <q-badge
                    :color="listReturn.statusColor(String(getNestedValue(props.row, col.statusField as string)))"
                    :label="listReturn.translateStatus(String(getNestedValue(props.row, col.statusField as string)))"
                  />
                </template>
                <template v-else>
                  {{ getNestedValue(props.row, col.field as string) ?? '' }}
                </template>
              </slot>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="q-pr-md">
              <template v-if="hasActions(props.row)">
                <q-btn
                  v-for="action in getVisibleActions(props.row)"
                  :key="action.label"
                  flat
                  round
                  size="sm"
                  :icon="action.icon"
                  :color="action.color || 'primary'"
                  :aria-label="action.label"
                  :disable="action.disable?.(props.row) ?? false"
                  @click="action.handler(props.row)"
                />
              </template>
              <template v-else>
                <q-icon name="mdi-help-circle" color="grey-5" size="sm" class="q-ma-sm" />
              </template>
            </q-td>
          </template>

          <template #no-data>
            <EmptyState
              :icon="props.emptyIcon"
              :title="t('common.noData')"
              :subtitle="t('common.noDataSubtitle')"
              :action-label="addRoute ? t(addLabel || 'common.add') : undefined"
              @action="addRoute && navigateToAdd"
            />
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <slot />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import { useBaseList, type ColumnDef, type RowAction, type BaseListStore } from '../composables/useBaseList'
import { useNotify } from '../composables/useNotify'
import { useConfirmDialog } from '../composables/useConfirmDialog'
import EmptyState from './EmptyState.vue'
// Column type from Quasar - define locally to avoid import issues
interface QColumn {
  name: string
  label: string
  field?: string | ((row: Record<string, unknown>) => unknown)
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: (value: unknown, row: Record<string, unknown>) => string
  style?: string
  classes?: string
  headerStyle?: string
  headerClasses?: string
}

interface Props {
  title: string
  icon?: string
  columns: ColumnDef<Record<string, unknown>>[]
  namespace: string
  searchFields: string[]
  rowKey?: string
  store: BaseListStore<Record<string, unknown>>
  actions?: RowAction<Record<string, unknown>>[]
  defaultSort?: { field: string; order: 'asc' | 'desc' }
  selection?: 'single' | 'multiple' | 'none'
  showToolbar?: boolean
  showExport?: boolean
  showPrint?: boolean
  addRoute?: string
  addLabel?: string
  addIcon?: string
  breadcrumbItems?: { label: string; to?: string }[]
  emptyIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'name',
  selection: 'none',
  showToolbar: true,
  showExport: true,
  showPrint: true,
  addIcon: 'mdi-plus',
  emptyIcon: 'mdi-database-outline',
})

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>]
  rowAction: [action: string, row: Record<string, unknown>]
  load: []
  submit: [row: Record<string, unknown>]
  cancel: [row: Record<string, unknown>]
  delete: [row: Record<string, unknown>]
  add: []
}>()

const { t } = useLcI18n()
const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const { saved, deleted, error: notifyError } = useNotify()
const { confirmDelete } = useConfirmDialog()

const listReturn = useBaseList<Record<string, unknown>>({
  store: props.store,
  columns: props.columns,
  namespace: props.namespace,
  searchFields: props.searchFields as (keyof Record<string, unknown>)[],
  rowKey: props.rowKey,
  defaultSort: props.defaultSort ?? { field: 'name', order: 'asc' },
  actions: props.actions ?? [],
  selection: props.selection,
})

const computedColumns = computed<QColumn[]>(() => [
  ...props.columns.map((col) => ({
    ...col,
    align: col.align ?? 'left',
    sortable: col.sortable ?? false,
  } as QColumn)),
  {
    name: 'actions',
    label: t('common.actions'),
    field: 'actions',
    align: 'right',
    sortable: false,
  },
])

const selectionMode = computed(() => {
  if (props.selection === 'multiple') return 'multiple'
  if (props.selection === 'single') return 'single'
  return false
})

const confirmDeleteDialog = ref(false)
const deleteTarget = ref<Record<string, unknown> | null>(null)

const hasDefaultDocstatusActions = computed(() => {
  if (props.actions && props.actions.length > 0) return false
  const sampleRow = props.store.items.value[0]
  if (!sampleRow) return false
  return 'docstatus' in sampleRow
})

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function hasActions(row: Record<string, unknown>): boolean {
  if (props.actions && props.actions.length > 0) {
    return props.actions.some((a) => a.visible?.(row) ?? true)
  }
  if (hasDefaultDocstatusActions.value) {
    const docstatus = row.docstatus
    return docstatus === 0 || docstatus === 1 || docstatus === 2
  }
  return false
}

function getVisibleActions(row: Record<string, unknown>): RowAction<Record<string, unknown>>[] {
  if (props.actions && props.actions.length > 0) {
    return props.actions.filter((a) => a.visible?.(row) ?? true)
  }

  const docstatus = row.docstatus as number | undefined
  const actions: RowAction<Record<string, unknown>>[] = []

  if (docstatus === 0) {
    actions.push(
      {
        label: t('common.submit'),
        icon: 'mdi-check',
        color: 'positive',
        handler: (r) => handleDefaultAction('submit', r),
      },
      {
        label: t('common.delete'),
        icon: 'mdi-delete',
        color: 'negative',
        handler: (r) => handleDefaultAction('delete', r),
      }
    )
  } else if (docstatus === 1) {
    actions.push({
      label: t('common.cancel'),
      icon: 'mdi-close',
      color: 'negative',
      handler: (r) => handleDefaultAction('cancel', r),
    })
  }

  return actions
}

function handleDefaultAction(action: 'submit' | 'cancel' | 'delete', row: Record<string, unknown>): void {
  if (action === 'delete') {
    deleteTarget.value = row
    confirmDeleteDialog.value = true
    return
  }
  emit(action, row)
}

async function executeDelete(): Promise<void> {
  if (!deleteTarget.value) return
  const name = deleteTarget.value.name as string
  const confirmed = await confirmDelete(name)
  if (!confirmed) return
  confirmDeleteDialog.value = false
  emit('delete', deleteTarget.value)
}

async function exportData(): Promise<void> {
  try {
    const { useExcelExport } = await import('../composables/useExcelExport')
    const { exportToExcel } = useExcelExport()
    const columns = props.columns.map((c) => ({ label: c.label, field: c.name }))
    await exportToExcel({
      data: listReturn.filteredRows.value,
      columns,
      filename: `${props.namespace}_${new Date().toISOString().split('T')[0]}`,
      company: { name: t('common.companyName') },
    })
    saved(t('common.exported'))
  } catch {
    notifyError(t('common.exportFailed'))
  }
}

async function printData(): Promise<void> {
  try {
    const { usePrint } = await import('../composables/usePrint')
    const { printTable } = usePrint()
    const columns = props.columns.map((c) => ({ label: c.label, field: c.name }))
    await printTable({
      data: listReturn.filteredRows.value,
      columns,
      title: t(props.title),
      company: { name: t('common.companyName') },
    })
  } catch {
    notifyError(t('common.printFailed'))
  }
}

function navigateToAdd(): void {
  emit('add')
  if (props.addRoute) {
    router.push(props.addRoute)
  }
}

async function loadData(): Promise<void> {
  try {
    await props.store.fetchItems()
    if (props.store.error) {
      notifyError(props.store.error)
    }
  } catch {
    notifyError(t('common.error'))
  }
}

onMounted(() => {
  void loadData()
  emit('load')
})

watch(
  () => route.fullPath,
  () => {
    void loadData()
  }
)
</script>