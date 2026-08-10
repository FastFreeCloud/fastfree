import { Notify } from 'quasar'
import { getSharedConfig } from '../shared-config'
import { t } from '../translate'
import { useErrorLogStore } from '../composables/useErrorLogStore'

function getCfg() {
  return getSharedConfig()
}

let _logQueue: Promise<void> = Promise.resolve()
const _throttleMap = new Map<string, number>()

type LogLevel = 'error' | 'warning' | 'info'

const consoleMethods: Record<LogLevel, typeof console.error> = {
  error: console.error,
  warning: console.warn,
  info: console.info,
}

export default function ({ app }: { app: { config: { errorHandler?: (err: unknown, instance: unknown, info: string) => void; warnHandler?: (msg: string, instance: unknown, trace: string) => void; globalProperties: Record<string, unknown> } } }) {

  function safeLog(level: LogLevel, source: string, message: string, details: string, component?: string, stack?: string) {
    _logQueue = _logQueue.then(() => {
      consoleMethods[level](`[${source}] ${message}`, details, component ?? '', stack ?? '')
      try {
        useErrorLogStore().addEntry({ level, source, message, details, component, stack })
      } catch {
        // Store not ready or failed — console logging already succeeded
      }
    })
  }

  function throttledLog(level: LogLevel, source: string, message: string, details: string, throttleKey?: string) {
    const key = throttleKey || `${source}:${message}`
    const lastLogged = _throttleMap.get(key) || 0
    if (Date.now() - lastLogged < getCfg().error.throttleMs) return
    _throttleMap.set(key, Date.now())
    safeLog(level, source, message, details)
  }

  /* ──────── 1. Vue Error Handler ──────── */
  app.config.errorHandler = (err: unknown, instance: unknown, info: string) => {
    const vueInstance = instance as { $options?: { name?: string }; type?: { __name?: string } } | null
    const componentName = vueInstance?.$options?.name || vueInstance?.type?.__name || 'Anonymous'
    const error = err instanceof Error ? err : new Error(String(err))

    safeLog('error', 'Vue', error.message, `Info: ${info}`, componentName, error.stack)

    Notify.create({
      type: 'negative',
      message: t('system.vueError', { component: componentName, message: error.message }),
      timeout: getCfg().error.notificationTimeout,
      position: getCfg().error.notificationPosition,
      icon: 'mdi-alert-circle',
    })
  }

  /* ──────── 2. Vue Warning Handler (DEV) ──────── */
  if (import.meta.env.DEV) {
    app.config.warnHandler = (msg: string, instance: unknown, trace: string) => {
      const vueInstance = instance as { $options?: { name?: string }; type?: { __name?: string } } | null
      const componentName = vueInstance?.$options?.name || vueInstance?.type?.__name || 'Anonymous'
      safeLog('warning', 'Vue', msg, trace, componentName)
    }
  }

  /* ──────── 3. Unhandled Promise Rejection ──────── */
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? reason.stack : ''

    safeLog('error', 'Promise', t('system.promiseRejected', { message }), '', undefined, stack)

    Notify.create({
      type: 'negative',
      message: t('system.promiseRejected', { message }),
      timeout: getCfg().error.notificationTimeout,
      position: getCfg().error.notificationPosition,
      icon: 'mdi-alert-circle-outline',
    })
  })

  /* ──────── 4. Global JS Errors (bubble phase) ──────── */
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement | null

    if (target && target.tagName) {
      throttledLog('error', 'Resource', t('system.resourceFailed', { resource: target.tagName.toLowerCase() }), '', `resource:${target.tagName}`)
      return
    }

    const error = event.error
    const message = error?.message || event.message
    const filename = event.filename
    const lineno = event.lineno
    const colno = event.colno

    safeLog('error', 'Browser', message, `Source: ${filename || 'unknown'} Line: ${lineno || 0} Col: ${colno || 0}`, undefined, error?.stack)

    Notify.create({
      type: 'negative',
      message: t('system.browserError', { message }),
      timeout: getCfg().error.notificationTimeout,
      position: getCfg().error.notificationPosition,
      icon: 'mdi-bug',
    })
  }, false)

  /* ──────── 5. Network Connectivity ──────── */
  if (!navigator.onLine) {
    safeLog('warning', 'Network', t('error.loadedOffline'), `online=${navigator.onLine}`)
  }

  window.addEventListener('offline', () => {
    throttledLog('warning', 'Network', t('error.lostConnection'), `navigator.onLine=${navigator.onLine}`, 'network:offline')
    Notify.create({
      type: 'warning',
      message: t('error.lostConnection'),
      timeout: 5000,
      position: 'top',
      icon: 'mdi-wifi-off',
    })
  })

  window.addEventListener('online', () => {
    throttledLog('info', 'Network', t('error.connectionRestored'), `navigator.onLine=${navigator.onLine}`, 'network:online')
    Notify.create({
      type: 'positive',
      message: t('error.connectionRestored'),
      timeout: 3000,
      position: 'top',
      icon: 'mdi-wifi',
    })
  })

  /* ──────── 6. Performance: LCP/CLS/Long Tasks ──────── */
  if (typeof PerformanceObserver !== 'undefined') {
    const LCP_CAP_MS = 30000
    const LONG_TASK_MS = 200
    const CLS_RESET_MS = 5000

    try {
      let lcpReported = false
      const lcpObserver = new PerformanceObserver((list) => {
        if (lcpReported) return
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        if (!last) return
        const lcpMs = last.startTime
        lcpReported = true
        lcpObserver.disconnect()
        if (lcpMs > LCP_CAP_MS) return
        if (lcpMs > getCfg().error.lcpBadThreshold) {
          throttledLog('error', 'Performance', t('system.lcpBad', { value: Math.round(lcpMs) }), `threshold=${getCfg().error.lcpBadThreshold}ms element=${last.name}`, 'performance:lcp')
        } else if (lcpMs > getCfg().error.lcpImproveThreshold) {
          throttledLog('warning', 'Performance', t('system.lcpImprove', { value: Math.round(lcpMs) }), `threshold=${getCfg().error.lcpImproveThreshold}ms`, 'performance:lcp')
        }
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch { /* entryType not supported */ }

    try {
      let clsValue = 0
      let clsLastReset = Date.now()
      let clsReported = false
      const clsObserver = new PerformanceObserver((list) => {
        const now = Date.now()
        if (now - clsLastReset > CLS_RESET_MS) {
          clsValue = 0
          clsReported = false
          clsLastReset = now
        }
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          if (!shift.hadRecentInput) {
            clsValue += shift.value ?? 0
          }
        }
        if (clsReported) return
        if (clsValue > getCfg().error.clsBadThreshold) {
          clsReported = true
          throttledLog('error', 'Performance', t('system.clsBad', { value: clsValue.toFixed(3) }), `threshold=${getCfg().error.clsBadThreshold}`, 'performance:cls')
        } else if (clsValue > getCfg().error.clsImproveThreshold) {
          clsReported = true
          throttledLog('warning', 'Performance', t('system.clsImprove', { value: clsValue.toFixed(3) }), `threshold=${getCfg().error.clsImproveThreshold}`, 'performance:cls')
        }
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          clsValue = 0
          clsReported = false
          clsLastReset = Date.now()
        }
      })
    } catch { /* entryType not supported */ }

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > LONG_TASK_MS) {
            throttledLog('warning', 'Performance', t('system.longTask', { value: Math.round(entry.duration) }), `startTime=${Math.round(entry.startTime)}ms`, 'performance:longtask')
          }
        }
      })
      longTaskObserver.observe({ type: 'longtask' })
    } catch { /* entryType not supported */ }
  }

  /* ──────── 7. Memory Pressure (Chrome only) ──────── */
  const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  if (perfMemory) {
    function checkMemory() {
      if (!perfMemory) return
      const { usedJSHeapSize, jsHeapSizeLimit } = perfMemory
      const percentUsed = (usedJSHeapSize / jsHeapSizeLimit) * 100
      if (percentUsed > getCfg().error.memoryPressureThreshold) {
        throttledLog('error', 'Memory', t('system.highMemory', { value: percentUsed.toFixed(1) }), `${Math.round(usedJSHeapSize / 1048576)}MB / ${Math.round(jsHeapSizeLimit / 1048576)}MB`, 'memory:high')
      }
    }
    setInterval(checkMemory, getCfg().error.memoryCheckInterval)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkMemory()
    })
  }

  safeLog('info', 'System', t('system.loggerInit'), 'sources=Vue,Browser,Resource,Promise,Network,Performance,Memory')
}
