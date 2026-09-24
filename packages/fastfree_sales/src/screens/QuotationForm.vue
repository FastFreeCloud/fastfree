<template>
  <BaseFormPage
    :title="isNew ? t('sales.newQuotation') : t('sales.editQuotation')"
    :subtitle="isNew ? '' : `Quotation: ${form.name}`"
    :saving="saving"
    :loading="loading"
    :docstatus="docstatus"
    :canEdit="canEdit"
    :canSubmit="canSubmit"
    :canCancel="canCancel"
    :canDelete="canDelete"
    :breadcrumb-items="breadcrumbItems"
    @save="handleSave"
    @submit="handleSubmit"
    @cancel="handleCancel"
    @delete="handleDelete"
    @back="closeWindow"
  >
    <template #default>
      <q-form id="main-form" @submit.prevent="handleSave" class="q-gutter-md">
        <BaseFormFields
          v-model="form"
          :fields="fields"
          :loading-options="loadingOptions"
          :readonly="!canEdit"
          @field-change="onFieldChange"
        />
        <BaseFormTotals
          v-if="form.items && form.items.length > 0"
          :items="form.items"
          :tax-rate="0.15"
          currency="EGP"
        />
      </q-form>
    </template>
  </BaseFormPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDesktopStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useDesktopStore'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useBaseForm } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useBaseForm'
import {
  BaseFormPage,
  BaseFormFields,
  BaseFormTotals,
} from 'quasar-app-extension-fastfree-lowcode/src/runtime/components'
import type { FieldSchema } from 'quasar-app-extension-fastfree-lowcode/src/runtime/components'
import { useSalesStore } from '../stores/useSalesStore'
import {
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  submitQuotation,
  cancelQuotation,
  getCompanies,
} from '../services/quotation.service'
import type { Quotation, QuotationItem } from '../types'

const { t } = useLcI18n()
const desktop = useDesktopStore()
const salesStore = useSalesStore()

const props = defineProps<{
  docId?: string
}>()

const isNew = computed(() => !props.docId)

const breadcrumbItems = computed(() => [
  { label: t('sales.sales'), to: '/sales' },
  { label: t('sales.quotations'), to: '/sales/quotation' },
  { label: isNew.value ? t('common.new') : t('common.edit') },
])

const fields: FieldSchema[] = [
  {
    name: 'party_name',
    label: 'sales.customer',
    type: 'select' as const,
    required: true,
    options: () =>
      Promise.resolve(
        salesStore.customers.map((c) => ({
          label: c.customer_name || c.name,
          value: c.name,
        })),
      ),
    col: 12,
  },
  {
    name: 'transaction_date',
    label: 'sales.date',
    type: 'date' as const,
    required: true,
    default: () => new Date().toISOString().split('T')[0],
    col: 6,
  },
  {
    name: 'valid_till',
    label: 'sales.validTill',
    type: 'date' as const,
    required: true,
    default: () => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    col: 6,
  },
  {
    name: 'company',
    label: 'sales.company',
    type: 'select' as const,
    required: true,
    options: async () => {
      const companies = await getCompanies()
      return companies.map((c) => ({ label: c, value: c }))
    },
    col: 12,
  },
  {
    name: 'items',
    label: 'sales.items',
    type: 'table' as const,
    required: true,
    tableAddLabel: 'sales.addItem',
    tableFields: [
      {
        name: 'item_code',
        label: 'sales.itemCode',
        type: 'text' as const,
        required: true,
        col: 4,
      },
      {
        name: 'item_name',
        label: 'sales.itemName',
        type: 'text' as const,
        col: 4,
      },
      {
        name: 'qty',
        label: 'sales.qty',
        type: 'number' as const,
        required: true,
        default: 1,
        min: 1,
        col: 2,
      },
      {
        name: 'rate',
        label: 'sales.rate',
        type: 'number' as const,
        required: true,
        default: 0,
        min: 0,
        col: 2,
      },
      {
        name: 'amount',
        label: 'sales.amount',
        type: 'computed' as const,
        computedFormula: 'qty * rate',
        col: 2,
      },
    ],
  },
]

const {
  form,
  loading,
  saving,
  error,
  docstatus,
  canEdit,
  canSubmit,
  canCancel,
  canDelete,
  load,
  save,
  submit,
  cancel,
  delete: del,
} = useBaseForm<Quotation>({
  service: {
    get: getQuotation,
    create: createQuotation,
    update: updateQuotation,
    delete: deleteQuotation,
    submit: submitQuotation,
    cancel: cancelQuotation,
  },
  fields,
  itemTitle: 'quotation',
  namespace: 'sales',
  permissions: { create: true, edit: true, delete: true, submit: true, cancel: true },
})

const loadingOptions = ref(false)

function onFieldChange(): void {
  // No autocomplete for items - using text input
}

function closeWindow() {
  const winId = desktop.sortedWindows.find((w) => w.screenType === 'sales-quotation-form')?.id
  if (winId) {
    desktop.closeWindow(winId)
  }
}

function stripRowIds(): void {
  const items = form.value.items
  if (items) {
    form.value.items = items.map((row) => {
      const { __rowId: _ignored, ...rest } = row as QuotationItem & { __rowId?: unknown }
      void _ignored
      return rest
    })
  }
}

async function handleSave() {
  try {
    stripRowIds()
    await save()
  } catch {
    /* notified inside useBaseForm */
  }
  if (!error.value) {
    await salesStore.fetchQuotations()
    closeWindow()
  }
}

async function handleSubmit() {
  try {
    stripRowIds()
    if (isNew.value) {
      await save()
    }
    await submit()
  } catch {
    /* notified inside useBaseForm */
  }
  if (!error.value) {
    await salesStore.fetchQuotations()
    closeWindow()
  }
}

async function handleCancel() {
  try {
    await cancel()
  } catch {
    /* notified inside useBaseForm */
  }
  if (!error.value) {
    await salesStore.fetchQuotations()
    closeWindow()
  }
}

async function handleDelete() {
  try {
    await del()
  } catch {
    /* notified inside useBaseForm */
  }
  if (!error.value) {
    await salesStore.fetchQuotations()
    closeWindow()
  }
}

onMounted(async () => {
  loadingOptions.value = true
  try {
    await salesStore.fetchCustomers()
    const companies = await getCompanies()
    const firstCompany = companies[0]
    if (companies.length === 1 && firstCompany && !form.value.company) {
      form.value.company = firstCompany
    }
  } finally {
    loadingOptions.value = false
  }
  if (!isNew.value && props.docId) {
    await load(props.docId)
  }
})

watch(
  () => props.docId,
  async (newDocId) => {
    if (newDocId) {
      await load(newDocId)
    }
  },
)
</script>
