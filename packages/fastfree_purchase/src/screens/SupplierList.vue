<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-truck" size="2rem" color="primary" />
        <span class="text-h6">{{ t('purchase.suppliers') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('purchase.addSupplier')" no-caps @click="openAdd" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="suppliers"
          :columns="columns"
          row-key="name"
          :loading="loading"
          :filter="search"
          flat
        >
          <template #top-right>
            <q-input v-model="search" :placeholder="t('common.search')" dense outlined clearable style="width: 200px">
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </template>
          <template #body-cell-supplier_type="props">
            <q-td :props="props">
              <q-badge :color="props.row.supplierType === 'Company' ? 'blue' : 'grey'" :label="translateSupplierType(props.row.supplierType)" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round icon="mdi-pencil" size="sm" color="warning" :aria-label="t('common.edit')" @click="editSupplier(props.row)" />
              <q-btn flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteSupplier(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <SupplierForm v-model="showForm" :supplier="editingSupplier" @saved="onSaved" />

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('common.confirmDelete') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteSupplier" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { getSuppliers, deleteSupplier as apiDeleteSupplier } from '../services'
import SupplierForm from './SupplierForm.vue'
import type { Supplier } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()

const suppliers = ref<Supplier[]>([])
const loading = ref(false)
const search = ref('')
const showForm = ref(false)
const editingSupplier = ref<Supplier | null>(null)
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'supplier_name', label: t('purchase.supplierName'), field: 'supplierName', sortable: true },
  { name: 'supplier_type', label: t('purchase.supplierType'), field: 'supplierType' },
  { name: 'email', label: t('purchase.email'), field: 'email' },
  { name: 'mobile_no', label: t('purchase.mobileNo'), field: 'mobileNo' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function translateSupplierType(type: string): string {
  const map: Record<string, string> = {
    Individual: t('purchase.supplier'),
    Company: t('purchase.company'),
  }
  return map[type] ?? type
}

async function fetchSuppliers() {
  loading.value = true
  try {
    const result = await getSuppliers()
    if (result.success && result.data) {
      suppliers.value = result.data
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editingSupplier.value = null
  showForm.value = true
}

function editSupplier(supplier: Supplier) {
  editingSupplier.value = supplier
  showForm.value = true
}

function deleteSupplier(supplier: Supplier) {
  deleteTarget.value = supplier.name
  confirmDelete.value = true
}

async function confirmDeleteSupplier() {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    await apiDeleteSupplier(name)
    $q.notify({ type: 'positive', message: t('common.delete') })
    await fetchSuppliers()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function onSaved() {
  showForm.value = false
  editingSupplier.value = null
  fetchSuppliers()
}

onMounted(fetchSuppliers)
</script>
