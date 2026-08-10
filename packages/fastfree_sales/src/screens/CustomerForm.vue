<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon :name="customer ? 'mdi-pencil' : 'mdi-plus'" size="1.5rem" color="primary" />
        <span class="text-h6">{{ customer ? t('common.edit') : t('sales.addCustomer') }}</span>
        <q-space />
        <q-btn flat round icon="mdi-close" :aria-label="t('common.cancel')" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="save">
          <div class="q-gutter-md">
            <q-input v-model="form.customer_name" :label="t('sales.customerName')" outlined :rules="[val => !!val || t('sales.fieldRequired')]" />
            <q-select v-model="form.customer_type" :options="customerTypes" :label="t('sales.customerType')" outlined emit-value map-options :rules="[val => !!val || t('sales.fieldRequired')]" />
            <q-input v-model="form.email" :label="t('sales.email')" outlined type="email" />
            <q-input v-model="form.phone" :label="t('sales.phone')" outlined />
            <q-input v-model="form.address" :label="t('sales.address')" outlined type="textarea" rows="2" />
          </div>

          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn flat :label="t('common.cancel')" @click="$emit('update:modelValue', false)" />
            <q-btn type="submit" color="primary" :label="t('common.save')" :loading="saving" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { createCustomer, updateCustomer } from '../services/customer.service'
import type { Customer } from '../types'

const props = defineProps<{
  modelValue: boolean
  customer?: Customer | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { t } = useLcI18n()
const $q = useQuasar()

const saving = ref(false)

const customerTypes = [
  { label: t('sales.individual'), value: 'Individual' },
  { label: t('sales.company'), value: 'Company' },
]

const form = ref({
  customer_name: '',
  customer_type: 'Individual' as 'Company' | 'Individual',
  email: '',
  phone: '',
  address: '',
})

watch(() => props.customer, (cust) => {
  if (cust) {
    form.value = {
      customer_name: cust.customer_name,
      customer_type: cust.customer_type,
      email: cust.email ?? '',
      phone: cust.phone ?? '',
      address: cust.address ?? '',
    }
  } else {
    form.value = { customer_name: '', customer_type: 'Individual' as 'Company' | 'Individual', email: '', phone: '', address: '' }
  }
}, { immediate: true })

async function save() {
  saving.value = true
  try {
    if (props.customer) {
      await updateCustomer(props.customer.name, form.value)
    } else {
      await createCustomer(form.value)
    }
    $q.notify({ type: 'positive', message: t('common.save') + ' ✓' })
    emit('saved')
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    saving.value = false
  }
}
</script>
