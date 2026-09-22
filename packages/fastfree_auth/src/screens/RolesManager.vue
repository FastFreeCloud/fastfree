<template>
  <div class="roles-manager">
    <q-card>
      <q-card-section class="row items-center">
        <q-icon name="mdi-shield-account" size="32px" color="primary" class="q-mr-md" />
        <div class="text-h6">{{ t('auth.roles.title') }}</div>
        <q-space />
        <q-btn color="primary" :label="t('auth.roles.createRole')" icon="mdi-plus" :loading="loading" :disable="loading" @click="openCreateDialog" />
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
                  <q-btn
                    v-if="role.isReal"
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

      <q-inner-loading :showing="loading" />
    </q-card>

    <!-- Create Role Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">{{ t('auth.roles.createRole') }}</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="formData.name" :label="t('auth.roles.roleName')" outlined class="q-mb-md" />
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
import { getDocList, createDoc, deleteDoc } from '../services/api.service'

const { t } = useLcI18n()
const $q = useQuasar()

interface Role {
  id: string
  name: string
  roleName: string
  isReal: boolean
  icon: string
  color: string
  description: string
  permissions: string[]
}

interface FrappeRole {
  name: string
}

// Frappe stock roles that must never be deleted from this screen.
const PROTECTED_ROLES = ['System Manager', 'Administrator']

const REAL_ROLE_COLORS = ['primary', 'secondary', 'accent', 'teal', 'purple', 'brown', 'pink', 'indigo']

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

// Local app-level role→screens mapping, display only (Phase-1). There is no
// backend table for screen permissions yet, so these defaults are merged with
// the real Frappe Role docs below purely for display.
const defaultRoles = computed<Role[]>(() => [
  {
    id: 'SWIFT',
    name: t('auth.roles.swiftName'),
    roleName: '',
    isReal: false,
    icon: 'mdi-crown',
    color: 'negative',
    description: t('auth.roles.swiftDescription'),
    permissions: ['manage-users', 'manage-roles', 'settings', 'backup', 'view-all-data'],
  },
  {
    id: 'OPERATOR',
    name: t('auth.roles.operatorName'),
    roleName: '',
    isReal: false,
    icon: 'mdi-account-cog',
    color: 'warning',
    description: t('auth.roles.operatorDescription'),
    permissions: ['view-invoices', 'create-invoices', 'view-companies', 'backup'],
  },
  {
    id: 'USER',
    name: t('auth.roles.userName'),
    roleName: '',
    isReal: false,
    icon: 'mdi-account',
    color: 'info',
    description: t('auth.roles.userDescription'),
    permissions: ['view-invoices', 'view-companies'],
  },
])

const realRoleNames = ref<string[]>([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)

const formData = ref({
  name: '',
})

const roles = computed<Role[]>(() => {
  const defaults = defaultRoles.value.map(d => ({ ...d }))
  const byId = new Map(defaults.map(d => [d.id, d]))
  const extras: Role[] = []

  realRoleNames.value.forEach((roleName, index) => {
    const existing = byId.get(roleName)
    if (existing) {
      existing.roleName = roleName
      existing.isReal = true
      return
    }
    extras.push({
      id: `ROLE_${roleName}`,
      name: roleName,
      roleName,
      isReal: true,
      icon: 'mdi-shield-star',
      color: REAL_ROLE_COLORS[index % REAL_ROLE_COLORS.length] ?? 'primary',
      description: '',
      permissions: [],
    })
  })

  return [...defaults, ...extras]
})

async function fetchRoles(): Promise<void> {
  loading.value = true
  try {
    const res = await getDocList<FrappeRole>('Role', undefined, ['name'])
    if (res.success && res.data) {
      realRoleNames.value = res.data.map(r => r.name)
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('auth.roles.saveError') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.roles.saveError') })
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  formData.value = { name: '' }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  formData.value = { name: '' }
}

async function saveRole(): Promise<void> {
  if (!formData.value.name.trim()) {
    $q.notify({ type: 'warning', message: t('auth.roles.nameRequired') })
    return
  }

  saving.value = true

  try {
    const res = await createDoc('Role', { role_name: formData.value.name.trim() })
    if (res.success) {
      $q.notify({ type: 'positive', message: t('auth.roles.createSuccess') })
      closeDialog()
      await fetchRoles()
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('auth.roles.saveError') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.roles.saveError') })
  } finally {
    saving.value = false
  }
}

function confirmDelete(role: Role) {
  if (PROTECTED_ROLES.includes(role.roleName)) {
    $q.notify({ type: 'warning', message: t('auth.roles.deleteError') })
    return
  }

  $q.dialog({
    title: t('auth.common.confirmDelete'),
    message: t('auth.common.confirmDeleteMessage', { name: role.name }),
    cancel: t('auth.common.cancel'),
    persistent: true,
  }).onOk(() => {
    void handleDelete(role)
  })
}

async function handleDelete(role: Role): Promise<void> {
  try {
    const res = await deleteDoc('Role', role.roleName)
    if (res.success) {
      $q.notify({ type: 'positive', message: t('auth.roles.deleteSuccess') })
      await fetchRoles()
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('auth.roles.deleteError') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.roles.deleteError') })
  }
}

onMounted(() => {
  void fetchRoles()
})
</script>
