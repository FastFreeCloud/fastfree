<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-truck-delivery" size="2rem" color="primary" />
        <span class="text-h6">{{ t('sales.deliveryNotes') }}</span>
        <q-space />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.deliveryNotes"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          :filter="search"
          :filter-method="filterDeliveries"
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
              <q-btn v-if="props.row.docstatus === 0" flat round icon="mdi-check" size="sm" color="positive" :aria-label="t('common.submit')" @click="submitDelivery(props.row)" />
              <q-btn v-if="props.row.docstatus === 1" flat round icon="mdi-close" size="sm" color="negative" :aria-label="t('common.cancel')" @click="cancelDelivery(props.row)" />
              <q-btn v-if="props.row.docstatus === 0" flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteDelivery(props.row)" />
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
        <q-card-section>{{ t('sales.submitDeliveryNoteConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="positive" :label="t('common.submit')" @click="confirmSubmitDelivery" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmCancel">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-close-circle" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.cancel') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.cancelDeliveryNoteConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.confirm')" @click="confirmCancelDelivery" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.deleteDeliveryNoteConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteDelivery" />
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
import { submitDeliveryNote as apiSubmitDeliveryNote, cancelDeliveryNote as apiCancelDeliveryNote, deleteDeliveryNote as apiDeleteDeliveryNote } from '../services/delivery.service'
import type { DeliveryNote } from '../types'

const { t } = useLcI18n()
const store = useSalesStore()
const $q = useQuasar()
const { formatNumber } = useFormatNumber()
const { translateStatus, statusColor } = useStatusHelpers('sales')

const search = ref('')
const confirmSubmit = ref(false)
const submitTarget = ref('')
const confirmCancel = ref(false)
const cancelTarget = ref('')
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'name', label: t('sales.deliveryNote'), field: 'name', sortable: true },
  { name: 'customer_name', label: t('sales.customerName'), field: 'customer_name', sortable: true },
  { name: 'posting_date', label: t('sales.deliveryDate'), field: 'posting_date', sortable: true },
  { name: 'total', label: t('sales.total'), field: 'total', sortable: true, format: (v: number | null | undefined) => formatNumber(v) },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function filterDeliveries(rows: readonly DeliveryNote[], terms: string): DeliveryNote[] {
  const needle = (terms ?? '').toLowerCase()
  if (!needle) return rows as DeliveryNote[]
  return (rows as DeliveryNote[]).filter((row) => {
    const haystack = `${row.name ?? ''} ${row.customer ?? ''} ${row.customer_name ?? ''} ${row.status ?? ''}`.toLowerCase()
    return haystack.includes(needle)
  })
}

function submitDelivery(delivery: DeliveryNote) {
  submitTarget.value = delivery.name
  confirmSubmit.value = true
}

async function confirmSubmitDelivery() {
  const name = submitTarget.value
  confirmSubmit.value = false
  try {
    const result = await apiSubmitDeliveryNote(name)
    if (!result.success) {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
      return
    }
    $q.notify({ type: 'positive', message: t('sales.deliveryNoteSubmitted') })
    await store.fetchDeliveryNotes()
    if (store.error) $q.notify({ type: 'negative', message: store.error })
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function cancelDelivery(delivery: DeliveryNote) {
  cancelTarget.value = delivery.name
  confirmCancel.value = true
}

async function confirmCancelDelivery() {
  const name = cancelTarget.value
  confirmCancel.value = false
  try {
    const result = await apiCancelDeliveryNote(name)
    if (!result.success) {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
      return
    }
    $q.notify({ type: 'positive', message: t('sales.deliveryNoteCancelled') })
    await store.fetchDeliveryNotes()
    if (store.error) $q.notify({ type: 'negative', message: store.error })
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function deleteDelivery(delivery: DeliveryNote) {
  deleteTarget.value = delivery.name
  confirmDelete.value = true
}

async function confirmDeleteDelivery() {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    const result = await apiDeleteDeliveryNote(name)
    if (!result.success) {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
      return
    }
    $q.notify({ type: 'positive', message: t('sales.deliveryNoteDeleted') })
    await store.fetchDeliveryNotes()
    if (store.error) $q.notify({ type: 'negative', message: store.error })
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(async () => {
  try {
    await store.fetchDeliveryNotes()
    if (store.error) $q.notify({ type: 'negative', message: store.error })
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
})
</script>
