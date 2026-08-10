<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 560px" class="payment-entry-form">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="mdi-cash-multiple" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6">{{ t('accounting.newPaymentEntry') }}</div>
        <q-space />
        <q-btn icon="mdi-close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <q-select v-model="form.paymentType" :options="paymentTypeOptions" :label="t('accounting.paymentType')" outlined emit-value map-options dense />
          </div>
          <div class="col-6">
            <q-select v-model="form.partyType" :options="partyTypeOptions" :label="t('accounting.partyType')" outlined emit-value map-options dense />
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <q-input v-model="form.party" :label="t('accounting.party')" outlined dense />
          </div>
          <div class="col-6">
            <q-input v-model="form.postingDate" :label="t('accounting.postingDate')" outlined type="date" dense />
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <q-input v-model="form.modeOfPayment" :label="t('accounting.modeOfPayment')" outlined dense />
          </div>
          <div class="col-6">
            <q-input v-model="form.partyAccount" :label="t('accounting.partyAccount')" outlined dense />
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <q-input v-model.number="form.paidAmount" :label="t('accounting.paidAmount')" outlined type="number" dense min="0" />
          </div>
          <div class="col-6">
            <q-input v-model.number="form.receivedAmount" :label="t('accounting.receivedAmount')" outlined type="number" dense min="0" />
          </div>
        </div>

        <div v-if="form.paymentType === 'Pay'" class="row q-col-gutter-sm q-mb-sm">
          <div class="col-12">
            <q-input v-model="form.paidFrom" :label="t('accounting.paidFrom')" outlined dense />
          </div>
        </div>

        <div v-if="form.paymentType === 'Receive'" class="row q-col-gutter-sm q-mb-sm">
          <div class="col-12">
            <q-input v-model="form.paidTo" :label="t('accounting.paidTo')" outlined dense />
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-12">
            <q-input v-model="form.company" :label="t('accounting.company')" outlined dense />
          </div>
        </div>

        <q-input v-model="form.remarks" :label="t('accounting.remarks')" outlined type="textarea" dense rows="2" />
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
import { createPaymentEntry } from '../services/payment.service'
import type { PaymentEntry } from '../types'

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

const paymentTypeOptions = computed(() => [
  { label: t('accounting.pay'), value: 'Pay' },
  { label: t('accounting.receive'), value: 'Receive' },
  { label: t('accounting.internalTransfer'), value: 'Internal Transfer' },
])

const partyTypeOptions = computed(() => [
  { label: t('accounting.customer'), value: 'Customer' },
  { label: t('accounting.supplier'), value: 'Supplier' },
  { label: t('accounting.employee'), value: 'Employee' },
])

const form = reactive({
  paymentType: 'Pay' as 'Pay' | 'Receive' | 'Internal Transfer',
  partyType: 'Customer' as 'Customer' | 'Supplier' | 'Employee',
  party: '',
  postingDate: new Date().toISOString().slice(0, 10),
  modeOfPayment: '',
  partyAccount: '',
  paidFrom: '',
  paidTo: '',
  paidAmount: 0,
  receivedAmount: 0,
  company: '',
  remarks: '',
})

function resetForm() {
  form.paymentType = 'Pay'
  form.partyType = 'Customer'
  form.party = ''
  form.postingDate = new Date().toISOString().slice(0, 10)
  form.modeOfPayment = ''
  form.partyAccount = ''
  form.paidFrom = ''
  form.paidTo = ''
  form.paidAmount = 0
  form.receivedAmount = 0
  form.company = ''
  form.remarks = ''
}

function close() {
  show.value = false
  resetForm()
}

async function save() {
  if (!form.party) {
    $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
    return
  }
  if (!form.partyAccount) {
    $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
    return
  }
  if (form.paymentType === 'Pay' && form.paidAmount <= 0) {
    $q.notify({ type: 'warning', message: t('accounting.amountMustBePositive') })
    return
  }
  if (form.paymentType === 'Receive' && form.receivedAmount <= 0) {
    $q.notify({ type: 'warning', message: t('accounting.amountMustBePositive') })
    return
  }
  saving.value = true
  try {
    const payload: Partial<PaymentEntry> = {
      paymentType: form.paymentType,
      partyType: form.partyType,
      party: form.party,
      postingDate: form.postingDate,
      modeOfPayment: form.modeOfPayment,
      partyAccount: form.partyAccount,
      paidAmount: form.paidAmount,
      receivedAmount: form.receivedAmount,
      company: form.company,
      remarks: form.remarks,
      status: 'Draft',
    }
    if (form.paymentType === 'Pay') payload.paidFrom = form.paidFrom
    if (form.paymentType === 'Receive') payload.paidTo = form.paidTo
    const result = await createPaymentEntry(payload as Parameters<typeof createPaymentEntry>[0])
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
.payment-entry-form {
  border-radius: 16px;
}
</style>
