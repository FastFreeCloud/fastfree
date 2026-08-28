<template>
  <div v-if="error" class="lc-error-boundary">
    <div class="lc-error-boundary__card">
      <div class="lc-error-boundary__icon">
        <q-icon name="mdi-alert-circle" color="negative" size="64px" />
      </div>
      <h2 class="lc-error-boundary__title">
        {{ t('error.screenTitle') }}
      </h2>
      <p class="lc-error-boundary__message">
        {{ t('screen.errorMessage') }}
      </p>
      <div class="lc-error-boundary__details">
        <div class="lc-error-boundary__label">
          {{ t('errorLog.columnLevel') }}:
          <q-badge color="negative">Error</q-badge>
        </div>
        <div class="lc-error-boundary__error-message">
          {{ error.message }}
        </div>
        <div v-if="errorInfo" class="lc-error-boundary__info">
          {{ t('common.info') }}: {{ errorInfo }}
        </div>
        <details v-if="error.stack" class="lc-error-boundary__stack">
          <summary>{{ t('common.details') }}</summary>
          <pre>{{ error.stack }}</pre>
        </details>
      </div>
      <div class="lc-error-boundary__actions">
        <q-btn
          color="primary"
          icon="mdi-refresh"
          :label="t('error.retry')"
          @click="retry"
        />
        <q-btn
          flat
          color="grey"
          icon="mdi-home"
          :label="t('common.goHome')"
          @click="goHome"
        />
      </div>
      <div class="lc-error-boundary__footer">
        <span>{{ t('about.version') }} {{ appVersion }}</span>
        <span>{{ timestamp }}</span>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, onMounted } from 'vue'
import { useLcI18n } from '../i18n'

const { t } = useLcI18n()

const error = ref<Error | null>(null)
const errorInfo = ref('')
const appVersion = ref('0.0.1')
const timestamp = ref('')

onMounted(() => {
  appVersion.value = localStorage.getItem('fastfree_app_version') || '0.0.1'
  timestamp.value = new Date().toLocaleString()
})

onErrorCaptured((err: unknown, instance: unknown, info: string) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  errorInfo.value = info
  timestamp.value = new Date().toLocaleString()

  console.error('[ErrorBoundary]', err, info)
  return false
})

function retry() {
  error.value = null
  errorInfo.value = ''
}

function goHome() {
  error.value = null
  errorInfo.value = ''
  try {
    const router = (globalThis as Record<string, unknown>).__VUE_ROUTER__
    if (router && typeof (router as { push: unknown }).push === 'function') {
      (router as { push: (path: string) => void }).push('/')
      return
    }
  } catch { /* ignore */ }
  window.location.href = '/'
}
</script>

<style scoped>
.lc-error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--lc-bg, #f5f5f5);
  font-family: 'Cairo', sans-serif;
}

.lc-error-boundary__card {
  max-width: 600px;
  width: 100%;
  background: var(--lc-surface, #ffffff);
  border-radius: 16px;
  padding: 48px 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  text-align: center;
}

.lc-error-boundary__icon {
  margin-bottom: 16px;
}

.lc-error-boundary__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--lc-text, #1a1a2e);
  margin: 0 0 8px;
}

.lc-error-boundary__message {
  font-size: 14px;
  color: var(--lc-text-secondary, #666);
  margin: 0 0 24px;
}

.lc-error-boundary__details {
  text-align: start;
  background: var(--lc-surface-alt, #f8f9fa);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.lc-error-boundary__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--lc-text-secondary, #666);
  margin-bottom: 8px;
}

.lc-error-boundary__error-message {
  font-family: 'Cairo', monospace;
  font-size: 13px;
  color: var(--lc-negative, #e53935);
  word-break: break-word;
  padding: 8px 12px;
  background: rgba(229, 57, 53, 0.08);
  border-radius: 4px;
  margin-bottom: 8px;
}

.lc-error-boundary__info {
  font-size: 12px;
  color: var(--lc-text-secondary, #999);
  margin-bottom: 8px;
}

.lc-error-boundary__stack {
  font-size: 11px;
  color: var(--lc-text-secondary, #999);
  margin-top: 8px;
}

.lc-error-boundary__stack summary {
  cursor: pointer;
  font-weight: 600;
}

.lc-error-boundary__stack pre {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--lc-surface, #ffffff);
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  font-size: 11px;
}

.lc-error-boundary__actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.lc-error-boundary__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  font-size: 11px;
  color: var(--lc-text-tertiary, #bbb);
}
</style>
