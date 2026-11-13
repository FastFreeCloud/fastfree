import { serve } from '@hono/node-server'
import { createApp } from './app.ts'

const HOST = process.env.SDUI_HOST?.trim() || '127.0.0.1'
const PORT = Number.parseInt(process.env.SDUI_PORT?.trim() || '4000', 10)

if (process.env.SDUI_NO_AUTOSTART !== '1') {
  const { app } = createApp()
  serve({ fetch: app.fetch, hostname: HOST, port: PORT }, (info) => {
    console.log(`[sdui-server] listening on http://${HOST}:${info.port}`)
  })
}

export { createApp }