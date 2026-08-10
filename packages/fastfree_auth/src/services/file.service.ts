// ============================================================
// FastFree Auth — File Service
// Handles file upload, download, and preview
// Uses frappe-js-sdk's file module
// ============================================================

import type { ApiResponse } from '../types'
import { getFile } from './api.service'

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface FileUploadResult {
  name: string
  file_url: string
  file_name: string
  file_size: number
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Upload a file to Frappe.
 */
export async function uploadFile(
  doctype: string,
  docname: string,
  file: File,
  fieldName = 'attachments',
): Promise<ApiResponse<FileUploadResult>> {
  try {
    const fileApi = getFile()
    const res = await fileApi.upload(file, {
      doctype,
      docname,
      fieldName,
    })
    return { success: true, data: res as unknown as FileUploadResult }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err instanceof Error ? err.message : 'Upload failed',
      },
    }
  }
}

/**
 * Get the download URL for a file.
 */
export function getFileUrl(fileUrl: string): string {
  if (fileUrl.startsWith('http')) {
    return fileUrl
  }
  // Relative URLs are served from the Frappe server
  return fileUrl
}

/**
 * Download a file.
 */
export async function downloadFile(fileUrl: string): Promise<ApiResponse<Blob>> {
  try {
    const res = await fetch(fileUrl, {
      credentials: 'include',
    })

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: String(res.status),
          message: 'Download failed',
        },
      }
    }

    const blob = await res.blob()
    return { success: true, data: blob }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: err instanceof Error ? err.message : 'Download failed',
      },
    }
  }
}

/**
 * Delete a file.
 */
export async function deleteFile(fileName: string): Promise<ApiResponse<void>> {
  try {
    const fileApi = getFile()
    await fileApi.delete(fileName)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: err instanceof Error ? err.message : 'Delete failed',
      },
    }
  }
}
