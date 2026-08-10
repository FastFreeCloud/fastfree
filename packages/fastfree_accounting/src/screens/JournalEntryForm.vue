<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 680px" class="journal-entry-form">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="mdi-book-plus" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6">{{ t('accounting.newJournalEntry') }}</div>
        <q-space />
        <q-btn icon="mdi-close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-4">
            <q-input v-model="form.postingDate" :label="t('accounting.postingDate')" outlined type="date" dense />
          </div>
          <div class="col-4">
            <q-select v-model="form.entryType" :options="entryTypeOptions" :label="t('accounting.entryType')" outlined emit-value map-options dense />
          </div>
          <div class="col-4">
            <q-input v-model="form.company" :label="t('accounting.company')" outlined dense />
          </div>
        </div>

        <q-input v-model="form.remark" :label="t('accounting.remark')" outlined type="textarea" dense rows="2" class="q-mb-md" />

        <div class="account-lines-header text-subtitle2 text-weight-medium q-mb-sm">
          <q-icon name="mdi-table" size="18px" class="q-mr-xs" />
          {{ t('accounting.accountLines') }}
        </div>

        <q-table
          :rows="form.accounts"
          :columns="accountColumns"
          row-key="index"
          flat
          bordered
          dense
          :hide-bottom="true"
          class="account-lines-table q-mb-sm"
        >
          <template #body-cell-account="props">
            <q-td :props="props">
              <q-input v-model="props.row.account" dense outlined :placeholder="t('accounting.accountName')" />
            </q-td>
          </template>
          <template #body-cell-debit="props">
            <q-td :props="props">
              <q-input v-model.number="props.row.debit" dense outlined type="number" min="0" placeholder="0.00" />
            </q-td>
          </template>
          <template #body-cell-credit="props">
            <q-td :props="props">
              <q-input v-model.number="props.row.credit" dense outlined type="number" min="0" placeholder="0.00" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn icon="mdi-delete-outline" flat round dense color="negative" size="sm" @click="removeRow(props.row.index)" />
            </q-td>
          </template>
        </q-table>

        <div class="row items-center q-gutter-sm q-mb-md">
          <q-btn icon="mdi-plus" :label="t('accounting.addRow')" color="secondary" outline no-caps dense rounded @click="addRow" />
          <q-space />
          <div class="totals-row text-weight-medium">
            <span class="q-mr-md">{{ t('accounting.totalDebit') }}: <span class="text-positive">{{ totalDebit.toFixed(2) }}</span></span>
            <span>{{ t('accounting.totalCredit') }}: <span class="text-negative">{{ totalCredit.toFixed(2) }}</span></span>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat :label="t('common.cancel')" no-caps @click="close" />
        <q-btn color="primary" :label="t('accounting.submit')" no-caps rounded icon="mdi-check" :loading="saving" @click="save" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { createJournalEntry } from '../services/journal.service'

const { t } = useLcI18n()
const $q = useQuasar()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const show = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const saving = ref(false)

const entryTypeOptions = computed(() => [
  { label: t('accounting.journalEntry'), value: 'Journal Entry' },
  { label: t('accounting.bankEntry'), value: 'Bank Entry' },
  { label: t('accounting.cashEntry'), value: 'Cash Entry' },
])

const accountColumns = computed(() => [
  { name: 'account', label: t('accounting.accountLabel'), field: 'account', align: 'left' as const },
  { name: 'debit', label: t('accounting.debit'), field: 'debit', align: 'right' as const },
  { name: 'credit', label: t('accounting.credit'), field: 'credit', align: 'right' as const },
  { name: 'actions', label: '', field: 'actions', align: 'center' as const },
])

const form = reactive({
  postingDate: new Date().toISOString().slice(0, 10),
  entryType: 'Journal Entry' as 'Journal Entry' | 'Bank Entry' | 'Cash Entry',
  company: '',
  remark: '',
  accounts: [
    { index: 0, account: '', debit: 0, credit: 0 },
    { index: 1, account: '', debit: 0, credit: 0 },
  ] as { index: number; account: string; debit: number; credit: number }[],
})

const totalDebit = computed(() => form.accounts.reduce((sum, row) => sum + (row.debit || 0), 0))
const totalCredit = computed(() => form.accounts.reduce((sum, row) => sum + (row.credit || 0), 0))

function addRow() {
  form.accounts.push({
    index: form.accounts.length,
    account: '',
    debit: 0,
    credit: 0,
  })
}

function removeRow(index: number) {
  if (form.accounts.length <= 2) return
  form.accounts.splice(index, 1)
  form.accounts.forEach((row, i) => { row.index = i })
}

function resetForm() {
  form.postingDate = new Date().toISOString().slice(0, 10)
  form.entryType = 'Journal Entry'
  form.company = ''
  form.remark = ''
  form.accounts = [
    { index: 0, account: '', debit: 0, credit: 0 },
    { index: 1, account: '', debit: 0, credit: 0 },
  ]
}

function close() {
  show.value = false
  resetForm()
}

async function save() {
  if (!form.postingDate) {
    $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
    return
  }
  const filledRows = form.accounts.filter(r => r.account.trim())
  if (filledRows.length < 2) {
    $q.notify({ type: 'warning', message: t('accounting.atLeastTwoRows') })
    return
  }
  for (const row of filledRows) {
    if (row.debit <= 0 && row.credit <= 0) {
      $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
      return
    }
  }
  if (totalDebit.value !== totalCredit.value) {
    $q.notify({ type: 'warning', message: t('accounting.debitCreditMustMatch') })
    return
  }
  saving.value = true
  try {
    const result = await createJournalEntry({
      postingDate: form.postingDate,
      entryType: form.entryType as 'Journal Entry' | 'Bank Entry' | 'Cash Entry',
      company: form.company,
      remark: form.remark,
      accounts: form.accounts.map(({ account, debit, credit }) => ({ account, debit, credit })),
      totalDebit: totalDebit.value,
      totalCredit: totalCredit.value,
      status: 'Draft',
    })
    if (result.success) {
      emit('saved')
      close()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message ?? t('common.error') })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.journal-entry-form {
  border-radius: 16px;
}

.account-lines-header {
  display: flex;
  align-items: center;
}

.account-lines-table {
  :deep(.q-table__top),
  :deep(.q-table__bottom) {
    display: none;
  }
}

.totals-row {
  font-size: 0.9rem;
}
</style>
