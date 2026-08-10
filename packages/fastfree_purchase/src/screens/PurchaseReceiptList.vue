<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-package-down" size="2rem" color="primary" />
        <span class="text-h6">{{ t('purchase.purchaseReceipts') }}</span>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="receipts"
          :columns="columns"
          row-key="name"
          :loading="loading"
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
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-check" size="sm" color="positive" :aria-label="t('common.submit')" @click="submitReceipt(props.row)" />
              <q-btn v-if="props.row.status === 'Submitted'" flat round icon="mdi-close" size="sm" color="negative" :aria-label="t('common.cancel')" @click="cancelReceipt(props.row)" />
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteReceipt(props.row)" />
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
        <q-card-section>{{ t('purchase.submitReceiptConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="positive" :label="t('common.submit')" @click="confirmSubmitReceipt" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmCancel">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-close-circle" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.cancel') }}</span>
        </q-card-section>
        <q-card-section>{{ t('purchase.cancelReceiptConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.cancel')" @click="confirmCancelReceipt" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('common.confirmDelete') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteReceipt" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber'
import { useStatusHelpers } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers'
import {
  getPurchaseReceipts,
  submitPurchaseReceipt as apiSubmitPurchaseReceipt,
  cancelPurchaseReceipt as apiCancelPurchaseReceipt,
  deletePurchaseReceipt as apiDeletePurchaseReceipt,
} from '../services'
import type { PurchaseReceipt } from '../types'

const { t } = useLcI18n()
const { formatNumber } = useFormatNumber()
const { translateStatus, statusColor } = useStatusHelpers('purchase')
const $q = useQuasar()

const receipts = ref<PurchaseReceipt[]>([])
const loading = ref(false)
const search = ref('')
const confirmSubmit = ref(false)
const submitTarget = ref('')
const confirmCancel = ref(false)
const cancelTarget = ref('')
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'name', label: t('common.name'), field: 'name', sortable: true },
  { name: 'supplier', label: t('purchase.supplier'), field: 'supplier', sortable: true },
  { name: 'posting_date', label: t('purchase.postingDate'), field: 'postingDate', sortable: true },
  { name: 'grand_total', label: t('purchase.total'), field: 'total', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

async function fetchReceipts() {
  loading.value = true
  try {
    const result = await getPurchaseReceipts()
    if (result.success && result.data) {
      receipts.value = result.data
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    loading.value = false
  }
}

function submitReceipt(receipt: PurchaseReceipt) {
  submitTarget.value = receipt.name
  confirmSubmit.value = true
}

async function confirmSubmitReceipt() {
  const name = submitTarget.value
  confirmSubmit.value = false
  try {
    await apiSubmitPurchaseReceipt(name)
    $q.notify({ type: 'positive', message: t('purchase.receiptSubmitted') })
    await fetchReceipts()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function cancelReceipt(receipt: PurchaseReceipt) {
  cancelTarget.value = receipt.name
  confirmCancel.value = true
}

async function confirmCancelReceipt() {
  const name = cancelTarget.value
  confirmCancel.value = false
  try {
    await apiCancelPurchaseReceipt(name)
    $q.notify({ type: 'positive', message: t('purchase.receiptCancelled') })
    await fetchReceipts()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function deleteReceipt(receipt: PurchaseReceipt) {
  deleteTarget.value = receipt.name
  confirmDelete.value = true
}

async function confirmDeleteReceipt() {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    await apiDeletePurchaseReceipt(name)
    $q.notify({ type: 'positive', message: t('common.delete') })
    await fetchReceipts()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(fetchReceipts)
</script>
