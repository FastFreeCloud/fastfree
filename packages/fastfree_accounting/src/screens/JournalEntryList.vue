<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-book-open" size="2rem" color="primary" />
        <span class="text-h6">{{ t('accounting.journalEntries') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('accounting.newJournalEntry')" no-caps @click="showForm = true" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.journalEntries"
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
              <q-btn flat round icon="mdi-eye" size="sm" :aria-label="t('common.view')" @click="viewEntry(props.row)" />
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-pencil" size="sm" color="warning" :aria-label="t('common.edit')" @click="editEntry(props.row)" />
              <q-btn v-if="props.row.status === 'Draft'" flat round icon="mdi-check" size="sm" color="positive" :aria-label="t('common.submit')" @click="submitEntry(props.row)" />
              <q-btn v-if="props.row.status === 'Submitted'" flat round icon="mdi-close" size="sm" color="negative" :aria-label="t('common.cancel')" @click="cancelEntry(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <JournalEntryForm v-model="showForm" @saved="onSaved" />

    <q-dialog v-model="showDetail">
      <q-card style="min-width: 600px; max-width: 800px">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="mdi-book-open" size="1.5rem" color="primary" />
          <span class="text-h6">{{ t('accounting.journalEntryDetail') }}</span>
          <q-space />
          <q-btn flat round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section v-if="detailEntry">
          <div class="row q-gutter-md q-mb-md">
            <div class="col">
              <div class="text-caption text-grey">{{ t('accounting.entryNumber') }}</div>
              <div>{{ detailEntry.name }}</div>
            </div>
            <div class="col">
              <div class="text-caption text-grey">{{ t('accounting.postingDate') }}</div>
              <div>{{ detailEntry.postingDate }}</div>
            </div>
            <div class="col">
              <div class="text-caption text-grey">{{ t('accounting.entryType') }}</div>
              <div>{{ detailEntry.entryType }}</div>
            </div>
            <div class="col">
              <div class="text-caption text-grey">{{ t('accounting.status') }}</div>
              <q-badge :color="statusColor(detailEntry.status)" :label="translateStatus(detailEntry.status)" />
            </div>
          </div>

          <div v-if="detailEntry.remark" class="q-mb-md">
            <div class="text-caption text-grey">{{ t('accounting.remark') }}</div>
            <div>{{ detailEntry.remark }}</div>
          </div>

          <q-table
            :rows="detailEntry.accounts"
            :columns="accountColumns"
            row-key="account"
            flat
            dense
            hide-bottom
          >
            <template #bottom-row>
              <q-tr>
                <q-td colspan="2" class="text-right text-weight-bold">{{ t('common.total') }}</q-td>
                <q-td class="text-weight-bold">{{ formatNumber(detailEntry.totalDebit) }}</q-td>
                <q-td class="text-weight-bold">{{ formatNumber(detailEntry.totalCredit) }}</q-td>
              </q-tr>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmSubmit">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-check-circle" color="positive" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('accounting.confirmSubmit') }}</span>
        </q-card-section>
        <q-card-section>{{ t('accounting.submitJournalEntryConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="positive" :label="t('common.submit')" @click="confirmSubmitEntry" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmCancel">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-close-circle" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('accounting.confirmCancel') }}</span>
        </q-card-section>
        <q-card-section>{{ t('accounting.cancelJournalEntryConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('accounting.cancelEntry')" @click="confirmCancelEntry" />
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
import { submitJournalEntry, cancelJournalEntry, getJournalEntry } from '../services/journal.service'
import JournalEntryForm from './JournalEntryForm.vue'
import type { JournalEntry } from '../types'

const { t } = useLcI18n()
const store = useAccountingStore()
const $q = useQuasar()

const search = ref('')
const showForm = ref(false)
const showDetail = ref(false)
const detailEntry = ref<JournalEntry | null>(null)
const editingEntry = ref<JournalEntry | null>(null)
const confirmSubmit = ref(false)
const submitTarget = ref('')
const confirmCancel = ref(false)
const cancelTarget = ref('')

const columns = computed(() => [
  { name: 'name', label: t('accounting.entryNumber'), field: 'name', sortable: true },
  { name: 'postingDate', label: t('accounting.postingDate'), field: 'postingDate', sortable: true },
  { name: 'entryType', label: t('accounting.entryType'), field: 'entryType' },
  { name: 'totalDebit', label: t('accounting.debit'), field: 'totalDebit', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'totalCredit', label: t('accounting.credit'), field: 'totalCredit', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'status', label: t('accounting.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

const accountColumns = computed(() => [
  { name: 'account', label: t('accounting.accountLabel'), field: 'account' },
  { name: 'costCenter', label: t('accounting.costCenter'), field: 'costCenter' },
  { name: 'debit', label: t('accounting.debit'), field: 'debit', format: (v: number) => formatNumber(v) },
  { name: 'credit', label: t('accounting.credit'), field: 'credit', format: (v: number) => formatNumber(v) },
])

function translateStatus(status: string): string {
  const key = `accounting.${status.toLowerCase()}`
  return t(key)
}

function statusColor(status: string): string {
  return { Draft: 'grey', Submitted: 'positive', Cancelled: 'negative' }[status] ?? 'grey'
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

async function viewEntry(entry: JournalEntry) {
  const result = await getJournalEntry(entry.name)
  if (result.success && result.data) {
    detailEntry.value = result.data
    showDetail.value = true
  } else {
    $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
  }
}

function editEntry(entry: JournalEntry) {
  editingEntry.value = entry
  showForm.value = true
}

function submitEntry(entry: JournalEntry) {
  submitTarget.value = entry.name
  confirmSubmit.value = true
}

async function confirmSubmitEntry() {
  const name = submitTarget.value
  confirmSubmit.value = false
  try {
    const result = await submitJournalEntry(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('accounting.journalEntrySubmitted') })
      await store.fetchJournalEntries()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function cancelEntry(entry: JournalEntry) {
  cancelTarget.value = entry.name
  confirmCancel.value = true
}

async function confirmCancelEntry() {
  const name = cancelTarget.value
  confirmCancel.value = false
  try {
    const result = await cancelJournalEntry(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('accounting.journalEntryCancelled') })
      await store.fetchJournalEntries()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function onSaved() {
  showForm.value = false
  editingEntry.value = null
  store.fetchJournalEntries()
}

onMounted(() => store.fetchJournalEntries())
</script>
