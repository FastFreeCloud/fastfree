<template>
  <div class="users-manager">
    <q-card>
      <q-card-section class="row items-center">
        <q-icon name="mdi-account-group" size="32px" color="primary" class="q-mr-md" />
        <div class="text-h6">{{ t('auth.users.title') }}</div>
        <q-space />
        <q-btn color="primary" :label="t('auth.users.addUser')" icon="mdi-plus" @click="showCreateDialog = true" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="users"
          :columns="columns"
          :loading="loading"
          row-key="id"
          flat
          bordered
        >
          <template #body-cell-role="props">
            <q-td :props="props">
              <q-badge :color="getRoleColor(props.row.role)">
                {{ getRoleLabel(props.row.role) }}
              </q-badge>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense icon="mdi-pencil" :aria-label="t('common.edit')" @click="editUser(props.row)" />
              <q-btn flat dense icon="mdi-key" color="warning" :aria-label="t('auth.users.resetPassword')" @click="openResetPassword(props.row)" />
              <q-btn flat dense icon="mdi-delete" color="negative" :aria-label="t('common.delete')" @click="confirmDelete(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingUser ? t('auth.users.editUser') : t('auth.users.addUser') }}</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="formData.name" :label="t('auth.common.name')" outlined class="q-mb-md" />
          <q-input v-model="formData.email" :label="t('auth.common.email')" type="email" outlined class="q-mb-md" />
          <q-select v-model="formData.role" :options="roleOptions" :label="t('auth.common.role')" outlined class="q-mb-md" emit-value map-options />
          <q-input
            v-if="!editingUser"
            v-model="formData.password"
            :label="t('auth.common.password')"
            type="password"
            outlined
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('auth.common.cancel')" @click="closeDialog" />
          <q-btn flat :label="t('auth.common.save')" color="primary" @click="saveUser" :loading="saving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Reset Password Dialog -->
    <q-dialog v-model="showResetPasswordDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">{{ t('auth.users.resetPassword') }}</div>
          <div class="text-caption text-grey-6">
            {{ t('auth.users.resetPasswordFor', { name: resetPasswordUser?.name ?? '' }) }}
          </div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newPassword"
            :label="t('auth.users.newPassword')"
            type="password"
            outlined
            :rules="[val => !!val || t('auth.common.required')]"
          />
          <q-input
            v-model="confirmPassword"
            :label="t('auth.users.confirmPassword')"
            type="password"
            outlined
            :rules="[val => val === newPassword || t('auth.users.passwordsDoNotMatch')]"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('auth.common.cancel')" @click="closeResetPasswordDialog" />
          <q-btn flat :label="t('auth.users.resetPassword')" color="warning" @click="resetPassword" :loading="resettingPassword" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/runtime'
import { listUsers, createUser, updateUserRole, deleteUser, resetPassword as resetPasswordApi } from '../services/user.service'
import { updateDoc } from '../services/api.service'

const { t } = useLcI18n()
const $q = useQuasar()

interface User {
  id: string
  name: string
  email: string
  role: string
}

const users = ref<User[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const editingUser = ref<User | null>(null)

const showResetPasswordDialog = ref(false)
const resetPasswordUser = ref<User | null>(null)
const newPassword = ref('')
const confirmPassword = ref('')
const resettingPassword = ref(false)

const formData = ref({
  name: '',
  email: '',
  role: 'USER',
  password: '',
})

const columns = computed(() => [
  { name: 'name', label: t('auth.common.name'), field: 'name', align: 'right' as const },
  { name: 'email', label: t('auth.common.email'), field: 'email', align: 'right' as const },
  { name: 'role', label: t('auth.common.role'), field: 'role', align: 'center' as const },
  { name: 'actions', label: t('auth.common.actions'), field: 'actions', align: 'center' as const },
])

const roleOptions = computed(() => [
  { label: t('auth.users.roleSwift'), value: 'SWIFT' },
  { label: t('auth.users.roleOperator'), value: 'OPERATOR' },
  { label: t('auth.users.roleUser'), value: 'USER' },
])

function getRoleColor(role: string) {
  const colors: Record<string, string> = {
    SWIFT: 'negative',
    OPERATOR: 'warning',
    USER: 'info',
  }
  return colors[role] || 'grey'
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    SWIFT: t('auth.users.roleSwiftLabel'),
    OPERATOR: t('auth.users.roleOperatorLabel'),
    USER: t('auth.users.roleUserLabel'),
  }
  return labels[role] || role
}

async function fetchUsers() {
  loading.value = true
  const res = await listUsers()
  if (res.success && res.data) {
    users.value = res.data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }))
  }
  loading.value = false
}

function editUser(user: User) {
  editingUser.value = user
  formData.value = {
    name: user.name,
    email: user.email,
    role: user.role,
    password: '',
  }
  showCreateDialog.value = true
}

async function saveUser() {
  if (!formData.value.name.trim() || !formData.value.email.trim()) {
    $q.notify({ type: 'warning', message: t('auth.users.requiredFields') })
    return
  }

  saving.value = true

  if (editingUser.value) {
    const roleRes = await updateUserRole(editingUser.value.id, formData.value.role)

    if (roleRes.success) {
      if (
        formData.value.name !== editingUser.value.name ||
        formData.value.email !== editingUser.value.email
      ) {
        const updateData: Record<string, unknown> = {}
        if (formData.value.name !== editingUser.value.name) {
          updateData.full_name = formData.value.name
        }
        if (formData.value.email !== editingUser.value.email) {
          updateData.email = formData.value.email
        }
        const nameEmailRes = await updateDoc('User', editingUser.value.id, updateData)
        if (nameEmailRes.success) {
          $q.notify({ type: 'positive', message: t('auth.users.roleUpdated') })
        } else {
          $q.notify({ type: 'warning', message: t('auth.users.roleUpdated') + ' — ' + t('auth.users.nameEmailBackendRequired') })
        }
      } else {
        $q.notify({ type: 'positive', message: t('auth.users.roleUpdated') })
      }
      await fetchUsers()
    } else {
      $q.notify({ type: 'negative', message: roleRes.error?.message || t('auth.users.editError') })
    }
  } else {
    const res = await createUser({
      name: formData.value.name,
      email: formData.value.email,
      role: formData.value.role,
      password: formData.value.password,
    })
    if (res.success) {
      $q.notify({ type: 'positive', message: t('auth.users.addSuccess') })
      await fetchUsers()
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('auth.users.addError') })
    }
  }

  saving.value = false
  closeDialog()
}

function confirmDelete(user: User) {
  $q.dialog({
    title: t('auth.common.confirmDelete'),
    message: t('auth.common.confirmDeleteMessage', { name: user.name }),
    cancel: t('auth.common.cancel'),
    persistent: true,
  }).onOk(async () => {
    const res = await deleteUser(user.id)
    if (res.success) {
      $q.notify({ type: 'positive', message: t('auth.users.deleteSuccess') })
      await fetchUsers()
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('auth.users.deleteError') })
    }
  })
}

function openResetPassword(user: User) {
  resetPasswordUser.value = user
  newPassword.value = ''
  confirmPassword.value = ''
  showResetPasswordDialog.value = true
}

function closeResetPasswordDialog() {
  showResetPasswordDialog.value = false
  resetPasswordUser.value = null
  newPassword.value = ''
  confirmPassword.value = ''
}

async function resetPassword() {
  if (!newPassword.value) {
    $q.notify({ type: 'warning', message: t('auth.users.passwordRequired') })
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    $q.notify({ type: 'warning', message: t('auth.users.passwordsDoNotMatch') })
    return
  }

  resettingPassword.value = true

  try {
    const res = await resetPasswordApi(resetPasswordUser.value!.name, newPassword.value)
    if (res.success) {
      $q.notify({ type: 'positive', message: t('auth.users.passwordResetSuccess') })
      closeResetPasswordDialog()
    } else {
      $q.notify({ type: 'negative', message: res.error || t('auth.users.passwordResetError') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.users.passwordResetError') })
  }

  resettingPassword.value = false
}

function closeDialog() {
  showCreateDialog.value = false
  editingUser.value = null
  formData.value = { name: '', email: '', role: 'USER', password: '' }
}

onMounted(() => {
  fetchUsers()
})
</script>
