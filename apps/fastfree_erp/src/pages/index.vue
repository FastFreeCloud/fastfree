<template>
  <div>
    <ServerUrlScreen
      v-if="needsServerUrl"
      @connected="onConnected"
    />

    <LcSplashScreen
      v-else-if="showSplash"
      :visible="showSplash"
      title="FastFree ERP"
      :message="t('splash.loading')"
      icon="mdi-office-building"
      :loading="true"
    />

    <LcConnectionScreen
      v-else-if="!isServerUp"
      title="FastFree ERP"
      subtitle="Checking server connection..."
      icon="mdi-office-building"
      :max-attempts="1"
      :interval-ms="3000"
      :allow-offline="true"
      @connected="onServerConnected"
      @failed="onServerOffline"
      @offline="onServerOffline"
    />

    <div
      v-else-if="authPhase === 'checking' || authPhase === 'idle'"
      class="fullscreen flex flex-center column q-gutter-md"
      role="status"
      :aria-label="t('splash.loading')"
    >
      <q-spinner color="primary" size="48px" />
      <div class="text-body2 text-grey-6">{{ t('splash.loading') }}</div>
    </div>

    <AuthLogin
      v-else-if="authPhase === 'login'"
      @success="onLoginSuccess"
      @error="onLoginError"
    />

    <DesktopShell
      v-else
      title="FastFree ERP"
      icon="mdi-office-building"
      show-built-in-screens
      :user-name="authStore.userName"
      :user-email="authStore.userEmail"
      :avatar-url="authStore.user?.avatar ?? ''"
    >
      <template #header-right>
        <q-btn
          flat
          dense
          round
          icon="mdi-logout"
          :aria-label="t('common.logout')"
          :title="t('common.logout')"
          @click="onLogout"
        />
      </template>
    </DesktopShell>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { DesktopShell, LcSplashScreen, LcConnectionScreen } from 'quasar-app-extension-fastfree-lowcode'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'
import { AuthLogin, useAuthStore } from 'fastfree-auth'
import { useAppStore } from '../stores/useAppStore'
import ServerUrlScreen from '../components/ServerUrlScreen.vue'

const { t } = useLcI18n()
const $q = useQuasar()
const appStore = useAppStore()
const authStore = useAuthStore()
const showSplash = ref(true)
const needsServerUrl = ref(false)
const isServerUp = ref(false)

type AuthPhase = 'idle' | 'checking' | 'login' | 'authenticated'
const authPhase = ref<AuthPhase>('idle')

const SPLASH_DURATION = 800

onMounted(() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  if (!envUrl && !appStore.hasServerUrl) {
    needsServerUrl.value = true
    showSplash.value = false
  } else {
    // URL already configured — splash briefly, then connection check takes over.
    setTimeout(() => {
      showSplash.value = false
    }, SPLASH_DURATION)
  }

  window.addEventListener('auth-session-expired', handleSessionExpiredEvent)
})

onUnmounted(() => {
  window.removeEventListener('auth-session-expired', handleSessionExpiredEvent)
})

function onConnected() {
  needsServerUrl.value = false
  showSplash.value = true
  setTimeout(() => {
    showSplash.value = false
  }, SPLASH_DURATION)
}

function onServerConnected() {
  isServerUp.value = true
  void checkAuthSession()
}

function onServerOffline() {
  isServerUp.value = true
  void checkAuthSession()
}

async function checkAuthSession(): Promise<void> {
  if (authPhase.value !== 'idle') return
  authPhase.value = 'checking'
  try {
    const restored = await authStore.restoreSession()
    authPhase.value = restored ? 'authenticated' : 'login'
  } catch {
    authPhase.value = 'login'
    $q.notify({ type: 'negative', message: t('auth.login.error') })
  }
}

function onLoginSuccess(): void {
  authPhase.value = 'authenticated'
}

function onLoginError(message: string): void {
  $q.notify({ type: 'negative', message: message || t('auth.login.error') })
}

function onLogout(): void {
  void handleLogout()
}

async function handleLogout(): Promise<void> {
  try {
    await authStore.logout()
    authPhase.value = 'login'
  } catch {
    $q.notify({ type: 'negative', message: t('auth.login.error') })
  }
}

function handleSessionExpiredEvent(): void {
  void handleSessionExpired()
}

async function handleSessionExpired(): Promise<void> {
  try {
    await authStore.logout()
  } catch {
    $q.notify({ type: 'negative', message: t('auth.login.error') })
  }
  authPhase.value = 'login'
  $q.notify({ type: 'warning', message: t('error.sessionExpired') })
}
</script>
