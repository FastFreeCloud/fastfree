<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="mdi-package-variant" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6">{{ t('inventory.addProduct') }}</div>
        <q-space />
        <q-btn icon="mdi-close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="save" class="q-gutter-sm">
          <q-input v-model="form.productName" :label="t('inventory.productName')" outlined dense :rules="[val => !!val || t('common.required')]" />
          <q-input v-model="form.productCode" :label="t('inventory.productCode')" outlined dense :rules="[val => !!val || t('common.required')]" />
          <q-input v-model="form.barcode" :label="t('inventory.barcode')" outlined dense />
          <q-select v-model="form.category" :options="categoryOptions" :label="t('inventory.category')" outlined dense emit-value map-options clearable />
          <q-select v-model="form.unitOfMeasure" :options="uomOptions" :label="t('inventory.unitOfMeasure')" outlined dense emit-value map-options :rules="[val => !!val || t('common.required')]" />
          <div class="row q-gutter-sm">
            <q-input v-model.number="form.buyingPrice" :label="t('inventory.buyingPrice')" outlined dense type="number" class="col" />
            <q-input v-model.number="form.sellingPrice" :label="t('inventory.sellingPrice')" outlined dense type="number" class="col" />
          </div>
          <div class="row q-gutter-sm">
            <q-input v-model.number="form.minimumStock" :label="t('inventory.minimumStock')" outlined dense type="number" class="col" />
            <q-input v-model.number="form.maximumStock" :label="t('inventory.maximumStock')" outlined dense type="number" class="col" />
          </div>
          <q-input v-model.number="form.taxRate" :label="t('inventory.taxRate')" outlined dense type="number" />
          <q-select v-model="form.warehouse" :options="warehouseOptions" :label="t('inventory.warehouse')" outlined dense emit-value map-options clearable />
          <q-select v-model="form.supplier" :options="supplierOptions" :label="t('inventory.supplier')" outlined dense emit-value map-options clearable />
          <q-select v-model="form.status" :options="statusOptions" :label="t('inventory.status')" outlined dense emit-value map-options />
          <q-input v-model="form.description" :label="t('inventory.description')" outlined dense type="textarea" />
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat :label="t('common.cancel')" @click="close" />
        <q-btn color="primary" :label="t('common.confirm')" :loading="saving" type="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useInventoryStore } from '../stores/useInventoryStore'
import { createProduct } from '../services'
import type { UnitOfMeasure, ProductStatus } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useInventoryStore()

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean]; saved: [] }>()

const show = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const saving = ref(false)

const form = reactive({
  productName: '',
  productCode: '',
  barcode: '',
  category: null as string | null,
  unitOfMeasure: 'Piece' as UnitOfMeasure,
  buyingPrice: 0,
  sellingPrice: 0,
  minimumStock: 0,
  maximumStock: 0,
  taxRate: 0,
  warehouse: null as string | null,
  supplier: null as string | null,
  status: 'Active' as ProductStatus,
  description: '',
})

const uomOptions = computed(() => [
  { label: t('inventory.piece'), value: 'Piece' },
  { label: t('inventory.kg'), value: 'Kg' },
  { label: t('inventory.gram'), value: 'Gram' },
  { label: t('inventory.liter'), value: 'Liter' },
  { label: t('inventory.meter'), value: 'Meter' },
  { label: t('inventory.box'), value: 'Box' },
  { label: t('inventory.pack'), value: 'Pack' },
  { label: t('inventory.dozen'), value: 'Dozen' },
])

const statusOptions = computed(() => [
  { label: t('inventory.active'), value: 'Active' },
  { label: t('inventory.inactive'), value: 'Inactive' },
  { label: t('inventory.discontinued'), value: 'Discontinued' },
])

onMounted(() => {
  store.fetchCategories()
  store.fetchWarehouses()
  store.fetchSuppliers()
})

const categoryOptions = computed(() =>
  store.categories.map(c => ({ label: `${c.categoryCode} - ${c.categoryName}`, value: c.name }))
)
const warehouseOptions = computed(() =>
  store.warehouses.map(w => ({ label: `${w.warehouseCode} - ${w.warehouseName}`, value: w.name }))
)
const supplierOptions = computed(() =>
  store.suppliers.map(s => ({ label: `${s.supplierCode} - ${s.supplierName}`, value: s.name }))
)

function close() {
  show.value = false
  resetForm()
}

function resetForm() {
  form.productName = ''
  form.productCode = ''
  form.barcode = ''
  form.category = null
  form.unitOfMeasure = 'Piece'
  form.buyingPrice = 0
  form.sellingPrice = 0
  form.minimumStock = 0
  form.maximumStock = 0
  form.taxRate = 0
  form.warehouse = null
  form.supplier = null
  form.status = 'Active'
  form.description = ''
}

async function save() {
  saving.value = true
  try {
    const result = await createProduct({
      productName: form.productName,
      productCode: form.productCode,
      barcode: form.barcode,
      unitOfMeasure: form.unitOfMeasure,
      buyingPrice: form.buyingPrice,
      sellingPrice: form.sellingPrice,
      currentStock: 0,
      openingStock: 0,
      minimumStock: form.minimumStock,
      maximumStock: form.maximumStock,
      taxRate: form.taxRate,
      status: form.status,
      disabled: false,
      ...(form.category ? { category: form.category } : {}),
      ...(form.warehouse ? { warehouse: form.warehouse } : {}),
      ...(form.supplier ? { supplier: form.supplier } : {}),
      ...(form.description ? { description: form.description } : {}),
    })
    if (result.success) {
      emit('saved')
      close()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    saving.value = false
  }
}
</script>
