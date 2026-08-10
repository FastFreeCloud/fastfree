<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-chart-bar" size="2rem" color="primary" />
        <span class="text-h6">{{ t('sales.salesReports') }}</span>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-blue-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-blue">{{ formatNumber(store.summary?.totalCustomers ?? 0) }}</div>
                <div class="text-caption">{{ t('sales.totalCustomers') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-green-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-green">{{ formatNumber(store.summary?.totalSales ?? 0) }}</div>
                <div class="text-caption">{{ t('sales.totalSales') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-orange-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-orange">{{ formatNumber(store.summary?.totalInvoices ?? 0) }}</div>
                <div class="text-caption">{{ t('sales.totalInvoices') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-red-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-red">{{ formatNumber(store.summary?.outstandingAmount ?? 0) }}</div>
                <div class="text-caption">{{ t('sales.outstandingAmount') }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode/src/runtime'
import { useSalesStore } from '../stores/useSalesStore'

const { t } = useLcI18n()
const store = useSalesStore()
const $q = useQuasar()
const loading = ref(false)
const { formatNumber } = useFormatNumber()

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      store.fetchCustomers(),
      store.fetchSalesInvoices(),
      store.fetchSalesSummary(),
    ])
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    loading.value = false
  }
})
</script>
