<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-book-open-variant" size="2rem" color="primary" />
        <span class="text-h6">{{ t('accounting.generalLedger') }}</span>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-sm q-mb-md">
          <q-select v-model="filter.account" :options="accountOptions" :label="t('accounting.accountLabel')" outlined dense class="col" emit-value map-options />
          <q-input v-model="filter.fromDate" :label="t('accounting.fromDate')" outlined dense type="date" class="col" />
          <q-input v-model="filter.toDate" :label="t('accounting.toDate')" outlined dense type="date" class="col" />
          <q-btn color="primary" icon="mdi-magnify" :label="t('common.search')" no-caps :loading="loading" @click="searchLedger" />
        </div>

        <q-table
          :rows="store.ledgerEntries"
          :columns="columns"
          row-key="voucherNumber"
          :loading="store.loading"
          flat
        >
          <template #body-cell-balance="props">
            <q-td :props="props" :class="props.row.balance >= 0 ? 'text-positive' : 'text-negative'">
              {{ formatNumber(props.row.balance) }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useAccountingStore } from '../stores/useAccountingStore'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useAccountingStore()

const filter = reactive({
  account: '',
  fromDate: new Date().toISOString().slice(0, 10),
  toDate: new Date().toISOString().slice(0, 10),
})

const accountOptions = computed(() =>
  store.accounts.map(a => ({ label: `${a.accountName} (${a.name})`, value: a.name }))
)

const columns = computed(() => [
  { name: 'date', label: t('accounting.date'), field: 'date', sortable: true },
  { name: 'voucherType', label: t('accounting.voucherType'), field: 'voucherType' },
  { name: 'voucherNumber', label: t('accounting.voucherNumber'), field: 'voucherNumber' },
  { name: 'debit', label: t('accounting.debit'), field: 'debit', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'credit', label: t('accounting.credit'), field: 'credit', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'balance', label: t('accounting.balance'), field: 'balance', sortable: true, format: (v: number) => formatNumber(v) },
  { name: 'party', label: t('accounting.party'), field: 'party' },
  { name: 'remarks', label: t('accounting.remarks'), field: 'remarks' },
])

const loading = ref(false)

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

async function searchLedger() {
  if (filter.account) {
    loading.value = true
    try {
      await store.fetchLedger(filter.account, filter.fromDate, filter.toDate)
    } catch {
      $q.notify({ type: 'negative', message: t('common.error') })
    } finally {
      loading.value = false
    }
  }
}

onMounted(() => store.fetchAccounts())
</script>
