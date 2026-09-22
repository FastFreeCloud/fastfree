<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-account-group" size="2rem" color="primary" />
        <span class="text-h6">{{ t('sales.customers') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('sales.addCustomer')" no-caps @click="openAdd" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.customers"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          :filter="search"
          flat
        >
          <template #top-right>
            <q-input v-model="search" :placeholder="t('common.search')" dense outlined clearable style="width: 200px">
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </template>
          <template #body-cell-customer_type="props">
            <q-td :props="props">
              <q-badge :color="props.row?.customer_type === 'Company' ? 'blue' : 'grey'" :label="translateCustomerType(props.row?.customer_type)" />
            </q-td>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="isCustomerDisabled(props.row) ? 'negative' : 'positive'" :label="translateCustomerStatus(props.row)" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round icon="mdi-pencil" size="sm" color="warning" :aria-label="t('common.edit')" @click="editCustomer(props.row)" />
              <q-btn flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteCustomer(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <CustomerForm v-model="showForm" :customer="editingCustomer" @saved="onSaved" />

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.deleteCustomerConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteCustomer" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useSalesStore } from '../stores/useSalesStore'
import { deleteCustomer as apiDeleteCustomer } from '../services/customer.service'
import CustomerForm from './CustomerForm.vue'

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

const { t } = useLcI18n()
const store = useSalesStore()
const $q = useQuasar()

const search = ref('')
const showForm = ref(false)
const editingCustomer = ref<CustomerModel | null>(null)
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'customer_name', label: t('sales.customerName'), field: 'customer_name', sortable: true, align: 'left' as const },
  { name: 'customer_type', label: t('sales.customerType'), field: 'customer_type', align: 'left' as const },
  { name: 'mobile_no', label: t('sales.phone'), field: 'mobile_no', align: 'left' as const },
  { name: 'email_id', label: t('sales.email'), field: 'email_id', align: 'left' as const },
  { name: 'status', label: t('sales.status'), field: 'disabled', align: 'left' as const },
  { name: 'actions', label: t('common.actions'), field: 'actions', align: 'right' as const },
])

function translateCustomerType(type: string | null | undefined): string {
  if (type == null || type === '') return ''
  const map: Record<string, string> = {
    Individual: t('sales.individual'),
    Company: t('sales.company'),
  }
  return map[type] ?? type
}

function isCustomerDisabled(row: { disabled?: unknown } | null | undefined): boolean {
  const disabled = row?.disabled
  return disabled === true || disabled === 1 || disabled === '1'
}

function translateCustomerStatus(row: { disabled?: unknown } | null | undefined): string {
  return isCustomerDisabled(row) ? t('sales.customers.disabled') : t('sales.customers.active')
}

function openAdd() {
  editingCustomer.value = null
  showForm.value = true
}

function editCustomer(customer: CustomerModel) {
  editingCustomer.value = customer
  showForm.value = true
}

function deleteCustomer(customer: CustomerModel | null | undefined) {
  const name = customer?.name ?? ''
  if (name === '') {
    $q.notify({ type: 'negative', message: t('common.error') })
    return
  }
  deleteTarget.value = name
  confirmDelete.value = true
}

async function confirmDeleteCustomer() {
  const name = deleteTarget.value
  confirmDelete.value = false
  deleteTarget.value = ''
  if (name === '') {
    $q.notify({ type: 'negative', message: t('common.error') })
    return
  }
  try {
    await apiDeleteCustomer(name)
    await store.fetchCustomers()
    if (store.error) {
      $q.notify({ type: 'negative', message: t('common.error') })
      return
    }
    $q.notify({ type: 'positive', message: t('sales.customerDeleted') })
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

async function onSaved() {
  showForm.value = false
  editingCustomer.value = null
  await loadCustomers()
}

async function loadCustomers() {
  try {
    await store.fetchCustomers()
    if (store.error) {
      $q.notify({ type: 'negative', message: t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => {
  void loadCustomers()
})
</script>
