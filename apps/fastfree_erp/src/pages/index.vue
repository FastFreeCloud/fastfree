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

    <DesktopShell
      v-if="!needsServerUrl && !showSplash && isServerUp"
      title="FastFree ERP"
      icon="mdi-office-building"
      show-built-in-screens
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { DesktopShell, LcSplashScreen, LcConnectionScreen } from 'quasar-app-extension-fastfree-lowcode'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'
import { useAppStore } from '../stores/useAppStore'
import ServerUrlScreen from '../components/ServerUrlScreen.vue'

const { t } = useLcI18n()
const appStore = useAppStore()
const showSplash = ref(true)
const needsServerUrl = ref(false)
const isServerUp = ref(false)

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
}

function onServerOffline() {
  isServerUp.value = true
}
</script>
