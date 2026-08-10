<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-cash-multiple" size="2rem" color="primary" />
        <span class="text-h6">{{ t('accounting.paymentEntries') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('accounting.newPayment')" no-caps @click="showForm = true" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.paymentEntries"
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
          <template #body-cell-paymentType="props">
            <q-td :props="props">
              <q-badge :color="props.row.paymentType === 'Pay' ? 'negative' : 'positive'" :label="translatePaymentType(props.row.paymentType)" />
            </q-td>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.row.status)" :label="translateStatus(props.row.status)" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round icon="mdi-eye" size="sm" :aria-label="t('common.view')" @click="viewEntry(props.row)" />
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-check" size="sm" color="positive" :aria-label="t('common.submit')" @click="submitEntry(props.row)" />
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteEntry(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <PaymentEntryForm v-model="showForm" @saved="onSaved" />

    <q-dialog v-model="showDetail">
      <q-card style="min-width: 600px; max-width: 800px">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="mdi-cash-multiple" size="1.5rem" color="primary" />
          <span class="text-h6">{{ t('accounting.paymentEntryDetail') }}</span>
          <q-space />
          <q-btn flat round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section v-if="detailEntry">
          <div class="row q-gutter-md">
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.entryNumber') }}</div>
              <div>{{ detailEntry.name }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.postingDate') }}</div>
              <div>{{ detailEntry.postingDate }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.paymentType') }}</div>
              <q-badge :color="detailEntry.paymentType === 'Pay' ? 'negative' : 'positive'" :label="translatePaymentType(detailEntry.paymentType)" />
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.status') }}</div>
              <q-badge :color="statusColor(detailEntry.status)" :label="translateStatus(detailEntry.status)" />
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.party') }}</div>
              <div>{{ detailEntry.party }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.partyType') }}</div>
              <div>{{ detailEntry.partyType }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.modeOfPayment') }}</div>
              <div>{{ detailEntry.modeOfPayment }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.paidAmount') }}</div>
              <div class="text-weight-bold">{{ formatNumber(detailEntry.paidAmount) }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.receivedAmount') }}</div>
              <div class="text-weight-bold">{{ formatNumber(detailEntry.receivedAmount) }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.partyAccount') }}</div>
              <div>{{ detailEntry.partyAccount }}</div>
            </div>
            <div v-if="detailEntry.paidFrom" class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.paidFrom') }}</div>
              <div>{{ detailEntry.paidFrom }}</div>
            </div>
            <div v-if="detailEntry.paidTo" class="col-6 col-md-3">
              <div class="text-caption text-grey">{{ t('accounting.paidTo') }}</div>
              <div>{{ detailEntry.paidTo }}</div>
            </div>
          </div>

          <div v-if="detailEntry.remarks" class="q-mt-md">
            <div class="text-caption text-grey">{{ t('accounting.remarks') }}</div>
            <div>{{ detailEntry.remarks }}</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmSubmit">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-check-circle" color="positive" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('accounting.confirmSubmit') }}</span>
        </q-card-section>
        <q-card-section>{{ t('accounting.submitPaymentEntryConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="positive" :label="t('common.submit')" @click="confirmSubmitEntry" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('accounting.deletePaymentEntryConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteEntry" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useAccountingStore } from '../stores/useAccountingStore'
import { getPaymentEntry, submitPaymentEntry, deletePaymentEntry } from '../services/payment.service'
import PaymentEntryForm from './PaymentEntryForm.vue'
import type { PaymentEntry } from '../types'

const { t } = useLcI18n()
const store = useAccountingStore()
const $q = useQuasar()

const search = ref('')
const showForm = ref(false)
const showDetail = ref(false)
const detailEntry = ref<PaymentEntry | null>(null)
const confirmSubmit = ref(false)
const submitTarget = ref('')
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'name', label: t('accounting.entryNumber'), field: 'name', sortable: true },
  { name: 'postingDate', label: t('accounting.postingDate'), field: 'postingDate', sortable: true },
  { name: 'party', label: t('accounting.party'), field: 'party', sortable: true },
  { name: 'paymentType', label: t('accounting.paymentType'), field: 'paymentType' },
  { name: 'paidAmount', label: t('accounting.amount'), field: 'paidAmount', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'modeOfPayment', label: t('accounting.modeOfPayment'), field: 'modeOfPayment' },
  { name: 'status', label: t('accounting.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function translateStatus(status: string): string {
  const key = `accounting.${status.toLowerCase()}`
  return t(key)
}

function translatePaymentType(type: string): string {
  const map: Record<string, string> = {
    'Pay': t('accounting.pay'),
    'Receive': t('accounting.receive'),
    'Internal Transfer': t('accounting.internalTransfer'),
  }
  return map[type] ?? type
}

function statusColor(status: string): string {
  return { Draft: 'grey', Submitted: 'positive', Cancelled: 'negative' }[status] ?? 'grey'
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

async function viewEntry(entry: PaymentEntry) {
  const result = await getPaymentEntry(entry.name)
  if (result.success && result.data) {
    detailEntry.value = result.data
    showDetail.value = true
  } else {
    $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
  }
}

function submitEntry(entry: PaymentEntry) {
  submitTarget.value = entry.name
  confirmSubmit.value = true
}

async function confirmSubmitEntry() {
  const name = submitTarget.value
  confirmSubmit.value = false
  try {
    const result = await submitPaymentEntry(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('accounting.paymentEntrySubmitted') })
      await store.fetchPaymentEntries()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function deleteEntry(entry: PaymentEntry) {
  deleteTarget.value = entry.name
  confirmDelete.value = true
}

async function confirmDeleteEntry() {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    const result = await deletePaymentEntry(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('accounting.paymentEntryDeleted') })
      await store.fetchPaymentEntries()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function onSaved() {
  showForm.value = false
  store.fetchPaymentEntries()
}

onMounted(() => store.fetchPaymentEntries())
</script>
