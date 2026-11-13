import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../src/app.ts'

let tmpDir: string
let dbPath: string
let store: any
let app: any

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'sdui-'))
  dbPath = join(tmpDir, 'test.db')
  const created = createApp({ dbPath })
  app = created.app
  store = created.store
})

after(() => {
  store?.close?.()
  rmSync(tmpDir, { recursive: true, force: true })
})

const sampleScreen = {
  id: 'test-screen',
  title: { ar: 'تجربة', en: 'Test' },
  root: { type: 'div', children: [{ type: 'span', text: 'hello' }] },
}

describe('SDUI server', () => {
  test('health', async () => {
    const res = await app.request('/health')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.data.status, 'ok')
  })

  test('POST /v1/screens creates draft', async () => {
    const res = await app.request('/v1/screens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ screen: sampleScreen }),
    })
    assert.equal(res.status, 201)
    const body = await res.json()
    assert.equal(body.data.id, 'test-screen')
    assert.ok(body.data.versionHash)
    assert.equal(body.data.channel, 'draft')
  })

  test('GET /v1/screens/:id serves screen', async () => {
    const res = await app.request('/v1/screens/test-screen')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.data.screen.id, 'test-screen')
    assert.ok(res.headers.get('etag'))
  })

  test('ETag / If-None-Match returns 304', async () => {
    const first = await app.request('/v1/screens/test-screen')
    const etag = first.headers.get('etag')!
    const res = await app.request('/v1/screens/test-screen', {
      headers: { 'if-none-match': etag },
    })
    assert.equal(res.status, 304)
    assert.equal(res.headers.get('etag'), etag)
  })

  test('GET /v1/screens/:id/versions', async () => {
    const res = await app.request('/v1/screens/test-screen/versions')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.ok(Array.isArray(body.data.versions))
    assert.ok(body.data.versions.length >= 1)
  })

  test('POST /v1/screens/:id/publish', async () => {
    const res = await app.request('/v1/screens/test-screen/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel: 'stable' }),
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.data.channel, 'stable')
    assert.ok(body.data.publishedAt)
  })

  test('404 for unknown screen', async () => {
    const res = await app.request('/v1/screens/does-not-exist')
    assert.equal(res.status, 404)
  })

  test('seeded home screen is served', async () => {
    const res = await app.request('/v1/screens/home')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.data.id, 'home')
  })
})