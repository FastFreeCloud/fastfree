<template>
  <div class="pinia-debugger">
    <!-- Toolbar -->
    <div class="toolbar">
      <q-btn :label="t('debugger.refresh')" @click="() => init()" color="primary" />
      <q-btn :label="t('debugger.downloadJson')" @click="downloadState" color="primary" />
      <q-btn :label="t('debugger.exportJson')" @click="copyStateToClipboard" color="primary" />
      <input type="file" @change="onImportFile" accept=".json" style="display:none" ref="fileInputRef" />
      <q-btn :label="t('debugger.importJson')" @click="fileInputRef?.click()" color="primary" />
      <q-btn :label="t('debugger.clearAll')" @click="confirmClearAll" color="negative" />
      <q-btn
        :label="t('debugger.takeSnapshot')"
        @click="takeSnapshot"
        color="secondary"
      />
      <q-btn
        :label="t('debugger.compareSnapshot')"
        @click="compareSnapshot"
        color="secondary"
        :disable="!snapshot"
      />

      <q-separator vertical class="toolbar-separator" />

      <!-- PWA Cache Controls -->
      <q-btn
        :label="isClearing ? t('debugger.clearing') : t('debugger.clearCache')"
        @click="confirmClearCache"
        color="warning"
        :loading="isClearing"
        :disable="isClearing"
      />
      <q-btn
        :label="t('debugger.nuclearClear')"
        @click="confirmNuclearClear"
        color="negative"
      />
      <q-btn
        :label="t('debugger.checkUpdates')"
        @click="checkForUpdate"
        color="primary"
        :loading="isChecking"
      />
      <q-btn
        :label="t('debugger.forceUpdate')"
        @click="forceSWUpdate"
        color="primary"
      />
      <q-checkbox v-model="autoRefresh" @update:model-value="autoRefresh ? startAutoRefresh() : stopAutoRefresh()" :label="t('debugger.autoRefresh')" />
    </div>

    <!-- Mutation Log Alert -->
    <q-banner
      v-if="mutationLog.length > 0"
      class="q-mb-md mutation-banner"
    >
      <template v-slot:avatar>
        <q-icon name="history" color="primary" />
      </template>
      <div class="text-caption">
        <strong>{{ mutationLog.length }} {{ t('debugger.mutations') }}</strong> -
        {{ t('debugger.last') }}: {{ mutationLog[0]?.store }} {{ mutationLog[0]?.type }}
        <q-btn flat dense size="sm" :label="t('debugger.clear')" @click="mutationLog = []" color="primary" />
      </div>
    </q-banner>

    <!-- Snapshot Diff Banner -->
    <q-banner
      v-if="diffResult.length > 0"
      class="q-mb-md diff-banner"
    >
      <template v-slot:avatar>
        <q-icon name="compare" color="secondary" />
      </template>
      <div class="text-caption">
        <strong>{{ t('debugger.diffResult') }}</strong>
        <q-btn flat dense size="sm" label="×" @click="diffResult = []" color="negative" />
      </div>
      <div class="diff-list">
        <div v-for="(d, i) in diffResult" :key="i" class="diff-item">
          <span class="diff-path">{{ d.path }}</span>
          <span :class="'diff-badge diff-' + d.type">{{ t('debugger.' + d.type) }}</span>
          <span v-if="d.type === 'changed'" class="diff-values">
            <span class="diff-old">{{ JSON.stringify(d.oldVal) }}</span>
            →
            <span class="diff-new">{{ JSON.stringify(d.newVal) }}</span>
          </span>
          <span v-else-if="d.type === 'added'" class="diff-values">
            <span class="diff-new">: {{ JSON.stringify(d.newVal) }}</span>
          </span>
        </div>
      </div>
    </q-banner>

    <div class="main-layout">
      <!-- Store List Sidebar -->
      <div class="store-list">
        <h3 class="store-list-title">{{ t('debugger.stores') }} ({{ filteredStoreList.length }})</h3>
        <q-input
          v-model="storeSearch"
          :placeholder="t('debugger.searchStores')"
          dense
          outlined
          class="search-input"
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        <ul class="store-list-ul">
          <li
            v-for="store in filteredStoreList"
            :key="store.id"
            @click="selectStore(store.id)"
            :class="{ active: selectedStoreId === store.id }"
            class="store-list-item"
          >
            <strong>{{ store.id }}</strong>
            <div class="store-meta">
              {{ t('debugger.state') }}: {{ store.stateKeys.length }} |
              {{ t('debugger.getters') }}: {{ store.getterKeys.length }} |
              {{ t('debugger.actions') }}: {{ store.actionKeys.length }}
            </div>
            <div class="store-persist-status">
              {{ getPersistenceStatus(store.id).enabled ? t('debugger.persisted') : t('debugger.memoryOnly') }}
            </div>
          </li>
        </ul>
      </div>

      <!-- Store Detail -->
      <div class="store-detail">
        <div v-if="!selectedStore" class="empty-state">
          {{ t('debugger.selectStore') }}
        </div>
        <div v-else class="store-detail-inner">
          <!-- Store Header -->
          <div class="store-header">
            <h3 class="store-title">{{ selectedStore.$id }}</h3>
            <div class="store-header-actions">
              <q-btn @click="confirmResetStore(selectedStore.$id)" class="secondary">
                {{ t('debugger.resetStore') }}
              </q-btn>
              <q-btn @click="confirmClearStorePersistence(selectedStore.$id)" class="secondary danger">
                {{ t('debugger.clearPersistence') }}
              </q-btn>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <q-btn
              v-for="tab in tabs"
              :key="tab"
              :label="tab"
              flat
              dense
              :class="{ active: activeTab === tab }"
              @click="activeTab = tab"
              class="tab-btn"
            />
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- State Tab -->
            <div v-if="activeTab === 'state'">
              <q-input
                v-model="stateSearch"
                :placeholder="t('debugger.searchState')"
                dense
                outlined
                class="search-input state-search"
                clearable
              >
                <template v-slot:prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
              <PiniaStateTreeView
                :nodes="filteredStoreStateTree"
                :store="selectedStore"
                @update="onStateUpdate"
              />
            </div>

            <!-- Getters Tab -->
            <div v-else-if="activeTab === 'getters'" class="tab-panel">
              <dl v-for="(value, key) in selectedStoreGetters" :key="key" class="getter-item">
                <dt class="getter-key">{{ key }}</dt>
                <dd class="getter-value">
                  {{ JSON.stringify(value, null, 2) }}
                </dd>
              </dl>
              <p v-if="!Object.keys(selectedStoreGetters).length" class="empty-text">{{ t('debugger.noGetters') }}</p>
            </div>

            <!-- Actions Tab -->
            <div v-else-if="activeTab === 'actions'" class="tab-panel">
              <ul class="action-list">
                <li
                  v-for="action in storeActionKeys"
                  :key="action"
                  class="action-item"
                >
                  <code>{{ action }}</code>
                  <q-btn
                    size="sm"
                    :label="t('debugger.invoke')"
                    class="secondary"
                    @click="selectedStore && showActionDialog(selectedStore, action)"
                  />
                </li>
              </ul>
              <p v-if="!storeActionKeys.length" class="empty-text">{{ t('debugger.noActions') }}</p>
            </div>

            <!-- Persistence Tab -->
            <div v-else-if="activeTab === 'persistence'" class="tab-panel">
              <PiniaPersistenceInfo v-if="selectedStore" :store="selectedStore" @reset="confirmResetStore(selectedStore.$id)" />
            </div>

            <!-- Mutation Log Tab -->
            <div v-else-if="activeTab === 'mutations'" class="tab-panel">
              <h4 class="mutation-log-title">{{ t('debugger.mutationLog') }}</h4>
              <div class="mutation-log-container">
                <div
                  v-for="(log, i) in mutationLog"
                  :key="i"
                  class="mutation-log-entry"
                >
                  <span class="mutation-time">{{ log.time.toLocaleTimeString() }}</span>
                  <span :class="'mutation-type mutation-type-' + log.type.replace(' ', '-')">
                    {{ log.type }}
                  </span>
                  <span class="mutation-detail">{{ log.store }} {{ log.payload ? '→ ' + JSON.stringify(log.payload).slice(0, 100) : '' }}</span>
                </div>
                <div v-if="mutationLog.length === 0" class="mutation-empty">{{ t('debugger.noMutations') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getActivePinia } from 'pinia'
import type { Pinia, Store } from 'pinia'
import { useQuasar } from 'quasar'

import PiniaStateTreeView from './PiniaStateTreeView.vue'
import PiniaPersistenceInfo from './PiniaPersistenceInfo.vue'
import { usePWACache } from '../composables/usePWACache'
import { useLcI18n } from '../i18n'

const $q = useQuasar()
const pwaCache = usePWACache()
const { isClearing, isChecking } = pwaCache
const { t } = useLcI18n()

interface StoreDebugInfo {
  id: string
  store: Store
  stateKeys: string[]
  getterKeys: string[]
  actionKeys: string[]
}

interface TreeNode {
  key: string
  value: unknown
  type: string
  children: TreeNode[]
}

interface PersistOptions {
  storage?: { getItem: (key: string) => string | null; removeItem: (key: string) => void; name?: string }
  key?: string
  pick?: string[]
  omit?: string[]
}

interface StoreWithPersist extends Store {
  $options: { persist?: PersistOptions }
}

interface DiffEntry {
  path: string
  type: 'added' | 'removed' | 'changed'
  oldVal?: unknown
  newVal?: unknown
}

const pinia = ref<Pinia | null>(null)
const stores = ref<Map<string, Store>>(new Map())
const selectedStoreId = ref<string | null>(null)
const autoRefresh = ref(true)
const refreshTimer = ref<number | undefined>(undefined)
const mutationLog = ref<Array<{ store: string; type: string; payload?: unknown; time: Date }>>([])
const tabs = ['state', 'getters', 'actions', 'persistence', 'mutations']
const activeTab = ref('state')
const fileInputRef = ref<HTMLInputElement | null>(null)
const storeSearch = ref('')
const stateSearch = ref('')
const snapshot = ref<Record<string, unknown> | null>(null)
const diffResult = ref<DiffEntry[]>([])

const selectedStore = computed((): Store | null =>
  selectedStoreId.value ? stores.value.get(selectedStoreId.value) ?? null : null
)

const storeList = computed((): StoreDebugInfo[] =>
  Array.from(stores.value.values()).map(s => ({
    id: s.$id,
    store: s,
    stateKeys: Object.keys(s.$state),
    getterKeys: Object.keys(s).filter(k => !k.startsWith('$') && !Object.keys(s.$state).includes(k)),
    actionKeys: Object.keys(s).filter(k => typeof (s as Record<string, unknown>)[k] === 'function' && !k.startsWith('$'))
  }))
)

const filteredStoreList = computed((): StoreDebugInfo[] => {
  if (!storeSearch.value) return storeList.value
  const q = storeSearch.value.toLowerCase()
  return storeList.value.filter(s => s.id.toLowerCase().includes(q))
})

const storeActionKeys = computed((): string[] => {
  if (!selectedStore.value) return []
  return Object.keys(selectedStore.value).filter(k => typeof (selectedStore.value as unknown as Record<string, unknown>)[k] === 'function' && !k.startsWith('$'))
})

const selectedStoreGetters = computed(() => {
  if (!selectedStore.value) return {}
  const stateKeys = Object.keys(selectedStore.value.$state)
  const getters: Record<string, unknown> = {}
  Object.keys(selectedStore.value).forEach(k => {
    if (!k.startsWith('$') && !stateKeys.includes(k)) {
      getters[k] = (selectedStore.value as unknown as Record<string, unknown>)[k]
    }
  })
  return getters
})

const storeStateTree = computed(() => {
  if (!selectedStore.value) return []
  return buildTreeView(selectedStore.value.$state, selectedStore.value.$id)
})

const filteredStoreStateTree = computed(() => {
  if (!stateSearch.value) return storeStateTree.value
  const q = stateSearch.value.toLowerCase()
  return filterTree(storeStateTree.value, q)
})

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  return nodes
    .map(node => {
      const keyMatch = node.key.toLowerCase().includes(query)
      const childResults = filterTree(node.children || [], query)
      if (keyMatch || childResults.length > 0) {
        return { ...node, children: childResults.length > 0 ? childResults : node.children }
      }
      return null
    })
    .filter((node): node is TreeNode => node !== null)
}

function buildTreeView(obj: unknown, path = '', depth = 0, maxDepth = 10): TreeNode[] {
  if (depth >= maxDepth || obj === null || typeof obj !== 'object') {
    return [{ key: path, value: String(obj), type: typeof obj, children: [] }]
  }
  if (Array.isArray(obj)) {
    return [{
      key: path,
      value: `[Array(${obj.length})]`,
      type: 'array',
      children: obj.map((item, i) => buildTreeView(item, `${path}[${i}]`, depth + 1, maxDepth)[0]!)
    }]
  }
  return Object.entries(obj).map(([key, value]) => ({
    key: path ? `${path}.${key}` : key,
    value: typeof value === 'object' ? (Array.isArray(value) ? `[${value.length}]` : '{...}') : value,
    type: typeof value,
    children: typeof value === 'object' && value !== null ? buildTreeView(value, path ? `${path}.${key}` : key, depth + 1, maxDepth) : []
  }))
}

function init() {
  const p = getActivePinia()
  if (!p) {
    console.warn('No active Pinia instance found. PiniaStateDebugger requires an existing Pinia instance.')
    return
  }
  pinia.value = p

  const piniaInternal = p as Pinia & { _debuggerInitialized?: boolean; _s: Map<string, Store> }
  if (!piniaInternal._debuggerInitialized) {
    piniaInternal._debuggerInitialized = true
    p.use(({ store }: { store: Store }) => {
      stores.value = new Map(stores.value).set(store.$id, store)
      store.$subscribe((mutation: { type: string; storeId: string; payload?: unknown }, _state) => {
        mutationLog.value.unshift({
          store: store.$id,
          type: mutation.type,
          payload: mutation.payload,
          time: new Date()
        })
        if (mutationLog.value.length > 100) mutationLog.value.pop()
      }, { detached: true })
    })
  }

  if (autoRefresh.value) startAutoRefresh()
}

function selectStore(id: string) {
  selectedStoreId.value = id
  diffResult.value = []
}

function resetStore(id: string) {
  const store = stores.value.get(id)
  if (store?.$reset) {
    try { store.$reset() }
    catch { console.warn(`Store "${id}" doesn't support $reset (setup store)`) }
  }
}

function getPersistenceStatus(id: string) {
  const store = stores.value.get(id)
  if (!store) return { enabled: false }
  const persist = (store as unknown as StoreWithPersist).$options?.persist
  return { enabled: !!persist }
}

function clearStorePersistence(id: string) {
  const store = stores.value.get(id)
  if (!store) return

  const persist = (store as unknown as StoreWithPersist).$options?.persist
  if (persist) {
    const storage = persist.storage || localStorage
    const key = persist.key || `pinia_${store.$id}`
    storage.removeItem(key)
    localStorage.removeItem(`__pinia_sync_${key}`)
  }
}

function clearAllStores() {
  stores.value.forEach(store => {
    if (store.$reset) store.$reset()
  })
  clearAllPersistence()
}

function clearAllPersistence() {
  const piniaInternal = pinia.value as (Pinia & { _s?: Map<string, Store> }) | null
  piniaInternal?._s?.forEach((store) => {
    const persist = (store as unknown as StoreWithPersist).$options?.persist
    if (persist) {
      const storage = persist.storage || localStorage
      const key = persist.key || `pinia_${store.$id}`
      storage.removeItem(key)
    }
  })
}

function getAllState(): Record<string, unknown> {
  const state: Record<string, unknown> = {}
  stores.value.forEach((store, id) => { state[id] = store.$state })
  return state
}

function copyStateToClipboard() {
  const json = JSON.stringify(getAllState(), null, 2)
  navigator.clipboard.writeText(json)
}

function downloadState() {
  const json = JSON.stringify(getAllState(), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pinia-state-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function onImportFile(evt: Event) {
  const input = evt.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const state = JSON.parse(e.target?.result as string) as Record<string, unknown>
      Object.entries(state).forEach(([id, storeState]) => {
        stores.value.get(id)?.$patch(storeState as Record<string, unknown>)
      })
    } catch (err) {
      console.error('Invalid state JSON:', err)
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function onStateUpdate(path: string, value: unknown) {
  if (!selectedStore.value) return
  selectedStore.value.$patch({ [path]: value })
}

function showActionDialog(store: Store, actionName: string) {
  $q.dialog({
    title: actionName,
    message: t('debugger.argsPlaceholder'),
    prompt: {
      model: '',
      type: 'text',
      placeholder: '[1, "hello", {"key": "value"}]'
    },
    cancel: true,
    persistent: true
  }).onOk((argsString: string) => {
    invokeAction(store, actionName, argsString)
  })
}

function invokeAction(store: Store, actionName: string, argsString?: string) {
  try {
    const action = (store as unknown as Record<string, unknown>)[actionName]
    if (typeof action === 'function') {
      if (argsString && argsString.trim()) {
        let args: unknown[]
        try {
          const parsed = JSON.parse(argsString)
          args = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          args = [argsString]
        }
        action.call(store, ...args)
      } else {
        action.call(store)
      }
    }
  } catch (e) {
    console.error(`Action ${actionName} failed:`, e)
  }
}

function takeSnapshot() {
  snapshot.value = JSON.parse(JSON.stringify(getAllState()))
  diffResult.value = []
  $q.notify({ message: t('debugger.snapshotTaken'), color: 'positive', icon: 'check' })
}

function compareSnapshot() {
  if (!snapshot.value) {
    $q.notify({ message: t('debugger.noSnapshot'), color: 'warning' })
    return
  }
  const current = getAllState()
  diffResult.value = computeDiff(snapshot.value, current, '')
}

function computeDiff(oldObj: Record<string, unknown>, newObj: Record<string, unknown>, basePath: string): DiffEntry[] {
  const diffs: DiffEntry[] = []
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key
    const oldVal = oldObj?.[key]
    const newVal = newObj?.[key]

    if (oldVal === undefined && newVal !== undefined) {
      diffs.push({ path, type: 'added', newVal })
    } else if (oldVal !== undefined && newVal === undefined) {
      diffs.push({ path, type: 'removed', oldVal })
    } else if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
      if (Array.isArray(oldVal) || Array.isArray(newVal)) {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          diffs.push({ path, type: 'changed', oldVal, newVal })
        }
    } else {
      diffs.push(...computeDiff(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, path))
    }
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ path, type: 'changed', oldVal, newVal })
    }
  }

  return diffs
}



function startAutoRefresh() {
  refreshTimer.value = window.setInterval(() => {
    stores.value = new Map(stores.value)
  }, 1000)
}

function stopAutoRefresh() {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = undefined
  }
}

// --- Confirmation Dialogs ---

function confirmClearAll() {
  $q.dialog({
    title: t('debugger.clearAll'),
    message: t('debugger.clearAllConfirm'),
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(() => {
    clearAllStores()
  })
}

function confirmResetStore(id: string) {
  $q.dialog({
    title: t('debugger.resetStore'),
    message: t('debugger.resetConfirm'),
    cancel: true,
    persistent: true,
    color: 'warning'
  }).onOk(() => {
    resetStore(id)
  })
}

function confirmClearStorePersistence(id: string) {
  $q.dialog({
    title: t('debugger.clearPersistence'),
    message: t('debugger.clearPersistConfirm'),
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(() => {
    clearStorePersistence(id)
  })
}

function confirmClearCache() {
  $q.dialog({
    title: t('debugger.clearCache'),
    message: t('debugger.clearAllConfirm'),
    cancel: true,
    persistent: true,
    color: 'warning'
  }).onOk(async () => {
    await pwaCache.clearAllCaches()
  })
}

function confirmNuclearClear() {
  $q.dialog({
    title: t('debugger.nuclearClear'),
    message: t('debugger.nuclearConfirm'),
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(() => {
    pwaCache.nuclearClear()
  })
}

async function checkForUpdate() {
  await pwaCache.checkForUpdate()
}

async function forceSWUpdate() {
  await pwaCache.forceSWUpdate()
}

onMounted(() => {
  init()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.pinia-debugger {
  font-family: monospace;
  font-size: 13px;
  --debugger-bg: var(--q-background, #ffffff);
  --debugger-surface: var(--q-surface, #ffffff);
  --debugger-text: var(--q-text, #333333);
  --debugger-text-secondary: #666666;
  --debugger-text-muted: #999999;
  --debugger-border: var(--q-separator, #e0e0e0);
  --debugger-border-light: #eeeeee;
  --debugger-hover: #f5f5f5;
  --debugger-active-bg: #e3f2fd;
  --debugger-active-border: #1976d2;
  --debugger-code-bg: #f8f9fa;
  --debugger-add-color: #4caf50;
  --debugger-remove-color: #f44336;
  --debugger-change-color: #ff9800;
  --debugger-diff-banner-bg: #fff3e0;
  --debugger-mutation-bg: #1e1e1e;
  --debugger-mutation-text: #d4d4d4;
  --debugger-mutation-border: #333;
  --debugger-mutation-time: #9cdcfe;
  --debugger-mutation-type: #ce9178;
  background: var(--debugger-bg);
  color: var(--debugger-text);
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-separator {
  height: 24px;
  margin: 0 8px;
}

.pinia-debugger :deep(.q-btn) {
  padding: 6px 12px;
  border-radius: 4px;
}

.pinia-debugger :deep(.q-btn.danger) {
  border-color: #ef5350;
  color: #ef5350;
}

.mutation-banner {
  background: var(--debugger-code-bg);
  border-left: 4px solid var(--debugger-active-border);
}

.diff-banner {
  background: var(--debugger-diff-banner-bg);
  border-left: 4px solid var(--debugger-change-color);
}

.diff-list {
  max-height: 200px;
  overflow-y: auto;
  font-size: 12px;
  font-family: monospace;
  margin-top: 8px;
}

.diff-item {
  padding: 3px 0;
  border-bottom: 1px solid var(--debugger-border-light);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.diff-path {
  color: var(--debugger-text);
  font-weight: bold;
}

.diff-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  color: #fff;
  font-weight: bold;
}

.diff-added { background: var(--debugger-add-color); }
.diff-removed { background: var(--debugger-remove-color); }
.diff-changed { background: var(--debugger-change-color); }

.diff-values {
  font-size: 11px;
  color: var(--debugger-text-secondary);
}

.diff-old {
  text-decoration: line-through;
  color: var(--debugger-remove-color);
}

.diff-new {
  color: var(--debugger-add-color);
}

.main-layout {
  display: flex;
  gap: 16px;
  height: calc(100vh - 200px);
}

.store-list {
  width: 300px;
  border-right: 1px solid var(--debugger-border);
  padding-right: 16px;
  overflow: auto;
  flex-shrink: 0;
}

.store-list-title {
  margin: 0 0 12px;
}

.search-input {
  margin-bottom: 8px;
}

.store-list-ul {
  list-style: none;
  padding: 0;
}

.store-list-item {
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 4px 0;
  transition: background 0.2s;
}

.store-list-item.active {
  background: var(--debugger-active-bg);
}

.store-meta {
  font-size: 11px;
  color: var(--debugger-text-secondary);
  margin-top: 4px;
}

.store-persist-status {
  font-size: 10px;
  color: var(--debugger-text-muted);
  margin-top: 2px;
}

.store-detail {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.empty-state {
  color: var(--debugger-text-muted);
  padding: 20px;
  text-align: center;
}

.store-detail-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.store-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--debugger-border-light);
}

.store-title {
  margin: 0;
}

.store-header-actions {
  display: flex;
  gap: 8px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--debugger-border-light);
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--debugger-text-secondary);
}

.tab-btn.active {
  border-bottom-color: var(--debugger-active-border);
  color: var(--debugger-active-border);
  font-weight: bold;
}

.tab-content {
  flex: 1;
  overflow: auto;
}

.tab-panel {
  padding: 16px;
}

.state-search {
  margin-bottom: 8px;
}

.getter-item {
  margin: 8px 0;
}

.getter-key {
  font-weight: bold;
  color: var(--debugger-text);
}

.getter-value {
  margin: 4px 0 0 16px;
  color: var(--debugger-text-secondary);
  font-family: monospace;
  white-space: pre-wrap;
}

.action-list {
  list-style: none;
  padding: 0;
}

.action-item {
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-text {
  color: var(--debugger-text-muted);
}

.mutation-log-title {
  margin: 0 0 8px;
}

.mutation-log-container {
  max-height: 400px;
  overflow: auto;
  background: var(--debugger-mutation-bg);
  color: var(--debugger-mutation-text);
  padding: 12px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
}

.mutation-log-entry {
  border-bottom: 1px solid var(--debugger-mutation-border);
  padding: 4px 0;
  display: grid;
  grid-template-columns: 120px 80px 1fr;
}

.mutation-time {
  color: var(--debugger-mutation-time);
}

.mutation-type {
  color: var(--debugger-mutation-type);
}

.mutation-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mutation-empty {
  color: var(--debugger-text-muted);
  text-align: center;
}
</style>
