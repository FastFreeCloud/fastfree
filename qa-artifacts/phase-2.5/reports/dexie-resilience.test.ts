/**
 * Phase 2.5 — Dexie IndexedDB offline caching resilience validation.
 * Runs the REAL storage service from packages/fastfree_auth against fake-indexeddb.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { pathToFileURL } from 'node:url'

const REPO = 'C:/Users/FastFree/Desktop/fastfree'
const toUrl = (p: string) => pathToFileURL(p).href
const storage = await import(
  toUrl(REPO + '/packages/fastfree_auth/src/services/storage.service.ts')
)
const themeStorage = await import(
  toUrl(REPO + '/packages/fastfree_lowcode/src/runtime/composables/useThemeStorage.ts')
)

let pass = 0
let fail = 0
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++
    console.log(`PASS: ${name}`)
  } else {
    fail++
    console.log(`FAIL: ${name}`, extra ?? '')
  }
}

async function main() {
  // ---------- 1. init ----------
  const init = storage.initStorage()
  check('initStorage() returns success', init.success === true, init)

  // ---------- 2. settings CRUD ----------
  const s1 = await storage.setStorageSetting('theme', { mode: 'dark', preset: 'oled' })
  check('setStorageSetting success', s1.success === true, s1)
  const g1 = await storage.getStorageSetting<{ mode: string }>('theme')
  check(
    'getStorageSetting round-trip',
    g1.success === true && (g1.data as any)?.mode === 'dark',
    g1
  )
  const all = await storage.getAllStorageSettings()
  check('getAllStorageSettings returns record', all.success === true && 'theme' in (all.data as any), all)

  // ---------- 3. documents CRUD ----------
  const d1 = await storage.setStorageDocument('INV-1', 'Sales Invoice', { total: 100 })
  check('setStorageDocument success', d1.success === true, d1)
  const gd = await storage.getStorageDocument<{ total: number }>('INV-1')
  check('getStorageDocument round-trip', gd.success === true && gd.data?.total === 100, gd)
  await storage.setStorageDocument('INV-2', 'Sales Invoice', { total: 200 })
  await storage.setStorageDocument('PAY-1', 'Payment', { amount: 50 })
  const allDocs = await storage.getAllStorageDocuments<{ total: number }>('Sales Invoice')
  check('getAllStorageDocuments filtered by doctype', allDocs.success === true && allDocs.data.length === 2, allDocs)

  // ---------- 4. sync queue ----------
  await storage.addToSyncQueue({ action: 'create', doctype: 'Sales Invoice', docName: 'A' })
  await storage.addToSyncQueue({ action: 'update', doctype: 'Sales Invoice', docName: 'B' })
  await storage.addToSyncQueue({ action: 'delete', doctype: 'Sales Invoice', docName: 'C' })
  const q1 = await storage.getSyncQueue()
  check('getSyncQueue returns 3 unsynced', q1.success === true && q1.data.length === 3, q1)
  if (q1.success && q1.data.length === 3) {
    const m = await storage.markSynced(q1.data[0].id!)
    check('markSynced success', m.success === true, m)
    const q2 = await storage.getSyncQueue()
    check('after markSynced 2 remain unsynced', q2.success === true && q2.data.length === 2, q2)
    const cs = await storage.clearSyncQueue()
    const q3 = await storage.getSyncQueue()
    check(
      'clearSyncQueue removes only synced items',
      cs.success === true && q3.success === true && q3.data.length === 2,
      q3
    )
  }

  // ---------- 5. persistence across destroy/re-init ----------
  storage.destroyStorage()
  storage.initStorage()
  const g2 = await storage.getStorageSetting<{ mode: string }>('theme')
  check(
    'data persists across destroy/re-init',
    g2.success === true && (g2.data as any)?.mode === 'dark',
    g2
  )

  // ---------- 6. schema migration v1 -> v2 ----------
  // Pre-create a v1 database with the legacy boolean `synced` index, then
  // initStorage() must upgrade it to v2 without losing rows.
  storage.destroyStorage()
  const legacy = new Dexie('fastfree-storage')
  legacy.version(1).stores({
    settings: 'id, key',
    documents: 'id, doctype',
    sync_queue: '++id, timestamp, synced',
  })
  await legacy.open()
  await legacy.table('settings').put({ id: 'legacy-key', key: 'legacy-key', value: { v: 1 }, updatedAt: Date.now() })
  await legacy.table('sync_queue').add({ action: 'create', doctype: 'X', timestamp: Date.now(), synced: false })
  legacy.close()
  storage.initStorage()
  const legacyRead = await storage.getStorageSetting<{ v: number }>('legacy-key')
  check(
    'v1 -> v2 migration preserves existing rows',
    legacyRead.success === true && (legacyRead.data as any)?.v === 1,
    legacyRead
  )

  // ---------- 7. resilience: IndexedDB unavailable ----------
  storage.destroyStorage()
  const savedIDB = Dexie.dependencies.indexedDB
  Dexie.dependencies.indexedDB = undefined as any
  storage.initStorage()
  let threw = false
  let r1: any, r2: any
  try {
    r1 = await storage.setStorageSetting('x', 1)
    r2 = await storage.getStorageSetting('x')
  } catch {
    threw = true
  }
  check('IndexedDB unavailable: no exception escapes', threw === false)
  check('IndexedDB unavailable: set returns success=false', r1?.success === false, r1)
  check('IndexedDB unavailable: get returns success=false', r2?.success === false, r2)
  Dexie.dependencies.indexedDB = savedIDB
  storage.destroyStorage()

  // ---------- 8. resilience: indexedDB.open() errors (corruption / quota) ----------
  const savedIDB2 = Dexie.dependencies.indexedDB
  Dexie.dependencies.indexedDB = {
    open() {
      const req: any = {}
      setTimeout(() => req.onerror?.({ target: req }), 0)
      return req
    },
  } as any
  storage.destroyStorage()
  storage.initStorage()
  let threw2 = false
  let r3: any
  try {
    r3 = await storage.setStorageSetting('y', 2)
  } catch {
    threw2 = true
  }
  check('indexedDB.open error: no exception escapes', threw2 === false)
  check('indexedDB.open error: set returns success=false', r3?.success === false, r3)
  Dexie.dependencies.indexedDB = savedIDB2
  storage.destroyStorage()

  // ---------- 9. resilience: uncloneable value (DataCloneError) ----------
  storage.initStorage()
  const bad = await storage.setStorageSetting('bad', { fn: () => {} })
  check('uncloneable value: set returns success=false', bad.success === false, bad)
  const good = await storage.setStorageSetting('good', { ok: true })
  check('DB still usable after a failed write', good.success === true, good)

  // ---------- 9. theme storage (silent-fallback wrapper) ----------
  await themeStorage.setThemeConfig('accent', { color: '#00ff88' })
  const accent = await themeStorage.getThemeConfig<{ color: string }>('accent')
  check('useThemeStorage round-trip', accent?.color === '#00ff88', accent)

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('HARNESS ERROR', e)
  process.exit(2)
})
