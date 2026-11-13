import { Hono } from 'hono'
import { SduiScreenSchema } from '../../../contract/screen.schema.ts'
import type { ScreenStore } from '../db.ts'
import type { StoredScreen } from '../types.ts'

export function screenRoutes(store: ScreenStore): Hono {
  const r = new Hono()

  r.get('/screens', (c) => {
    return c.json({ data: { ids: store.listScreens() } })
  })

  r.get('/screens/:id', (c) => {
    const id = c.req.param('id')
    const channel = c.req.query('channel') || undefined
    const versionParam = c.req.query('version')
    let record: StoredScreen | undefined
    if (versionParam) {
      const v = Number(versionParam)
      if (!Number.isInteger(v)) {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'version must be an integer.' } }, 400)
      }
      record = store.getVersion(id, v)
    } else {
      record = store.getLatest(id, channel)
    }
    if (!record) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Screen not found.' } }, 404)
    }
    const etag = `"${record.versionHash}"`
    const ifNoneMatch = c.req.header('if-none-match')
    if (ifNoneMatch) {
      // Support comma-separated lists and weak prefixes.
      const candidates = ifNoneMatch.split(',').map((s) => s.trim().replace(/^W\//, ''))
      if (candidates.includes(etag) || candidates.includes('*')) {
        return new Response(null, { status: 304, headers: { ETag: etag } })
      }
    }
    return c.json({ data: record }, 200, { ETag: etag })
  })

  r.get('/screens/:id/versions', (c) => {
    const id = c.req.param('id')
    const versions = store.listVersions(id)
    return c.json({ data: { id, versions } })
  })

  r.post('/screens', async (c) => {
    let body: any
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' } }, 400)
    }
    const id = (body?.id ?? body?.screen?.id) as string | undefined
    const rawScreen = body?.screen ?? body
    if (!rawScreen || typeof rawScreen !== 'object') {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'screen is required.' } }, 400)
    }
    let validated: any
    try {
      validated = SduiScreenSchema.parse(rawScreen)
    } catch (err: any) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid screen.', details: { issues: err?.issues ?? String(err) } } },
        400,
      )
    }
    if (id) validated.id = id
    if (!validated.id) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'screen.id is required.' } }, 400)
    }
    const channel = (body?.channel as string) || 'draft'
    const targeting = body?.targeting
    const record = store.createDraft({ id: validated.id, screen: validated, channel, targeting })
    return c.json({ data: record }, 201)
  })

  r.post('/screens/:id/publish', async (c) => {
    const id = c.req.param('id')
    let body: any = {}
    try {
      body = await c.req.json()
    } catch {
      body = {}
    }
    const channel = (body?.channel as string) || 'stable'
    const version = body?.version != null ? Number(body.version) : undefined
    const record = store.publish(id, channel, version)
    if (!record) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Screen not found.' } }, 404)
    }
    return c.json({ data: record })
  })

  return r
}