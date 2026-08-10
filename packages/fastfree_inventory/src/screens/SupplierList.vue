<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-truck" size="2rem" color="primary" />
        <span class="text-h6">{{ t('inventory.suppliers') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('inventory.addSupplier')" no-caps @click="openAdd" />
        <q-btn flat round icon="refresh" :aria-label="t('common.refresh')" @click="store.fetchSuppliers()" />
      </q-card-section>

      <q-card-section>
        <q-table :rows="store.suppliers" :columns="columns" row-key="name" :loading="store.loading" flat dense>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense size="sm" icon="mdi-pencil" color="warning" :aria-label="t('common.edit')" @click="editSupplier(props.row)" />
              <q-btn flat round dense size="sm" icon="mdi-delete" color="negative" :aria-label="t('common.delete')" @click="confirmDelete(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="mdi-truck" size="24px" color="primary" class="q-mr-sm" />
          <div class="text-h6">{{ editingSupplier ? t('inventory.editSupplier') : t('inventory.addSupplier') }}</div>
          <q-space />
          <q-btn icon="mdi-close" flat round dense @click="closeForm" />
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="save" class="q-gutter-sm">
            <q-input v-model="form.supplierName" :label="t('inventory.supplierName')" outlined dense :rules="[val => !!val || t('common.required')]" />
            <q-input v-model="form.supplierCode" :label="t('inventory.supplierCode')" outlined dense :rules="[val => !!val || t('common.required')]" />
            <q-input v-model="form.contactPerson" :label="t('inventory.contactPerson')" outlined dense />
            <q-input v-model="form.email" :label="t('inventory.email')" outlined dense />
            <q-input v-model="form.phone" :label="t('inventory.phone')" outlined dense />
            <q-input v-model="form.address" :label="t('inventory.address')" outlined dense />
            <q-input v-model="form.gstNumber" :label="t('inventory.gstNumber')" outlined dense />

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
import { createSupplier, updateSupplier, deleteSupplier } from '../services'
import type { Supplier } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useInventoryStore()

const showForm = ref(false)
const confirmDeleteVisible = ref(false)
const editingSupplier = ref<Supplier | null>(null)
const deletingSupplier = ref<Supplier | null>(null)
const saving = ref(false)

const form = reactive({
  supplierName: '',
  supplierCode: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  gstNumber: '',
})

const columns = computed(() => [
  { name: 'supplierCode', label: t('inventory.supplierCode'), field: 'supplierCode', sortable: true },
  { name: 'supplierName', label: t('inventory.supplierName'), field: 'supplierName', sortable: true },
  { name: 'contactPerson', label: t('inventory.contactPerson'), field: 'contactPerson' },
  { name: 'email', label: t('inventory.email'), field: 'email' },
  { name: 'phone', label: t('inventory.phone'), field: 'phone' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function openAdd() {
  editingSupplier.value = null
  resetForm()
  showForm.value = true
}

function editSupplier(supplier: Supplier) {
  editingSupplier.value = supplier
  form.supplierName = supplier.supplierName
  form.supplierCode = supplier.supplierCode
  form.contactPerson = supplier.contactPerson ?? ''
  form.email = supplier.email ?? ''
  form.phone = supplier.phone ?? ''
  form.address = supplier.address ?? ''
  form.gstNumber = supplier.gstNumber ?? ''
  showForm.value = true
}

function confirmDelete(supplier: Supplier) {
  deletingSupplier.value = supplier
  confirmDeleteVisible.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

function resetForm() {
  form.supplierName = ''
  form.supplierCode = ''
  form.contactPerson = ''
  form.email = ''
  form.phone = ''
  form.address = ''
  form.gstNumber = ''
}

async function save() {
  saving.value = true
  try {
    let result
    if (editingSupplier.value) {
      result = await updateSupplier(editingSupplier.value.name, {
        supplierName: form.supplierName,
        supplierCode: form.supplierCode,
        ...(form.contactPerson ? { contactPerson: form.contactPerson } : {}),
        ...(form.email ? { email: form.email } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.address ? { address: form.address } : {}),
        ...(form.gstNumber ? { gstNumber: form.gstNumber } : {}),
      })
    } else {
      result = await createSupplier({
        supplierName: form.supplierName,
        supplierCode: form.supplierCode,
        disabled: false,
        ...(form.contactPerson ? { contactPerson: form.contactPerson } : {}),
        ...(form.email ? { email: form.email } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.address ? { address: form.address } : {}),
        ...(form.gstNumber ? { gstNumber: form.gstNumber } : {}),
      })
    }
    if (result.success) {
      await store.fetchSuppliers()
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
  if (!deletingSupplier.value) return
  try {
    const result = await deleteSupplier(deletingSupplier.value.name)
    if (result.success) {
      await store.fetchSuppliers()
      confirmDeleteVisible.value = false
      deletingSupplier.value = null
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => store.fetchSuppliers())
</script>
