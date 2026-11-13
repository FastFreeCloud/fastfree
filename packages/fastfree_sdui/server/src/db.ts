import { DatabaseSync } from 'node:sqlite'
import type { SduiScreen } from '../../contract/types.ts'
import type { StoredScreen, CreateDraftInput, ScreenChannel } from './types.ts'
import { computeVersionHash } from './hash.ts'

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS screen_versions (
  screen_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  channel TEXT NOT NULL,
  version_hash TEXT NOT NULL,
  screen_json TEXT NOT NULL,
  targeting TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (screen_id, version)
);
`

function rowToRecord(row: any): StoredScreen {
  return {
    id: row.screen_id,
    channel: row.channel,
    version: row.version,
    versionHash: row.version_hash,
    screen: JSON.parse(row.screen_json) as SduiScreen,
    targeting: row.targeting ? JSON.parse(row.targeting) : undefined,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
  }
}

export class ScreenStore {
  readonly db: DatabaseSync

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath)
    this.db.exec(CREATE_TABLE)
    this.seedDemoIfNeeded()
  }

  close(): void {
    this.db.close()
  }

  private seedDemoIfNeeded(): void {
    const row = this.db.prepare('SELECT COUNT(*) AS c FROM screen_versions').get() as { c: number }
    if (row.c > 0) return
    const now = Date.now()
    const home: SduiScreen = {
      id: 'home',
      title: { ar: 'الصفحة الرئيسية', en: 'Home' },
      meta: { app: 'installer', tags: ['demo', 'seeded'], updatedAt: now },
      root: {
        type: 'div',
        children: [
          {
            type: 'card',
            children: [{ type: 'span', text: { ar: 'مرحباً من خادم SDUI', en: 'Hello from SDUI server' } }],
          },
        ],
      },
    }
    this.createDraft({ id: 'home', screen: home, channel: 'stable' })
    this.db
      .prepare(
        `UPDATE screen_versions SET channel='stable', published_at=? WHERE screen_id='home' AND version=1`,
      )
      .run(now)

    const demo: SduiScreen = {
      id: 'sdui-demo',
      title: { ar: 'شاشة تجريبية من الخادم', en: 'Server-driven demo screen' },
      meta: { app: 'installer', tags: ['demo', 'sdui-05'], updatedAt: now },
      state: { counter: 0 },
      root: {
        type: 'div',
        children: [
          {
            type: 'card',
            children: [
              { type: 'span', text: { ar: 'هذه الشاشة تُخدَم من خادم SDUI', en: 'This screen is served by the SDUI server' } },
              { type: 'q-banner', props: { dense: true }, children: [{ type: 'span', text: { ar: 'تحديث الخادم ينعكس فورًا', en: 'Server updates reflect instantly' } }] },
              { type: 'q-btn', props: { color: 'primary', label: { ar: 'زيادة', en: 'Increment' } }, events: { click: { type: 'state:set', target: 'counter', payload: 1 } } },
            ],
          },
        ],
      },
    }
    this.createDraft({ id: 'sdui-demo', screen: demo, channel: 'stable' })
    this.db
      .prepare(
        `UPDATE screen_versions SET channel='stable', published_at=? WHERE screen_id='sdui-demo' AND version=1`,
      )
      .run(now)
  }

  private nextVersion(id: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(version), 0) AS m FROM screen_versions WHERE screen_id = ?')
      .get(id) as { m: number }
    return (row?.m ?? 0) + 1
  }

  createDraft(input: CreateDraftInput): StoredScreen {
    const version = this.nextVersion(input.id)
    const baseScreen = { ...input.screen, id: input.id }
    const hash = computeVersionHash(baseScreen)
    const screen = { ...baseScreen, versionHash: hash }
    const channel = input.channel ?? 'draft'
    const createdAt = Date.now()
    const publishedAt = channel === 'draft' ? null : createdAt
    this.db
      .prepare(
        `INSERT INTO screen_versions (screen_id, version, channel, version_hash, screen_json, targeting, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        version,
        channel,
        screen.versionHash,
        JSON.stringify(screen),
        input.targeting ? JSON.stringify(input.targeting) : null,
        publishedAt,
        createdAt,
      )
    return {
      id: input.id,
      channel,
      version,
      versionHash: screen.versionHash,
      screen,
      targeting: input.targeting,
      publishedAt,
      createdAt,
    }
  }

  listScreens(): string[] {
    const rows = this.db
      .prepare('SELECT DISTINCT screen_id FROM screen_versions ORDER BY screen_id ASC')
      .all() as any[]
    return rows.map((r) => r.screen_id)
  }

  listVersions(id: string): StoredScreen[] {
    const rows = this.db
      .prepare('SELECT * FROM screen_versions WHERE screen_id = ? ORDER BY version DESC')
      .all(id) as any[]
    return rows.map(rowToRecord)
  }

  getVersion(id: string, version: number): StoredScreen | undefined {
    const row = this.db
      .prepare('SELECT * FROM screen_versions WHERE screen_id = ? AND version = ?')
      .get(id, version) as any
    return row ? rowToRecord(row) : undefined
  }

  getLatest(id: string, channel?: string): StoredScreen | undefined {
    let sql = 'SELECT * FROM screen_versions WHERE screen_id = ?'
    const params: any[] = [id]
    if (channel) {
      sql += ' AND channel = ?'
      params.push(channel)
    }
    sql += ' ORDER BY version DESC LIMIT 1'
    const row = this.db.prepare(sql).get(...params) as any
    return row ? rowToRecord(row) : undefined
  }

  publish(id: string, channel: string, version?: number): StoredScreen | undefined {
    let targetVersion = version
    if (!targetVersion) {
      const latestDraft = this.db
        .prepare(
          `SELECT version FROM screen_versions WHERE screen_id = ? AND channel = 'draft' ORDER BY version DESC LIMIT 1`,
        )
        .get(id) as { version: number } | undefined
      if (latestDraft) targetVersion = latestDraft.version
      else {
        const latest = this.db
          .prepare('SELECT MAX(version) AS m FROM screen_versions WHERE screen_id = ?')
          .get(id) as { m: number } | undefined
        if (!latest || latest.m == null) return undefined
        targetVersion = latest.m
      }
    }
    const now = Date.now()
    const res = this.db
      .prepare(
        `UPDATE screen_versions SET channel = ?, published_at = ? WHERE screen_id = ? AND version = ?`,
      )
      .run(channel, now, id, targetVersion)
    if (res.changes === 0) return undefined
    return this.getVersion(id, targetVersion)
  }
}