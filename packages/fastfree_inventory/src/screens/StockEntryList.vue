<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-swap-horizontal" size="2rem" color="primary" />
        <span class="text-h6">{{ t('inventory.stockEntries') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('inventory.addEntry')" no-caps @click="showForm = true" />
        <q-btn flat round icon="refresh" :aria-label="t('common.refresh')" @click="store.fetchStockEntries()" />
      </q-card-section>

      <q-card-section>
        <q-table :rows="store.stockEntries" :columns="columns" row-key="name" :loading="store.loading" flat dense>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="props.row.status === 'Draft' ? 'grey' : props.row.status === 'Submitted' ? 'positive' : 'negative'"
                :label="translateStatus(props.row.status)"
              />
            </q-td>
          </template>
          <template #body-cell-totalAmount="props">
            <q-td :props="props">
              {{ props.row.totalAmount.toLocaleString() }}
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense size="sm" icon="mdi-eye" color="primary" :aria-label="t('common.view')" @click="viewEntry(props.row)" />
              <q-btn
                v-if="props.row.status === 'Draft'"
                flat round dense size="sm"
                icon="mdi-check-circle"
                color="positive"
                :aria-label="t('common.submit')"
                @click="handleSubmit(props.row)"
              />
              <q-btn
                v-if="props.row.status === 'Submitted'"
                flat round dense size="sm"
                icon="mdi-cancel"
                color="negative"
                :aria-label="t('common.cancel')"
                @click="handleCancel(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <StockEntryForm v-model="showForm" @saved="onSaved" />

    <q-dialog v-model="showDetail">
      <q-card v-if="selectedEntry" style="min-width: 600px">
        <q-card-section class="row items-center">
          <q-icon name="mdi-swap-horizontal" size="1.5rem" color="primary" class="q-mr-sm" />
          <span class="text-h6">{{ selectedEntry.name }}</span>
          <q-space />
          <q-badge
            :color="selectedEntry.status === 'Draft' ? 'grey' : selectedEntry.status === 'Submitted' ? 'positive' : 'negative'"
            :label="translateStatus(selectedEntry.status)"
          />
          <q-btn icon="close" flat round dense class="q-ml-sm" @click="showDetail = false" />
        </q-card-section>
        <q-card-section>
          <div class="row q-gutter-md q-mb-md">
            <div class="col"><b>{{ t('inventory.entryType') }}:</b> {{ selectedEntry.entryType }}</div>
            <div class="col"><b>{{ t('inventory.postingDate') }}:</b> {{ selectedEntry.postingDate }}</div>
            <div class="col"><b>{{ t('inventory.totalAmount') }}:</b> {{ selectedEntry.totalAmount.toLocaleString() }}</div>
          </div>
          <div v-if="selectedEntry.remarks" class="q-mb-md"><b>{{ t('inventory.remarks') }}:</b> {{ selectedEntry.remarks }}</div>
          <div class="text-subtitle2 q-mb-sm">{{ t('inventory.items') }}</div>
          <q-table :rows="selectedEntry.items" :columns="itemColumns" row-key="product" flat dense />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmActionVisible" persistent>
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center">
          <q-avatar :icon="actionType === 'submit' ? 'mdi-check-circle' : 'mdi-cancel'" :color="actionType === 'submit' ? 'positive' : 'negative'" text-color="white" />
          <span class="q-ml-sm text-h6">{{ actionType === 'submit' ? t('inventory.submitEntryConfirm') : t('inventory.cancelEntryConfirm') }}</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="t('common.cancel')" />
          <q-btn :color="actionType === 'submit' ? 'positive' : 'negative'" :label="t('common.confirm')" @click="executeAction" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useInventoryStore } from '../stores/useInventoryStore'
import { submitStockEntry, cancelStockEntry } from '../services'
import type { StockEntry } from '../types'
import StockEntryForm from './StockEntryForm.vue'

const { t } = useLcI18n()
const store = useInventoryStore()
const $q = useQuasar()

const showForm = ref(false)
const showDetail = ref(false)
const selectedEntry = ref<StockEntry | null>(null)
const confirmActionVisible = ref(false)
const actionType = ref<'submit' | 'cancel'>('submit')
const actionTarget = ref<StockEntry | null>(null)

const columns = computed(() => [
  { name: 'name', label: t('inventory.entryNumber'), field: 'name', sortable: true },
  { name: 'entryType', label: t('inventory.entryType'), field: 'entryType', sortable: true },
  { name: 'postingDate', label: t('inventory.postingDate'), field: 'postingDate', sortable: true },
  { name: 'totalAmount', label: t('inventory.totalAmount'), field: 'totalAmount', sortable: true, format: (v: number) => v.toLocaleString() },
  { name: 'status', label: t('inventory.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

const itemColumns = computed(() => [
  { name: 'product', label: t('inventory.product'), field: 'product' },
  { name: 'quantity', label: t('inventory.quantity'), field: 'quantity' },
  { name: 'rate', label: t('inventory.rate'), field: 'rate', format: (v: number) => v.toLocaleString() },
  { name: 'amount', label: t('inventory.amount'), field: 'amount', format: (v: number) => v.toLocaleString() },
  { name: 'sourceWarehouse', label: t('inventory.sourceWarehouse'), field: 'sourceWarehouse' },
  { name: 'targetWarehouse', label: t('inventory.targetWarehouse'), field: 'targetWarehouse' },
])

function viewEntry(entry: StockEntry) {
  selectedEntry.value = entry
  showDetail.value = true
}

function handleSubmit(entry: StockEntry) {
  actionType.value = 'submit'
  actionTarget.value = entry
  confirmActionVisible.value = true
}

function handleCancel(entry: StockEntry) {
  actionType.value = 'cancel'
  actionTarget.value = entry
  confirmActionVisible.value = true
}

async function executeAction() {
  if (!actionTarget.value) return
  try {
    if (actionType.value === 'submit') {
      await submitStockEntry(actionTarget.value.name)
    } else {
      await cancelStockEntry(actionTarget.value.name)
    }
    $q.notify({ type: 'positive', message: t('common.success') })
    await store.fetchStockEntries()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    confirmActionVisible.value = false
    actionTarget.value = null
  }
}

function onSaved() {
  store.fetchStockEntries()
}

function translateStatus(status: string): string {
  const key = `inventory.${status.toLowerCase()}`
  return t(key)
}

onMounted(() => store.fetchStockEntries())
</script>
