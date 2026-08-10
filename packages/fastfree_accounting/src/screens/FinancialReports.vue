<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-chart-bar" size="2rem" color="primary" />
        <span class="text-h6">{{ t('accounting.financialReports') }}</span>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-sm q-mb-md">
          <q-select v-model="filter.reportType" :options="reportTypes" :label="t('accounting.reportType')" outlined dense class="col" emit-value map-options />
          <q-input v-model="filter.fromDate" :label="t('accounting.fromDate')" outlined dense type="date" class="col" />
          <q-input v-model="filter.toDate" :label="t('accounting.toDate')" outlined dense type="date" class="col" />
          <q-btn color="primary" icon="mdi-chart-bar" :label="t('accounting.generate')" no-caps :loading="loading" @click="generate" />
        </div>

        <div v-if="store.currentReport" class="q-mt-md">
          <div class="text-subtitle1 q-mb-sm">{{ store.currentReport.reportType }}</div>
          <q-table
            :rows="store.currentReport.rows"
            :columns="columns"
            row-key="label"
            flat
            dense
          />
          <div class="row q-gutter-lg q-mt-sm text-weight-medium">
            <span>{{ t('accounting.totalDebit') }}: {{ formatNumber(store.currentReport.totalDebit) }}</span>
            <span>{{ t('accounting.totalCredit') }}: {{ formatNumber(store.currentReport.totalCredit) }}</span>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useAccountingStore } from '../stores/useAccountingStore'
import type { ReportType, ReportFilter } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useAccountingStore()

const reportTypes = [
  { label: t('accounting.trialBalance'), value: 'trial_balance' as ReportType },
  { label: t('accounting.profitAndLoss'), value: 'profit_and_loss' as ReportType },
  { label: t('accounting.balanceSheet'), value: 'balance_sheet' as ReportType },
  { label: t('accounting.generalLedger'), value: 'general_ledger' as ReportType },
  { label: t('accounting.accountsReceivable'), value: 'accounts_receivable' as ReportType },
  { label: t('accounting.accountsPayable'), value: 'accounts_payable' as ReportType },
]

const filter = ref<ReportFilter>({
  reportType: 'trial_balance',
  fromDate: new Date().toISOString().slice(0, 10),
  toDate: new Date().toISOString().slice(0, 10),
})

const columns = computed(() => [
  { name: 'label', label: t('accounting.accountLabel'), field: 'label' },
  { name: 'debit', label: t('accounting.debit'), field: 'debit', format: (v: number) => formatNumber(v) },
  { name: 'credit', label: t('accounting.credit'), field: 'credit', format: (v: number) => formatNumber(v) },
  { name: 'balance', label: t('accounting.balance'), field: 'balance', format: (v: number) => formatNumber(v) },
])

const loading = ref(false)

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

async function generate() {
  loading.value = true
  try {
    await store.fetchReport(filter.value)
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    loading.value = false
  }
}
</script>
