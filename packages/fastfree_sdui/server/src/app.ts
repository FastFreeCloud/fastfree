import { Hono } from 'hono'
import { ScreenStore } from './db.ts'
import { screenRoutes } from './routes/screens.ts'

export interface CreateAppOptions {
  dbPath?: string
  store?: ScreenStore
}

export function createApp(options: CreateAppOptions = {}): { app: Hono; store: ScreenStore } {
  const store = options.store ?? new ScreenStore(options.dbPath ?? process.env.SDUI_DB_PATH ?? './sdui.db')
  const app = new Hono()

  // Minimal CORS for self-hosted clients (Tauri webview / browser).
  app.use('*', async (c, next) => {
    const origin = c.req.header('origin') || '*'
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, If-None-Match, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    await next()
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Expose-Headers', 'ETag, Content-Length')
  })

  app.get('/health', (c) => {
    return c.json({ data: { status: 'ok' } })
  })

  app.route('/v1', screenRoutes(store))

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } }, 404))

  app.onError((err, c) => {
    console.error('[sdui-server] unhandled error:', err)
    return c.json({ error: { code: 'INTERNAL', message: 'Internal server error.' } }, 500)
  })

  return { app, store }
}