<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-view-dashboard" size="2rem" color="primary" />
        <span class="text-h6">{{ t('purchase.purchaseReports') }}</span>
        <q-space />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="loadSummary" />
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
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber'
import { getPurchaseSummary } from '../services/report.service'

const { t } = useLcI18n()
const { formatNumber } = useFormatNumber()
const $q = useQuasar()

const summary = ref({ totalPurchases: 0, totalInvoices: 0, totalSuppliers: 0 })

async function loadSummary() {
  try {
    const result = await getPurchaseSummary()
    if (result.success && result.data) {
      summary.value = result.data as { totalPurchases: number; totalInvoices: number; totalSuppliers: number }
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(loadSummary)
</script>
