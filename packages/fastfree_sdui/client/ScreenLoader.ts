/**
 * ScreenLoader — client-side loader for server-driven screens.
 *
 * Fetches a screen from the FastFree SDUI delivery server, caches it (SWR),
 * and falls back to a bundled/offline copy when the network fails.
 *
 * Kept dependency-free (no Vue/Dexie) so it runs in Node, browsers and Tauri.
 */

export interface SduiScreenLike {
  id: string
  versionHash?: string
  title?: unknown
  root: any
  state?: Record<string, any>
  meta?: any
  [key: string]: unknown
}

export interface ScreenLoaderCache {
  get(id: string): Promise<SduiScreenLike | null> | SduiScreenLike | null
  set(screen: SduiScreenLike): Promise<void> | void
  invalidate?(id: string): Promise<void> | void
}

export interface ScreenLoaderOptions {
  /** Base URL of the SDUI server, e.g. http://127.0.0.1:4000 */
  baseUrl?: string
  /** Default channel to request (draft/stable/beta). */
  channel?: string
  /** Target app identifier sent as ?app= */
  app?: string
  /** Locale sent as ?locale= */
  locale?: string
  /** App version sent as ?version= */
  appVersion?: string
  /** Inject a fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch
  /** Optional cache backend (defaults to an in-memory Map). */
  cache?: ScreenLoaderCache | null
  /** Bundled fallback screens keyed by id. */
  fallbackScreens?: Record<string, SduiScreenLike> | SduiScreenLike[]
  /** Request timeout in ms. */
  timeoutMs?: number
}

export interface LoadOptions {
  channel?: string
  app?: string
  locale?: string
  appVersion?: string
  version?: number | string
  forceRefresh?: boolean
  signal?: AbortSignal
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:4000'

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function toFallbackMap(input?: ScreenLoaderOptions['fallbackScreens']): Record<string, SduiScreenLike> {
  if (!input) return {}
  if (Array.isArray(input)) {
    const out: Record<string, SduiScreenLike> = {}
    for (const s of input) if (s && s.id) out[s.id] = s
    return out
  }
  return input
}

function parseScreenFromResponse(json: any): SduiScreenLike | null {
  if (!json) return null
  // Server envelope: { data: { screen } } or { data: screen }
  const data = json.data !== undefined ? json.data : json
  if (data && typeof data === 'object') {
    if (data.screen && typeof data.screen === 'object' && data.screen.root) {
      const screen = { ...data.screen }
      if (!screen.id && data.id) screen.id = data.id
      if (!screen.versionHash && data.versionHash) screen.versionHash = data.versionHash
      return screen as SduiScreenLike
    }
    if (data.root && typeof data.root === 'object') {
      return data as SduiScreenLike
    }
  }
  // Maybe the whole payload is a screen
  if (json.root && typeof json.root === 'object') return json as SduiScreenLike
  return null
}

export class ScreenLoader {
  private baseUrl: string
  private defaultChannel: string | undefined
  private defaultApp: string | undefined
  private defaultLocale: string | undefined
  private defaultAppVersion: string | undefined
  private fetchImpl: typeof fetch
  private cache: ScreenLoaderCache | null
  private fallbacks: Record<string, SduiScreenLike>
  private timeoutMs: number
  private memoryCache: Map<string, SduiScreenLike> = new Map()

  constructor(options: ScreenLoaderOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl || DEFAULT_BASE_URL)
    this.defaultChannel = options.channel
    this.defaultApp = options.app
    this.defaultLocale = options.locale
    this.defaultAppVersion = options.appVersion
    this.fetchImpl = options.fetchImpl || (globalThis as any).fetch
    this.cache = options.cache === undefined ? null : options.cache
    // If no external cache provided, use an in-memory one.
    if (this.cache === null && options.cache === undefined) {
      this.cache = this.createMemoryCache()
    }
    this.fallbacks = toFallbackMap(options.fallbackScreens)
    this.timeoutMs = options.timeoutMs ?? 15000
  }

  private createMemoryCache(): ScreenLoaderCache {
    const store = this.memoryCache
    return {
      get: (id) => store.get(id) ?? null,
      set: (screen) => {
        store.set(screen.id, screen)
      },
      invalidate: (id) => {
        store.delete(id)
      },
    }
  }

  /** Singleton holder. */
  private static instance: ScreenLoader | null = null
  public static getInstance(options?: ScreenLoaderOptions): ScreenLoader {
    if (!ScreenLoader.instance) {
      ScreenLoader.instance = new ScreenLoader(options)
    }
    return ScreenLoader.instance
  }
  public static resetInstance(): void {
    ScreenLoader.instance = null
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = normalizeBaseUrl(url)
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  private buildUrl(id: string, opts: LoadOptions): string {
    const params = new URLSearchParams()
    const channel = opts.channel ?? this.defaultChannel
    const app = opts.app ?? this.defaultApp
    const locale = opts.locale ?? this.defaultLocale
    const appVersion = opts.appVersion ?? this.defaultAppVersion
    if (channel) params.set('channel', channel)
    if (app) params.set('app', app)
    if (locale) params.set('locale', locale)
    if (appVersion) params.set('version', appVersion)
    if (opts.version != null) params.set('version', String(opts.version))
    const qs = params.toString()
    return `${this.baseUrl}/v1/screens/${encodeURIComponent(id)}${qs ? '?' + qs : ''}`
  }

  private async doFetch(id: string, opts: LoadOptions): Promise<SduiScreenLike> {
    const url = this.buildUrl(id, opts)
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const signal = opts.signal || controller?.signal
    let timeoutHandle: any
    if (controller && this.timeoutMs > 0 && !opts.signal) {
      timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs)
    }
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: signal ?? null,
      })
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
    if (res.status === 304) {
      const cached = this.cache ? await this.cache.get(id) : null
      if (cached) return cached
      // fall through to error
    }
    if (!res.ok) {
      throw new Error(`ScreenLoader: failed to load "${id}" (${res.status})`)
    }
    const json = await res.json()
    const screen = parseScreenFromResponse(json)
    if (!screen || !screen.id) {
      // ensure id
      if (screen) screen.id = screen.id || id
    }
    if (!screen) {
      throw new Error(`ScreenLoader: invalid screen payload for "${id}"`)
    }
    if (!screen.id) screen.id = id
    if (this.cache) {
      try {
        await this.cache.set(screen)
      } catch {
        // ignore cache write failures
      }
    }
    return screen
  }

  public async load(id: string, opts: LoadOptions = {}): Promise<SduiScreenLike> {
    if (!id) throw new Error('ScreenLoader: screen id is required')

    const force = !!opts.forceRefresh

    // Integration point with the lowcode detection layer: when the cache backend
    // exposes `getOrFetch` (SduiCacheManager does), delegate SWR to it so the
    // two-tier cache, deduplication and revalidation listeners stay the single
    // source of truth. Forced refreshes bypass it and hit the network directly.
    if (!force && this.cache && typeof (this.cache as any).getOrFetch === 'function') {
      try {
        const screen = await (this.cache as any).getOrFetch(
          id,
          () => this.doFetch(id, opts),
        )
        if (screen) return screen as SduiScreenLike
      } catch (err) {
        // 3. Fallback to bundled screen.
        const fb = this.fallbacks[id]
        if (fb) {
          if (this.cache) {
            try {
              await this.cache.set(fb)
            } catch {}
          }
          return fb
        }
        // 4. Last resort: stale cache.
        if (this.cache) {
          try {
            const stale = await this.cache.get(id)
            if (stale) return stale as SduiScreenLike
          } catch {}
        }
        throw err
      }
    }

    // 1. Try cache first (SWR) unless forced (backends without getOrFetch).
    if (!force && this.cache) {
      try {
        const cached = await this.cache.get(id)
        if (cached) {
          // Background revalidation (non-blocking).
          void this.doFetch(id, opts).catch(() => {
            // ignore background failures
          })
          return cached as SduiScreenLike
        }
      } catch {
        // ignore cache read failures
      }
    }

    // 2. Fetch from server.
    try {
      return await this.doFetch(id, opts)
    } catch (err) {
      // 3. Fallback to bundled screen.
      const fb = this.fallbacks[id]
      if (fb) {
        if (this.cache) {
          try {
            await this.cache.set(fb)
          } catch {}
        }
        return fb
      }
      // 4. Last resort: stale cache.
      if (this.cache) {
        try {
          const stale = await this.cache.get(id)
          if (stale) return stale as SduiScreenLike
        } catch {}
      }
      throw err
    }
  }

  public async invalidate(id: string): Promise<void> {
    if (this.cache && this.cache.invalidate) {
      try {
        await this.cache.invalidate(id)
      } catch {}
    }
    this.memoryCache.delete(id)
  }

  public async preload(ids: string[], opts: LoadOptions = {}): Promise<void> {
    await Promise.all(ids.map((id) => this.load(id, opts).catch(() => null)))
  }
}

export default ScreenLoader

// Convenience functional API.
export async function loadScreen(
  id: string,
  options?: ScreenLoaderOptions & LoadOptions
): Promise<SduiScreenLike> {
  const { baseUrl, channel, app, locale, appVersion, fetchImpl, cache, fallbackScreens, timeoutMs, ...loadOpts } =
    options || {}
  const loader = new ScreenLoader({ baseUrl, channel, app, locale, appVersion, fetchImpl, cache, fallbackScreens, timeoutMs } as ScreenLoaderOptions)
  return loader.load(id, loadOpts)
}
