<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getActivePinia } from 'pinia'
import type { Store } from 'pinia'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import { useDesktopStore } from '../composables/useDesktopStore'
import { useGroupsStore } from '../composables/useGroupsStore'
import { getSharedConfig } from '../shared-config'
import { getSupportedLanguages } from '../shared-config'
import { getAllMessageKeys } from '../i18n'

const { t } = useLcI18n()
const $q = useQuasar()
const desktop = useDesktopStore()
const groupsStore = useGroupsStore()
const cfg = getSharedConfig()

const isDev = import.meta.env.DEV

const searchQuery = ref('')
const expandApp = ref(true)
const expandConfig = ref(false)
const expandGroups = ref(true)
const expandWindows = ref(true)
const expandStores = ref(false)
const expandTheme = ref(false)
const expandI18n = ref(false)
const expandNetwork = ref(false)
const expandPerformance = ref(false)

const isOnline = ref(navigator.onLine)
const connectionType = ref('')
const effectiveType = ref('')
const downlink = ref<number | null>(null)
const rtt = ref<number | null>(null)
const saveData = ref(false)
const usedJSHeapSize = ref<number | null>(null)
const jsHeapSizeLimit = ref<number | null>(null)
const totalJSHeapSize = ref<number | null>(null)
const pageLoadTime = ref<number | null>(null)

interface NetworkConnection {
  type?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

function updateNetworkInfo() {
  isOnline.value = navigator.onLine
  const conn = (navigator as unknown as { connection?: NetworkConnection; mozConnection?: NetworkConnection; webkitConnection?: NetworkConnection }).connection
    || (navigator as unknown as { mozConnection?: NetworkConnection }).mozConnection
    || (navigator as unknown as { webkitConnection?: NetworkConnection }).webkitConnection
  if (conn) {
    connectionType.value = conn.type || ''
    effectiveType.value = conn.effectiveType || ''
    downlink.value = conn.downlink ?? null
    rtt.value = conn.rtt ?? null
    saveData.value = conn.saveData || false
  }
}

interface PerformanceMemory {
  usedJSHeapSize: number
  jsHeapSizeLimit: number
  totalJSHeapSize: number
}

function updateMemoryInfo() {
  const perfMemory = (performance as unknown as { memory?: PerformanceMemory }).memory
  if (perfMemory) {
    usedJSHeapSize.value = perfMemory.usedJSHeapSize ?? null
    jsHeapSizeLimit.value = perfMemory.jsHeapSizeLimit ?? null
    totalJSHeapSize.value = perfMemory.totalJSHeapSize ?? null
  }
}

function updatePageLoadTime() {
  const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (entries.length > 0 && entries[0]) {
    if (entries[0].loadEventEnd > 0) {
      pageLoadTime.value = Math.round(entries[0].loadEventEnd - entries[0].startTime)
    }
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'N/A'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  updateNetworkInfo()
  updateMemoryInfo()
  updatePageLoadTime()
  window.addEventListener('online', updateNetworkInfo)
  window.removeEventListener('offline', updateNetworkInfo)
  const conn = (navigator as unknown as { connection?: NetworkConnection }).connection
  if (conn?.addEventListener) conn.addEventListener('change', updateNetworkInfo)
})

onUnmounted(() => {
  window.removeEventListener('online', updateNetworkInfo)
  window.removeEventListener('offline', updateNetworkInfo)
  const conn = (navigator as unknown as { connection?: NetworkConnection }).connection
  if (conn?.removeEventListener) conn.removeEventListener('change', updateNetworkInfo)
})

function matchesSearch(...values: (string | number | boolean | null | undefined)[]): boolean {
  if (!searchQuery.value) return true
  const q = searchQuery.value.toLowerCase()
  return values.some(v => {
    if (v === null || v === undefined) return false
    return String(v).toLowerCase().includes(q)
  })
}

function copyToClipboard(data: Record<string, unknown>) {
  navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
    $q.notify({ message: t('inspector.copied'), color: 'positive', icon: 'mdi-check-circle', timeout: 2000 })
  }).catch(() => {
    $q.notify({ message: t('inspector.clipboardError'), color: 'negative', icon: 'mdi-alert-circle', timeout: 2000 })
  })
}

const appInfo = computed(() => ({
  mode: isDev ? t('inspector.devMode') : t('inspector.prodMode'),
  locale: cfg.locale,
  version: (import.meta.env.VITE_APP_VERSION as string) || '1.0.0',
  storeId: cfg.desktop.storeId,
  persistState: cfg.desktop.persistState,
}))

const filteredAppInfo = computed(() => {
  if (!matchesSearch(appInfo.value.mode, appInfo.value.locale, appInfo.value.version, appInfo.value.storeId)) return null
  return appInfo.value
})

const screenConfigs = computed(() => {
  const screens = cfg.desktop.screens || {}
  return Object.entries(screens)
    .map(([key, val]) => ({
      screenType: key,
      maxInstances: val.maxInstances ?? '∞',
      defaultWidth: val.defaultWidth ?? cfg.desktop.defaultWidth,
      defaultHeight: val.defaultHeight ?? cfg.desktop.defaultHeight,
      maximizeOnOpen: val.maximizeOnOpen ?? false,
    }))
    .filter(sc => matchesSearch(sc.screenType, String(sc.maxInstances), `${sc.defaultWidth}×${sc.defaultHeight}`, String(sc.maximizeOnOpen)))
})

const desktopConfig = computed(() => [
  { key: 'headerHeight', value: cfg.desktop.headerHeight },
  { key: 'switcherHeight', value: cfg.desktop.switcherHeight },
  { key: 'dockHeight', value: cfg.desktop.dockHeight },
  { key: 'defaultWidth', value: cfg.desktop.defaultWidth },
  { key: 'defaultHeight', value: cfg.desktop.defaultHeight },
  { key: 'dockPosition', value: cfg.desktop.dockPosition },
  { key: 'dockStyle', value: cfg.desktop.dockStyle },
  { key: 'persistState', value: cfg.desktop.persistState },
].filter(item => matchesSearch(item.key, String(item.value))))

const openWindows = computed(() => desktop.sortedWindows
  .map(w => ({
    id: w.id,
    screenType: w.screenType,
    title: w.title,
    isMinimized: w.isMinimized,
    isMaximized: w.isMaximized,
  }))
  .filter(w => matchesSearch(w.title, w.screenType, w.id))
)

const piniaStores = computed(() => {
  const pinia = getActivePinia()
  if (!pinia) return []
  const s = (pinia as unknown as { _s?: Map<string, Store> })._s
  if (!s) return []
  return Array.from(s.values())
    .map((store) => ({
      id: store.$id,
      stateKeys: Object.keys(store.$state || {}),
      hasPersist: !!(store as unknown as { $options?: { persist?: unknown } }).$options?.persist,
    }))
    .filter(st => matchesSearch(st.id, ...st.stateKeys, String(st.hasPersist)))
})

const groups = computed(() => groupsStore.groups
  .map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    pageCount: g.pages?.length ?? 0,
    pages: g.pages?.map(p => ({
      screenType: p.screenType,
      label: p.label,
      icon: p.icon,
    })) ?? [],
  }))
  .filter(g => matchesSearch(g.name, g.id))
)

const themeVars = computed(() => {
  const theme = cfg.theme || {}
  return Object.entries(theme)
    .map(([key, val]) => ({ key, value: val }))
    .filter(v => matchesSearch(v.key, v.value))
})

const i18nInfo = computed(() => {
  const langs = getSupportedLanguages()
  const keys = getAllMessageKeys()
  return {
    locale: cfg.locale,
    languageCount: langs.length,
    languages: langs.map(l => `${l.value.toUpperCase()} (${l.label})`),
    keyCount: keys.length,
  }
})

const filteredI18nInfo = computed(() => {
  if (!matchesSearch(i18nInfo.value.locale, String(i18nInfo.value.languageCount), String(i18nInfo.value.keyCount))) return null
  return i18nInfo.value
})
</script>

<template>
  <div class="lc-structure-inspector fit column q-pa-md">
    <!-- Search -->
    <q-input
      v-model="searchQuery"
      :placeholder="t('inspector.searchPlaceholder')"
      dense
      outlined
      clearable
      class="q-mb-md"
      debounce="300"
    >
      <template #prepend>
        <q-icon name="mdi-magnify" size="18px" />
      </template>
    </q-input>

    <!-- App Info -->
    <q-expansion-item
      :label="t('inspector.appInfo')"
      header-class="text-weight-bold"
      v-model:open="expandApp"
    >
      <q-card flat bordered class="q-mb-md" v-if="filteredAppInfo">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard(appInfo)" />
        </div>
        <q-card-section>
          <table class="info-table">
            <tbody>
              <tr><td class="label">{{ t('inspector.mode') }}</td><td>
                <q-badge :color="isDev ? 'warning' : 'positive'">{{ filteredAppInfo.mode }}</q-badge>
              </td></tr>
              <tr><td class="label">{{ t('inspector.version') }}</td><td><code>{{ filteredAppInfo.version }}</code></td></tr>
              <tr><td class="label">{{ t('inspector.locale') }}</td><td><code>{{ filteredAppInfo.locale }}</code></td></tr>
              <tr><td class="label">{{ t('inspector.storeId') }}</td><td><code>{{ filteredAppInfo.storeId }}</code></td></tr>
              <tr><td class="label">{{ t('inspector.persistState') }}</td><td>
                <q-icon :name="filteredAppInfo.persistState ? 'mdi-check-circle' : 'mdi-close-circle'"
                  :color="filteredAppInfo.persistState ? 'positive' : 'negative'" size="18px" />
              </td></tr>
            </tbody>
          </table>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- Configuration -->
    <q-expansion-item
      :label="t('inspector.configuration')"
      header-class="text-weight-bold"
      v-model:open="expandConfig"
    >
      <q-card flat bordered class="q-mb-md">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard({ desktop: Object.fromEntries(desktopConfig.map(d => [d.key, d.value])), screenConfigs })" />
        </div>
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">{{ t('inspector.desktop') }}</div>
          <table class="info-table" v-if="desktopConfig.length > 0">
            <tbody>
              <tr v-for="item in desktopConfig" :key="item.key">
                <td class="label">{{ item.key }}</td>
                <td><code>{{ item.value }}</code></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="text-caption text-grey">{{ t('inspector.noResults') }}</div>

          <div class="text-subtitle2 q-mb-sm q-mt-md">{{ t('inspector.screenConfigs') }}</div>
          <table class="info-table" v-if="screenConfigs.length > 0">
            <thead>
              <tr>
                <th class="label">{{ t('inspector.screenType') }}</th>
                <th>{{ t('inspector.maxInstances') }}</th>
                <th>{{ t('inspector.size') }}</th>
                <th>{{ t('inspector.maximizeOnOpen') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sc in screenConfigs" :key="sc.screenType">
                <td class="label"><code>{{ sc.screenType }}</code></td>
                <td>{{ sc.maxInstances }}</td>
                <td>{{ sc.defaultWidth }}×{{ sc.defaultHeight }}</td>
                <td>
                  <q-icon :name="sc.maximizeOnOpen ? 'mdi-check' : 'mdi-close'" size="16px"
                    :color="sc.maximizeOnOpen ? 'positive' : 'grey'" />
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="text-caption text-grey">{{ t('inspector.noResults') }}</div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- Groups & Pages -->
    <q-expansion-item
      :label="t('inspector.groupsPages')"
      header-class="text-weight-bold"
      v-model:open="expandGroups"
    >
      <q-card flat bordered class="q-mb-md">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard({ groups })" v-if="groups.length > 0" />
        </div>
        <q-card-section>
          <div class="text-caption text-grey q-mb-sm">
            {{ t('inspector.storeCount', { count: groups.length }) }}
          </div>
          <div v-for="group in groups" :key="group.id" class="group-section">
            <div class="group-header">
              <q-icon :name="group.icon" size="18px" class="q-mr-sm" />
              <strong>{{ group.name }}</strong>
              <q-badge color="grey" class="q-ml-sm">{{ group.pageCount }}</q-badge>
            </div>
            <table class="info-table" v-if="group.pages.length > 0">
              <tbody>
                <tr v-for="page in group.pages" :key="page.screenType">
                  <td class="label">
                    <q-icon :name="page.icon" size="14px" class="q-mr-xs" />
                    {{ t(page.label) }}
                  </td>
                  <td><code>{{ page.screenType }}</code></td>
                </tr>
              </tbody>
            </table>
            <div v-else class="text-caption text-grey q-pl-md">{{ t('inspector.noPages') }}</div>
          </div>
          <div v-if="groups.length === 0" class="text-caption text-grey">{{ t('inspector.noResults') }}</div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- Open Windows -->
    <q-expansion-item
      :label="t('inspector.openWindows')"
      header-class="text-weight-bold"
      v-model:open="expandWindows"
    >
      <q-card flat bordered class="q-mb-md">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard({ windows: openWindows })" v-if="openWindows.length > 0" />
        </div>
        <q-card-section>
          <div class="text-caption text-grey q-mb-sm">
            {{ t('inspector.windowCount', { count: openWindows.length }) }}
          </div>
          <table class="info-table" v-if="openWindows.length > 0">
            <thead>
              <tr>
                <th class="label">{{ t('inspector.title') }}</th>
                <th>{{ t('inspector.screenType') }}</th>
                <th>{{ t('inspector.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="win in openWindows" :key="win.id">
                <td class="label">{{ win.title }}</td>
                <td><code>{{ win.screenType }}</code></td>
                <td>
                  <q-badge v-if="win.isMaximized" color="primary">{{ t('inspector.maximized') }}</q-badge>
                  <q-badge v-else-if="win.isMinimized" color="grey">{{ t('inspector.minimized') }}</q-badge>
                  <q-badge v-else color="positive">{{ t('inspector.open') }}</q-badge>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="text-caption text-grey">{{ t('inspector.noOpenWindows') }}</div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- Pinia Stores -->
    <q-expansion-item
      :label="t('inspector.stores')"
      header-class="text-weight-bold"
      v-model:open="expandStores"
    >
      <q-card flat bordered class="q-mb-md">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard({ stores: piniaStores })" v-if="piniaStores.length > 0" />
        </div>
        <q-card-section>
          <div class="text-caption text-grey q-mb-sm">
            {{ t('inspector.storeCount', { count: piniaStores.length }) }}
          </div>
          <table class="info-table" v-if="piniaStores.length > 0">
            <thead>
              <tr>
                <th class="label">{{ t('inspector.storeId') }}</th>
                <th>{{ t('inspector.stateKeys') }}</th>
                <th>{{ t('inspector.persist') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="store in piniaStores" :key="store.id">
                <td class="label"><code>{{ store.id }}</code></td>
                <td>{{ store.stateKeys.length }}</td>
                <td>
                  <q-icon :name="store.hasPersist ? 'mdi-check-circle' : 'mdi-close-circle'"
                    :color="store.hasPersist ? 'positive' : 'grey'" size="16px" />
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="text-caption text-grey">{{ t('inspector.noStores') }}</div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- Theme -->
    <q-expansion-item
      :label="t('inspector.theme')"
      header-class="text-weight-bold"
      v-model:open="expandTheme"
    >
      <q-card flat bordered class="q-mb-md">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard({ theme: Object.fromEntries(themeVars.map(v => [v.key, v.value])) })" v-if="themeVars.length > 0" />
        </div>
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">{{ t('inspector.currentTheme') }}</div>
          <div v-if="themeVars.length > 0" class="theme-vars">
            <div v-for="v in themeVars" :key="v.key" class="theme-var-item">
              <code class="var-name">{{ v.key }}</code>
              <code class="var-value">{{ v.value }}</code>
            </div>
          </div>
          <div v-else class="text-caption text-grey">{{ t('inspector.noThemeVars') }}</div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- i18n -->
    <q-expansion-item
      :label="t('inspector.i18n')"
      header-class="text-weight-bold"
      v-model:open="expandI18n"
    >
      <q-card flat bordered class="q-mb-md" v-if="filteredI18nInfo">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard(i18nInfo)" />
        </div>
        <q-card-section>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">{{ t('inspector.locale') }}</td>
                <td><code>{{ filteredI18nInfo.locale }}</code></td>
              </tr>
              <tr>
                <td class="label">{{ t('inspector.languageCount') }}</td>
                <td>{{ filteredI18nInfo.languageCount }}</td>
              </tr>
              <tr>
                <td class="label">{{ t('inspector.keyCount', { count: '' }).replace(' ', '') }}</td>
                <td>{{ filteredI18nInfo.keyCount }}</td>
              </tr>
            </tbody>
          </table>
          <div class="text-subtitle2 q-mt-md q-mb-sm">{{ t('inspector.availableLanguages') }}</div>
          <div class="lang-chips">
            <q-badge v-for="lang in filteredI18nInfo.languages" :key="lang" outline color="primary" class="q-mr-xs q-mb-xs">
              {{ lang }}
            </q-badge>
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- Network Info -->
    <q-expansion-item
      :label="t('inspector.networkInfo')"
      header-class="text-weight-bold"
      v-model:open="expandNetwork"
    >
      <q-card flat bordered class="q-mb-md">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard({ isOnline, connectionType, effectiveType, downlink, rtt, saveData })" />
        </div>
        <q-card-section>
          <table class="info-table">
            <tbody>
              <tr>
                <td class="label">{{ t('inspector.status') }}</td>
                <td>
                  <q-badge :color="isOnline ? 'positive' : 'negative'">
                    {{ isOnline ? t('inspector.online') : t('inspector.offline') }}
                  </q-badge>
                </td>
              </tr>
              <tr v-if="connectionType">
                <td class="label">{{ t('inspector.connectionType') }}</td>
                <td><code>{{ connectionType }}</code></td>
              </tr>
              <tr v-if="effectiveType">
                <td class="label">{{ t('inspector.effectiveType') }}</td>
                <td><code>{{ effectiveType }}</code></td>
              </tr>
              <tr v-if="downlink !== null">
                <td class="label">{{ t('inspector.downlink') }}</td>
                <td><code>{{ downlink }}</code></td>
              </tr>
              <tr v-if="rtt !== null">
                <td class="label">{{ t('inspector.rtt') }}</td>
                <td><code>{{ rtt }}</code></td>
              </tr>
              <tr>
                <td class="label">{{ t('inspector.saveData') }}</td>
                <td>
                  <q-icon :name="saveData ? 'mdi-check-circle' : 'mdi-close-circle'"
                    :color="saveData ? 'positive' : 'grey'" size="18px" />
                </td>
              </tr>
            </tbody>
          </table>
        </q-card-section>
      </q-card>
    </q-expansion-item>

    <!-- Performance Metrics -->
    <q-expansion-item
      :label="t('inspector.performance')"
      header-class="text-weight-bold"
      v-model:open="expandPerformance"
    >
      <q-card flat bordered class="q-mb-md">
        <div class="row justify-end q-pa-xs">
          <q-btn flat dense round icon="mdi-content-copy" size="xs" :title="t('inspector.copyToClipboard')"
            @click.stop="copyToClipboard({ usedJSHeapSize, jsHeapSizeLimit, totalJSHeapSize, pageLoadTime })" />
        </div>
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">{{ t('inspector.memoryUsage') }}</div>
          <table class="info-table">
            <tbody>
              <tr v-if="usedJSHeapSize !== null">
                <td class="label">{{ t('inspector.usedJSHeapSize') }}</td>
                <td><code>{{ formatBytes(usedJSHeapSize) }}</code></td>
              </tr>
              <tr v-if="totalJSHeapSize !== null">
                <td class="label">{{ t('inspector.totalJSHeapSize') }}</td>
                <td><code>{{ formatBytes(totalJSHeapSize) }}</code></td>
              </tr>
              <tr v-if="jsHeapSizeLimit !== null">
                <td class="label">{{ t('inspector.jsHeapSizeLimit') }}</td>
                <td><code>{{ formatBytes(jsHeapSizeLimit) }}</code></td>
              </tr>
              <template v-if="usedJSHeapSize === null && totalJSHeapSize === null && jsHeapSizeLimit === null">
                <tr><td colspan="2" class="text-caption text-grey">{{ t('inspector.memoryApiUnavailable') }}</td></tr>
              </template>
            </tbody>
          </table>

          <div class="text-subtitle2 q-mb-sm q-mt-md">{{ t('inspector.pageLoadTime') }}</div>
          <table class="info-table">
            <tbody>
              <tr v-if="pageLoadTime !== null">
                <td class="label">{{ t('inspector.pageLoadTime') }}</td>
                <td><code>{{ pageLoadTime }} ms</code></td>
              </tr>
              <tr v-else>
                <td colspan="2" class="text-caption text-grey">{{ t('inspector.navigationTimingUnavailable') }}</td>
              </tr>
            </tbody>
          </table>
        </q-card-section>
      </q-card>
    </q-expansion-item>

  </div>
</template>

<style lang="scss" scoped>
.lc-structure-inspector {
  --lc-bg: #ffffff;
  --lc-bg-alt: #f5f5f5;
  --lc-border: #e0e0e0;
  --lc-text: #333333;
  --lc-text-muted: #666666;
  --lc-text-header: #666666;
  --lc-code-bg: #f0f0f0;
  --lc-accent: #1565C0;
  --lc-section-border: #e0e0e0;
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  .lc-structure-inspector {
    --lc-bg: #1e1e1e;
    --lc-bg-alt: #2a2a2a;
    --lc-border: #444444;
    --lc-text: #e0e0e0;
    --lc-text-muted: #aaaaaa;
    --lc-text-header: #aaaaaa;
    --lc-code-bg: #2d2d2d;
    --lc-accent: #64b5f6;
    --lc-section-border: #444444;
  }
}

.info-table {
  border-collapse: collapse;
  width: 100%;

  th, td {
    padding: 6px 10px;
    text-align: start;
    border-bottom: 1px solid var(--lc-border);
    font-size: 12px;
  }

  th {
    font-weight: 600;
    color: var(--lc-text-header);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .label {
    font-weight: 500;
    color: var(--lc-text);
    white-space: nowrap;
  }
}

code {
  font-size: 11px;
  background: var(--lc-code-bg);
  padding: 1px 5px;
  border-radius: 3px;
}

.group-section {
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 2px solid var(--lc-section-border);
}

.group-header {
  display: flex;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
}

.theme-vars {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 4px;
}

.theme-var-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 2px 0;
}

.var-name {
  color: var(--lc-accent);
  font-size: 11px;
}

.var-value {
  color: var(--lc-text-muted);
  font-size: 11px;
}

.lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
