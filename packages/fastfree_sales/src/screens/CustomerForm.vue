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
            <q-select v-model="form.customer_group" :options="groupOptions" :label="t('sales.customers.group')" outlined :loading="loadingOptions" :rules="[val => !!val || t('sales.fieldRequired')]" />
            <q-select v-model="form.territory" :options="territoryOptions" :label="t('sales.customers.territory')" outlined :loading="loadingOptions" :rules="[val => !!val || t('sales.fieldRequired')]" />
            <q-input v-model="form.email_id" :label="t('sales.email')" outlined type="email" />
            <q-input v-model="form.mobile_no" :label="t('sales.customers.mobile')" outlined />
            <q-input v-model="form.default_currency" :label="t('sales.customers.currency')" outlined />
            <q-toggle v-model="form.disabled" :label="t('sales.customers.disabled')" />
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
import { createCustomer, updateCustomer, getCustomerGroups, getTerritories } from '../services/customer.service'

// Frappe v15 Customer shape (mirrors the customer.service contract).
interface CustomerModel {
  name: string
  customer_name: string
  customer_type: 'Company' | 'Individual'
  customer_group: string
  territory: string
  email_id?: string
  mobile_no?: string
  default_currency?: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: boolean
  customer?: CustomerModel | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { t } = useLcI18n()
const $q = useQuasar()

const saving = ref(false)
const loadingOptions = ref(false)
const groupOptions = ref<string[]>([])
const territoryOptions = ref<string[]>([])

const customerTypes = [
  { label: t('sales.individual'), value: 'Individual' },
  { label: t('sales.company'), value: 'Company' },
]

function emptyForm() {
  return {
    customer_name: '',
    customer_type: 'Individual' as 'Company' | 'Individual',
    customer_group: '',
    territory: '',
    email_id: '',
    mobile_no: '',
    default_currency: '',
    disabled: false,
  }
}

const form = ref(emptyForm())

function resetForm() {
  const cust = props.customer
  if (cust) {
    form.value = {
      customer_name: cust.customer_name ?? '',
      customer_type: cust.customer_type ?? 'Individual',
      customer_group: cust.customer_group ?? '',
      territory: cust.territory ?? '',
      email_id: cust.email_id ?? '',
      mobile_no: cust.mobile_no ?? '',
      default_currency: cust.default_currency ?? '',
      disabled: cust.disabled ?? false,
    }
  } else {
    form.value = emptyForm()
  }
}

async function loadOptions() {
  loadingOptions.value = true
  try {
    const [groups, territories] = await Promise.all([getCustomerGroups(), getTerritories()])
    groupOptions.value = groups ?? []
    territoryOptions.value = territories ?? []
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    loadingOptions.value = false
  }
}

watch(() => props.customer, () => {
  resetForm()
}, { immediate: true })

watch(() => props.modelValue, (open) => {
  if (open) {
    resetForm()
    void loadOptions()
  }
})

async function save() {
  saving.value = true
  try {
    if (props.customer?.name) {
      const result = await updateCustomer(props.customer.name, form.value)
      if (!result.success) {
        $q.notify({ type: 'negative', message: t('common.error') })
        return
      }
    } else {
      const result = await createCustomer(form.value)
      if (!result.success) {
        $q.notify({ type: 'negative', message: t('common.error') })
        return
      }
    }
    $q.notify({ type: 'positive', message: t('common.save') + ' ✓' })
    emit('saved')
    emit('update:modelValue', false)
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    saving.value = false
  }
}
</script>
