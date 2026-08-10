/**
 * Pinia Debug Plugin
 *
 * Logs all store actions (start / success / failure) with timing.
 * In production builds, only failures are logged.
 * When an optional `onError` callback is provided, action failures are forwarded to it
 * so the consumer can integrate with their own error-logging system (e.g. error-log store).
 *
 * ### Usage
 * ```ts
 * import { createPinia } from 'pinia'
 * import { piniaDebugPlugin } from 'quasar-app-extension-fastfree-lowcode'
 *
 * const pinia = createPinia()
 * pinia.use(piniaDebugPlugin())
 *
 * // — or with an error callback —
 * pinia.use(piniaDebugPlugin({
 *   onError(storeId, actionName, error, args) {
 *     myErrorLogStore.addEntry({ source: `Pinia/${storeId}`, message: error.message })
 *   },
 * }))
 * ```
 */

export interface PiniaDebugOptions {
  /**
   * When `true`, action start/success logs are printed even in production.
   * @default false
   */
  verbose?: boolean

  /**
   * Optional callback invoked whenever an action throws.
   */
  onError?: (storeId: string, actionName: string, error: Error, args: unknown[]) => void
}

export interface PiniaDebugContext {
  store: {
    $id: string
    $onAction: (callback: (ctx: {
      name: string
      args: unknown[]
      after: (cb: (result: unknown) => void) => void
      onError: (cb: (error: unknown) => void) => void
    }) => void) => void
  }
}

/**
 * Creates a Pinia plugin that traces every action with console logs and optional error reporting.
 */
export function piniaDebugPlugin(options: PiniaDebugOptions = {}) {
  const { verbose = false, onError } = options
  const isDev = import.meta.env.DEV

  return function plugin(context: PiniaDebugContext) {
    const { store } = context

    store.$onAction(({ name, args, after, onError: onActionError }) => {
      const t0 = Date.now()

      if (isDev || verbose) {
        // debug: action started
      }

      after((_result: unknown) => {
        if (isDev || verbose) {
          // debug: action completed
        }
      })

      onActionError((error: unknown) => {
        const errObj =
          error instanceof Error
            ? error
            : new Error(typeof error === 'string' ? error : 'Unknown error')

        console.groupCollapsed(
          `%c[${store.$id}] Action "${name}" FAILED after ${Date.now() - t0}ms`,
          'color: #C10015; font-weight: bold;',
        )
        console.error('Error:', errObj.message)
        console.error('Args:', args)
        if (errObj.stack) console.error('Stack:', errObj.stack)
        console.groupEnd()

        onError?.(store.$id, name, errObj, args)
      })
    })
  }
}
