/**
 * SduiCacheManager — Two-Tier Cache Architecture for Server-Driven UI
 * L1: High-speed In-Memory Cache (Map)
 * L2: Persistent IndexedDB via Dexie ('lc-sdui-cache')
 * Strategy: Stale-While-Revalidate (SWR)
 */

import Dexie, { type Table } from 'dexie'
import type { SduiScreen, SduiCacheEntry, CachedScreenRecord } from './types'

/**
 * Internal Dexie Database Schema for SDUI Screen Storage
 */
class SduiDexieDb extends Dexie {
  screens!: Table<CachedScreenRecord, string>

  constructor() {
    super('lc-sdui-cache')
    this.version(1).stores({
      screens: 'id, versionHash, updatedAt'
    })
  }
}

export class SduiCacheManager {
  private static instance: SduiCacheManager | null = null

  /** Default SWR freshness window: 5 minutes. */
  private static readonly DEFAULT_TTL = 5 * 60 * 1000

  /** L1 In-Memory Fast Cache */
  private l1Cache: Map<string, SduiCacheEntry> = new Map()

  /** L2 Persistent Dexie Database */
  private db: SduiDexieDb

  /** Mutex map for background revalidations in-flight */
  private inflightFetches: Map<string, Promise<SduiScreen>> = new Map()

  /** Optional event listeners for cache revalidation */
  private revalidateListeners: Set<(screen: SduiScreen) => void> = new Set()

  constructor() {
    this.db = new SduiDexieDb()
  }

  /**
   * Singleton Accessor
   */
  public static getInstance(): SduiCacheManager {
    if (!SduiCacheManager.instance) {
      SduiCacheManager.instance = new SduiCacheManager()
    }
    return SduiCacheManager.instance
  }

  /**
   * Retrieves a screen from L1 (Memory) first, then falls back to L2 (IndexedDB).
   * Automatically promotes L2 hits to L1.
   *
   * @param id Screen identifier
   * @returns SduiScreen or null if not found
   */
  public async get(id: string): Promise<SduiScreen | null> {
    // 1. Inspect L1 In-Memory Cache
    const memEntry = this.l1Cache.get(id)
    if (memEntry) {
      return memEntry.screen
    }

    // 2. Inspect L2 IndexedDB via Dexie
    try {
      const record = await this.db.screens.get(id)
      if (record && record.screen) {
        // Promote to L1
        this.l1Cache.set(id, {
          screen: record.screen,
          timestamp: record.updatedAt || Date.now()
        })
        return record.screen
      }
    } catch (err) {
      console.warn(`[SduiCacheManager] Failed to read from L2 cache for id "${id}":`, err)
    }

    return null
  }

  /**
   * Persists a screen into both L1 (Memory) and L2 (Dexie DB).
   *
   * @param screen Screen definition to cache
   */
  public async set(screen: SduiScreen): Promise<void> {
    if (!screen || !screen.id) {
      throw new Error('[SduiCacheManager] Cannot cache invalid screen without id')
    }

    const now = Date.now()
    const clonedScreen: SduiScreen = JSON.parse(JSON.stringify(screen))

    // 1. Write to L1 In-Memory
    this.l1Cache.set(screen.id, {
      screen: clonedScreen,
      timestamp: now
    })

    // 2. Write to L2 Dexie IndexedDB
    try {
      const record: CachedScreenRecord = {
        id: screen.id,
        versionHash: screen.versionHash || '',
        updatedAt: now,
        screen: clonedScreen
      }
      await this.db.screens.put(record)
    } catch (err) {
      console.warn(`[SduiCacheManager] Failed to persist screen "${screen.id}" to L2:`, err)
    }
  }

  /**
   * Stale-While-Revalidate (SWR) fetching policy:
   * Returns cached data immediately if available (L1/L2), and asynchronously
   * revalidates with the remote fetcher in the background.
   * If cache is empty, awaits the fetcher directly.
   *
   * @param id Screen ID to fetch
   * @param fetcher Network or RPC fetch function
   * @param onRevalidate Optional callback triggered when background refresh yields newer screen
   */
  public async getOrFetch(
    id: string,
    fetcher: () => Promise<SduiScreen>,
    onRevalidate?: (screen: SduiScreen) => void
  ): Promise<SduiScreen> {
    const cached = await this.get(id)

    if (cached) {
      // Trigger background revalidation non-blockingly
      this.triggerRevalidation(id, fetcher, cached, onRevalidate)
      return cached
    }

    // Cache miss — fetch synchronously
    return this.executeFetch(id, fetcher)
  }

  /**
   * Trigger non-blocking background revalidation
   */
  private triggerRevalidation(
    id: string,
    fetcher: () => Promise<SduiScreen>,
    cached: SduiScreen,
    onRevalidate?: (screen: SduiScreen) => void
  ): void {
    if (this.inflightFetches.has(id)) {
      return
    }

    this.executeFetch(id, fetcher)
      .then((fresh) => {
        // Compare versionHash or deep structure
        const hasChanged =
          fresh.versionHash && cached.versionHash
            ? fresh.versionHash !== cached.versionHash
            : JSON.stringify(fresh) !== JSON.stringify(cached)

        if (hasChanged) {
          if (onRevalidate) {
            onRevalidate(fresh)
          }
          this.notifyRevalidation(fresh)
        }
      })
      .catch((err) => {
        console.warn(`[SduiCacheManager] Background revalidation failed for "${id}":`, err)
      })
  }

  /**
   * Executes fetcher with deduplication
   */
  private async executeFetch(
    id: string,
    fetcher: () => Promise<SduiScreen>
  ): Promise<SduiScreen> {
    const existing = this.inflightFetches.get(id)
    if (existing) {
      return existing
    }

    const fetchPromise = (async () => {
      try {
        const fresh = await fetcher()
        await this.set(fresh)
        return fresh
      } finally {
        this.inflightFetches.delete(id)
      }
    })()

    this.inflightFetches.set(id, fetchPromise)
    return fetchPromise
  }

  /**
   * Invalidates a screen from both L1 and L2
   */
  public async invalidate(id: string): Promise<void> {
    this.l1Cache.delete(id)
    try {
      await this.db.screens.delete(id)
    } catch (err) {
      console.warn(`[SduiCacheManager] Failed to invalidate L2 entry "${id}":`, err)
    }
  }

  /**
   * Clears entire cache across L1 and L2
   */
  public async clear(): Promise<void> {
    this.l1Cache.clear()
    try {
      await this.db.screens.clear()
    } catch (err) {
      console.warn('[SduiCacheManager] Failed to clear L2 screens table:', err)
    }
  }

  /**
   * Subscribe to global background revalidation updates
   */
  public onRevalidate(callback: (screen: SduiScreen) => void): () => void {
    this.revalidateListeners.add(callback)
    return () => this.revalidateListeners.delete(callback)
  }

  private notifyRevalidation(screen: SduiScreen): void {
    for (const listener of this.revalidateListeners) {
      try {
        listener(screen)
      } catch (e) {
        console.error('[SduiCacheManager] Error in revalidation listener:', e)
      }
    }
  }

  /**
   * Returns current count of entries in L1 memory
   */
  public getL1Size(): number {
    return this.l1Cache.size
  }

  /**
   * Number of screens persisted in the L2 Dexie store.
   */
  public async size(): Promise<number> {
    try {
      return await this.db.screens.count()
    } catch (err) {
      console.warn('[SduiCacheManager] Failed to count L2 screens:', err)
      return 0
    }
  }

  /**
   * Every screen currently persisted in L2 (IndexedDB), newest first.
   */
  public async getAll(): Promise<SduiScreen[]> {
    try {
      const records = await this.db.screens.orderBy('updatedAt').reverse().toArray()
      return records.map((record) => record.screen).filter(Boolean)
    } catch (err) {
      console.warn('[SduiCacheManager] Failed to read all L2 screens:', err)
      return []
    }
  }

  /**
   * Cache age (ms) for a screen across L1 then L2. Returns null when missing.
   */
  public async getAge(id: string, maxAge = SduiCacheManager.DEFAULT_TTL): Promise<number | null> {
    const cached = await this.getWithTimestamp(id)
    if (!cached) return null
    return Date.now() - cached.timestamp
  }

  /**
   * Stale-While-Revalidate freshness check: a cached screen is stale once it
   * is older than `maxAge` (or when the store holds no entry at all).
   */
  public async isStale(id: string, maxAge = SduiCacheManager.DEFAULT_TTL): Promise<boolean> {
    const age = await this.getAge(id, maxAge)
    return age === null || age > maxAge
  }

  /**
   * Prefetch a batch of screens into L1 + L2 without blocking rendering.
   */
  public async prefetch(screens: SduiScreen[] | (() => Promise<SduiScreen[]>)): Promise<void> {
    const list = typeof screens === 'function' ? await screens() : screens
    await Promise.all(list.map((screen) => this.set(screen)))
  }

  /**
   * Remove every entry older than `maxAge` from both cache tiers.
   */
  public async clearStale(maxAge = SduiCacheManager.DEFAULT_TTL): Promise<number> {
    const cutoff = Date.now() - maxAge
    let removed = 0

    for (const [id, entry] of this.l1Cache.entries()) {
      if (entry.timestamp < cutoff) {
        this.l1Cache.delete(id)
        removed++
      }
    }

    try {
      const stale = await this.db.screens.filter((r) => r.updatedAt < cutoff).primaryKeys()
      await this.db.screens.bulkDelete(stale)
    } catch (err) {
      console.warn('[SduiCacheManager] Failed to clear stale L2 entries:', err)
    }

    return removed
  }

  /**
   * Snapshot of cache health for diagnostics / the SDUI playground.
   */
  public getCacheStats(): { l1: number; l2: number | null; database: string } {
    return {
      l1: this.l1Cache.size,
      l2: null,
      database: 'lc-sdui-cache',
    }
  }

  /**
   * Internal: read a screen plus the timestamp it was cached at.
   */
  private async getWithTimestamp(id: string): Promise<SduiCacheEntry | null> {
    const memEntry = this.l1Cache.get(id)
    if (memEntry) return memEntry

    try {
      const record = await this.db.screens.get(id)
      if (record) {
        return { screen: record.screen, timestamp: record.updatedAt || 0 }
      }
    } catch {
      // L2 unavailable — treat as a miss.
    }
    return null
  }
}

export const sduiCacheManager = SduiCacheManager.getInstance()
