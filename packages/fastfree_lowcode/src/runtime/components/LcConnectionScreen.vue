<template>
  <div class="lc-connection-screen">
    <q-card class="lc-connection-card" flat>
      <q-card-section class="text-center q-pa-lg">
        <!-- Logo -->
        <div class="lc-connection-logo">
          <q-icon :name="icon" size="48px" color="white" />
        </div>
        <div class="lc-connection-title">{{ title }}</div>
        <div class="lc-connection-subtitle">{{ subtitle }}</div>

        <!-- Status -->
        <div class="lc-connection-status">
          <transition name="fade" mode="out-in">
            <div v-if="state === 'connected'" class="lc-status-row connected" key="connected">
              <q-icon name="mdi-check-circle" size="28px" color="positive" />
              <span class="lc-status-text text-positive">{{ t('error.connectionRestored') }}</span>
            </div>

            <div v-else-if="state === 'connecting'" class="lc-status-row" key="connecting">
              <q-spinner color="primary" size="28px" />
              <span class="lc-status-text">{{ connectingLabelFinal }}</span>
            </div>

            <div v-else-if="state === 'failed'" class="lc-status-row failed" key="failed">
              <q-icon name="mdi-cloud-alert" size="28px" color="negative" />
              <span class="lc-status-text text-negative">{{ cannotConnectLabelFinal }}</span>
            </div>

            <div v-else-if="state === 'offline'" class="lc-status-row offline" key="offline">
              <q-icon name="mdi-wifi-off" size="28px" color="warning" />
              <span class="lc-status-text text-warning">{{ offlineLabelFinal }}</span>
            </div>
          </transition>
        </div>

        <!-- Attempt info -->
        <div v-if="state === 'connecting'" class="lc-attempt-info">
          <span>{{ attemptLabelFinal }} {{ attempt }} / {{ maxAttempts }}</span>
        </div>

        <!-- Server URL -->
        <div v-if="state === 'connected' && displayUrl" class="lc-server-info">
          <span class="lc-server-url">{{ displayUrl }}</span>
        </div>

        <!-- Actions -->
        <div class="lc-connection-actions q-mt-md row items-center justify-center q-gutter-sm">
          <q-btn
            v-if="state === 'failed'"
            color="primary"
            :label="retryLabelFinal"
            icon="mdi-refresh"
            no-caps
            rounded
            unelevated
            @click="retry"
          />

          <q-btn
            v-if="(state === 'failed' || state === 'connecting') && allowOffline"
            color="grey-6"
            :label="offlineBtnLabelFinal"
            icon="mdi-wifi-off"
            no-caps
            rounded
            outline
            @click="goOffline"
          />
        </div>
      </q-card-section>

      <q-card-actions v-if="showSettings" align="right" class="q-pa-sm absolute-top-right">
        <q-btn
          round
          flat
          dense
          icon="mdi-cog"
          color="grey-5"
          size="sm"
          @click="$emit('open-settings')"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useLcI18n } from '../i18n'

const props = withDefaults(defineProps<{
  /** Application title */
  title?: string
  /** Subtitle text */
  subtitle?: string
  /** Icon name for logo */
  icon?: string
  /** Health-check function — should return true if the server is reachable */
  healthCheck?: () => Promise<boolean>
  /** Maximum connection attempts before showing failure */
  maxAttempts?: number
  /** Interval between connection attempts (ms) */
  intervalMs?: number
  /** Allow the user to go offline */
  allowOffline?: boolean
  /** Show a settings gear button */
  showSettings?: boolean
  /** Server URL to display on success */
  displayUrl?: string
  /** Auto-start connection check on mount */
  autoStart?: boolean
  /** Label overrides */
  connectingLabel?: string
  cannotConnectLabel?: string
  offlineLabel?: string
  retryLabel?: string
  offlineBtnLabel?: string
  attemptLabel?: string
}>(), {
  title: 'FastFree',
  subtitle: '',
  icon: 'mdi-lightning-bolt',
  maxAttempts: 10,
  intervalMs: 5000,
  allowOffline: true,
  showSettings: false,
  displayUrl: '',
  autoStart: true,
  connectingLabel: '',
  cannotConnectLabel: '',
  offlineLabel: '',
  retryLabel: '',
  offlineBtnLabel: '',
  attemptLabel: '',
})

const emit = defineEmits<{
  connected: []
  offline: []
  failed: []
  'open-settings': []
}>()

const { t } = useLcI18n()

// Fallback labels using i18n
const connectingLabelFinal = props.connectingLabel || t('error.cannotConnect').replace(/\.$/, '...')
const cannotConnectLabelFinal = props.cannotConnectLabel || t('error.cannotConnect')
const offlineLabelFinal = props.offlineLabel || t('error.lostConnection')
const retryLabelFinal = props.retryLabel || t('common.refresh')
const offlineBtnLabelFinal = props.offlineBtnLabel || t('error.lostConnection')
const attemptLabelFinal = props.attemptLabel || ''

const state = ref<'connecting' | 'connected' | 'failed' | 'offline'>('connecting')
const attempt = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

/**
 * Default health check — tries to reach the configured base URL.
 */
async function defaultHealthCheck(): Promise<boolean> {
  try {
    const baseUrl = localStorage.getItem('fastfree_base_url') || window.location.origin
    const res = await fetch(`${baseUrl}/api/method/ping`, { method: 'GET', signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

const checkHealth = props.healthCheck ?? defaultHealthCheck

async function tryConnect() {
  attempt.value++

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    state.value = 'offline'
    return
  }

  state.value = 'connecting'

  const ok = await checkHealth()
  if (ok) {
    state.value = 'connected'
    stopPolling()
    emit('connected')
    return
  }

  if (attempt.value >= props.maxAttempts) {
    state.value = 'failed'
    stopPolling()
    emit('failed')
  }
}

function retry() {
  attempt.value = 0
  startPolling()
}

function goOffline() {
  stopPolling()
  state.value = 'offline'
  emit('offline')
}

function startPolling() {
  stopPolling()
  void tryConnect()
  timer = setInterval(() => {
    if (attempt.value < props.maxAttempts) {
      void tryConnect()
    } else {
      stopPolling()
    }
  }, props.intervalMs)
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function onOnline() {
  if (state.value === 'offline' || state.value === 'failed') {
    attempt.value = 0
    startPolling()
  }
}

onMounted(() => {
  if (props.autoStart) {
    startPolling()
  }
  window.addEventListener('online', onOnline)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('online', onOnline)
})

defineExpose({ retry, goOffline, startPolling, stopPolling, state })
</script>

<style lang="scss" scoped>
.lc-connection-screen {
  position: fixed;
  inset: 0;
  z-index: 1000000;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0a0e27;
}

.lc-connection-card {
  width: 400px;
  max-width: 90vw;
  border-radius: 24px;
  border: 1.5px solid rgba(124, 58, 237, 0.25);
  background: rgba(255, 255, 255, 0.03) !important;
  backdrop-filter: blur(20px);
  color: white;
  position: relative;
}

.lc-connection-logo {
  width: 88px;
  height: 88px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, var(--lc-primary-dark, #0D47A1), var(--lc-primary, #1565C0));
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 40px color-mix(in srgb, var(--lc-primary, #1565C0) 35%, transparent);
  border: 2px solid color-mix(in srgb, var(--lc-primary, #1565C0) 40%, transparent);
}

.lc-connection-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 4px;
}

.lc-connection-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 32px;
}

.lc-connection-status {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.lc-status-row {
  display: flex;
  align-items: center;
  gap: 12px;

  &.failed, &.offline {
    .lc-status-text {
      color: rgba(255, 255, 255, 0.7);
    }
  }
}

.lc-status-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.lc-attempt-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 24px;
}

.lc-server-info {
  margin-top: 8px;
}

.lc-server-url {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  direction: ltr;
  display: inline-block;
}

.lc-connection-actions {
  margin-top: 8px;
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
