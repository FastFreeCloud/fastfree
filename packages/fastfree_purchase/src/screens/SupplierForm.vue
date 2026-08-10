<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card style="min-width: 420px">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="mdi-truck" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6">{{ editingSupplier ? t('purchase.editSupplier') : t('purchase.addSupplier') }}</div>
        <q-space />
        <q-btn icon="mdi-close" flat round dense aria-label="Close" @click="close" />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="save" class="q-gutter-sm">
          <q-input v-model="form.supplierName" :label="t('purchase.supplierName')" outlined dense :rules="[val => !!val || t('validation.fieldRequired')]" />
          <q-select v-model="form.supplierType" :options="supplierTypeOptions" :label="t('purchase.supplierType')" outlined dense emit-value map-options :rules="[val => !!val || t('validation.fieldRequired')]" aria-label="Supplier Type" />
          <q-input v-model="form.mobileNo" :label="t('purchase.mobileNo')" outlined dense />
          <q-input v-model="form.email" :label="t('purchase.email')" outlined dense :rules="[val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || t('validation.fieldRequired')]" />
          <q-input v-model="form.address" :label="t('purchase.address')" outlined dense />

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat :label="t('common.cancel')" @click="close" type="button" />
            <q-btn color="primary" :label="t('common.save')" :loading="saving" type="submit" />
          </q-card-actions>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { createSupplier, updateSupplier } from '../services/supplier.service'
import type { Supplier } from '../types'

const props = defineProps<{
  modelValue: boolean
  supplier?: Supplier | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const { t } = useLcI18n()
const $q = useQuasar()

const editingSupplier = ref<Supplier | null>(null)
const saving = ref(false)

const supplierTypeOptions = computed(() => [
  { label: t('common.company'), value: 'Company' },
  { label: t('common.individual'), value: 'Individual' },
])

const form = reactive({
  supplierName: '',
  supplierType: 'Company' as 'Company' | 'Individual',
  mobileNo: '',
  email: '',
  address: '',
})

watch(() => props.supplier, (val) => {
  editingSupplier.value = val ?? null
  if (val) {
    form.supplierName = val.supplierName
    form.supplierType = val.supplierType
    form.mobileNo = val.mobileNo ?? ''
    form.email = val.email ?? ''
    form.address = val.address ?? ''
  } else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  form.supplierName = ''
  form.supplierType = 'Company'
  form.mobileNo = ''
  form.email = ''
  form.address = ''
}

function close() {
  emit('update:modelValue', false)
  resetForm()
}

async function save() {
  saving.value = true
  try {
    let result
    if (editingSupplier.value) {
      result = await updateSupplier(editingSupplier.value.name, {
        supplierName: form.supplierName,
        supplierType: form.supplierType,
        ...(form.mobileNo ? { mobileNo: form.mobileNo } : {}),
        ...(form.email ? { email: form.email } : {}),
        ...(form.address ? { address: form.address } : {}),
      })
    } else {
      result = await createSupplier({
        supplierName: form.supplierName,
        supplierType: form.supplierType,
        disabled: false,
        ...(form.mobileNo ? { mobileNo: form.mobileNo } : {}),
        ...(form.email ? { email: form.email } : {}),
        ...(form.address ? { address: form.address } : {}),
      })
    }
    if (result.success) {
      emit('saved')
      close()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    saving.value = false
  }
}
</script>
