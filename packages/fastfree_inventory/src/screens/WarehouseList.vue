<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-warehouse" size="2rem" color="primary" />
        <span class="text-h6">{{ t('inventory.warehouses') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('inventory.addWarehouse')" no-caps @click="openAdd" />
        <q-btn flat round icon="refresh" :aria-label="t('common.refresh')" @click="store.fetchWarehouses()" />
      </q-card-section>

      <q-card-section>
        <q-table :rows="store.warehouses" :columns="columns" row-key="name" :loading="store.loading" flat dense>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense size="sm" icon="mdi-pencil" color="warning" :aria-label="t('common.edit')" @click="editWarehouse(props.row)" />
              <q-btn flat round dense size="sm" icon="mdi-delete" color="negative" :aria-label="t('common.delete')" @click="confirmDelete(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="mdi-warehouse" size="24px" color="primary" class="q-mr-sm" />
          <div class="text-h6">{{ editingWarehouse ? t('inventory.editWarehouse') : t('inventory.addWarehouse') }}</div>
          <q-space />
          <q-btn icon="mdi-close" flat round dense @click="closeForm" />
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="save" class="q-gutter-sm">
            <q-input v-model="form.warehouseName" :label="t('inventory.warehouseName')" outlined dense :rules="[val => !!val || t('common.required')]" />
            <q-input v-model="form.warehouseCode" :label="t('inventory.warehouseCode')" outlined dense :rules="[val => !!val || t('common.required')]" />
            <q-input v-model="form.address" :label="t('inventory.address')" outlined dense />
            <q-input v-model="form.phone" :label="t('inventory.phone')" outlined dense />
            <q-input v-model="form.manager" :label="t('inventory.manager')" outlined dense />

            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat :label="t('common.cancel')" @click="closeForm" type="button" />
              <q-btn color="primary" :label="t('common.confirm')" :loading="saving" type="submit" />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDeleteVisible" persistent>
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-alert" color="warning" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="t('common.cancel')" />
          <q-btn color="negative" :label="t('common.confirm')" @click="handleDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useInventoryStore } from '../stores/useInventoryStore'
import { createWarehouse, updateWarehouse, deleteWarehouse } from '../services'
import type { Warehouse } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useInventoryStore()

const showForm = ref(false)
const confirmDeleteVisible = ref(false)
const editingWarehouse = ref<Warehouse | null>(null)
const deletingWarehouse = ref<Warehouse | null>(null)
const saving = ref(false)

const form = reactive({
  warehouseName: '',
  warehouseCode: '',
  address: '',
  phone: '',
  manager: '',
})

const columns = computed(() => [
  { name: 'warehouseCode', label: t('inventory.warehouseCode'), field: 'warehouseCode', sortable: true },
  { name: 'warehouseName', label: t('inventory.warehouseName'), field: 'warehouseName', sortable: true },
  { name: 'address', label: t('inventory.address'), field: 'address' },
  { name: 'phone', label: t('inventory.phone'), field: 'phone' },
  { name: 'manager', label: t('inventory.manager'), field: 'manager' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function openAdd() {
  editingWarehouse.value = null
  resetForm()
  showForm.value = true
}

function editWarehouse(warehouse: Warehouse) {
  editingWarehouse.value = warehouse
  form.warehouseName = warehouse.warehouseName
  form.warehouseCode = warehouse.warehouseCode
  form.address = warehouse.address ?? ''
  form.phone = warehouse.phone ?? ''
  form.manager = warehouse.manager ?? ''
  showForm.value = true
}

function confirmDelete(warehouse: Warehouse) {
  deletingWarehouse.value = warehouse
  confirmDeleteVisible.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

function resetForm() {
  form.warehouseName = ''
  form.warehouseCode = ''
  form.address = ''
  form.phone = ''
  form.manager = ''
}

async function save() {
  saving.value = true
  try {
    let result
    if (editingWarehouse.value) {
      result = await updateWarehouse(editingWarehouse.value.name, {
        warehouseName: form.warehouseName,
        warehouseCode: form.warehouseCode,
        ...(form.address ? { address: form.address } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.manager ? { manager: form.manager } : {}),
      })
    } else {
      result = await createWarehouse({
        warehouseName: form.warehouseName,
        warehouseCode: form.warehouseCode,
        disabled: false,
        ...(form.address ? { address: form.address } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.manager ? { manager: form.manager } : {}),
      })
    }
    if (result.success) {
      await store.fetchWarehouses()
      closeForm()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingWarehouse.value) return
  try {
    const result = await deleteWarehouse(deletingWarehouse.value.name)
    if (result.success) {
      await store.fetchWarehouses()
      confirmDeleteVisible.value = false
      deletingWarehouse.value = null
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => store.fetchWarehouses())
</script>
