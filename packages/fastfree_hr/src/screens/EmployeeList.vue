<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-account-group" size="2rem" color="primary" />
        <span class="text-h6">{{ t('hr.employees') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('hr.addEmployee')" no-caps @click="openAdd" />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="store.fetchEmployees" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.employees"
          :columns="columns"
          row-key="employee"
          :loading="store.loading"
          :filter="search"
          flat
        >
          <template #top-right>
            <q-input v-model="search" :placeholder="t('common.search')" dense outlined clearable style="width: 200px">
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round icon="mdi-pencil" size="sm" color="warning" :aria-label="t('common.edit')" @click="editEmployee(props.row)" />
              <q-btn flat round icon="mdi-delete" size="sm" color="negative" :aria-label="t('common.delete')" @click="deleteEmployee(props.row)" />
            </q-td>
          </template>
          <template #no-data>
            <q-td :props="{ colSpan: columns.length }" class="text-center">
              {{ t('common.noData') }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <EmployeeForm v-model="showForm" :employee="editingEmployee" @saved="onSaved" />

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('hr.deleteEmployeeConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteEmployee" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useStatusHelpers } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers'
import { useHrStore } from '../stores/useHrStore'
import { deleteEmployee as apiDeleteEmployee } from '../services/employee.service'
import EmployeeForm from './EmployeeForm.vue'
import type { Employee } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useHrStore()
const { statusColor } = useStatusHelpers('hr')

const search = ref('')
const showForm = ref(false)
const editingEmployee = ref<Employee | null>(null)
const confirmDelete = ref(false)
const deleteTarget = ref<string | null>(null)

const columns = computed(() => [
  { name: 'employee_name', label: t('hr.employeeName'), field: 'employee_name', sortable: true },
  { name: 'department', label: t('hr.department'), field: 'department' },
  { name: 'designation', label: t('hr.designation'), field: 'designation' },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'date_of_joining', label: t('hr.dateOfJoining'), field: 'date_of_joining' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function openAdd() {
  editingEmployee.value = null
  showForm.value = true
}

function editEmployee(employee: Employee) {
  editingEmployee.value = employee
  showForm.value = true
}

function deleteEmployee(employee: Employee) {
  deleteTarget.value = employee.employee_id
  confirmDelete.value = true
}

async function confirmDeleteEmployee() {
  const id = deleteTarget.value
  if (!id) return
  confirmDelete.value = false
  try {
    await apiDeleteEmployee(id)
    $q.notify({ type: 'positive', message: t('hr.employeeDeleted') })
    await store.fetchEmployees()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function onSaved() {
  showForm.value = false
  editingEmployee.value = null
  store.fetchEmployees()
}

onMounted(() => store.fetchEmployees())
</script>
