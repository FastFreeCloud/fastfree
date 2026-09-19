<template>
  <LcErrorBoundary>
    <router-view />

    <UpdateDialog
      v-if="updateAvailable"
      :version-info="updateVersionInfo"
      @update="handleUpdate"
      @later="handleLater"
      @open-play="handleOpenPlay"
    />
  </LcErrorBoundary>
</template>

<script setup lang="ts">
import { ref, inject, watch } from 'vue'
import { LcErrorBoundary } from 'quasar-app-extension-fastfree-lowcode'
import { APP_UPDATE_KEY } from 'quasar-app-extension-fastfree_update/src/runtime/types'
import type { AppUpdateApi } from 'quasar-app-extension-fastfree_update/src/runtime/useAppUpdate'

const appUpdate = inject<AppUpdateApi>(APP_UPDATE_KEY)
const updateAvailable = ref(false)
const updateVersionInfo = ref('')

watch(
  () => appUpdate?.status.value.available,
  (available) => {
    if (available) {
      updateAvailable.value = true
      updateVersionInfo.value = appUpdate?.status.value.versionCode
        ? `v${appUpdate.status.value.versionCode}`
        : ''
    }
  },
  { immediate: true }
)

async function handleUpdate() {
  if (!appUpdate) return
  await appUpdate.startUpdate()
}

function handleLater() {
  if (!appUpdate) return
  appUpdate.snooze()
  updateAvailable.value = false
}

function handleOpenPlay() {
  if (!appUpdate) return
  void appUpdate.openPlayListing('com.fastfree.erp')
  updateAvailable.value = false
}
</script>
