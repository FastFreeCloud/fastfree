<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" persistent>
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon :name="employee ? 'mdi-pencil' : 'mdi-plus'" size="1.5rem" color="primary" />
        <span class="text-h6">{{ employee ? t('hr.editEmployee') : t('hr.addEmployee') }}</span>
        <q-space />
        <q-btn flat round icon="mdi-close" :aria-label="t('common.cancel')" @click="close" />
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="save">
          <div class="q-gutter-md">
            <q-input
              v-model="form.employee_name"
              :label="t('hr.employeeName')"
              outlined
              :rules="[val => !!val || t('validation.fieldRequired')]"
              aria-label="Employee Name"
            />
            <q-select
              v-model="form.department"
              :options="departmentOptions"
              :label="t('hr.department')"
              outlined
              emit-value
              map-options
              :rules="[val => !!val || t('validation.fieldRequired')]"
              :aria-label="t('hr.selectDepartment')"
              options-dense
            />
            <q-select
              v-model="form.designation"
              :options="designationOptions"
              :label="t('hr.designation')"
              outlined
              emit-value
              map-options
              :aria-label="t('hr.selectDesignation')"
              options-dense
            />
            <q-input
              v-model="form.date_of_joining"
              :label="t('hr.dateOfJoining')"
              outlined
              type="date"
              :rules="[val => !!val || t('validation.fieldRequired')]"
              aria-label="Date of Joining"
            />
            <q-input
              v-model="form.personal_email"
              :label="t('hr.personalEmail')"
              outlined
              type="email"
              :rules="[val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || t('validation.fieldRequired')]"
              aria-label="Personal Email"
            />
            <q-input
              v-model="form.company_email"
              :label="t('hr.companyEmail')"
              outlined
              type="email"
              :rules="[val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || t('validation.fieldRequired')]"
              aria-label="Company Email"
            />
            <q-input
              v-model="form.phone"
              :label="t('hr.phone')"
              outlined
              aria-label="Phone"
            />
            <q-select
              v-model="form.gender"
              :options="genderOptions"
              :label="t('hr.gender')"
              outlined
              emit-value
              map-options
              :aria-label="t('hr.gender')"
              options-dense
            />
            <q-select
              v-model="form.status"
              :options="statusOptions"
              :label="t('hr.status')"
              outlined
              emit-value
              map-options
              :rules="[val => !!val || t('validation.fieldRequired')]"
              :aria-label="t('hr.status')"
              options-dense
            />

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat :label="t('common.cancel')" @click="close" type="button" />
              <q-btn type="submit" color="primary" :label="t('common.save')" :loading="saving" />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { createEmployee, updateEmployee } from '../services/employee.service'
import { useHrStore } from '../stores/useHrStore'
import type { Employee } from '../types'

const props = defineProps<{
  modelValue: boolean
  employee?: Employee | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const { t } = useLcI18n()
const $q = useQuasar()
const store = useHrStore()

const saving = ref(false)

const genderOptions = [
  { label: t('hr.male'), value: 'Male' },
  { label: t('hr.female'), value: 'Female' },
  { label: t('hr.other'), value: 'Other' },
]

const statusOptions = [
  { label: t('common.active'), value: 'Active' },
  { label: t('hr.inactive'), value: 'Inactive' },
  { label: t('hr.suspended'), value: 'Suspended' },
  { label: t('hr.left'), value: 'Left' },
  { label: t('hr.terminated'), value: 'Terminated' },
  { label: t('hr.retired'), value: 'Retired' },
]

const form = reactive<Partial<Employee>>({
  employee_name: '',
  department: '',
  designation: '',
  date_of_joining: '',
  personal_email: '',
  company_email: '',
  phone: '',
  gender: '',
  status: 'Active',
})

const departmentOptions = computed(() =>
  store.departments.map(d => ({ label: d.department_name, value: d.department_name }))
)

const designationOptions = computed(() =>
  store.designations.map(d => ({ label: d.designation_name, value: d.designation_name }))
)

watch(() => props.employee, (emp) => {
  if (emp) {
    form.employee_name = emp.employee_name
    form.department = emp.department ?? ''
    form.designation = emp.designation ?? ''
    form.date_of_joining = emp.date_of_joining
    form.personal_email = emp.personal_email ?? ''
    form.company_email = emp.company_email ?? ''
    form.phone = emp.phone ?? ''
    form.gender = emp.gender ?? ''
    form.status = emp.status
  } else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  form.employee_name = ''
  form.department = ''
  form.designation = ''
  form.date_of_joining = ''
  form.personal_email = ''
  form.company_email = ''
  form.phone = ''
  form.gender = ''
  form.status = 'Active'
}

function close() {
  emit('update:modelValue', false)
  resetForm()
}

async function save() {
  saving.value = true
  try {
    let result
    if (props.employee) {
      result = await updateEmployee(props.employee.employee_id, form)
    } else {
      result = await createEmployee(form)
    }
    if (result.success) {
      $q.notify({ type: 'positive', message: t('hr.employeeSaved') })
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

onMounted(() => {
  if (!store.departments.length) store.fetchDepartments()
  if (!store.designations.length) store.fetchDesignations()
})
</script>
