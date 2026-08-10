// ============================================================
// FastFree Auth — API Service
// Uses frappe-js-sdk (official Frappe JavaScript SDK)
// ============================================================

import { FrappeApp } from 'frappe-js-sdk'
import type { ApiResponse } from '../types'

// ------------------------------------------------------------
// Frappe SDK Types
// ------------------------------------------------------------

interface FrappeAuth {
  loginWithUsernamePassword: (credentials: { username: string; password: string }) => Promise<{ message: string }>
  getLoggedInUser: () => Promise<string>
  logout: () => Promise<void>
}

interface FrappeDB {
  getDoc: (doctype: string, name: string) => Promise<Record<string, unknown>>
  getDocList: (doctype: string, options: { filters?: Record<string, unknown>; fields?: string[]; orderBy?: string; limit?: number }) => Promise<Record<string, unknown>[]>
  createDoc: (doctype: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateDoc: (doctype: string, name: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  deleteDoc: (doctype: string, name: string) => Promise<void>
  exists: (doctype: string, name: string) => Promise<boolean>
  getCount: (doctype: string, options: { filters?: Record<string, unknown> }) => Promise<number>
}

interface FrappeCall {
  get: (method: string, params?: Record<string, unknown>) => Promise<unknown>
  post: (method: string, params?: Record<string, unknown>) => Promise<unknown>
  put: (method: string, params?: Record<string, unknown>) => Promise<unknown>
  delete: (method: string, params?: Record<string, unknown>) => Promise<unknown>
}

interface FrappeFile {
  upload: (file: File, options: Record<string, unknown>) => Promise<Record<string, unknown>>
  delete: (fileName: string) => Promise<void>
}

interface FrappeAppInstance {
  auth: () => FrappeAuth
  db: () => FrappeDB
  call: () => FrappeCall
  file: () => FrappeFile
}

// ------------------------------------------------------------
// State
// ------------------------------------------------------------

let _frappe: FrappeAppInstance | null = null
let _auth: FrappeAuth | null = null
let _db: FrappeDB | null = null
let _call: FrappeCall | null = null
let _file: FrappeFile | null = null
let _baseUrl = ''

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------

/**
 * Initialize the API service with frappe-js-sdk.
 * Must be called once before any other service.
 */
export function initApiService(baseUrl: string): void {
  _baseUrl = baseUrl
  _frappe = new FrappeApp(baseUrl) as unknown as FrappeAppInstance
  _auth = _frappe.auth()
  _db = _frappe.db()
  _call = _frappe.call()
  _file = _frappe.file()
}

/**
 * Get the base URL.
 */
export function getBaseUrl(): string {
  return _baseUrl
}

/**
 * Get the FrappeApp instance.
 */
export function getFrappeApp(): FrappeAppInstance {
  if (!_frappe) {
    throw new Error('API service not initialized. Call initApiService() first.')
  }
  return _frappe
}

/**
 * Get the auth instance.
 */
export function getAuth(): FrappeAuth {
  if (!_auth) {
    throw new Error('API service not initialized. Call initApiService() first.')
  }
  return _auth
}

/**
 * Get the database instance.
 */
export function getDb(): FrappeDB {
  if (!_db) {
    throw new Error('API service not initialized. Call initApiService() first.')
  }
  return _db
}

/**
 * Get the call instance.
 */
export function getCall(): FrappeCall {
  if (!_call) {
    throw new Error('API service not initialized. Call initApiService() first.')
  }
  return _call
}

/**
 * Get the file instance.
 */
export function getFile(): FrappeFile {
  if (!_file) {
    throw new Error('API service not initialized. Call initApiService() first.')
  }
  return _file
}

// ------------------------------------------------------------
// Auth helpers
// ------------------------------------------------------------

/**
 * Login with email and password.
 */
export async function login(
  email: string,
  password: string,
): Promise<ApiResponse<{ message: string }>> {
  try {
    const auth = getAuth()
    const res = await auth.loginWithUsernamePassword({
      username: email,
      password,
    })
    return { success: true, data: res }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: err instanceof Error ? err.message : 'Login failed',
      },
    }
  }
}

/**
 * Get the currently logged in user.
 */
export async function getCurrentUser(): Promise<ApiResponse<{ user: string; email: string }>> {
  try {
    const auth = getAuth()
    const res = await auth.getLoggedInUser()
    return { success: true, data: { user: res, email: res } }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GET_USER_FAILED',
        message: err instanceof Error ? err.message : 'Failed to get user',
      },
    }
  }
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<ApiResponse<void>> {
  try {
    const auth = getAuth()
    await auth.logout()
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: err instanceof Error ? err.message : 'Logout failed',
      },
    }
  }
}

// ------------------------------------------------------------
// Database helpers
// ------------------------------------------------------------

/**
 * Get a document by doctype and name.
 */
export async function getDoc<T>(doctype: string, name: string): Promise<ApiResponse<T>> {
  try {
    const db = getDb()
    const res = await db.getDoc(doctype, name)
    return { success: true, data: res as T }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GET_DOC_FAILED',
        message: err instanceof Error ? err.message : 'Failed to get document',
      },
    }
  }
}

/**
 * Get a list of documents.
 */
export async function getDocList<T>(
  doctype: string,
  filters?: Record<string, unknown>,
  fields?: string[],
  orderBy?: string,
  limit?: number,
): Promise<ApiResponse<T[]>> {
  try {
    const db = getDb()
    const res = await db.getDocList(doctype, {
      ...(filters ? { filters } : {}),
      ...(fields ? { fields } : {}),
      orderBy: orderBy || `${doctype} desc`,
      ...(limit !== undefined ? { limit } : {}),
    })
    return { success: true, data: res as T[] }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GET_LIST_FAILED',
        message: err instanceof Error ? err.message : 'Failed to get list',
      },
    }
  }
}

/**
 * Create a new document.
 */
export async function createDoc<T>(doctype: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const db = getDb()
    const res = await db.createDoc(doctype, data)
    return { success: true, data: res as T }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'CREATE_DOC_FAILED',
        message: err instanceof Error ? err.message : 'Failed to create document',
      },
    }
  }
}

/**
 * Update an existing document.
 */
export async function updateDoc<T>(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  try {
    const db = getDb()
    const res = await db.updateDoc(doctype, name, data)
    return { success: true, data: res as T }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'UPDATE_DOC_FAILED',
        message: err instanceof Error ? err.message : 'Failed to update document',
      },
    }
  }
}

/**
 * Delete a document.
 */
export async function deleteDoc(doctype: string, name: string): Promise<ApiResponse<void>> {
  try {
    const db = getDb()
    await db.deleteDoc(doctype, name)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'DELETE_DOC_FAILED',
        message: err instanceof Error ? err.message : 'Failed to delete document',
      },
    }
  }
}

/**
 * Check if a document exists.
 */
export async function docExists(doctype: string, name: string): Promise<ApiResponse<boolean>> {
  try {
    const db = getDb()
    const res = await db.exists(doctype, name)
    return { success: true, data: res }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'CHECK_EXISTS_FAILED',
        message: err instanceof Error ? err.message : 'Failed to check document',
      },
    }
  }
}

/**
 * Get count of documents.
 */
export async function getCount(
  doctype: string,
  filters?: Record<string, unknown>,
): Promise<ApiResponse<number>> {
  try {
    const db = getDb()
    const res = await db.getCount(doctype, { ...(filters ? { filters } : {}) })
    return { success: true, data: res }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'GET_COUNT_FAILED',
        message: err instanceof Error ? err.message : 'Failed to get count',
      },
    }
  }
}

// ------------------------------------------------------------
// Call helpers
// ------------------------------------------------------------

/**
 * Call a whitelisted API method.
 */
export async function callGet<T>(method: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const call = getCall()
    const res = await call.get(method, params)
    return { success: true, data: res as T }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'CALL_GET_FAILED',
        message: err instanceof Error ? err.message : 'Failed to call method',
      },
    }
  }
}

/**
 * Call a whitelisted API method (POST).
 */
export async function callPost<T>(method: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const call = getCall()
    const res = await call.post(method, params)
    return { success: true, data: res as T }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'CALL_POST_FAILED',
        message: err instanceof Error ? err.message : 'Failed to call method',
      },
    }
  }
}

/**
 * Call a whitelisted API method (PUT).
 */
export async function callPut<T>(method: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const call = getCall()
    const res = await call.put(method, params)
    return { success: true, data: res as T }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'CALL_PUT_FAILED',
        message: err instanceof Error ? err.message : 'Failed to call method',
      },
    }
  }
}

/**
 * Call a whitelisted API method (DELETE).
 */
export async function callDelete<T>(method: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const call = getCall()
    const res = await call.delete(method, params)
    return { success: true, data: res as T }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'CALL_DELETE_FAILED',
        message: err instanceof Error ? err.message : 'Failed to call method',
      },
    }
  }
}
