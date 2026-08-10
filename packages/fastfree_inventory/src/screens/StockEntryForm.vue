<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 650px">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="mdi-swap-horizontal" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6">{{ t('inventory.addEntry') }}</div>
        <q-space />
        <q-btn icon="mdi-close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="save" class="q-gutter-sm">
          <q-select v-model="form.entryType" :options="entryTypeOptions" :label="t('inventory.entryType')" outlined dense emit-value map-options />
          <q-input v-model="form.postingDate" :label="t('inventory.postingDate')" outlined dense type="date" />
          <q-input v-model="form.remarks" :label="t('inventory.remarks')" outlined dense />

          <div class="text-subtitle2 q-mt-md q-mb-sm">{{ t('inventory.items') }}</div>
          <div v-for="(item, index) in form.items" :key="index" class="row q-gutter-sm q-mb-sm items-center">
            <q-select
              v-model="item.product"
              :options="productOptions"
              :label="t('inventory.product')"
              outlined dense emit-value map-options
              class="col"
            />
            <q-input v-model.number="item.quantity" :label="t('inventory.quantity')" outlined dense type="number" class="col" :rules="[val => val >= 1 || t('common.required')]" />
            <q-input v-model.number="item.rate" :label="t('inventory.rate')" outlined dense type="number" class="col" :rules="[val => val >= 0 || t('common.required')]" />
            <q-btn flat round dense icon="mdi-delete" color="negative" @click="removeItem(index)" />
          </div>
          <q-btn flat color="primary" icon="mdi-plus" :label="t('inventory.addItem')" no-caps @click="addItem" class="q-mb-md" />

          <div v-if="form.entryType === 'Transfer'" class="row q-gutter-sm">
            <q-select
              v-model="form.sourceWarehouse"
              :options="warehouseOptions"
              :label="t('inventory.sourceWarehouse')"
              outlined dense emit-value map-options clearable class="col"
            />
            <q-select
              v-model="form.targetWarehouse"
              :options="warehouseOptions"
              :label="t('inventory.targetWarehouse')"
              outlined dense emit-value map-options clearable class="col"
            />
          </div>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat :label="t('common.cancel')" @click="close" type="button" />
            <q-btn color="primary" :label="t('common.confirm')" :loading="saving" type="submit" />
          </q-card-actions>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useInventoryStore } from '../stores/useInventoryStore'
import { createStockEntry } from '../services'
import type { StockEntryType, StockEntryItem, StockEntry } from '../types'

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
  entryType: 'Receipt' as StockEntryType,
  postingDate: new Date().toISOString().split('T')[0],
  remarks: '',
  items: [] as Array<{ product: string | null; quantity: number; rate: number }>,
  sourceWarehouse: null as string | null,
  targetWarehouse: null as string | null,
})

const entryTypeOptions = computed(() => [
  { label: t('inventory.receipt'), value: 'Receipt' },
  { label: t('inventory.issue'), value: 'Issue' },
  { label: t('inventory.transfer'), value: 'Transfer' },
  { label: t('inventory.adjustment'), value: 'Adjustment' },
])

const productOptions = computed(() =>
  store.products.map(p => ({ label: `${p.productCode} - ${p.productName}`, value: p.name }))
)

const warehouseOptions = computed(() =>
  store.warehouses.map(w => ({ label: `${w.warehouseCode} - ${w.warehouseName}`, value: w.name }))
)

function addItem() {
  form.items.push({ product: null, quantity: 0, rate: 0 })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

function close() {
  show.value = false
  resetForm()
}

function resetForm() {
  form.entryType = 'Receipt'
  form.postingDate = new Date().toISOString().split('T')[0]
  form.remarks = ''
  form.items = []
  form.sourceWarehouse = null
  form.targetWarehouse = null
}

async function save() {
  saving.value = true
  try {
    const items: StockEntryItem[] = form.items.map(item => ({
      product: item.product ?? '',
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
      ...(form.sourceWarehouse ? { sourceWarehouse: form.sourceWarehouse } : {}),
      ...(form.targetWarehouse ? { targetWarehouse: form.targetWarehouse } : {}),
    }))

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

    const payload: Partial<StockEntry> = {
      entryType: form.entryType,
      postingDate: form.postingDate || new Date().toISOString().split('T')[0]!,
      items,
      totalAmount,
      status: 'Draft',
    }
    if (form.remarks) payload.remarks = form.remarks
    const result = await createStockEntry(payload as Parameters<typeof createStockEntry>[0])
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
