<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-chart-bar" size="2rem" color="primary" />
        <span class="text-h6">{{ t('purchase.purchaseReports') }}</span>
        <q-space />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="loadSummary" />
        <q-btn flat round icon="mdi-printer" :aria-label="t('common.print')" @click="printReport" />
        <q-btn flat round icon="mdi-file-export" :aria-label="t('common.export')" @click="exportReport" />
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-sm q-mb-md">
          <q-input
            v-model="dateFrom"
            :label="t('common.dateFrom')"
            outlined dense type="date"
            class="col-12 col-sm-4"
          />
          <q-input
            v-model="dateTo"
            :label="t('common.dateTo')"
            outlined dense type="date"
            class="col-12 col-sm-4"
          />
          <div class="col-12 col-sm-4 row items-end">
            <q-btn color="primary" :label="t('common.filter')" @click="loadSummary" class="full-width" />
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-blue-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-blue">{{ formatNumber(summary.totalPurchases) }}</div>
                <div class="text-caption">{{ t('purchase.totalPurchases') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-green-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-green">{{ summary.totalInvoices }}</div>
                <div class="text-caption">{{ t('purchase.totalInvoices') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-orange-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-orange">{{ summary.totalSuppliers }}</div>
                <div class="text-caption">{{ t('purchase.totalSuppliers') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-red-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-red">{{ formatNumber(summary.overdueAmount ?? 0) }}</div>
                <div class="text-caption">{{ t('purchase.overdueAmount') }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">{{ t('purchase.summaryByStatus') }}</div>
        <q-table
          :rows="statusRows"
          :columns="statusColumns"
          row-key="status"
          flat dense
          hide-bottom
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber'
import { getPurchaseSummary } from '../services/report.service'

const { t } = useLcI18n()
const $q = useQuasar()
const { formatNumber } = useFormatNumber()

const summary = ref({
  totalPurchases: 0,
  totalInvoices: 0,
  totalSuppliers: 0,
  overdueAmount: 0,
  pendingOrders: 0,
  completedOrders: 0,
  overdueOrders: 0,
})

const dateFrom = ref('')
const dateTo = ref('')

const statusColumns = computed(() => [
  { name: 'status', label: t('common.status'), field: 'status', sortable: true },
  { name: 'count', label: t('purchase.count'), field: 'count', sortable: true },
])

const statusRows = computed(() => [
  { status: t('purchase.pending'), count: summary.value.pendingOrders ?? 0 },
  { status: t('purchase.completed'), count: summary.value.completedOrders ?? 0 },
  { status: t('purchase.overdue'), count: summary.value.overdueOrders ?? 0 },
])

async function loadSummary() {
  try {
    const result = await getPurchaseSummary()
    if (result.success && result.data) {
      summary.value = { ...summary.value, ...result.data }
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function printReport() {
  window.print()
}

function exportReport() {
  const rows = [
    [t('purchase.totalPurchases'), summary.value.totalPurchases],
    [t('purchase.totalInvoices'), summary.value.totalInvoices],
    [t('purchase.totalSuppliers'), summary.value.totalSuppliers],
    [t('purchase.overdueAmount'), summary.value.overdueAmount ?? 0],
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'purchase-report.csv'
  link.click()
}

onMounted(loadSummary)
</script>
