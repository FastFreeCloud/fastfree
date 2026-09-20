<template>
  <div class="storage-inspector">
    <div class="storage-toolbar">
      <q-input
        v-model="search"
        :placeholder="t('debugger.searchStorage')"
        dense
        outlined
        clearable
        class="search-input"
      >
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>
      <q-btn flat dense icon="refresh" @click="refresh" :label="t('debugger.refresh')" color="primary" />
      <q-btn flat dense icon="delete_sweep" @click="confirmClearAll" :label="t('debugger.clearAll')" color="negative" />
    </div>

    <!-- Tabs: localStorage / SessionStorage / IndexedDB / Cache API -->
    <q-tabs v-model="activeTab" dense active-color="primary" indicator-color="primary" class="storage-tabs">
      <q-tab name="local" :label="`localStorage (${localStorageItems.length})`" />
      <q-tab name="session" :label="`sessionStorage (${sessionStorageItems.length})`" />
      <q-tab name="indexeddb" :label="`IndexedDB (${indexedDbDatabases.length})`" />
      <q-tab name="cache" :label="`Cache API (${cacheNames.length})`" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <!-- localStorage -->
      <q-tab-panel name="local" class="storage-panel">
        <div v-if="!localStorageItems.length" class="empty-state">{{ t('debugger.noData') }}</div>
        <div v-else class="storage-list">
          <div v-for="item in filteredLocalStorage" :key="item.key" class="storage-item">
            <div class="storage-item-header">
              <span class="storage-key">{{ item.key }}</span>
              <span class="storage-size">{{ formatSize(item.size) }}</span>
              <q-btn flat dense size="sm" icon="content_copy" @click="copyValue(item.value)" />
              <q-btn flat dense size="sm" icon="delete" color="negative" @click="removeLocalStorage(item.key)" />
            </div>
            <div class="storage-value" @click="expanded[item.key] = !expanded[item.key]">
              <pre v-if="expanded[item.key]">{{ item.value }}</pre>
              <span v-else class="storage-value-preview">{{ truncate(item.value, 120) }}</span>
            </div>
          </div>
        </div>
        <div class="storage-summary">
          {{ t('debugger.totalKeys') }}: {{ localStorageItems.length }} |
          {{ t('debugger.totalSize') }}: {{ formatSize(totalLocalStorageSize) }}
        </div>
      </q-tab-panel>

      <!-- SessionStorage -->
      <q-tab-panel name="session" class="storage-panel">
        <div v-if="!sessionStorageItems.length" class="empty-state">{{ t('debugger.noData') }}</div>
        <div v-else class="storage-list">
          <div v-for="item in filteredSessionStorage" :key="item.key" class="storage-item">
            <div class="storage-item-header">
              <span class="storage-key">{{ item.key }}</span>
              <span class="storage-size">{{ formatSize(item.size) }}</span>
              <q-btn flat dense size="sm" icon="content_copy" @click="copyValue(item.value)" />
              <q-btn flat dense size="sm" icon="delete" color="negative" @click="removeSessionStorage(item.key)" />
            </div>
            <div class="storage-value" @click="expanded[item.key] = !expanded[item.key]">
              <pre v-if="expanded[item.key]">{{ item.value }}</pre>
              <span v-else class="storage-value-preview">{{ truncate(item.value, 120) }}</span>
            </div>
          </div>
        </div>
        <div class="storage-summary">
          {{ t('debugger.totalKeys') }}: {{ sessionStorageItems.length }} |
          {{ t('debugger.totalSize') }}: {{ formatSize(totalSessionStorageSize) }}
        </div>
      </q-tab-panel>

      <!-- IndexedDB -->
      <q-tab-panel name="indexeddb" class="storage-panel">
        <div v-if="!indexedDbDatabases.length" class="empty-state">{{ t('debugger.noData') }}</div>
        <div v-else>
          <div v-for="db in indexedDbDatabases" :key="db.name" class="storage-item">
            <div class="storage-item-header">
              <span class="storage-key">{{ db.name }}</span>
              <span class="storage-size">v{{ db.version }}</span>
              <q-btn flat dense size="sm" icon="expand_more" @click="toggleDbExpand(db.name)" />
            </div>
            <div v-if="expandedDbs[db.name]" class="db-tables">
              <div v-for="table in db.tables" :key="table.name" class="db-table">
                <div class="storage-item-header">
                  <span class="storage-key">{{ table.name }}</span>
                  <span class="storage-size">{{ table.count }} {{ t('debugger.records') }}</span>
                  <q-btn flat dense size="sm" icon="visibility" @click="viewTableData(db.name, table.name)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-tab-panel>

      <!-- Cache API -->
      <q-tab-panel name="cache" class="storage-panel">
        <div v-if="!cacheNames.length" class="empty-state">{{ t('debugger.noData') }}</div>
        <div v-else>
          <div v-for="cacheName in cacheNames" :key="cacheName" class="storage-item">
            <div class="storage-item-header">
              <span class="storage-key">{{ cacheName }}</span>
              <q-btn flat dense size="sm" icon="delete" color="negative" @click="deleteCache(cacheName)" />
            </div>
          </div>
        </div>
        <div class="storage-summary">
          {{ t('debugger.totalCaches') }}: {{ cacheNames.length }}
        </div>
      </q-tab-panel>
    </q-tab-panels>

    <!-- IndexedDB Table Data Dialog -->
    <q-dialog v-model="showTableDialog" position="bottom" full-width>
      <q-card>
        <q-card-section>
          <div class="text-h6">{{ currentDbName }}.{{ currentTableName }}</div>
        </q-card-section>
        <q-card-section style="max-height: 60vh; overflow: auto;">
          <pre class="json-data">{{ tableDataJson }}</pre>
        </q-card-section>
        <q-card-actions>
          <q-btn flat label="Close" v-close-popup />
          <q-btn flat label="Copy" color="primary" @click="copyValue(tableDataJson)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'

const $q = useQuasar()
const { t } = useLcI18n()

interface StorageItem {
  key: string
  value: string
  size: number
}

interface IndexedDbTable {
  name: string
  count: number
}

interface IndexedDbInfo {
  name: string
  version: number
  tables: IndexedDbTable[]
}

const search = ref('')
const activeTab = ref('local')
const expanded = reactive<Record<string, boolean>>({})
const expandedDbs = reactive<Record<string, boolean>>({})

const localStorageItems = ref<StorageItem[]>([])
const sessionStorageItems = ref<StorageItem[]>([])
const indexedDbDatabases = ref<IndexedDbInfo[]>([])
const cacheNames = ref<string[]>([])

const showTableDialog = ref(false)
const currentDbName = ref('')
const currentTableName = ref('')
const tableDataJson = ref('')

const filteredLocalStorage = computed(() => {
  if (!search.value) return localStorageItems.value
  const q = search.value.toLowerCase()
  return localStorageItems.value.filter(i => i.key.toLowerCase().includes(q) || i.value.toLowerCase().includes(q))
})

const filteredSessionStorage = computed(() => {
  if (!search.value) return sessionStorageItems.value
  const q = search.value.toLowerCase()
  return sessionStorageItems.value.filter(i => i.key.toLowerCase().includes(q) || i.value.toLowerCase().includes(q))
})

const totalLocalStorageSize = computed(() => localStorageItems.value.reduce((sum, i) => sum + i.size, 0))
const totalSessionStorageSize = computed(() => sessionStorageItems.value.reduce((sum, i) => sum + i.size, 0))

function readStorage(storage: Storage): StorageItem[] {
  const items: StorageItem[] = []
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key === null) continue
      const value = storage.getItem(key) ?? ''
      items.push({ key, value, size: new Blob([value]).size })
    }
  } catch { /* private mode */ }
  return items.sort((a, b) => b.size - a.size)
}

async function readIndexedDb(): Promise<IndexedDbInfo[]> {
  try {
    if (typeof indexedDB === 'undefined') return []
    // @ts-expect-error chrome extension — indexedDB.databases may not exist
    const dbs: { name: string; version: number }[] = typeof indexedDB.databases === 'function'
      ? await indexedDB.databases()
      : []

    const results: IndexedDbInfo[] = []
    for (const dbInfo of dbs) {
      const tables = await new Promise<IndexedDbTable[]>((resolve) => {
        try {
          const req = indexedDB.open(dbInfo.name, dbInfo.version)
          req.onsuccess = () => {
            const db = req.result
            const tableNames = Array.from(db.objectStoreNames)
            const tableResults: IndexedDbTable[] = tableNames.map(name => ({ name, count: -1 }))
            db.close()
            resolve(tableResults)
          }
          req.onerror = () => resolve([])
        } catch { resolve([]) }
      })
      results.push({ name: dbInfo.name, version: dbInfo.version, tables })
    }
    return results
  } catch { return [] }
}

async function readCacheNames(): Promise<string[]> {
  try {
    if (typeof caches === 'undefined') return []
    return await caches.keys()
  } catch { return [] }
}

async function refresh() {
  localStorageItems.value = readStorage(localStorage)
  sessionStorageItems.value = readStorage(sessionStorage)
  indexedDbDatabases.value = await readIndexedDb()
  cacheNames.value = await readCacheNames()
}

function removeLocalStorage(key: string) {
  localStorage.removeItem(key)
  localStorageItems.value = localStorageItems.value.filter(i => i.key !== key)
}

function removeSessionStorage(key: string) {
  sessionStorage.removeItem(key)
  sessionStorageItems.value = sessionStorageItems.value.filter(i => i.key !== key)
}

function confirmClearAll() {
  $q.dialog({
    title: t('debugger.clearAll'),
    message: t('debugger.clearAllConfirm'),
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(() => {
    localStorage.clear()
    sessionStorage.clear()
    refresh()
    $q.notify({ message: t('debugger.storageCleared'), color: 'positive' })
  })
}

function toggleDbExpand(name: string) {
  expandedDbs[name] = !expandedDbs[name]
}

async function viewTableData(dbName: string, tableName: string) {
  currentDbName.value = dbName
  currentTableName.value = tableName
  tableDataJson.value = 'Loading...'
  showTableDialog.value = true

  try {
    const data = await new Promise<unknown[]>((resolve) => {
      const req = indexedDB.open(dbName)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(tableName)) { db.close(); resolve([]); return }
        const tx = db.transaction(tableName, 'readonly')
        const store = tx.objectStore(tableName)
        const getAll = store.getAll()
        getAll.onsuccess = () => { resolve(getAll.result ?? []); db.close() }
        getAll.onerror = () => { resolve([]); db.close() }
      }
      req.onerror = () => resolve([])
    })
    tableDataJson.value = JSON.stringify(data, null, 2)
  } catch {
    tableDataJson.value = '[]'
  }
}

async function deleteCache(name: string) {
  try {
    await caches.delete(name)
    cacheNames.value = cacheNames.value.filter(n => n !== name)
    $q.notify({ message: `Cache "${name}" deleted`, color: 'positive' })
  } catch { /* ignore */ }
}

function copyValue(value: string) {
  navigator.clipboard.writeText(value)
  $q.notify({ message: t('debugger.copied'), color: 'positive', icon: 'check' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

onMounted(() => { refresh() })
</script>

<style scoped>
.storage-inspector { font-family: monospace; font-size: 13px; }
.storage-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.storage-toolbar .search-input { flex: 1; min-width: 150px; }
.storage-tabs { margin-bottom: 8px; }
.storage-panel { padding: 8px 0 !important; }
.storage-list { display: flex; flex-direction: column; gap: 4px; max-height: 60vh; overflow: auto; }
.storage-item { background: var(--q-surface, #f9f9f9); border: 1px solid var(--q-separator, #e0e0e0); border-radius: 6px; padding: 8px 10px; }
.storage-item-header { display: flex; align-items: center; gap: 8px; }
.storage-key { font-weight: bold; color: var(--q-primary, #1976d2); flex: 1; word-break: break-all; font-size: 12px; }
.storage-size { font-size: 11px; color: #999; white-space: nowrap; }
.storage-value { margin-top: 4px; cursor: pointer; font-size: 11px; color: #666; }
.storage-value pre { margin: 0; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow: auto; background: #f5f5f5; padding: 6px; border-radius: 4px; }
.storage-value-preview { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.storage-summary { margin-top: 12px; font-size: 11px; color: #999; text-align: center; }
.db-tables { padding-left: 16px; }
.db-table { border-left: 2px solid var(--q-separator, #e0e0e0); padding-left: 8px; }
.empty-state { color: #999; text-align: center; padding: 20px; }
.json-data { font-size: 11px; white-space: pre-wrap; word-break: break-all; max-height: 50vh; overflow: auto; background: #f5f5f5; padding: 8px; border-radius: 4px; }
</style>
