import Dexie, { type Table } from 'dexie'

interface ThemeRecord {
  id: string
  value: unknown
  updatedAt: number
}

let _db: Dexie | null = null

function getDb(): Dexie {
  if (!_db) {
    _db = new Dexie('lc-theme-storage')
    _db.version(1).stores({ themes: 'id' })
  }
  return _db
}

export async function getThemeConfig<T>(key: string): Promise<T | null> {
  const table: Table<ThemeRecord> = getDb().table('themes')
  const record = await table.get(key)
  return record ? (record.value as T) : null
}

export async function setThemeConfig(key: string, value: unknown): Promise<void> {
  try {
    const table: Table<ThemeRecord> = getDb().table('themes')
    const plainValue = JSON.parse(JSON.stringify(value))
    await table.put({ id: key, value: plainValue, updatedAt: Date.now() })
  } catch {
    // Graceful fallback: storage errors must never crash UI or trigger unhandled rejections
  }
}
