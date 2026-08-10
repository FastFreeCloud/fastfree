<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-shape" size="2rem" color="primary" />
        <span class="text-h6">{{ t('inventory.categories') }}</span>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('inventory.addCategory')" no-caps @click="openAdd" />
        <q-btn flat round icon="refresh" :aria-label="t('common.refresh')" @click="store.fetchCategories()" />
      </q-card-section>

      <q-card-section>
        <q-table :rows="store.categories" :columns="columns" row-key="name" :loading="store.loading" flat dense>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense size="sm" icon="mdi-pencil" color="warning" :aria-label="t('common.edit')" @click="editCategory(props.row)" />
              <q-btn flat round dense size="sm" icon="mdi-delete" color="negative" :aria-label="t('common.delete')" @click="confirmDelete(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="mdi-shape" size="24px" color="primary" class="q-mr-sm" />
          <div class="text-h6">{{ editingCategory ? t('inventory.editCategory') : t('inventory.addCategory') }}</div>
          <q-space />
          <q-btn icon="mdi-close" flat round dense @click="closeForm" />
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="save" class="q-gutter-sm">
            <q-input v-model="form.categoryName" :label="t('inventory.categoryName')" outlined dense :rules="[val => !!val || t('common.required')]" />
            <q-input v-model="form.categoryCode" :label="t('inventory.categoryCode')" outlined dense :rules="[val => !!val || t('common.required')]" />
            <q-input v-model="form.parent" :label="t('inventory.parent')" outlined dense />
            <q-input v-model="form.description" :label="t('inventory.description')" outlined dense type="textarea" />

            <q-card-actions align="right" class="q-pa-md">
              <q-btn flat :label="t('common.cancel')" @click="closeForm" type="button" />
              <q-btn color="primary" :label="t('common.confirm')" :loading="saving" type="submit" />
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
        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="t('common.cancel')" />
          <q-btn color="negative" :label="t('common.confirm')" @click="handleDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useInventoryStore } from '../stores/useInventoryStore'
import { createCategory, updateCategory, deleteCategory } from '../services'
import type { Category } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useInventoryStore()

const showForm = ref(false)
const confirmDeleteVisible = ref(false)
const editingCategory = ref<Category | null>(null)
const deletingCategory = ref<Category | null>(null)
const saving = ref(false)

const form = reactive({
  categoryName: '',
  categoryCode: '',
  parent: '',
  description: '',
})

const columns = computed(() => [
  { name: 'categoryCode', label: t('inventory.categoryCode'), field: 'categoryCode', sortable: true },
  { name: 'categoryName', label: t('inventory.categoryName'), field: 'categoryName', sortable: true },
  { name: 'parent', label: t('inventory.parent'), field: 'parent' },
  { name: 'description', label: t('inventory.description'), field: 'description' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function openAdd() {
  editingCategory.value = null
  resetForm()
  showForm.value = true
}

function editCategory(category: Category) {
  editingCategory.value = category
  form.categoryName = category.categoryName
  form.categoryCode = category.categoryCode
  form.parent = category.parent ?? ''
  form.description = category.description ?? ''
  showForm.value = true
}

function confirmDelete(category: Category) {
  deletingCategory.value = category
  confirmDeleteVisible.value = true
}

function closeForm() {
  showForm.value = false
  resetForm()
}

function resetForm() {
  form.categoryName = ''
  form.categoryCode = ''
  form.parent = ''
  form.description = ''
}

async function save() {
  saving.value = true
  try {
    let result
    if (editingCategory.value) {
      result = await updateCategory(editingCategory.value.name, {
        categoryName: form.categoryName,
        categoryCode: form.categoryCode,
        ...(form.parent ? { parent: form.parent } : {}),
        ...(form.description ? { description: form.description } : {}),
      })
    } else {
      result = await createCategory({
        categoryName: form.categoryName,
        categoryCode: form.categoryCode,
        disabled: false,
        ...(form.parent ? { parent: form.parent } : {}),
        ...(form.description ? { description: form.description } : {}),
      })
    }
    if (result.success) {
      await store.fetchCategories()
      closeForm()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingCategory.value) return
  try {
    const result = await deleteCategory(deletingCategory.value.name)
    if (result.success) {
      await store.fetchCategories()
      confirmDeleteVisible.value = false
      deletingCategory.value = null
    } else {
      $q.notify({ type: 'negative', message: result.error?.message || t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => store.fetchCategories())
</script>
