<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 420px" class="cost-center-form">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="mdi-office-building" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6">{{ t('accounting.newCostCenter') }}</div>
        <q-space />
        <q-btn icon="mdi-close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <q-input v-model="form.costCenterName" :label="t('accounting.costCenterName')" outlined dense class="q-mb-sm">
          <template #prepend><q-icon name="mdi-label-outline" /></template>
        </q-input>
        <q-input v-model="form.costCenterCode" :label="t('accounting.costCenterCode')" outlined dense class="q-mb-sm">
          <template #prepend><q-icon name="mdi-identifier" /></template>
        </q-input>
        <q-input v-model="form.parent" :label="t('accounting.parent')" outlined dense class="q-mb-sm">
          <template #prepend><q-icon name="mdi-folder-outline" /></template>
        </q-input>
        <q-input v-model.number="form.budget" :label="t('accounting.budget')" outlined type="number" dense class="q-mb-sm" min="0">
          <template #prepend><q-icon name="mdi-cash" /></template>
        </q-input>
        <q-input v-model="form.company" :label="t('accounting.company')" outlined dense>
          <template #prepend><q-icon name="mdi-domain" /></template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat :label="t('common.cancel')" no-caps @click="close" />
        <q-btn color="primary" :label="t('accounting.submit')" no-caps rounded icon="mdi-check" :loading="saving" @click="save" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { createCostCenter } from '../services/costCenter.service'

const { t } = useLcI18n()
const $q = useQuasar()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const show = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const saving = ref(false)

const form = reactive({
  costCenterName: '',
  costCenterCode: '',
  parent: '',
  budget: 0,
  company: '',
})

function resetForm() {
  form.costCenterName = ''
  form.costCenterCode = ''
  form.parent = ''
  form.budget = 0
  form.company = ''
}

function close() {
  show.value = false
  resetForm()
}

async function save() {
  if (!form.costCenterName) {
    $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
    return
  }
  if (!form.costCenterCode) {
    $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
    return
  }
  saving.value = true
  try {
    const result = await createCostCenter({
      costCenterName: form.costCenterName,
      costCenterCode: form.costCenterCode,
      parent: form.parent,
      budget: form.budget,
      company: form.company,
      disabled: false,
    })
    if (result.success) {
      emit('saved')
      close()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message ?? t('common.error') })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.cost-center-form {
  border-radius: 16px;
}
</style>
