<template>
  <div class="base-form-fields">
    <!-- A consumer that owns submission passes :standalone-form="false" so its own
         q-form is the only form and validate() sees every registered input -->
    <component
      :is="standaloneForm ? QForm : 'div'"
      v-if="fields.length > 0"
      class="q-gutter-md"
    >
      <div
        v-for="field in fields"
        :key="field.name"
        :class="`col-${field.col || 12}`"
        class="q-col-gutter-md row"
      >
        <!-- Text / Textarea / Number / Date / Datetime -->
        <q-input
          v-if="['text', 'textarea', 'number', 'date', 'datetime'].includes(field.type)"
          :model-value="getModelValue(field.name) as string | number | null | undefined"
          @update:model-value="(val: unknown) => updateField(field, val)"
          :label="t(field.label)"
          :type="getInputType(field.type)"
          :outlined="true"
          dense
          :disable="field.readonly || props.readonly"
          :rules="getRules(field)"
          :lazy-rules="true"
          :min="field.min"
          :max="field.max"
          :mask="getInputMask(field.type)"
        >
          <template v-if="field.type === 'date' || field.type === 'datetime'" #append>
            <q-icon :name="field.type === 'date' ? 'event' : 'access_time'" class="cursor-pointer">
              <q-popup-proxy>
                <component
                  :is="field.type === 'date' ? QDate : QDate"
                  :model-value="getModelValue(field.name)"
                  @update:model-value="(val: unknown) => updateField(field, val)"
                  :mask="field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'"
                />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>

        <!-- Select -->
        <q-select
          v-else-if="field.type === 'select'"
          :model-value="getModelValue(field.name)"
          @update:model-value="(val: unknown) => updateField(field, val)"
          :label="t(field.label)"
          :options="getSelectOptions(field)"
          emit-value
          map-options
          outlined
          dense
          :disable="field.readonly || readonly"
          :rules="getRules(field)"
          :lazy-rules="true"
          :loading="loadingOptions || selectLoading[field.name] || false"
          option-value="value"
          option-label="label"
        />

        <!-- Autocomplete -->
        <q-select
          v-else-if="field.type === 'autocomplete'"
          :model-value="getModelValue(field.name)"
          @update:model-value="(val: unknown) => updateField(field, val)"
          @filter="onAutocompleteFilter(field)"
          :label="t(field.label)"
          :options="getAutocompleteOptions(field)"
          :use-input="true"
          :emit-value="true"
          :map-options="true"
          outlined
          dense
          :disable="field.readonly || readonly"
          :rules="getRules(field)"
          :lazy-rules="true"
          :loading="autocompleteLoading[field.name] || false"
          option-value="value"
          option-label="label"
          :debounce="field.debounce || 300"
          @new-value="onAutocompleteNewValue(field, $event)"
        >
          <template v-if="field.getLabel" #option="scope">
            <span>{{ field.getLabel(scope.opt) }}</span>
          </template>
          <template v-if="field.getLabel" #no-option>
            <q-item>
              <q-item-section>{{ t('common.noResults') }}</q-item-section>
            </q-item>
          </template>
        </q-select>

        <!-- Checkbox -->
        <q-checkbox
          v-else-if="field.type === 'checkbox'"
          :model-value="getModelValue(field.name)"
          @update:model-value="(val: unknown) => updateField(field, val)"
          :label="t(field.label)"
          :disable="field.readonly || readonly"
        />

        <!-- Toggle -->
        <q-toggle
          v-else-if="field.type === 'toggle'"
          :model-value="getModelValue(field.name)"
          @update:model-value="(val: unknown) => updateField(field, val)"
          :label="t(field.label)"
          :disable="field.readonly || readonly"
        />

        <!-- Computed (read-only display) -->
        <q-input
          v-else-if="field.type === 'computed'"
          :model-value="computeValue(field)"
          :label="t(field.label)"
          outlined
          dense
          readonly
          disable
          class="text-weight-bold"
        >
          <template #prepend v-if="field.computedFormula">
            <q-icon name="calculate" color="primary" class="q-mr-sm" />
          </template>
        </q-input>

        <!-- Table (child table with inline editing) -->
        <div v-else-if="field.type === 'table'" class="q-mt-md">
          <div class="row items-center q-mb-sm">
            <span class="text-h6">{{ t(field.label) }}</span>
            <q-space />
            <q-btn
              v-if="!field.readonly && !props.readonly"
              color="primary"
              dense
              icon="mdi-plus"
              size="sm"
              @click="addTableRow(field)"
              :label="t(field.tableAddLabel || 'common.addRow')"
              :aria-label="t(field.tableAddLabel || 'common.addRow')"
            />
          </div>
          <!-- The row set itself is not an input, so register its rules with the
               surrounding form through a hidden field to keep required live -->
          <q-field
            v-if="field.required"
            :model-value="modelValue[field.name]"
            :rules="getRules(field)"
            :lazy-rules="true"
            class="hidden"
            aria-hidden="true"
          />
          <q-table
            :rows="getTableRows(field)"
            :columns="getTableColumns(field)"
            :loading="false"
            :no-data-label="t('common.noData')"
            flat
            dense
            bordered
            separator="cell"
            row-key="__rowId"
            :pagination="getTablePagination(field)"
            class="lc-data-table"
          >
            <template #body-cell-action="cellProps">
              <q-td :props="cellProps">
                <q-btn
                  v-if="!field.readonly && !isReadonly"
                  flat
                  round
                  dense
                  size="sm"
                  icon="mdi-delete"
                  color="negative"
                  @click="removeTableRow(field, cellProps.row.__rowId)"
                  :aria-label="t('common.delete')"
                >
                  <q-tooltip>{{ t('common.delete') }}</q-tooltip>
                </q-btn>
              </q-td>
            </template>
            <template v-for="col in field.tableFields" :key="col.name" #[`body-cell-${col.name}`]="cellProps">
              <q-td :props="cellProps" :class="getTableCellAlign(col)">
                {{ formatTableCellValue(cellProps.row[col.name], col, cellProps.row, field) }}
<q-popup-edit
                  v-if="!col.readonly && !field.readonly && !isReadonly && col.type !== 'computed'"
                  :model-value="cellProps.row[col.name]"
                  @update:model-value="(val: unknown) => updateTableCell(field, cellProps.row.__rowId, col.name, val)"
                  buttons
                  :label-set="t('common.save')"
                  :label-cancel="t('common.cancel')"
                  v-slot="scope"
                >
                  <component
                    :is="getTableEditorComponent(col.type)"
                    :model-value="scope.value"
                    @update:model-value="(val: unknown) => { scope.value = val }"
                    @keyup.enter="scope.set"
                    :label="t(col.label)"
                    :type="getInputType(col.type)"
                    :rules="getTableCellRules(col)"
                    :lazy-rules="true"
                    outlined
                    dense
                    :options="getSelectOptions(col, field)"
                    emit-value
                    map-options
                    option-value="value"
                    option-label="label"
                    :mask="col.type === 'date' ? '####-##-##' : undefined"
                    :min="col.min"
                    :max="col.max"
                    autofocus
                  />
                </q-popup-edit>
              </q-td>
            </template>
            <template #bottom>
              <div class="row items-center q-pa-sm">
                <span class="text-caption text-grey">
                  {{ t('common.total') }}: {{ getTableRows(field).length }} {{ t('common.rows') }}
                </span>
              </div>
            </template>
          </q-table>
        </div>
      </div>
    </component>
    <div v-else class="text-center text-grey q-pa-lg">
      <q-icon name="inbox" size="40px" class="q-mb-sm" />
      <p>{{ t('common.noData') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUpdated, type PropType } from 'vue'
import { useQuasar, QForm, QInput, QSelect, QDate } from 'quasar'
import { useLcI18n } from '../i18n'
import { useFormatNumber } from '../composables/useFormatNumber'
import { resolveFieldDefault } from '../composables/useBaseForm'

// Type augmentation for QPopupEdit slots
declare module 'quasar' {
  interface QPopupEditSlots {
    display: []
    editor: []
  }
}

// ============ Types ============

export interface SelectOption {
  label: string
  value: unknown
}

export interface FieldSchema {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'autocomplete' | 'checkbox' | 'toggle' | 'table' | 'computed'
  required?: boolean
  default?: unknown
  options?: SelectOption[] | (() => SelectOption[] | Promise<SelectOption[]>)
  getLabel?: (item: { label: string; value: unknown }) => string
  getValue?: (item: { label: string; value: unknown }) => unknown
  debounce?: number
  min?: number
  max?: number
  readonly?: boolean
  computedFormula?: string
  tableFields?: FieldSchema[]
  tableAddLabel?: string
  col?: number
}

export interface TableRow {
  __rowId: string
  [key: string]: unknown
}

export interface TablePagination {
  page: number
  rowsPerPage: number
  rowsNumber: number
  sortBy: string
  descending: boolean
}

type InputType = 'text' | 'textarea' | 'number' | 'date' | 'datetime-local' | 'email' | 'file' | 'password' | 'tel' | 'url' | 'search'

// ============ Props & Emits ============

const props = withDefaults(defineProps<{
  fields: FieldSchema[]
  modelValue: Record<string, unknown>
  loadingOptions?: boolean
  readonly?: boolean
  standaloneForm?: boolean
}>(), {
  fields: () => [] as FieldSchema[],
  modelValue: () => ({}) as Record<string, unknown>,
  loadingOptions: false,
  readonly: false,
  standaloneForm: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'field-change': [field: string, value: unknown]
}>()

// ============ Composables ============

const { t } = useLcI18n()
const $q = useQuasar()
const { formatNumber } = useFormatNumber()

// ============ Reactive State ============

const autocompleteLoading = ref<Record<string, boolean>>({})
const autocompleteCache = ref<Record<string, SelectOption[]>>({})
const selectCache = ref<Record<string, SelectOption[]>>({})
const selectLoading = ref<Record<string, boolean>>({})
const tableRowCounters = ref<Record<string, number>>({})
const tablePaginationState = ref<Record<string, TablePagination>>({})

const MAX_SELECT_UPDATE_RETRIES = 3

const pendingSelectKeys = new Set<string>()
const settledSelectKeys = new Set<string>()
const selectUpdateRetries: Record<string, number> = {}
const rowIdRegistry = new WeakMap<TableRow, string>()

// ============ Computed ============

function getModelValue(fieldName: string): unknown {
  return props.modelValue?.[fieldName] ?? getDefaultValue(getFieldSchema(fieldName))
}

function getFieldSchema(fieldName: string): FieldSchema | undefined {
  return props.fields.find(f => f.name === fieldName)
}

function getDefaultValue(field?: FieldSchema): unknown {
  if (!field) return undefined
  if (field.default !== undefined) return resolveFieldDefault(field)
  switch (field.type) {
    case 'number': return 0
    case 'checkbox':
    case 'toggle': return false
    case 'select':
    case 'autocomplete': return null
    case 'table': return []
    default: return ''
  }
}

function selectCacheKey(field: FieldSchema, parent?: FieldSchema): string {
  return parent ? `${parent.name}.${field.name}` : field.name
}

function resolveSelectOptions(field: FieldSchema, parent?: FieldSchema, force = false): void {
  if (typeof field.options !== 'function') return
  const key = selectCacheKey(field, parent)
  if (pendingSelectKeys.has(key)) return
  if (!force && settledSelectKeys.has(key)) return
  if (!force && (selectCache.value[key]?.length ?? 0) > 0) return

  let provided: SelectOption[] | Promise<SelectOption[]>
  try {
    provided = field.options()
  } catch {
    settledSelectKeys.add(key)
    return
  }

  pendingSelectKeys.add(key)
  selectLoading.value[key] = true
  Promise.resolve(provided)
    .then((options) => {
      if (Array.isArray(options) && options.length > 0) {
        selectCache.value[key] = options
        return
      }
      if ((selectCache.value[key]?.length ?? 0) > 0) selectCache.value[key] = []
    })
    .catch(() => undefined)
    .finally(() => {
      selectLoading.value[key] = false
      pendingSelectKeys.delete(key)
      settledSelectKeys.add(key)
    })
}

function preloadSelectOptions(force = false): void {
  for (const field of props.fields) {
    if (field.type !== 'select') continue
    resolveSelectOptions(field, undefined, force)
  }
}

function getSelectOptions(field: FieldSchema, parent?: FieldSchema): SelectOption[] {
  if (!field.options) return []
  if (typeof field.options !== 'function') return field.options
  const key = selectCacheKey(field, parent)
  const cached = selectCache.value[key]
  if (!cached) resolveSelectOptions(field, parent)
  return cached ?? []
}

function getAutocompleteOptions(field: FieldSchema): { label: string; value: unknown }[] {
  if (!field.options || typeof field.options !== 'function') return []
  return autocompleteCache.value[field.name] || []
}

function getRowId(field: FieldSchema, row: TableRow, index: number): string {
  if (row.__rowId) return row.__rowId
  const registered = rowIdRegistry.get(row)
  if (registered) return registered
  const rowId = `${field.name}-${index}-${Date.now()}`
  rowIdRegistry.set(row, rowId)
  return rowId
}

function getTableRows(field: FieldSchema): TableRow[] {
  const rows = (props.modelValue?.[field.name] as TableRow[]) || []
  return rows.map((row, index): TableRow => ({
    ...row,
    __rowId: getRowId(field, row, index),
  }))
}

function getTableColumns(field: FieldSchema) {
  const cols = field.tableFields?.map(f => ({
    name: f.name,
    label: t(f.label),
    field: f.name,
    align: (f.type === 'number' || f.type === 'computed' ? 'right' : 'left') as 'left' | 'center' | 'right',
    sortable: false,
  })) || []
  if (!field.readonly && !props.readonly) {
    cols.push({ name: 'action', label: '', field: 'action', align: 'center' as const, sortable: false })
  }
  return cols
}

function getTablePagination(field: FieldSchema): TablePagination {
  const key = field.name
  if (!tablePaginationState.value[key]) {
    tablePaginationState.value[key] = {
      page: 1,
      rowsPerPage: 10,
      rowsNumber: 0,
      sortBy: '',
      descending: false,
    }
  }
  return tablePaginationState.value[key]
}

function getInputType(type: FieldSchema['type']): InputType {
  switch (type) {
    case 'textarea': return 'textarea'
    case 'number': return 'number'
    case 'date': return 'text'
    case 'datetime': return 'text'
    default: return 'text'
  }
}

function getInputMask(type: FieldSchema['type']): string | undefined {
  switch (type) {
    case 'date': return '####-##-##'
    case 'datetime': return '####-##-## ##:##'
    default: return undefined
  }
}

function getTableEditorComponent(type: FieldSchema['type']): typeof QInput | typeof QSelect {
  if (type === 'select' || type === 'autocomplete') return QSelect
  return QInput
}

function getTableCellAlign(field: FieldSchema): string {
  return field.type === 'number' || field.type === 'computed' ? 'text-right' : ''
}

const isReadonly = computed(() => props.readonly)

function formatComputedResult(result: number | string): string {
  if (typeof result === 'number' && !Number.isNaN(result)) return formatNumber(result, 2)
  return String(result ?? '')
}

function computeValue(field: FieldSchema): string {
  if (!field.computedFormula) return ''
  try {
    const model = props.modelValue || {}
    return formatComputedResult(evaluateFormula(field.computedFormula, model))
  } catch {
    return ''
  }
}

function evaluateFormula(formula: string, model: Record<string, unknown>): number | string {
  let expr = formula
  for (const [key, value] of Object.entries(model)) {
    const numValue = typeof value === 'number' ? value : Number(value) || 0
    const regex = new RegExp(`\\b${key}\\b`, 'g')
    expr = expr.replace(regex, String(numValue))
  }
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${expr})`)()
  } catch {
    return 0
  }
}

function formatTableCellValue(value: unknown, field: FieldSchema, row?: Record<string, unknown>, parent?: FieldSchema): string {
  if (field.type === 'computed') {
    if (!field.computedFormula || !row) {
      return value === null || value === undefined || value === '' ? '—' : String(value)
    }
    const result = evaluateFormula(field.computedFormula, row)
    return result === '' ? '—' : formatComputedResult(result)
  }
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'number' && typeof value === 'number') {
    return formatNumber(value, 2)
  }
  if (field.type === 'date' && typeof value === 'string') {
    return value.split('T')[0] ?? ''
  }
  if (field.type === 'datetime' && typeof value === 'string') {
    return value.replace('T', ' ').substring(0, 16)
  }
  if (field.type === 'select' || field.type === 'autocomplete') {
    const options = getSelectOptions(field, parent)
    const opt = options.find(o => o.value === value)
    return opt?.label ?? String(value)
  }
  return String(value)
}

// ============ Methods ============

function getRules(field: FieldSchema): ((val: unknown) => true | string)[] {
  const rules: ((val: unknown) => true | string)[] = []
  if (field.required) {
    rules.push((val) => {
      if (field.type === 'table') {
        return (Array.isArray(val) && val.length > 0) || t('validation.required')
      }
      const isEmpty = val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)
      return !isEmpty || t('validation.required')
    })
  }
  if (field.type === 'number' && (field.min !== undefined || field.max !== undefined)) {
    rules.push((val) => {
      const num = Number(val)
      if (isNaN(num)) return true
      if (field.min !== undefined && num < field.min) return `${t(field.label)} ${t('validation.min', { min: field.min })}`
      if (field.max !== undefined && num > field.max) return `${t(field.label)} ${t('validation.max', { max: field.max })}`
      return true
    })
  }
  return rules
}

function getTableCellRules(col: FieldSchema): ((val: unknown) => true | string)[] {
  return col.type === 'computed' ? [] : getRules(col)
}

function applyComputedColumns(field: FieldSchema, row: TableRow): TableRow {
  let result = row
  for (const col of field.tableFields || []) {
    if (col.type !== 'computed' || !col.computedFormula) continue
    const value = evaluateFormula(col.computedFormula, result)
    if (result[col.name] === value) continue
    if (result === row) result = { ...row }
    result[col.name] = value
  }
  return result
}

function updateField(field: FieldSchema, value: unknown): void {
  const newModel = { ...props.modelValue, [field.name]: value }
  emit('update:modelValue', newModel)
  emit('field-change', field.name, value)
}

function onAutocompleteFilter(field: FieldSchema): (val: string, update: (fn: () => void) => void, abort: () => void) => Promise<void> {
  return async (val: string, update: (fn: () => void) => void, abort: () => void): Promise<void> => {
    if (!field.options || typeof field.options !== 'function') {
      update(() => {
        autocompleteCache.value[field.name] = []
      })
      return
    }

    autocompleteLoading.value[field.name] = true

    try {
      const options = await field.options()
      update(() => {
        autocompleteCache.value[field.name] = options
      })
    } catch {
      abort()
      update(() => {
        autocompleteCache.value[field.name] = []
      })
    } finally {
      autocompleteLoading.value[field.name] = false
    }
  }
}

function onAutocompleteNewValue(field: FieldSchema, val: string): void {
  if (!field.getValue || !field.getLabel) return
  const newOption = { label: val, value: val }
  const options = [...(autocompleteCache.value[field.name] || []), newOption]
  autocompleteCache.value[field.name] = options
  updateField(field, field.getValue(newOption))
}

function addTableRow(field: FieldSchema): void {
  const counter = tableRowCounters.value[field.name] || 0
  tableRowCounters.value[field.name] = counter + 1

  const newRow: TableRow = { __rowId: `${field.name}-${counter}-${Date.now()}` }
  for (const childField of field.tableFields || []) {
    newRow[childField.name] = getDefaultValue(childField)
  }

  const newModel = { ...props.modelValue }
  const rows = (newModel[field.name] as TableRow[]) || []
  newModel[field.name] = [...rows, applyComputedColumns(field, newRow)]
  emit('update:modelValue', newModel)
  emit('field-change', field.name, newModel[field.name])
}

function removeTableRow(field: FieldSchema, rowId: string): void {
  const newModel = { ...props.modelValue }
  const rows = (newModel[field.name] as TableRow[]) || []
  newModel[field.name] = rows.filter(r => r.__rowId !== rowId)
  emit('update:modelValue', newModel)
  emit('field-change', field.name, newModel[field.name])
}

function updateTableCell(field: FieldSchema, rowId: string, cellName: string, value: unknown): void {
  const newModel = { ...props.modelValue }
  const rows = (newModel[field.name] as TableRow[]) || []
  const rowIndex = rows.findIndex(r => r.__rowId === rowId)
  if (rowIndex >= 0) {
    const colDef = field.tableFields?.find(c => c.name === cellName)
    let coerced: unknown = value
    if (colDef?.type === 'number') {
      coerced = value === '' || value === null || value === undefined ? 0 : Number(value)
      if (Number.isNaN(coerced as number)) coerced = 0
    }
    const updatedRows = [...rows] as TableRow[]
    const currentRow = updatedRows[rowIndex]
    if (currentRow) {
      updatedRows[rowIndex] = applyComputedColumns(field, { ...currentRow, [cellName]: coerced })
      newModel[field.name] = updatedRows
      emit('update:modelValue', newModel)
      emit('field-change', field.name, newModel[field.name])
    }
  }
}

function syncTableRows(): void {
  const newModel: Record<string, unknown> = { ...props.modelValue }
  let changed = false
  for (const field of props.fields) {
    if (field.type !== 'table') continue
    const rows = newModel[field.name]
    if (!Array.isArray(rows)) continue
    const source = rows as TableRow[]
    const synced = source.map((row, index): TableRow => {
      const identified: TableRow = row.__rowId
        ? row
        : { ...row, __rowId: getRowId(field, row, index) }
      return applyComputedColumns(field, identified)
    })
    if (synced.some((row, index) => row !== source[index])) {
      newModel[field.name] = synced
      changed = true
    }
  }
  if (changed) emit('update:modelValue', newModel)
}

// Table rows arrive from the model, so re-attach ids and computed values whenever
// it changes, and let any select that is still empty resolve its options again
watch(() => props.modelValue, () => {
  syncTableRows()
  preloadSelectOptions()
}, { deep: true })

watch(() => props.fields, () => {
  syncTableRows()
  preloadSelectOptions(true)
}, { deep: true })

// Consumers signal that their option sources finished loading through this flag
watch(() => props.loadingOptions, (loading) => {
  if (!loading) preloadSelectOptions(true)
})

// Providers that resolved before the data existed leave the cache empty, so retry
// a bounded number of times across the next updates of the component
function retryPendingSelectOptions(): void {
  for (const field of props.fields) {
    if (field.type !== 'select' || typeof field.options !== 'function') continue
    if (pendingSelectKeys.has(field.name)) continue
    if ((selectCache.value[field.name]?.length ?? 0) > 0) continue
    const retries = selectUpdateRetries[field.name] || 0
    if (retries >= MAX_SELECT_UPDATE_RETRIES) continue
    selectUpdateRetries[field.name] = retries + 1
    resolveSelectOptions(field, undefined, true)
  }
}

onUpdated(retryPendingSelectOptions)

// Warm up async option lists on mount so dropdowns open instantly
// (QSelect only renders its menu when options exist or a no-option slot is present)
onMounted(async () => {
  preloadSelectOptions()
  for (const field of props.fields) {
    if (field.type === 'autocomplete' && typeof field.options === 'function') {
      try {
        autocompleteCache.value[field.name] = await field.options()
      } catch {
        // ignore preload errors — the @filter handler retries on user input
      }
    }
  }
})

// ============ Expose ============

defineExpose({
  getModelValue,
  getRules,
  getTableCellRules,
  computeValue,
  syncTableRows,
})
</script>