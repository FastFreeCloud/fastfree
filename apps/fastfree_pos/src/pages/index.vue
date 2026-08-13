<template>
  <div>
    <ServerUrlScreen
      v-if="needsServerUrl"
      @connected="onConnected"
      @cancel="onCancel"
    />

    <LcSplashScreen
      v-else-if="showSplash"
      title="FastFree POS"
      :message="t('splash.loading')"
      icon="mdi-point-of-sale"
      :loading="true"
    />

    <DesktopShell
      v-if="!needsServerUrl && !showSplash"
      title="FastFree POS"
      icon="mdi-point-of-sale"
      show-built-in-screens
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DesktopShell, LcSplashScreen } from 'quasar-app-extension-fastfree-lowcode'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'
import { useAppStore } from '../stores/useAppStore'
import ServerUrlScreen from '../components/ServerUrlScreen.vue'

const { t } = useLcI18n()
const appStore = useAppStore()
const showSplash = ref(true)
const needsServerUrl = ref(false)

const SPLASH_DURATION = 800

onMounted(() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL

  if (!envUrl && !appStore.hasServerUrl) {
    needsServerUrl.value = true
    showSplash.value = false
  }
})

function onConnected() {
  needsServerUrl.value = false
  showSplash.value = true
  setTimeout(() => {
    showSplash.value = false
  }, SPLASH_DURATION)
}

function onCancel() {
  needsServerUrl.value = false
  showSplash.value = true
  setTimeout(() => {
    showSplash.value = false
  }, SPLASH_DURATION)
}
</script>
