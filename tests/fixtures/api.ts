/**
 * API envelope factories — the shared success/error/pagination shapes every
 * service returns. Useful for mocking `fastfree-auth` responses in unit tests
 * and for asserting backend envelopes in E2E specs.
 */
import type { ApiResponse, PaginatedResponse } from 'fastfree-auth'

/** Successful API envelope. */
export function apiSuccess<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}

/** Failed API envelope (optionally carrying details). */
export function apiFailure(
  code = 'FETCH_FAILED',
  message = 'Request failed',
  details?: unknown,
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  }
}

/** Paginated list envelope. */
export function paginated<T>(data: T[], page = 1, limit = 20): PaginatedResponse<T> {
  return { data, total: data.length, page, limit }
}
