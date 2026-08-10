<template>
  <div class="lc-pwa-screen fit column items-center justify-center q-pa-md">
    <q-card flat bordered class="lc-pwa-card">
      <q-card-section class="text-center">
        <q-avatar size="72px" color="primary" text-color="white" class="q-mb-md">
          <q-icon :name="pwaIcon" size="40px" />
        </q-avatar>

        <div class="text-h6 text-weight-bold">{{ pwaTitle }}</div>
        <div class="text-caption text-grey-6 q-mt-xs">{{ pwaDescription }}</div>
      </q-card-section>

      <q-card-section v-if="isProcessing" class="q-px-lg q-pt-none">
        <div class="text-caption text-grey-6 q-mb-sm text-center">
          {{ progressLabel }}
        </div>
        <q-linear-progress
          :value="progress"
          color="primary"
          size="6px"
          rounded
          stripe
          animation-speed="800"
        />
      </q-card-section>

      <q-card-section v-if="errorMessage" class="q-px-lg q-pt-none text-center">
        <q-banner dense class="bg-red-1 text-red" rounded>
          <template #avatar>
            <q-icon name="mdi-alert-circle" color="red" />
          </template>
          {{ errorMessage }}
        </q-banner>
      </q-card-section>

      <q-card-actions
        v-if="!isProcessing"
        align="center"
        class="q-px-lg q-pb-lg q-pt-none column q-gutter-sm"
      >
        <q-btn
          v-if="!isInstalled && !updateAvailable && !errorMessage && canInstall"
          unelevated
          color="primary"
          :label="t('pwa.install')"
          icon="mdi-download"
          class="full-width"
          @click="installPwa"
        />
        <q-btn
          v-if="updateAvailable && !errorMessage"
          unelevated
          color="positive"
          :label="t('pwa.updateNow')"
          icon="mdi-update"
          class="full-width"
          @click="updatePwa"
        />
        <q-btn
          v-if="errorMessage"
          unelevated
          color="warning"
          :label="t('pwa.retrying')"
          icon="mdi-refresh"
          class="full-width"
          @click="retry"
        />
        <q-btn
          v-if="!canInstall && !isInstalled"
          flat
          color="grey-7"
          :label="t('pwa.notAvailable')"
          class="full-width"
          disable
        />
        <q-btn
          flat
          color="grey-7"
          :label="t('pwa.later')"
          class="full-width"
          @click="dismiss"
        />
      </q-card-actions>

      <q-card-section class="q-pt-none text-center column q-gutter-xs">
        <div class="row justify-center q-gutter-sm">
          <q-badge
            :color="isOnline ? 'positive' : 'negative'"
            :label="isOnline ? t('pwa.online') : t('pwa.offline')"
            outline
          />
          <q-badge
            :color="isInstalled ? 'positive' : 'grey-5'"
            :label="isInstalled ? t('pwa.installed') : t('pwa.notInstalled')"
            outline
          />
        </div>

        <div class="text-caption text-grey-5 q-mt-xs">
          {{ t('pwa.version') }} {{ appVersion }}
        </div>
        <div class="text-caption text-grey-5">
          {{ t('pwa.serviceWorker') }}: {{ swStatusLabel }}
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import { usePWACache } from '../composables/usePWACache'
import type { LcMessages } from '../config'
import { usePwaInstall } from '../composables/usePwaInstall'

const $q = useQuasar()
const { t } = useLcI18n()
const { forceSWUpdate } = usePWACache()

const {
  isInstalled: pwaIsInstalled,
  isProcessing: pwaIsProcessing,
  deferredPrompt: pwaDeferredPrompt,
  handleBeforeInstall,
  handleAppInstalled,
  install,
} = usePwaInstall()

const isInstalled = ref(false)
watch(pwaIsInstalled, (val) => { isInstalled.value = val }, { immediate: true })
const updateAvailable = ref(false)
const checking = ref(true)
const isProcessing = ref(false)
const progress = ref(0)
const progressLabel = ref('')
const errorMessage = ref('')
const isOnline = ref(navigator.onLine)
const appVersion = ref('')
const swStatus = ref<'installed' | 'active' | 'waiting' | 'none'>('none')

const canInstall = computed(() => {
  return pwaDeferredPrompt.value && !pwaIsInstalled.value && !pwaIsProcessing.value
})

const canUpdate = computed(() => swStatus.value === 'waiting')

const pwaIcon = computed(() => {
  if (isProcessing.value) return 'mdi-progress-clock'
  if (checking.value) return 'mdi-progress-check'
  if (errorMessage.value) return 'mdi-alert-circle-outline'
  if (updateAvailable.value) return 'mdi-package-up'
  if (isInstalled.value) return 'mdi-check-circle'
  return 'mdi-cellphone-arrow-down'
})

const pwaTitle = computed(() => {
  if (isProcessing.value) return t('pwa.checking' as keyof LcMessages)
  if (checking.value) return t('pwa.checking' as keyof LcMessages)
  if (errorMessage.value) return t('pwa.installError' as keyof LcMessages)
  if (updateAvailable.value) return t('pwa.updateAvailable' as keyof LcMessages)
  if (isInstalled.value) return t('pwa.installed')
  if (!pwaDeferredPrompt.value) return t('pwa.install')
  return t('pwa.install')
})

const pwaDescription = computed(() => {
  if (isProcessing.value) return ''
  if (errorMessage.value) return ''
  if (!pwaDeferredPrompt.value && !isInstalled.value) return t('pwa.installHint' as keyof LcMessages)
  if (updateAvailable.value) return t('pwa.updateNow' as keyof LcMessages)
  return ''
})

const swStatusLabel = computed(() => {
  switch (swStatus.value) {
    case 'active': return t('pwa.swActive' as keyof LcMessages)
    case 'installed': return t('pwa.swInstalled' as keyof LcMessages)
    case 'waiting': return t('pwa.swWaiting' as keyof LcMessages)
    default: return t('pwa.swNone' as keyof LcMessages)
  }
})

async function installPwa() {
  const success = await install()
  if (success) {
    isInstalled.value = true
    $q.notify({ type: 'positive', message: t('pwa.installSuccess' as keyof LcMessages) })
  }
}

async function updatePwa() {
  isProcessing.value = true
  progress.value = 0.2
  progressLabel.value = t('pwa.step1' as keyof LcMessages)
  errorMessage.value = ''

  try {
    progress.value = 0.5
    progressLabel.value = t('pwa.step2' as keyof LcMessages)
    await forceSWUpdate()
    progress.value = 0.8
    progressLabel.value = t('pwa.step3' as keyof LcMessages)
    updateAvailable.value = false
    isInstalled.value = true
    $q.notify({ type: 'positive', message: t('pwa.updateSuccess' as keyof LcMessages) })
  } catch {
    errorMessage.value = t('pwa.updateError' as keyof LcMessages)
  } finally {
    isProcessing.value = false
    progress.value = 0
    progressLabel.value = ''
  }
}

function retry() {
  errorMessage.value = ''
  if (updateAvailable.value) {
    updatePwa()
  } else {
    installPwa()
  }
}

function dismiss() {
  updateAvailable.value = false
  errorMessage.value = ''
}

function handleOnline() {
  isOnline.value = true
}

function handleOffline() {
  isOnline.value = false
}

async function detectSWStatus() {
  if (!('serviceWorker' in navigator)) {
    swStatus.value = 'none'
    return
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    if (registrations.length === 0) {
      swStatus.value = 'none'
      return
    }

    for (const reg of registrations) {
      if (reg.active) {
        swStatus.value = 'active'
        return
      }
      if (reg.waiting) {
        swStatus.value = 'waiting'
        return
      }
      if (reg.installing) {
        swStatus.value = 'installed'
        return
      }
    }
    swStatus.value = 'installed'
  } catch {
    swStatus.value = 'none'
  }
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstall)
  window.addEventListener('appinstalled', handleAppInstalled)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  isOnline.value = navigator.onLine

  try {
    appVersion.value = document.querySelector('meta[name="app-version"]')?.getAttribute('content') || '0.0.0'
  } catch {
    appVersion.value = '0.0.0'
  }

  detectSWStatus()

  const qpwa = ($q as unknown as {
    pwa?: {
      installed: boolean
      onUpdate: (cb: () => void) => void
      onReady: (cb: () => void) => void
      activateUpdate: () => void
    }
  }).pwa

  if (qpwa?.installed) {
    isInstalled.value = true
  }

  try {
    qpwa?.onUpdate(() => {
      updateAvailable.value = true
      checking.value = false
      swStatus.value = 'waiting'
    })
    qpwa?.onReady(() => {
      checking.value = false
      swStatus.value = 'active'
    })
  } catch { /* PWA not available */ }

  setTimeout(() => {
    checking.value = false
  }, 2000)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  window.removeEventListener('appinstalled', handleAppInstalled)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<style lang="scss" scoped>
.lc-pwa-screen {
  min-height: 350px;
}

.lc-pwa-card {
  max-width: 380px;
  width: 100%;
  border-radius: 16px;
}
</style>