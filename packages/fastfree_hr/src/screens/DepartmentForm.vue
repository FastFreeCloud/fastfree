<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-office-building" size="2rem" color="primary" />
        <span class="text-h6">{{ t('hr.departments') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('hr.addDepartment')" no-caps @click="openAdd" />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="store.fetchDepartments" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.departments"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          :filter="search"
          flat
          dense
        >
          <template #top-right>
            <q-input v-model="search" :placeholder="t('common.search')" dense outlined clearable style="width: 200px">
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </template>
          <template #body-cell-disabled="props">
            <q-td :props="props">
              <q-badge :color="props.row.disabled ? 'negative' : 'positive'" :label="props.row.disabled ? t('common.cancel') : t('common.active')" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense size="sm" icon="mdi-pencil" color="warning" :aria-label="t('common.edit')" @click="editDepartment(props.row)" />
              <q-btn flat round dense size="sm" icon="mdi-delete" color="negative" :aria-label="t('common.delete')" @click="confirmDelete(props.row)" />
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

    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="mdi-office-building" size="24px" color="primary" class="q-mr-sm" />
          <div class="text-h6">{{ editingDepartment ? t('hr.editDepartment') : t('hr.addDepartment') }}</div>
          <q-space />
          <q-btn icon="mdi-close" flat round dense :aria-label="t('common.cancel')" @click="closeForm" />
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="save" class="q-gutter-sm">
            <q-input
              v-model="form.department_name"
              :label="t('hr.departmentName')"
              outlined dense
              :rules="[val => !!val || t('validation.fieldRequired')]"
              aria-label="Department Name"
            />
            <q-select
              v-model="form.parent_department"
              :options="parentOptions"
              :label="t('hr.parentDepartment')"
              outlined dense
              emit-value
              map-options
              clearable
              :aria-label="t('hr.parentDepartment')"
              options-dense
            />
            <q-input
              v-model="form.description"
              :label="t('hr.description')"
              outlined dense type="textarea" rows="2"
              aria-label="Description"
            />

            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat :label="t('common.cancel')" @click="closeForm" type="button" />
              <q-btn color="primary" :label="t('common.save')" :loading="saving" type="submit" />
            </q-card-actions>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDeleteVisible" persistent>
      <q-card style="min-width: 300px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-alert" color="warning" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('hr.deleteDepartmentConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="t('common.cancel')" />
          <q-btn color="negative" :label="t('common.delete')" @click="handleDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useHrStore } from '../stores/useHrStore'
import { createDepartment, updateDepartment, deleteDepartment } from '../services/department.service'
import type { Department } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useHrStore()

const search = ref('')
const showForm = ref(false)
const confirmDeleteVisible = ref(false)
const editingDepartment = ref<Department | null>(null)
const deletingDepartment = ref<Department | null>(null)
const saving = ref(false)

const form = reactive({
  department_name: '',
  parent_department: undefined as string | undefined,
  description: '',
})

const columns = computed(() => [
  { name: 'name', label: t('common.name'), field: 'name', sortable: true },
  { name: 'department_name', label: t('hr.departmentName'), field: 'department_name', sortable: true },
  { name: 'parent_department', label: t('hr.parentDepartment'), field: 'parent_department' },
  { name: 'description', label: t('hr.description'), field: 'description' },
  { name: 'disabled', label: t('common.status'), field: 'disabled' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

const parentOptions = computed(() =>
  store.departments
    .filter(d => d.name !== editingDepartment.value?.name)
    .map(d => ({ label: d.department_name, value: d.name }))
)

const parentOptionsAll = computed(() =>
  store.departments.map(d => ({ label: d.department_name, value: d.name }))
)

function openAdd() {
  editingDepartment.value = null
  resetForm()
  showForm.value = true
}

function editDepartment(dept: Department) {
  editingDepartment.value = dept
  form.department_name = dept.department_name
  form.parent_department = dept.parent_department ?? undefined
  form.description = dept.description ?? ''
  showForm.value = true
}

function confirmDelete(dept: Department) {
  deletingDepartment.value = dept
  confirmDeleteVisible.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

function resetForm() {
  form.department_name = ''
  form.parent_department = undefined
  form.description = ''
}

async function save() {
  saving.value = true
  try {
    let result
    if (editingDepartment.value) {
      result = await updateDepartment(editingDepartment.value.name, {
        department_name: form.department_name,
        ...(form.parent_department ? { parent_department: form.parent_department } : {}),
        ...(form.description ? { description: form.description } : {}),
      })
    } else {
      result = await createDepartment({
        department_name: form.department_name,
        disabled: false,
        ...(form.parent_department ? { parent_department: form.parent_department } : {}),
        ...(form.description ? { description: form.description } : {}),
      })
    }
    if (result.success) {
      await store.fetchDepartments()
      closeForm()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingDepartment.value) return
  try {
    const result = await deleteDepartment(deletingDepartment.value.name)
    if (result.success) {
      await store.fetchDepartments()
      confirmDeleteVisible.value = false
      deletingDepartment.value = null
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

watch([editingDepartment], () => {
  if (editingDepartment.value) {
    form.department_name = editingDepartment.value.department_name
    form.parent_department = editingDepartment.value.parent_department ?? undefined
    form.description = editingDepartment.value.description ?? ''
  }
})

onMounted(() => store.fetchDepartments())
</script>
