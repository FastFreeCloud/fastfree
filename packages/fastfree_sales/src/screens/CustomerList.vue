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
              <q-badge :color="props.row.customer_type === 'Company' ? 'blue' : 'grey'" :label="translateCustomerType(props.row.customer_type)" />
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
import type { Customer } from '../types'

const { t } = useLcI18n()
const store = useSalesStore()
const $q = useQuasar()

const search = ref('')
const showForm = ref(false)
const editingCustomer = ref<Customer | null>(null)
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'customer_name', label: t('sales.customerName'), field: 'customer_name', sortable: true },
  { name: 'customer_type', label: t('sales.customerType'), field: 'customer_type' },
  { name: 'email', label: t('sales.email'), field: 'email' },
  { name: 'phone', label: t('sales.phone'), field: 'phone' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function translateCustomerType(type: string): string {
  const map: Record<string, string> = {
    Individual: t('sales.individual'),
    Company: t('sales.company'),
  }
  return map[type] ?? type
}

function openAdd() {
  editingCustomer.value = null
  showForm.value = true
}

function editCustomer(customer: Customer) {
  editingCustomer.value = customer
  showForm.value = true
}

function deleteCustomer(customer: Customer) {
  deleteTarget.value = customer.name
  confirmDelete.value = true
}

async function confirmDeleteCustomer() {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    await apiDeleteCustomer(name)
    $q.notify({ type: 'positive', message: t('sales.customerDeleted') })
    await store.fetchCustomers()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function onSaved() {
  showForm.value = false
  editingCustomer.value = null
  store.fetchCustomers()
}

onMounted(() => store.fetchCustomers())
</script>
