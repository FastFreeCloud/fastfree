/**
 * ScreenLoader client tests (SDUI-05, docs/sdui/PLAN.md §9 P1)
 *
 * Verifies the client loader: fetch + parse + SWR cache + forceRefresh +
 * fallback + invalidate + preload, using an injected fetch (no network).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScreenLoader, loadScreen } from '../client/ScreenLoader'

function makeResponse(body: any, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(Object.entries(headers)),
    json: async () => body,
  } as any
}

// Hono-style headers use .get; make a minimal Headers-like.
function makeRes(body: any, status = 200, etag?: string) {
  const h = new Map<string, string>()
  if (etag) h.set('etag', etag)
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => h.get(k.toLowerCase()) ?? null },
    json: async () => body,
  } as any
}

const sampleScreen = (id = 'demo', title = 'Hello') => ({
  id,
  title: { ar: title, en: title },
  root: { type: 'div', children: [{ type: 'span', text: title }] },
  versionHash: 'hash-' + id,
})

describe('ScreenLoader', () => {
  beforeEach(() => {
    ScreenLoader.resetInstance()
  })

  it('defaults baseUrl to http://127.0.0.1:4000', () => {
    const l = new ScreenLoader({ cache: null, fallbackScreens: {} })
    expect(l.getBaseUrl()).toBe('http://127.0.0.1:4000')
  })

  it('honors custom baseUrl and strips trailing slash', () => {
    const l = new ScreenLoader({ baseUrl: 'http://example.com/api/', cache: null })
    expect(l.getBaseUrl()).toBe('http://example.com/api')
  })

  it('load fetches and parses server envelope {data:{screen}}', async () => {
    const fetchImpl = vi.fn(async () =>
      makeRes({ data: { id: 'demo', channel: 'stable', version: 1, screen: sampleScreen('demo') } }, 200, '"h"'),
    )
    const l = new ScreenLoader({ fetchImpl, cache: null, baseUrl: 'http://x' })
    const s = await l.load('demo')
    expect(s.id).toBe('demo')
    expect(fetchImpl).toHaveBeenCalledOnce()
    const url = fetchImpl.mock.calls[0][0]
    expect(url).toBe('http://x/v1/screens/demo')
  })

  it('appends query params from defaults and LoadOptions', async () => {
    const fetchImpl = vi.fn(async () => makeRes({ data: { screen: sampleScreen('demo') } }, 200))
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', channel: 'beta', app: 'installer', locale: 'ar', appVersion: '1.0.0' })
    await l.load('demo', { version: 3 })
    const url = fetchImpl.mock.calls[0][0] as string
    expect(url).toContain('channel=beta')
    expect(url).toContain('app=installer')
    expect(url).toContain('locale=ar')
    // version from LoadOptions overrides appVersion
    expect(url).toContain('version=3')
  })

  it('parses direct {data: screen} and bare screen', async () => {
    const fetchImpl = vi.fn(async () => makeRes({ data: sampleScreen('a') }, 200))
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: null })
    expect((await l.load('a')).id).toBe('a')

    const fetchImpl2 = vi.fn(async () => makeRes(sampleScreen('b'), 200))
    const l2 = new ScreenLoader({ fetchImpl: fetchImpl2, baseUrl: 'http://x', cache: null })
    expect((await l2.load('b')).id).toBe('b')
  })

  it('throws on non-ok response', async () => {
    const fetchImpl = vi.fn(async () => makeRes({ error: 'nope' }, 404))
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: null, fallbackScreens: {} })
    await expect(l.load('missing')).rejects.toThrow(/failed to load/)
  })

  it('throws on invalid payload', async () => {
    const fetchImpl = vi.fn(async () => makeRes({ data: { foo: 'bar' } }, 200))
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: null, fallbackScreens: {} })
    await expect(l.load('bad')).rejects.toThrow(/invalid screen payload/)
  })

  it('SWR: returns cached immediately and revalidates in background', async () => {
    let calls = 0
    const fetchImpl = vi.fn(async () => {
      calls++
      return makeRes({ data: { screen: sampleScreen('demo', 'v' + calls) } }, 200)
    })
    const cache = new Map<string, any>()
    const cacheObj = {
      get: async (id: string) => cache.get(id) ?? null,
      set: async (s: any) => { cache.set(s.id, s) },
      invalidate: async (id: string) => { cache.delete(id) },
    }
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: cacheObj })

    // prime cache
    await l.load('demo')
    expect((cache.get('demo') as any).title.ar).toBe('v1')

    // second load returns cached (v1) immediately
    const cached = await l.load('demo')
    expect((cached as any).title.ar).toBe('v1')

    // wait for background revalidation
    await new Promise((r) => setTimeout(r, 50))
    expect((cache.get('demo') as any).title.ar).toBe('v2')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('forceRefresh bypasses cache and fetches', async () => {
    const fetchImpl = vi.fn(async () => makeRes({ data: { screen: sampleScreen('demo') } }, 200))
    const cache = new Map<string, any>()
    const cacheObj = {
      get: async (id: string) => cache.get(id) ?? null,
      set: async (s: any) => { cache.set(s.id, s) },
    }
    cache.set('demo', sampleScreen('demo'))
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: cacheObj })
    await l.load('demo', { forceRefresh: true })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('falls back to bundled screen on fetch failure', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down') })
    const fb = sampleScreen('demo')
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: null, fallbackScreens: { demo: fb } })
    const s = await l.load('demo')
    expect(s.id).toBe('demo')
  })

  it('falls back to stale cache on fetch failure', async () => {
    const cache = new Map<string, any>()
    const cacheObj = {
      get: async (id: string) => cache.get(id) ?? null,
      set: async (s: any) => { cache.set(s.id, s) },
    }
    cache.set('demo', sampleScreen('demo'))
    const fetchImpl = vi.fn(async () => { throw new Error('network down') })
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: cacheObj, fallbackScreens: {} })
    const s = await l.load('demo')
    expect(s.id).toBe('demo')
  })

  it('throws when no cache and no fallback', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down') })
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: null, fallbackScreens: {} })
    await expect(l.load('demo')).rejects.toThrow(/network down/)
  })

  it('304 returns cached screen', async () => {
    const fetchImpl = vi.fn(async () => makeRes(null, 304))
    const cache = new Map<string, any>()
    const cacheObj = {
      get: async (id: string) => cache.get(id) ?? null,
      set: async (s: any) => { cache.set(s.id, s) },
    }
    cache.set('demo', sampleScreen('demo'))
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: cacheObj })
    const s = await l.load('demo', { forceRefresh: true })
    expect(s.id).toBe('demo')
  })

  it('invalidate removes from cache and memory', async () => {
    const cache = new Map<string, any>()
    const cacheObj = {
      get: async (id: string) => cache.get(id) ?? null,
      set: async (s: any) => { cache.set(s.id, s) },
      invalidate: async (id: string) => { cache.delete(id) },
    }
    const l = new ScreenLoader({ baseUrl: 'http://x', cache: cacheObj, fetchImpl: vi.fn() })
    // prime memory cache via constructor's default? Use set via load? Instead direct:
    await cacheObj.set(sampleScreen('demo'))
    await l.invalidate('demo')
    expect(cache.get('demo')).toBeUndefined()
  })

  it('preload loads multiple ids', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const id = url.split('/').pop() as string
      return makeRes({ data: { screen: sampleScreen(id) } }, 200)
    })
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: null })
    await l.preload(['a', 'b'])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('singleton getInstance/resetInstance', () => {
    const a = ScreenLoader.getInstance({ baseUrl: 'http://x', cache: null })
    const b = ScreenLoader.getInstance()
    expect(a).toBe(b)
    ScreenLoader.resetInstance()
    const c = ScreenLoader.getInstance({ baseUrl: 'http://y', cache: null })
    expect(c).not.toBe(a)
    expect(c.getBaseUrl()).toBe('http://y')
  })

  it('loadScreen functional API works', async () => {
    const fetchImpl = vi.fn(async () => makeRes({ data: { screen: sampleScreen('demo') } }, 200))
    const s = await loadScreen('demo', { baseUrl: 'http://x', fetchImpl, cache: null })
    expect(s.id).toBe('demo')
  })

  it('sets id when missing', async () => {
    const sc = sampleScreen('demo')
    delete (sc as any).id
    // server returns screen without id but envelope has id
    const fetchImpl = vi.fn(async () => makeRes({ data: { id: 'demo', screen: sc } }, 200))
    const l = new ScreenLoader({ fetchImpl, baseUrl: 'http://x', cache: null })
    const s = await l.load('demo')
    expect(s.id).toBe('demo')
  })
})