import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScreenLoader } from './ScreenLoader'
import { SduiCacheManager } from './SduiCacheManager'

describe('ScreenLoader (lowcode)', () => {
  beforeEach(async () => {
    await SduiCacheManager.getInstance().clear()
    ScreenLoader.resetInstance()
  })

  it('fetches a screen from the server and caches it', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            id: 'srv',
            versionHash: 'h1',
            root: { type: 'div', children: [{ type: 'span', text: 'hi' }] },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const loader = new ScreenLoader({
      baseUrl: 'http://example.test',
      fetchImpl,
      fallbackScreens: {},
    })

    const screen = await loader.load('srv')
    expect(screen.id).toBe('srv')
    expect(screen.root.type).toBe('div')
    expect(fetchImpl).toHaveBeenCalled()

    const cached = await SduiCacheManager.getInstance().get('srv')
    expect(cached?.id).toBe('srv')
  })

  it('returns the cached screen when the network fails', async () => {
    const cache = SduiCacheManager.getInstance()
    await cache.set({ id: 'off', root: { type: 'div' } } as any)

    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })
    const bundled = { id: 'off', root: { type: 'span' } }
    const loader = new ScreenLoader({
      baseUrl: 'http://example.test',
      fetchImpl,
      fallbackScreens: [bundled],
    })

    const screen = await loader.load('off')
    expect(screen.root.type).toBe('div')
  })

  it('falls back to a bundled screen when there is no cache', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    })
    const bundled = { id: 'missing', root: { type: 'button' } }
    const loader = new ScreenLoader({
      baseUrl: 'http://example.test',
      fetchImpl,
      fallbackScreens: { missing: bundled },
    })

    const screen = await loader.load('missing')
    expect(screen.root.type).toBe('button')
  })

  it('does not break SduiCacheManager basic operations', async () => {
    const c = SduiCacheManager.getInstance()
    await c.set({ id: 'x', root: { type: 'div' } } as any)
    expect((await c.get('x'))?.id).toBe('x')
    await c.invalidate('x')
    expect(await c.get('x')).toBeNull()
  })
})