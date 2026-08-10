<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-account-tie" size="2rem" color="primary" />
        <span class="text-h6">{{ t('hr.designations') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('hr.addDesignation')" no-caps @click="openAdd" />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="store.fetchDesignations" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.designations"
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
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense size="sm" icon="mdi-pencil" color="warning" :aria-label="t('common.edit')" @click="editDesignation(props.row)" />
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
          <q-icon name="mdi-account-tie" size="24px" color="primary" class="q-mr-sm" />
          <div class="text-h6">{{ editingDesignation ? t('hr.editDesignation') : t('hr.addDesignation') }}</div>
          <q-space />
          <q-btn icon="mdi-close" flat round dense :aria-label="t('common.cancel')" @click="closeForm" />
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="save" class="q-gutter-sm">
            <q-input
              v-model="form.designation_name"
              :label="t('hr.designationName')"
              outlined dense
              :rules="[val => !!val || t('validation.fieldRequired')]"
              aria-label="Designation Name"
            />
            <q-select
              v-model="form.department"
              :options="departmentOptions"
              :label="t('hr.department')"
              outlined dense
              emit-value
              map-options
              clearable
              :aria-label="t('hr.department')"
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
        <q-card-section>{{ t('hr.deleteDesignationConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="t('common.cancel')" />
          <q-btn color="negative" :label="t('common.delete')" @click="handleDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useHrStore } from '../stores/useHrStore'
import { createDesignation, updateDesignation, deleteDesignation } from '../services/designation.service'
import type { Designation } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useHrStore()

const search = ref('')
const showForm = ref(false)
const confirmDeleteVisible = ref(false)
const editingDesignation = ref<Designation | null>(null)
const deletingDesignation = ref<Designation | null>(null)
const saving = ref(false)

const form = reactive({
  designation_name: '',
  department: undefined as string | undefined,
  description: '',
})

const columns = computed(() => [
  { name: 'name', label: t('common.name'), field: 'name', sortable: true },
  { name: 'designation_name', label: t('hr.designationName'), field: 'designation_name', sortable: true },
  { name: 'department', label: t('hr.department'), field: 'department' },
  { name: 'description', label: t('hr.description'), field: 'description' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

const departmentOptions = computed(() =>
  store.departments.map(d => ({ label: d.department_name, value: d.name }))
)

function openAdd() {
  editingDesignation.value = null
  resetForm()
  showForm.value = true
}

function editDesignation(desig: Designation) {
  editingDesignation.value = desig
  form.designation_name = desig.designation_name
  form.department = desig.department ?? undefined
  form.description = desig.description ?? ''
  showForm.value = true
}

function confirmDelete(desig: Designation) {
  deletingDesignation.value = desig
  confirmDeleteVisible.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

function resetForm() {
  form.designation_name = ''
  form.department = undefined
  form.description = ''
}

async function save() {
  saving.value = true
  try {
    let result
    if (editingDesignation.value) {
      result = await updateDesignation(editingDesignation.value.name, {
        designation_name: form.designation_name,
        ...(form.department ? { department: form.department } : {}),
        ...(form.description ? { description: form.description } : {}),
      })
    } else {
      result = await createDesignation({
        designation_name: form.designation_name,
        ...(form.department ? { department: form.department } : {}),
        ...(form.description ? { description: form.description } : {}),
      })
    }
    if (result.success) {
      await store.fetchDesignations()
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
  if (!deletingDesignation.value) return
  try {
    const result = await deleteDesignation(deletingDesignation.value.name)
    if (result.success) {
      await store.fetchDesignations()
      confirmDeleteVisible.value = false
      deletingDesignation.value = null
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => {
  store.fetchDesignations()
  if (!store.departments.length) store.fetchDepartments()
})
</script>
