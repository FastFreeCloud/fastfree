<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-package-variant" size="2rem" color="primary" />
        <span class="text-h6">{{ t('inventory.products') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('inventory.addProduct')" no-caps @click="showForm = true" />
        <q-btn flat round icon="refresh" :aria-label="t('common.refresh')" @click="store.fetchProducts()" />
      </q-card-section>

      <q-card-section>
        <q-table :rows="store.products" :columns="columns" row-key="name" :loading="store.loading" flat dense>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="props.row.status === 'Active' ? 'positive' : props.row.status === 'Inactive' ? 'warning' : 'negative'" :label="props.row.status" />
            </q-td>
          </template>
          <template #body-cell-stock="props">
            <q-td :props="props">
              <span :class="props.row.currentStock <= props.row.minimumStock ? 'text-negative text-weight-bold' : ''">
                {{ props.row.currentStock }}
              </span>
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense size="sm" icon="mdi-eye" color="primary" :aria-label="t('common.view')" @click="viewProduct(props.row)" />
              <q-btn flat round dense size="sm" icon="mdi-delete" color="negative" :aria-label="t('common.delete')" @click="confirmDelete(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <ProductForm v-model="showForm" @saved="onSaved" />

    <q-dialog v-model="showDetail">
      <q-card v-if="selectedProduct" style="min-width: 500px">
        <q-card-section class="row items-center">
          <q-icon name="mdi-package-variant" size="1.5rem" color="primary" class="q-mr-sm" />
          <span class="text-h6">{{ selectedProduct.productName }}</span>
          <q-space />
          <q-btn icon="close" flat round dense @click="showDetail = false" />
        </q-card-section>
        <q-card-section>
          <div class="row q-gutter-md">
            <div class="col"><b>{{ t('inventory.productCode') }}:</b> {{ selectedProduct.productCode }}</div>
            <div class="col"><b>{{ t('inventory.category') }}:</b> {{ selectedProduct.category || '-' }}</div>
            <div class="col"><b>{{ t('inventory.unitOfMeasure') }}:</b> {{ selectedProduct.unitOfMeasure }}</div>
            <div class="col"><b>{{ t('inventory.status') }}:</b> {{ selectedProduct.status }}</div>
            <div class="col"><b>{{ t('inventory.buyingPrice') }}:</b> {{ selectedProduct.buyingPrice }}</div>
            <div class="col"><b>{{ t('inventory.sellingPrice') }}:</b> {{ selectedProduct.sellingPrice }}</div>
            <div class="col"><b>{{ t('inventory.currentStock') }}:</b> {{ selectedProduct.currentStock }}</div>
            <div class="col"><b>{{ t('inventory.minimumStock') }}:</b> {{ selectedProduct.minimumStock }}</div>
            <div class="col"><b>{{ t('inventory.warehouse') }}:</b> {{ selectedProduct.warehouse || '-' }}</div>
            <div class="col"><b>{{ t('inventory.supplier') }}:</b> {{ selectedProduct.supplier || '-' }}</div>
          </div>
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useInventoryStore } from '../stores/useInventoryStore'
import { deleteProduct } from '../services'
import type { Product } from '../types'
import ProductForm from './ProductForm.vue'

const { t } = useLcI18n()
const store = useInventoryStore()
const $q = useQuasar()

const showForm = ref(false)
const showDetail = ref(false)
const confirmDeleteVisible = ref(false)
const selectedProduct = ref<Product | null>(null)
const deletingProduct = ref<Product | null>(null)

const columns = computed(() => [
  { name: 'productCode', label: t('inventory.productCode'), field: 'productCode', sortable: true },
  { name: 'productName', label: t('inventory.productName'), field: 'productName', sortable: true },
  { name: 'category', label: t('inventory.category'), field: 'category' },
  { name: 'currentStock', label: t('inventory.currentStock'), field: 'currentStock', sortable: true },
  { name: 'unitOfMeasure', label: t('inventory.unitOfMeasure'), field: 'unitOfMeasure' },
  { name: 'sellingPrice', label: t('inventory.sellingPrice'), field: 'sellingPrice', format: (v: number) => v.toLocaleString() },
  { name: 'status', label: t('inventory.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function viewProduct(product: Product) {
  selectedProduct.value = product
  showDetail.value = true
}

function confirmDelete(product: Product) {
  deletingProduct.value = product
  confirmDeleteVisible.value = true
}

async function handleDelete() {
  if (!deletingProduct.value) return
  try {
    await deleteProduct(deletingProduct.value.name)
    $q.notify({ type: 'positive', message: t('inventory.productDeleted') })
    await store.fetchProducts()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    confirmDeleteVisible.value = false
    deletingProduct.value = null
  }
}

function onSaved() {
  store.fetchProducts()
}

onMounted(() => store.fetchProducts())
</script>
