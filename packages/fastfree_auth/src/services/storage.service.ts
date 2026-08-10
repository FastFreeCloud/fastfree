// ============================================================
// FastFree Auth — Storage Service
// Offline/POS storage using Dexie.js (IndexedDB)
// ============================================================

import Dexie, { type Table } from 'dexie'
import type { ApiResponse } from '../types'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface SettingRecord {
  id: string
  key: string
  value: unknown
  updatedAt: number
}

export interface DocumentRecord {
  id: string
  doctype: string
  data: Record<string, unknown>
  updatedAt: number
}

export interface SyncQueueItem {
  id?: number
  action: 'create' | 'update' | 'delete'
  doctype: string
  docName?: string
  data?: Record<string, unknown>
  timestamp: number
  synced: boolean
}

export type StorageTable = 'settings' | 'documents' | 'sync_queue'

export interface FastFreeStorageConfig {
  dbName?: string
  version?: number
}

// ------------------------------------------------------------
// Database
// ------------------------------------------------------------

let _db: Dexie | null = null

function getDb(): Dexie {
  if (!_db) {
    throw new Error('Storage not initialized. Call initStorage() first.')
  }
  return _db
}

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------

/**
 * Initialize the Dexie database.
 */
export function initStorage(config: FastFreeStorageConfig = {}): ApiResponse<void> {
  const { dbName = 'fastfree-storage', version = 1 } = config

  try {
    _db = new Dexie(dbName)

    _db.version(version).stores({
      settings: 'id, key',
      documents: 'id, doctype',
      sync_queue: '++id, timestamp, synced',
    })

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'STORAGE_INIT_FAILED',
        message: 'Failed to initialize storage',
        details: error,
      },
    }
  }
}

/**
 * Get the Dexie database instance.
 */
export function getStorage(): Dexie {
  return getDb()
}

// ------------------------------------------------------------
// Settings CRUD
// ------------------------------------------------------------

/**
 * Get a setting by key.
 */
export async function getStorageSetting<T = unknown>(key: string): Promise<ApiResponse<T | null>> {
  try {
    const db = getDb()
    const table: Table<SettingRecord> = db.table('settings')
    const record = await table.where('key').equals(key).first()

    return {
      success: true,
      data: record ? (record.value as T) : null,
    }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'GET_FAILED',
        message: `Failed to get setting: ${key}`,
        details: error,
      },
    }
  }
}

/**
 * Set a setting value.
 */
export async function setStorageSetting(key: string, value: unknown): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<SettingRecord> = db.table('settings')

    const record: SettingRecord = {
      id: key,
      key,
      value,
      updatedAt: Date.now(),
    }

    await table.put(record)

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'SET_FAILED',
        message: `Failed to set setting: ${key}`,
        details: error,
      },
    }
  }
}

/**
 * Delete a setting by key.
 */
export async function deleteStorageSetting(key: string): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<SettingRecord> = db.table('settings')

    await table.where('key').equals(key).delete()

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: `Failed to delete setting: ${key}`,
        details: error,
      },
    }
  }
}

/**
 * Get all settings.
 */
export async function getAllStorageSettings<T = Record<string, unknown>>(): Promise<ApiResponse<T>> {
  try {
    const db = getDb()
    const table: Table<SettingRecord> = db.table('settings')
    const records = await table.toArray()

    const result = {} as Record<string, unknown>
    for (const record of records) {
      result[record.key] = record.value
    }

    return {
      success: true,
      data: result as T,
    }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'GET_ALL_FAILED',
        message: 'Failed to get all settings',
        details: error,
      },
    }
  }
}

/**
 * Clear all settings.
 */
export async function clearStorageSettings(): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<SettingRecord> = db.table('settings')

    await table.clear()

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'CLEAR_FAILED',
        message: 'Failed to clear settings',
        details: error,
      },
    }
  }
}

// ------------------------------------------------------------
// Documents CRUD
// ------------------------------------------------------------

/**
 * Get a document by ID.
 */
export async function getStorageDocument<T = Record<string, unknown>>(id: string): Promise<ApiResponse<T | null>> {
  try {
    const db = getDb()
    const table: Table<DocumentRecord> = db.table('documents')
    const record = await table.get(id)

    return {
      success: true,
      data: record ? (record.data as T) : null,
    }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'GET_DOC_FAILED',
        message: `Failed to get document: ${id}`,
        details: error,
      },
    }
  }
}

/**
 * Set (upsert) a document.
 */
export async function setStorageDocument(
  id: string,
  doctype: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<DocumentRecord> = db.table('documents')

    const record: DocumentRecord = {
      id,
      doctype,
      data,
      updatedAt: Date.now(),
    }

    await table.put(record)

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'SET_DOC_FAILED',
        message: `Failed to set document: ${id}`,
        details: error,
      },
    }
  }
}

/**
 * Delete a document by ID.
 */
export async function deleteStorageDocument(id: string): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<DocumentRecord> = db.table('documents')

    await table.delete(id)

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'DELETE_DOC_FAILED',
        message: `Failed to delete document: ${id}`,
        details: error,
      },
    }
  }
}

/**
 * Get all documents for a doctype.
 */
export async function getAllStorageDocuments<T = Record<string, unknown>>(
  doctype?: string,
): Promise<ApiResponse<T[]>> {
  try {
    const db = getDb()
    const table: Table<DocumentRecord> = db.table('documents')

    let records: DocumentRecord[]
    if (doctype) {
      records = await table.where('doctype').equals(doctype).toArray()
    }
    else {
      records = await table.toArray()
    }

    return {
      success: true,
      data: records.map(r => r.data) as T[],
    }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'GET_ALL_DOC_FAILED',
        message: 'Failed to get all documents',
        details: error,
      },
    }
  }
}

/**
 * Clear all documents.
 */
export async function clearStorageDocuments(): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<DocumentRecord> = db.table('documents')

    await table.clear()

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'CLEAR_DOC_FAILED',
        message: 'Failed to clear documents',
        details: error,
      },
    }
  }
}

// ------------------------------------------------------------
// Sync Queue
// ------------------------------------------------------------

/**
 * Add an item to the sync queue.
 */
export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'synced'>,
): Promise<ApiResponse<number>> {
  try {
    const db = getDb()
    const table: Table<SyncQueueItem> = db.table('sync_queue')

    const id = await table.add({
      ...item,
      timestamp: Date.now(),
      synced: false,
    })

    return {
      success: true,
      data: id as number,
    }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'ADD_SYNC_FAILED',
        message: 'Failed to add item to sync queue',
        details: error,
      },
    }
  }
}

/**
 * Get all unsynced items from the queue.
 */
export async function getSyncQueue(): Promise<ApiResponse<SyncQueueItem[]>> {
  try {
    const db = getDb()
    const table: Table<SyncQueueItem> = db.table('sync_queue')

    const items = await table.where('synced').equals(0).sortBy('timestamp')

    return {
      success: true,
      data: items,
    }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'GET_SYNC_FAILED',
        message: 'Failed to get sync queue',
        details: error,
      },
    }
  }
}

/**
 * Mark a sync queue item as synced.
 */
export async function markSynced(id: number): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<SyncQueueItem> = db.table('sync_queue')

    await table.update(id, { synced: true })

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'MARK_SYNC_FAILED',
        message: `Failed to mark sync item as synced: ${id}`,
        details: error,
      },
    }
  }
}

/**
 * Clear all synced items from the queue.
 */
export async function clearSyncQueue(): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    const table: Table<SyncQueueItem> = db.table('sync_queue')

    await table.where('synced').equals(1).delete()

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: {
        code: 'CLEAR_SYNC_FAILED',
        message: 'Failed to clear sync queue',
        details: error,
      },
    }
  }
}

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------

/**
 * Destroy the storage instance (cleanup).
 */
export function destroyStorage(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
