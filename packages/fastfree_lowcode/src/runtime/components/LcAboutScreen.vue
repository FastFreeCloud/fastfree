<template>
  <div class="lc-about-screen fit column items-center justify-center q-pa-md text-center">
    <div class="lc-about-card q-pa-lg">
      <q-avatar size="64px" color="primary" text-color="white" class="q-mb-md shadow-3">
        <q-icon :name="icon || 'mdi-lightning-bolt'" size="36px" />
      </q-avatar>

      <div class="text-h6 text-weight-bold text-primary q-mb-xs">{{ title }}</div>
      <div class="text-caption text-grey-6 q-mb-sm">{{ version ? t('about.version', { version }) : t('about.titleDefault') }}</div>

      <div class="row flex-center q-gutter-xs q-mb-md">
        <q-badge :color="devMode ? 'orange' : 'green'" class="shadow-1">
          {{ devMode ? t('about.badgeDev') : t('about.badgeProd') }}
        </q-badge>
        <q-badge :color="isOnline ? 'positive' : 'negative'" class="shadow-1">
          <q-icon :name="isOnline ? 'mdi-wifi' : 'mdi-wifi-off'" class="q-mr-xs" size="xs" />
          {{ isOnline ? t('about.online') : t('about.offline') }}
        </q-badge>
      </div>

      <div class="text-caption text-grey-7 q-mb-md" style="max-width: 320px; margin: 0 auto;">
        {{ description || t('about.description') }}
      </div>

      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">{{ t('about.browser') }}</span>
          <span class="info-value">{{ systemInfo.browser }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('about.os') }}</span>
          <span class="info-value">{{ systemInfo.os }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('about.screen') }}</span>
          <span class="info-value">{{ systemInfo.screen }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('about.currentDate') }}</span>
          <span class="info-value">{{ systemInfo.date }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useLcI18n } from '../i18n'

interface Props {
  title?: string
  version?: string
  description?: string
  icon?: string
}

withDefaults(defineProps<Props>(), {
  title: 'FastFree LowCode App',
  version: '1.0.0',
  description: '',
  icon: 'mdi-view-dashboard',
})

const { t } = useLcI18n()
const devMode = import.meta.env.DEV
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

const systemInfo = reactive({ browser: '', os: '', screen: '', date: '' })

function updateSystemInfo() {
  if (typeof navigator === 'undefined' || typeof screen === 'undefined') return
  const ua = navigator.userAgent
  systemInfo.browser = parseBrowser(ua)
  systemInfo.os = parseOS(ua)
  systemInfo.screen = `${screen.width} × ${screen.height}`
  systemInfo.date = formatDate(new Date())
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseBrowser(ua: string): string {
  if (ua.includes('Firefox/')) return 'Firefox ' + ua.split('Firefox/')[1]?.split(' ')[0]
  if (ua.includes('Edg/')) return 'Edge ' + ua.split('Edg/')[1]?.split(' ')[0]
  if (ua.includes('OPR/')) return 'Opera ' + ua.split('OPR/')[1]?.split(' ')[0]
  if (ua.includes('Chrome/')) return 'Chrome ' + ua.split('Chrome/')[1]?.split(' ')[0]
  if (ua.includes('Safari/') && ua.includes('Version/')) return 'Safari ' + ua.split('Version/')[1]?.split(' ')[0]
  return t('about.unknown')
}

function parseOS(ua: string): string {
  if (ua.includes('Windows NT 10')) return 'Windows 10/11'
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1'
  if (ua.includes('Windows NT 6.2')) return 'Windows 8'
  if (ua.includes('Windows NT 6.1')) return 'Windows 7'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X')) return 'macOS ' + ua.split('Mac OS X ')[1]?.split(')')[0]?.replace(/_/g, '.')
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android ' + ua.split('Android ')[1]?.split(';')[0]
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return t('about.unknown')
}

function updateOnline() { isOnline.value = navigator.onLine }

onMounted(() => {
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
  updateSystemInfo()
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<style lang="scss" scoped>
.lc-about-card {
  max-width: 360px;
  width: 100%;
  border-radius: 16px;
  background: var(--lc-surface, #ffffff);
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.06));
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--lc-surface-container, rgba(0, 0, 0, 0.03));
}

.info-label {
  font-size: 11px;
  color: var(--lc-on-surface-variant, #888);
}

.info-value {
  font-size: 11px;
  font-weight: 500;
  color: var(--lc-on-surface, #333);
}
</style>
