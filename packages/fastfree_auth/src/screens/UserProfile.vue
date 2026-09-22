<template>
  <div class="user-profile">
    <q-card>
      <q-card-section class="row items-center">
        <q-icon name="mdi-account-circle" size="32px" color="primary" class="q-mr-md" />
        <div class="text-h6">{{ t('auth.profile.title') }}</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="saveProfile" class="user-profile__form">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="formData.name" :label="t('auth.common.name')" outlined />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="formData.email" :label="t('auth.common.email')" outlined disable />
            </div>
            <div class="col-12 col-md-6">
              <q-input v-model="formData.phone" :label="t('auth.common.phone')" outlined />
            </div>
            <div class="col-12 col-md-6">
              <q-select v-model="settings.language" :options="languageOptions" :label="t('auth.common.language')" outlined />
            </div>
          </div>

          <div class="q-mt-md">
            <q-btn type="submit" color="primary" :label="t('auth.profile.saveChanges')" :loading="saving" :disable="loading || saving" />
          </div>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-h6 q-mb-md">{{ t('auth.profile.changePasswordTitle') }}</div>
        <q-form @submit="changePassword">
          <q-input
            v-model="passwordData.current"
            :label="t('auth.profile.currentPassword')"
            type="password"
            outlined
            class="q-mb-md"
          />
          <q-input
            v-model="passwordData.newPassword"
            :label="t('auth.profile.newPassword')"
            type="password"
            outlined
            class="q-mb-md"
          />
          <q-input
            v-model="passwordData.confirm"
            :label="t('auth.profile.confirmPassword')"
            type="password"
            outlined
            class="q-mb-md"
            :rules="[val => val === passwordData.newPassword || t('auth.profile.passwordMismatch')]"
          />
          <q-btn type="submit" color="warning" :label="t('auth.profile.changePassword')" :loading="changingPassword" :disable="changingPassword" />
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/runtime'
import { useSettingsStore } from '../stores/useSettingsStore'
import { getCurrentUserProfile, updateProfile, changePassword as apiChangePassword } from '../services/user.service'

const { t } = useLcI18n()
const $q = useQuasar()
const settingsStore = useSettingsStore()

const loading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)

const formData = ref({
  name: '',
  email: '',
  phone: '',
})

const passwordData = ref({
  current: '',
  newPassword: '',
  confirm: '',
})

const settings = computed(() => settingsStore.settings)

const languageOptions = computed(() => [
  { label: t('auth.common.arabic'), value: 'ar' },
  { label: t('auth.common.english'), value: 'en' },
])

// Raw Frappe User doc shape: display name lives in `full_name` (not `name`,
// which is the docname/email) and the avatar in `user_image`.
interface FrappeUserDoc {
  full_name?: string
  name?: string
  email?: string
  phone?: string
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fastfree:goto-login'))
  }
}

function handleNoSession(message: string): void {
  $q.notify({ type: 'negative', message })
  redirectToLogin()
}

async function fetchProfile() {
  loading.value = true
  try {
    const res = await getCurrentUserProfile()
    if (res.success && res.data) {
      const raw = res.data as unknown as FrappeUserDoc
      formData.value = {
        name: raw.full_name || raw.name || '',
        email: raw.email || '',
        phone: raw.phone || '',
      }
    } else if (res.error?.code === 'NO_SESSION') {
      handleNoSession(res.error?.message || t('common.error'))
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  saving.value = true

  try {
    // user.service updateProfile() forwards its payload raw to updateDoc, but
    // its Param type still says `name`. Frappe expects `full_name`, so adapt
    // on the caller side (email is the docname and is never sent).
    const payload = {
      full_name: formData.value.name,
      phone: formData.value.phone,
    } as unknown as Parameters<typeof updateProfile>[0]

    const res = await updateProfile(payload)

    if (res.success) {
      $q.notify({ type: 'positive', message: t('auth.profile.saveSuccess') })
    } else if (res.error?.code === 'NO_SESSION') {
      handleNoSession(res.error?.message || t('auth.profile.saveError'))
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('auth.profile.saveError') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.profile.saveError') })
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (passwordData.value.newPassword !== passwordData.value.confirm) {
    $q.notify({ type: 'warning', message: t('auth.profile.passwordMismatch') })
    return
  }

  changingPassword.value = true

  try {
    // NOTE: changePassword() in user.service.ts calls an admin-only method and
    // cannot be fixed from here — surface its failure honestly, never mask it.
    const res = await apiChangePassword(
      passwordData.value.current,
      passwordData.value.newPassword,
    )

    if (res.success) {
      $q.notify({ type: 'positive', message: t('auth.profile.passwordChangeSuccess') })
      passwordData.value = { current: '', newPassword: '', confirm: '' }
    } else {
      $q.notify({ type: 'negative', message: res.error?.message || t('auth.profile.passwordChangeError') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.profile.passwordChangeError') })
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  fetchProfile()
  settingsStore.fetchSettings()
})
</script>
