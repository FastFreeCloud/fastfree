<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-domain" size="2rem" color="primary" />
        <span class="text-h6">{{ t('accounting.costCenters') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('accounting.addCostCenter')" no-caps @click="openAdd" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.costCenters"
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
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round icon="mdi-pencil" size="sm" color="warning" :aria-label="t('common.edit')" @click="editCostCenter(props.row)" />
              <q-btn flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteCostCenter(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <CostCenterForm v-model="showForm" @saved="onSaved" />

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('accounting.deleteCostCenterConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteCostCenter" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useAccountingStore } from '../stores/useAccountingStore'
import { deleteCostCenter as deleteCostCenterService } from '../services/costCenter.service'
import CostCenterForm from './CostCenterForm.vue'
import type { CostCenter } from '../types'

const { t } = useLcI18n()
const store = useAccountingStore()
const $q = useQuasar()

const search = ref('')
const showForm = ref(false)
const editingCostCenter = ref<CostCenter | null>(null)
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'name', label: t('accounting.costCenterCode'), field: 'name', sortable: true },
  { name: 'costCenterName', label: t('accounting.costCenterName'), field: 'costCenterName', sortable: true },
  { name: 'parent', label: t('accounting.parent'), field: 'parent' },
  { name: 'budget', label: t('accounting.budget'), field: 'budget', sortable: true, format: (v: number) => new Intl.NumberFormat().format(v) },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function openAdd() {
  editingCostCenter.value = null
  showForm.value = true
}

function editCostCenter(costCenter: CostCenter) {
  editingCostCenter.value = costCenter
  showForm.value = true
}

function deleteCostCenter(costCenter: CostCenter) {
  deleteTarget.value = costCenter.name
  confirmDelete.value = true
}

async function confirmDeleteCostCenter() {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    const result = await deleteCostCenterService(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('accounting.costCenterDeleted') })
      await store.fetchCostCenters()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function onSaved() {
  showForm.value = false
  editingCostCenter.value = null
  store.fetchCostCenters()
}

onMounted(() => store.fetchCostCenters())
</script>
