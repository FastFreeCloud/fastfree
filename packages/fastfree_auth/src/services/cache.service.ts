// ============================================================
// FastFree Auth — Cache Service
// Caches Frappe metadata and doctype schemas
// ============================================================

import Dexie, { type Table } from 'dexie'
import type { ApiResponse } from '../types'
import { getDoc } from './api.service'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface CacheRecord {
  key: string
  data: unknown
  updatedAt: number
  ttlMs: number
}

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const DEFAULT_METADATA_TTL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_DOCTYPE_TTL = 60 * 60 * 1000 // 1 hour

// ------------------------------------------------------------
// Database
// ------------------------------------------------------------

let _db: Dexie | null = null

function getDb(): Dexie {
  if (!_db) {
    _db = new Dexie('fastfree-cache')
    _db.version(1).stores({ cache: 'key' })
  }
  return _db
}

// ------------------------------------------------------------
// Core Cache Operations
// ------------------------------------------------------------

/**
 * Get cached data. Returns null if expired or not found.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = getDb()
    const table: Table<CacheRecord> = db.table('cache')
    const record = await table.get(key)

    if (!record) return null

    const elapsed = Date.now() - record.updatedAt
    if (elapsed > record.ttlMs) {
      await table.delete(key)
      return null
    }

    return record.data as T
  }
  catch {
    return null
  }
}

/**
 * Set cached data with TTL.
 */
export async function setCached(
  key: string,
  data: unknown,
  ttlMs: number = DEFAULT_METADATA_TTL,
): Promise<void> {
  try {
    const db = getDb()
    const table: Table<CacheRecord> = db.table('cache')

    const record: CacheRecord = {
      key,
      data,
      updatedAt: Date.now(),
      ttlMs,
    }

    await table.put(record)
  }
  catch {
    // Silently fail — cache is non-critical
  }
}

/**
 * Get or fetch — tries cache first, then fetcher.
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<ApiResponse<T>>,
  ttlMs: number = DEFAULT_METADATA_TTL,
): Promise<ApiResponse<T>> {
  const cached = await getCached<T>(key)
  if (cached !== null) {
    return { success: true, data: cached }
  }

  const result = await fetcher()
  if (result.success && result.data !== undefined) {
    await setCached(key, result.data, ttlMs)
  }

  return result
}

// ------------------------------------------------------------
// DocType Schema Caching
// ------------------------------------------------------------

/**
 * Cache a doctype schema from Frappe.
 */
export async function cacheDocType(doctype: string): Promise<ApiResponse<unknown>> {
  const key = `doctype:${doctype}`
  const result = await getDoc<unknown>('DocType', doctype)

  if (result.success && result.data) {
    await setCached(key, result.data, DEFAULT_DOCTYPE_TTL)
  }

  return result
}

/**
 * Get cached doctype schema.
 */
export async function getDocTypeSchema(doctype: string): Promise<ApiResponse<unknown>> {
  const key = `doctype:${doctype}`
  const cached = await getCached<unknown>(key)

  if (cached !== null) {
    return { success: true, data: cached }
  }

  return { success: false, error: { code: 'CACHE_MISS', message: `DocType schema not cached: ${doctype}` } }
}

// ------------------------------------------------------------
// Cache Management
// ------------------------------------------------------------

/**
 * Clear all cache entries.
 */
export async function clearCache(): Promise<void> {
  try {
    const db = getDb()
    const table: Table<CacheRecord> = db.table('cache')
    await table.clear()
  }
  catch {
    // Silently fail
  }
}

/**
 * Clear expired cache entries.
 */
export async function clearExpired(): Promise<void> {
  try {
    const db = getDb()
    const table: Table<CacheRecord> = db.table('cache')
    const all = await table.toArray()
    const now = Date.now()

    const expiredKeys = all
      .filter(r => now - r.updatedAt > r.ttlMs)
      .map(r => r.key)

    if (expiredKeys.length > 0) {
      await table.bulkDelete(expiredKeys)
    }
  }
  catch {
    // Silently fail
  }
}

/**
 * Destroy the cache database instance (cleanup).
 */
export function destroyCache(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
