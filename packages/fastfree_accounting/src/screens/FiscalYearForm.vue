<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 420px" class="fiscal-year-form">
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="mdi-calendar-range" size="24px" color="primary" class="q-mr-sm" />
        <div class="text-h6">{{ t('accounting.newFiscalYear') }}</div>
        <q-space />
        <q-btn icon="mdi-close" flat round dense @click="close" />
      </q-card-section>

      <q-card-section>
        <q-input v-model="form.yearStartDate" :label="t('accounting.startDate')" outlined type="date" dense class="q-mb-sm">
          <template #prepend><q-icon name="mdi-calendar-start" /></template>
        </q-input>
        <q-input v-model="form.yearEndDate" :label="t('accounting.endDate')" outlined type="date" dense class="q-mb-sm">
          <template #prepend><q-icon name="mdi-calendar-end" /></template>
        </q-input>
        <q-checkbox v-model="form.isCurrent" :label="t('accounting.setCurrentFiscalYear')" class="q-mb-sm" />
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
import { createFiscalYear } from '../services/fiscalYear.service'

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
  yearStartDate: '',
  yearEndDate: '',
  isCurrent: false,
})

function resetForm() {
  form.yearStartDate = ''
  form.yearEndDate = ''
  form.isCurrent = false
}

function close() {
  show.value = false
  resetForm()
}

async function save() {
  if (!form.yearStartDate || !form.yearEndDate) {
    $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
    return
  }
  if (form.yearEndDate <= form.yearStartDate) {
    $q.notify({ type: 'warning', message: t('accounting.endDateMustBeAfterStart') })
    return
  }
  saving.value = true
  try {
    const result = await createFiscalYear({
      yearStartDate: form.yearStartDate,
      yearEndDate: form.yearEndDate,
      isCurrent: form.isCurrent,
      status: 'Open',
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
.fiscal-year-form {
  border-radius: 16px;
}
</style>
