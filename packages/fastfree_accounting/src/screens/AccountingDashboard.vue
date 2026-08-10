<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-view-dashboard" size="2rem" color="primary" />
        <span class="text-h6">{{ t('accounting.dashboard') }}</span>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <!-- Stats Cards -->
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-blue-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-blue">{{ store.accounts.length }}</div>
                <div class="text-caption">{{ t('accounting.totalAccounts') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-green-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-green">{{ store.journalEntries.length }}</div>
                <div class="text-caption">{{ t('accounting.journalEntries') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-orange-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-orange">{{ formatNumber(store.totalDebit) }}</div>
                <div class="text-caption">{{ t('accounting.totalDebit') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-purple-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-purple">{{ formatNumber(store.totalCredit) }}</div>
                <div class="text-caption">{{ t('accounting.totalCredit') }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Fiscal Year Info -->
        <q-card v-if="store.currentFiscalYear" flat class="q-mt-md bg-grey-1">
          <q-card-section class="row items-center q-gutter-sm">
            <q-icon name="mdi-calendar" color="primary" />
            <span class="text-subtitle1">{{ t('accounting.currentFiscalYear') }}: {{ store.currentFiscalYear.name }}</span>
            <q-space />
            <q-badge color="positive">{{ translateStatus(store.currentFiscalYear.status) }}</q-badge>
          </q-card-section>
        </q-card>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useAccountingStore } from '../stores/useAccountingStore'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useAccountingStore()

function translateStatus(status: string): string {
  const key = `accounting.${status.toLowerCase()}`
  return t(key)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchAccounts(),
      store.fetchJournalEntries(),
      store.fetchFiscalYears(),
    ])
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
})
</script>
