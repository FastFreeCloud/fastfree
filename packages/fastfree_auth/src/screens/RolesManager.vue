<template>
  <div class="roles-manager">
    <q-card>
      <q-card-section class="row items-center">
        <q-icon name="mdi-shield-account" size="32px" color="primary" class="q-mr-md" />
        <div class="text-h6">{{ t('auth.roles.title') }}</div>
        <q-space />
        <q-btn color="primary" :label="t('auth.roles.createRole')" icon="mdi-plus" @click="openCreateDialog" />
      </q-card-section>

      <q-card-section>
        <div class="row q-col-gutter-md">
          <div v-for="role in roles" :key="role.id" class="col-12 col-md-4">
            <q-card flat bordered>
              <q-card-section>
                <div class="row items-center q-mb-sm">
                  <q-icon :name="role.icon" :color="role.color" size="24px" class="q-mr-sm" />
                  <div class="text-h6">{{ role.name }}</div>
                  <q-space />
                  <q-btn flat dense icon="mdi-pencil" size="sm" :aria-label="t('common.edit')" @click="openEditDialog(role)" />
                  <q-btn
                    v-if="role.id !== 'SWIFT'"
                    flat
                    dense
                    icon="mdi-delete"
                    color="negative"
                    size="sm"
                    :aria-label="t('common.delete')"
                    @click="confirmDelete(role)"
                  />
                </div>
                <div class="text-caption text-grey-6 q-mb-md">{{ role.description }}</div>
                <q-separator class="q-mb-md" />
                <div class="text-subtitle2 q-mb-sm">{{ t('auth.roles.permissions') }}</div>
                <q-chip
                  v-for="perm in role.permissions"
                  :key="perm"
                  size="sm"
                  color="grey-3"
                >
                  {{ permLabelMap[perm] ? t('auth.' + permLabelMap[perm]) : perm }}
                </q-chip>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">{{ editingRole ? t('auth.roles.editRole') : t('auth.roles.createRole') }}</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="formData.name" :label="t('auth.roles.roleName')" outlined class="q-mb-md" />
          <q-input v-model="formData.description" :label="t('auth.roles.description')" type="textarea" outlined class="q-mb-md" />
          <div class="text-subtitle2 q-mb-sm">{{ t('auth.roles.permissions') }}</div>
          <div class="row q-col-gutter-sm">
            <div v-for="perm in availablePermissions" :key="perm.id" class="col-6">
              <q-checkbox v-model="formData.permissions" :val="perm.id" :label="perm.label" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('auth.common.cancel')" @click="closeDialog" />
          <q-btn flat :label="t('auth.common.save')" color="primary" @click="saveRole" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/runtime'

const { t } = useLcI18n()
const $q = useQuasar()

interface Role {
  id: string
  name: string
  icon: string
  color: string
  description: string
  permissions: string[]
}

const permLabelMap: Record<string, string> = {
  'manage-users': 'roles.permManageUsers',
  'manage-roles': 'roles.permManageRoles',
  settings: 'roles.permSettings',
  backup: 'roles.permBackup',
  'view-all-data': 'roles.permViewAllData',
  'view-invoices': 'roles.permViewInvoices',
  'create-invoices': 'roles.permCreateInvoices',
  'view-companies': 'roles.permViewCompanies',
  invoices: 'roles.permInvoices',
  'invoices-list': 'roles.permInvoicesList',
  companies: 'roles.permCompanies',
  restore: 'roles.permRestore',
  errors: 'roles.permErrors',
  'print-settings': 'roles.permPrintSettings',
  permissions: 'roles.permPermissions',
  'dev-settings': 'roles.permDevSettings',
}

const defaultRoles = computed<Role[]>(() => [
  {
    id: 'SWIFT',
    name: t('auth.roles.swiftName'),
    icon: 'mdi-crown',
    color: 'negative',
    description: t('auth.roles.swiftDescription'),
    permissions: ['manage-users', 'manage-roles', 'settings', 'backup', 'view-all-data'],
  },
  {
    id: 'OPERATOR',
    name: t('auth.roles.operatorName'),
    icon: 'mdi-account-cog',
    color: 'warning',
    description: t('auth.roles.operatorDescription'),
    permissions: ['view-invoices', 'create-invoices', 'view-companies', 'backup'],
  },
  {
    id: 'USER',
    name: t('auth.roles.userName'),
    icon: 'mdi-account',
    color: 'info',
    description: t('auth.roles.userDescription'),
    permissions: ['view-invoices', 'view-companies'],
  },
])

const STORAGE_KEY = 'fastfree-custom-roles'

const roles = ref<Role[]>([])
const showDialog = ref(false)
const saving = ref(false)
const editingRole = ref<Role | null>(null)

const formData = ref({
  name: '',
  description: '',
  permissions: [] as string[],
})

const availablePermissions = computed(() => [
  { id: 'invoices', label: t('auth.roles.permInvoices') },
  { id: 'invoices-list', label: t('auth.roles.permInvoicesList') },
  { id: 'companies', label: t('auth.roles.permCompanies') },
  { id: 'backup', label: t('auth.roles.permBackup') },
  { id: 'restore', label: t('auth.roles.permRestore') },
  { id: 'errors', label: t('auth.roles.permErrors') },
  { id: 'print-settings', label: t('auth.roles.permPrintSettings') },
  { id: 'permissions', label: t('auth.roles.permPermissions') },
  { id: 'dev-settings', label: t('auth.roles.permDevSettings') },
])

function loadRoles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const customRoles = JSON.parse(stored) as Role[]
      roles.value = [...defaultRoles.value, ...customRoles]
    } else {
      roles.value = [...defaultRoles.value]
    }
  } catch {
    roles.value = [...defaultRoles.value]
  }
}

function saveCustomRoles(customRoles: Role[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customRoles))
  } catch {
    $q.notify({ type: 'negative', message: t('auth.roles.saveError') })
  }
}

function getCustomRoles(): Role[] {
  return roles.value.filter(r => !defaultRoles.value.some(d => d.id === r.id))
}

function openCreateDialog() {
  editingRole.value = null
  formData.value = { name: '', description: '', permissions: [] }
  showDialog.value = true
}

function openEditDialog(role: Role) {
  editingRole.value = role
  formData.value = {
    name: role.name,
    description: role.description,
    permissions: [...role.permissions],
  }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingRole.value = null
  formData.value = { name: '', description: '', permissions: [] }
}

function saveRole() {
  if (!formData.value.name.trim()) {
    $q.notify({ type: 'warning', message: t('auth.roles.nameRequired') })
    return
  }

  saving.value = true

  try {
    if (editingRole.value) {
      const idx = roles.value.findIndex(r => r.id === editingRole.value!.id)
      if (idx !== -1) {
        const isDefault = defaultRoles.value.some(d => d.id === editingRole.value!.id)
        const updatedRole: Role = {
          ...(roles.value[idx] as Role),
          name: formData.value.name,
          description: formData.value.description,
          permissions: formData.value.permissions,
        }
        roles.value[idx] = updatedRole

        if (isDefault) {
          const customRoles = getCustomRoles()
          saveCustomRoles(customRoles)
        } else {
          const customRoles = getCustomRoles().map(r =>
            r.id === editingRole.value!.id ? updatedRole : r,
          )
          saveCustomRoles(customRoles)
        }

        $q.notify({ type: 'positive', message: t('auth.roles.editSuccess') })
      }
    } else {
      const newId = `CUSTOM_${Date.now()}`
      const colors = ['primary', 'secondary', 'accent', 'teal', 'purple', 'brown', 'pink', 'indigo']
      const newRole: Role = {
        id: newId,
        name: formData.value.name,
        icon: 'mdi-shield-star',
        color: colors[roles.value.length % colors.length] ?? 'primary',
        description: formData.value.description,
        permissions: formData.value.permissions,
      }
      roles.value.push(newRole)
      saveCustomRoles(getCustomRoles())
      $q.notify({ type: 'positive', message: t('auth.roles.createSuccess') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.roles.saveError') })
  }

  saving.value = false
  closeDialog()
}

function confirmDelete(role: Role) {
  $q.dialog({
    title: t('auth.common.confirmDelete'),
    message: t('auth.common.confirmDeleteMessage', { name: role.name }),
    cancel: t('auth.common.cancel'),
    persistent: true,
  }).onOk(() => {
    try {
      const idx = roles.value.findIndex(r => r.id === role.id)
      if (idx !== -1) {
        roles.value.splice(idx, 1)
        saveCustomRoles(getCustomRoles())
        $q.notify({ type: 'positive', message: t('auth.roles.deleteSuccess') })
      }
    } catch {
      $q.notify({ type: 'negative', message: t('auth.roles.deleteError') })
    }
  })
}

onMounted(() => {
  loadRoles()
})
</script>
