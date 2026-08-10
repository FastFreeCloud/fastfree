<template>
  <div class="auth-login">
    <q-card class="auth-login__card">
      <q-card-section class="auth-login__header">
        <q-icon name="mdi-lock-outline" size="48px" color="primary" />
        <div class="text-h6 q-mt-md">{{ t('auth.login.title') }}</div>
        <div class="text-caption text-grey-6">{{ t('auth.login.subtitle') }}</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="handleLogin" class="auth-login__form">
          <q-input
            v-model="email"
            :label="t('auth.login.email')"
            type="email"
            outlined
            :rules="[val => !!val || t('auth.login.emailRequired')]"
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="mdi-email-outline" />
            </template>
          </q-input>

          <q-input
            v-model="password"
            :label="t('auth.login.password')"
            :type="showPassword ? 'text' : 'password'"
            outlined
            :rules="[val => !!val || t('auth.login.passwordRequired')]"
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="mdi-lock-outline" />
            </template>
            <template #append>
              <q-icon
                :name="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-btn
            type="submit"
            color="primary"
            :label="t('auth.login.submit')"
            class="full-width q-mb-md"
            :loading="loading"
          />

          <q-btn
            flat
            color="grey"
            :label="t('auth.login.connectionSettings')"
            icon="mdi-cog-outline"
            class="full-width"
            @click="showConnectionSettings = true"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <!-- Connection Settings Dialog -->
    <q-dialog v-model="showConnectionSettings" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ t('auth.login.connectionSettings') }}</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="connectionUrl"
            :label="t('auth.login.serverUrl')"
            outlined
            :placeholder="t('auth.login.serverUrlPlaceholder')"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('auth.common.cancel')" v-close-popup />
          <q-btn flat :label="t('auth.common.save')" color="primary" @click="saveConnection" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/runtime'
import { useAuthStore } from '../stores/useAuthStore'

const { t } = useLcI18n()
const $q = useQuasar()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const showConnectionSettings = ref(false)
const connectionUrl = ref(localStorage.getItem('fastfree_base_url') || window.location.origin)

async function handleLogin() {
  loading.value = true
  try {
    const success = await authStore.login(email.value, password.value)

    if (success) {
      emit('success')
    } else {
      emit('error', authStore.error || t('auth.login.error'))
    }
  } catch {
    $q.notify({ type: 'negative', message: t('auth.login.error') })
  } finally {
    loading.value = false
  }
}

function saveConnection() {
  localStorage.setItem('fastfree_base_url', connectionUrl.value)
  window.location.reload()
}
</script>

<style lang="scss" scoped>
.auth-login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
  padding: 20px;

  &__card {
    width: 100%;
    max-width: 400px;
    border-radius: 16px;
  }

  &__header {
    text-align: center;
    padding: 32px 24px 16px;
  }

  &__form {
    padding: 0 24px 24px;
  }
}
</style>
