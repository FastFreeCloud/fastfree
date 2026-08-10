<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-calendar-range" size="2rem" color="primary" />
        <span class="text-h6">{{ t('accounting.fiscalYears') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('accounting.addFiscalYear')" no-caps @click="showForm = true" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.fiscalYears"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          flat
        >
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.row.status === 'Open' ? 'positive' : 'grey'" :label="translateStatus(props.row.status)" />
            </q-td>
          </template>
          <template #body-cell-isCurrent="props">
            <q-td :props="props">
              <q-icon v-if="props.row.isCurrent" name="mdi-check-circle" color="positive" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round icon="mdi-pencil" size="sm" color="warning" :aria-label="t('common.edit')" @click="editFiscalYear(props.row)" />
              <q-btn v-if="props.row.status === 'Open' && !props.row.isCurrent" flat round icon="mdi-lock" size="sm" color="negative" :aria-label="t('accounting.closeYear')" @click="closeYear(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <FiscalYearForm v-model="showForm" @saved="onSaved" />

    <q-dialog v-model="confirmClose">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-lock" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('accounting.confirmCloseYear') }}</span>
        </q-card-section>
        <q-card-section>{{ t('accounting.closeFiscalYearConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('accounting.closeYear')" @click="confirmCloseYear" />
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
import { closeFiscalYear } from '../services/fiscalYear.service'
import FiscalYearForm from './FiscalYearForm.vue'
import type { FiscalYear } from '../types'

const { t } = useLcI18n()
const store = useAccountingStore()
const $q = useQuasar()

const showForm = ref(false)
const confirmClose = ref(false)
const closeTarget = ref('')

function translateStatus(status: string): string {
  const key = `accounting.${status.toLowerCase()}`
  return t(key)
}

const columns = computed(() => [
  { name: 'name', label: t('accounting.fiscalYear'), field: 'name', sortable: true },
  { name: 'yearStartDate', label: t('accounting.startDate'), field: 'yearStartDate', sortable: true },
  { name: 'yearEndDate', label: t('accounting.endDate'), field: 'yearEndDate', sortable: true },
  { name: 'status', label: t('accounting.status'), field: 'status' },
  { name: 'isCurrent', label: t('accounting.current'), field: 'isCurrent' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function editFiscalYear(_fiscalYear: FiscalYear) {
  $q.notify({ type: 'info', message: t('accounting.editNotYetSupported') })
}

function closeYear(fiscalYear: FiscalYear) {
  closeTarget.value = fiscalYear.name
  confirmClose.value = true
}

async function confirmCloseYear() {
  const name = closeTarget.value
  confirmClose.value = false
  try {
    const result = await closeFiscalYear(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('accounting.fiscalYearClosed') })
      await store.fetchFiscalYears()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function onSaved() {
  showForm.value = false
  store.fetchFiscalYears()
}

onMounted(() => store.fetchFiscalYears())
</script>
