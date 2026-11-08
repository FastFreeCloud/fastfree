<template>
  <div class="q-pa-md hr-employee-list" role="region" :aria-label="t('hr.employees')">
    <q-card flat bordered class="hr-card">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-account-group" size="2rem" class="hr-accent" />
        <span class="text-h6 hr-foreground">{{ t('hr.employees') }}</span>
        <q-badge color="primary" :label="store.employeeCount" class="q-ml-xs" />
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('hr.addEmployee')" no-caps :aria-label="t('hr.addEmployee')" @click="openAdd" />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="store.fetchEmployees" />
      </q-card-section>

      <q-card-section class="row items-center q-gutter-sm">
        <q-input
          v-model="search"
          :debounce="300"
          :placeholder="t('common.search')"
          dense
          outlined
          clearable
          style="width: 220px"
          :aria-label="t('common.search')"
        >
          <template #prepend><q-icon name="mdi-magnify" /></template>
        </q-input>

        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          :label="t('common.status')"
          dense
          outlined
          clearable
          emit-value
          map-options
          style="width: 160px"
        />

        <q-select
          v-model="departmentFilter"
          :options="departmentOptions"
          :label="t('hr.department')"
          dense
          outlined
          clearable
          emit-value
          map-options
          style="width: 200px"
        />

        <q-space />
        <span class="text-caption text-grey-7">
          {{ t('common.total') }}: {{ filteredRows.length }}
        </span>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="filteredRows"
          :columns="columns"
          row-key="employee_id"
          :loading="store.loading"
          :pagination="pagination"
          v-model:pagination="pagination"
          flat
          :aria-label="t('hr.employees')"
        >
          <template #top-right>
            <q-input
              v-model="search"
              :placeholder="t('common.search')"
              dense
              outlined
              clearable
              style="width: 200px"
              :aria-label="t('common.search')"
            >
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
            <q-td :props="{ colSpan: columns.length }" class="text-center hr-muted">
              {{ t('common.noData') }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <EmployeeForm v-model="showForm" :employee="editingEmployee" @saved="onSaved" />

    <q-dialog v-model="confirmDelete" role="dialog" aria-modal="true" :aria-label="t('common.confirmDelete')">
      <q-card style="min-width: 400px" class="hr-card">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="text-h6 hr-foreground" style="margin-inline-start: 0.5rem">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section class="hr-muted">{{ t('hr.deleteEmployeeConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteEmployee" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
const statusFilter = ref<string | null>(null)
const departmentFilter = ref<string | null>(null)
const showForm = ref(false)
const editingEmployee = ref<Employee | null>(null)
const confirmDelete = ref(false)
const deleteTarget = ref<string | null>(null)

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: '',
  descending: false,
  rowsNumber: 0,
})

const columns = computed(() => [
  { name: 'employee_name', label: t('hr.employeeName'), field: 'employee_name', sortable: true },
  { name: 'department', label: t('hr.department'), field: 'department' },
  { name: 'designation', label: t('hr.designation'), field: 'designation' },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'date_of_joining', label: t('hr.dateOfJoining'), field: 'date_of_joining' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

const statusOptions = computed(() => [
  { label: t('status.active'), value: 'Active' },
  { label: t('status.inactive'), value: 'Inactive' },
])

const departmentOptions = computed(() =>
  store.departments.map(d => ({ label: d.department_name, value: d.name }))
)

const filteredRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  return store.employees.filter((e: Employee) => {
    if (statusFilter.value && e.status !== statusFilter.value) return false
    if (departmentFilter.value && e.department !== departmentFilter.value) return false
    if (term) {
      const haystack = [e.employee_name, e.department, e.designation, e.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })
})

watch([search, statusFilter, departmentFilter], () => {
  pagination.value.page = 1
  pagination.value.rowsNumber = filteredRows.value.length
})

watch(filteredRows, (rows) => {
  pagination.value.rowsNumber = rows.length
})

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

onMounted(() => {
  store.fetchEmployees()
  if (!store.departments.length) store.fetchDepartments()
})
</script>

<style scoped>
.hr-employee-list {
  color: var(--foreground);
}
.hr-card {
  background: var(--card);
  border: 1px solid var(--border);
}
.hr-foreground {
  color: var(--foreground);
}
.hr-muted {
  color: var(--muted-foreground);
}
.hr-accent {
  color: var(--accent);
}
</style>
