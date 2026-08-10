<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-warehouse" size="2rem" color="primary" />
        <span class="text-h6">{{ t('inventory.dashboard') }}</span>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md q-mb-lg">
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-primary">{{ store.products.length }}</div>
              <div class="text-caption">{{ t('inventory.totalProducts') }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-positive">{{ lowStockCount }}</div>
              <div class="text-caption">{{ t('inventory.lowStock') }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-warning">{{ store.warehouses.length }}</div>
              <div class="text-caption">{{ t('inventory.totalWarehouses') }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center">
              <div class="text-h4 text-info">{{ store.stockEntries.length }}</div>
              <div class="text-caption">{{ t('inventory.totalEntries') }}</div>
            </q-card-section>
          </q-card>
        </div>

        <div class="text-subtitle1 q-mb-sm">{{ t('inventory.recentEntries') }}</div>
        <q-table :rows="recentEntries" :columns="entryColumns" row-key="name" flat dense />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useInventoryStore } from '../stores/useInventoryStore'

const { t } = useLcI18n()
const store = useInventoryStore()
const $q = useQuasar()
const loading = ref(false)

const lowStockCount = computed(() =>
  store.products.filter(p => p.currentStock <= p.minimumStock).length
)

const recentEntries = computed(() => store.stockEntries.slice(0, 5))

const entryColumns = computed(() => [
  { name: 'name', label: t('inventory.entryNumber'), field: 'name' },
  { name: 'entryType', label: t('inventory.entryType'), field: 'entryType' },
  { name: 'postingDate', label: t('inventory.postingDate'), field: 'postingDate' },
  { name: 'totalAmount', label: t('inventory.totalAmount'), field: 'totalAmount', format: (v: number) => v.toLocaleString() },
  { name: 'status', label: t('inventory.status'), field: 'status' },
])

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      store.fetchProducts(),
      store.fetchStockEntries(),
      store.fetchWarehouses(),
    ])
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    loading.value = false
  }
})
</script>
