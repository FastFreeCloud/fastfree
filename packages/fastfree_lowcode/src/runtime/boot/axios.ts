import { t } from '../translate'

const originalConsoleError = console.error.bind(console)
let _isOnline = true

interface ApiClientOptions {
  baseUrl?: string
  timeout?: number
  headers?: Record<string, string>
}

function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? '/api'
  const timeout = options.timeout ?? 10000
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  async function request<T = unknown>(
    url: string,
    config: RequestInit & { method?: string } = {}
  ): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
    const { method = 'GET', headers, body, signal } = config
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(fullUrl, {
        method,
        headers: { ...defaultHeaders, ...headers } as HeadersInit,
        body: body ?? null,
        signal: signal ?? controller.signal,
      })

      if (!_isOnline) {
        _isOnline = true
        window.dispatchEvent(new CustomEvent('api-status', { detail: { online: true } }))
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const err = new Error((data as { message?: string }).message || `HTTP ${res.status}`)
        ;(err as Error & { status?: number; data?: unknown }).status = res.status
        ;(err as Error & { status?: number; data?: unknown }).data = data
        throw err
      }

      return (await res.json()) as T
    } catch (err: unknown) {
      const error = err as Error & { status?: number; name?: string; data?: unknown }
      const status = error.status
      let message = t('error.unknownError')

      if (error.name === 'AbortError') {
        message = t('error.serverTimeout')
      } else if (status === 401) {
        message = t('error.sessionExpired')
        window.dispatchEvent(new CustomEvent('auth-expired'))
      } else if (status === 403) {
        message = t('error.noPermission')
      } else if (status === 404) {
        message = t('error.notFound')
      } else if (status === 500) {
        message = t('error.serverError')
      } else if (status === 422) {
        message = error.data && typeof error.data === 'object' && 'message' in error.data
          ? String((error.data as { message: string }).message)
          : t('error.invalidData')
      } else if (status === 502) {
        message = t('error.serverUnavailable')
      } else if (!status) {
        message = t('error.cannotConnect')
        if (_isOnline) {
          _isOnline = false
          window.dispatchEvent(new CustomEvent('api-status', { detail: { online: false } }))
        }
      } else if (error.data && typeof error.data === 'object' && 'message' in error.data) {
        message = String((error.data as { message: string }).message)
      }

      originalConsoleError(
        `[API Error] ${method} ${url}`,
        `Status: ${status ?? 'N/A'}`,
        `Message: ${message}`
      )

      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    get<T = unknown>(url: string, config?: RequestInit) {
      return request<T>(url, { ...config, method: 'GET' })
    },
    post<T = unknown>(url: string, body?: unknown, config?: RequestInit) {
      return request<T>(url, { ...config, method: 'POST', body: body !== undefined ? JSON.stringify(body) : null })
    },
    put<T = unknown>(url: string, body?: unknown, config?: RequestInit) {
      return request<T>(url, { ...config, method: 'PUT', body: body !== undefined ? JSON.stringify(body) : null })
    },
    patch<T = unknown>(url: string, body?: unknown, config?: RequestInit) {
      return request<T>(url, { ...config, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : null })
    },
    delete<T = unknown>(url: string, config?: RequestInit) {
      return request<T>(url, { ...config, method: 'DELETE' })
    },
  }
}

export const api = createApiClient()

export { createApiClient }
