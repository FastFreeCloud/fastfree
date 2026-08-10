<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-file-document" size="2rem" color="primary" />
        <span class="text-h6">{{ t('sales.quotations') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('sales.addQuotation')" no-caps @click="showForm = true" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.quotations"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          :filter="search"
          flat
        >
          <template #top-right>
            <q-input v-model="search" :placeholder="t('common.search')" dense outlined clearable style="width: 200px">
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.row.status)" :label="translateStatus(props.row.status)" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-check" size="sm" color="positive" :aria-label="t('common.submit')" @click="submitQuotation(props.row)" />
              <q-btn v-if="props.row.status === 'Submitted'" flat round icon="mdi-close" size="sm" color="negative" :aria-label="t('common.cancel')" @click="cancelQuotation(props.row)" />
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteQuotation(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="confirmSubmit">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-check-circle" color="positive" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.submit') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.submitQuotationConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="positive" :label="t('common.submit')" @click="confirmSubmitQuotation" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmCancel">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-close-circle" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.cancel') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.cancelQuotationConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.confirm')" @click="confirmCancelQuotation" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.deleteQuotationConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteQuotation" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useFormatNumber, useStatusHelpers } from 'quasar-app-extension-fastfree-lowcode/src/runtime'
import { useSalesStore } from '../stores/useSalesStore'
import { submitQuotation as apiSubmitQuotation, cancelQuotation as apiCancelQuotation, deleteQuotation as apiDeleteQuotation } from '../services/quotation.service'
import type { Quotation } from '../types'

const { t } = useLcI18n()
const store = useSalesStore()
const $q = useQuasar()
const { formatNumber } = useFormatNumber()
const { translateStatus, statusColor } = useStatusHelpers('sales')

const search = ref('')
const showForm = ref(false)
const confirmSubmit = ref(false)
const submitTarget = ref('')
const confirmCancel = ref(false)
const cancelTarget = ref('')
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'name', label: t('sales.quotation'), field: 'name', sortable: true },
  { name: 'customer_name', label: t('sales.customerName'), field: 'customer_name', sortable: true },
  { name: 'transaction_date', label: t('common.date'), field: 'transaction_date', sortable: true },
  { name: 'valid_till', label: t('sales.validTill'), field: 'valid_till', sortable: true },
  { name: 'grand_total', label: t('sales.grandTotal'), field: 'grand_total', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function submitQuotation(quotation: Quotation) {
  submitTarget.value = quotation.name
  confirmSubmit.value = true
}

async function confirmSubmitQuotation() {
  const name = submitTarget.value
  confirmSubmit.value = false
  try {
    await apiSubmitQuotation(name)
    $q.notify({ type: 'positive', message: t('sales.quotationSubmitted') })
    await store.fetchQuotations()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function cancelQuotation(quotation: Quotation) {
  cancelTarget.value = quotation.name
  confirmCancel.value = true
}

async function confirmCancelQuotation() {
  const name = cancelTarget.value
  confirmCancel.value = false
  try {
    await apiCancelQuotation(name)
    $q.notify({ type: 'positive', message: t('sales.quotationCancelled') })
    await store.fetchQuotations()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function deleteQuotation(quotation: Quotation) {
  deleteTarget.value = quotation.name
  confirmDelete.value = true
}

async function confirmDeleteQuotation() {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    await apiDeleteQuotation(name)
    $q.notify({ type: 'positive', message: t('sales.quotationDeleted') })
    await store.fetchQuotations()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => store.fetchQuotations())
</script>
