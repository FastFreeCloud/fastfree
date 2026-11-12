/**
 * SduiActionDispatcher — Event and Action Orchestrator for Server-Driven UI
 * Dispatches SDUI Actions ('tauri:invoke', 'state:set', 'notify', 'navigate', and custom handlers).
 * Handles Tauri Rust IPC with safe browser mock/fallback logging and local state mutations.
 */

import { Notify } from 'quasar'
import type {
  SduiAction,
  SduiActionContext,
  SduiActionHandler,
  SduiState
} from './types'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
    __TAURI__?: unknown
  }
}


export interface SduiExecutionRecord {
  id: string
  timestamp: number
  action: SduiAction
  success: boolean
  result?: unknown
  error?: string
  simulated?: boolean
}

export class SduiActionDispatcher {
  private static instance: SduiActionDispatcher | null = null

  /** Custom registered action handlers */
  private customHandlers: Map<string, SduiActionHandler> = new Map()

  /** Internal execution history log */
  private executionLogs: SduiExecutionRecord[] = []

  /** Cached Tauri invoke function if available */
  private tauriInvokeFn: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null
  private tauriChecked: boolean = false

  /** Optional navigation callback (e.g. vue-router push) */
  private navigatorCallback: ((target: string) => void) | null = null

  private constructor() {
    this.registerBuiltinHandlers()
  }

  /**
   * Singleton instance accessor
   */
  public static getInstance(): SduiActionDispatcher {
    if (!SduiActionDispatcher.instance) {
      SduiActionDispatcher.instance = new SduiActionDispatcher()
    }
    return SduiActionDispatcher.instance
  }

  /**
   * Set a custom router or navigation handler (e.g. router.push)
   */
  public setNavigator(callback: (target: string) => void): void {
    this.navigatorCallback = callback
  }

  /**
   * Register a custom action handler for extensible SDUI applications
   */
  public registerHandler(type: string, handler: SduiActionHandler): void {
    this.customHandlers.set(type, handler)
  }

  /**
   * Dispatches a single action or an array of actions sequentially
   */
  public async dispatchAll(
    actions: SduiAction | SduiAction[] | undefined,
    context: SduiActionContext
  ): Promise<unknown[]> {
    if (!actions) return []
    const list = Array.isArray(actions) ? actions : [actions]
    const results: unknown[] = []

    for (const action of list) {
      const res = await this.dispatch(action, context)
      results.push(res)
    }

    return results
  }

  /**
   * Main dispatch entry point for an SduiAction
   */
  public async dispatch(action: SduiAction, context: SduiActionContext): Promise<unknown> {
    if (!action || !action.type) {
      return null
    }

    const logEntry: SduiExecutionRecord = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: Date.now(),
      action: { ...action },
      success: false
    }

    try {
      // 1. Check custom handlers first
      if (this.customHandlers.has(action.type)) {
        const handler = this.customHandlers.get(action.type)!
        const result = await handler(action, context)
        logEntry.success = true
        logEntry.result = result
        this.recordLog(logEntry)
        return result
      }

      // 2. Dispatch standard built-in actions
      let result: unknown = null
      switch (action.type) {
        case 'tauri:invoke':
          result = await this.handleTauriInvoke(action, context, logEntry)
          break

        case 'state:set':
          result = this.handleStateSet(action, context)
          logEntry.success = true
          logEntry.result = result
          break

        case 'notify':
          result = this.handleNotify(action)
          logEntry.success = true
          logEntry.result = result
          break

        case 'navigate':
          result = this.handleNavigate(action)
          logEntry.success = true
          logEntry.result = result
          break

        default:
          console.warn(`[SduiActionDispatcher] Unhandled action type: "${action.type}"`, action)
          logEntry.error = `Unhandled action type: ${action.type}`
      }

      this.recordLog(logEntry)
      return result
    } catch (err: any) {
      logEntry.success = false
      logEntry.error = err?.message || String(err)
      this.recordLog(logEntry)
      console.error(`[SduiActionDispatcher] Error executing action "${action.type}":`, err)
      throw err
    }
  }

  /**
   * Handles 'tauri:invoke' actions with graceful fallback to console & mock logs
   */
  private async handleTauriInvoke(
    action: SduiAction,
    context: SduiActionContext,
    logEntry: SduiExecutionRecord
  ): Promise<unknown> {
    const cmd = action.command
    if (!cmd) {
      throw new Error('[SduiActionDispatcher] tauri:invoke requires a command name')
    }

    const payload = (action.payload && typeof action.payload === 'object' ? action.payload : {}) as Record<string, unknown>
    const invoke = await this.resolveTauriInvoke()

    let result: unknown = null

    if (invoke) {
      try {
        result = await invoke(cmd, payload)
        logEntry.success = true
        logEntry.result = result
      } catch (invokeErr: any) {
        console.warn(`[SduiActionDispatcher] Tauri invoke "${cmd}" failed:`, invokeErr)
        logEntry.error = invokeErr?.message || String(invokeErr)
        throw invokeErr
      }
    } else {
      // Fallback: Browser environment / IPC Bridge not available
      logEntry.simulated = true
      logEntry.success = true
      result = { simulated: true, command: cmd, payload, timestamp: Date.now() }
      console.info(
        `%c[SduiActionDispatcher] [Mock Tauri Invoke]%c ${cmd}`,
        'background: #1976d2; color: white; padding: 2px 6px; border-radius: 3px;',
        'font-weight: bold;',
        payload
      )
    }

    // If a target state path is specified, update local state with invoke result
    if (action.target && context.state) {
      this.setNestedState(context.state, action.target, result)
    }

    return result
  }

  /**
   * Handles 'state:set' actions to mutate local state
   */
  private handleStateSet(action: SduiAction, context: SduiActionContext): unknown {
    if (!context.state) {
      console.warn('[SduiActionDispatcher] No state context provided for state:set')
      return null
    }

    if (action.target) {
      // Set nested or direct path
      this.setNestedState(context.state, action.target, action.payload)
    } else if (action.payload && typeof action.payload === 'object') {
      // Bulk merge
      Object.assign(context.state, action.payload)
    }

    return action.payload
  }

  /**
   * Handles 'notify' actions with Quasar Notify
   */
  private handleNotify(action: SduiAction): unknown {
    const raw = action.payload ?? action.command

    let options: Record<string, any> = {
      position: 'top',
      timeout: 3000
    }

    if (typeof raw === 'string') {
      options.message = raw
      options.color = 'primary'
    } else if (typeof raw === 'object' && raw !== null) {
      options = { ...options, ...raw }
    } else {
      options.message = String(raw || 'Notification')
    }

    try {
      Notify.create(options as any)
    } catch {
      // Fallback if Quasar Notify plugin is not initialized in current app context
      console.info(`[SduiActionDispatcher Notification] ${options.message}`)
    }

    return options
  }

  /**
   * Handles 'navigate' actions (URL, route or anchor)
   */
  private handleNavigate(action: SduiAction): unknown {
    const destination = (action.target || action.payload || action.command) as string
    if (!destination || typeof destination !== 'string') return null

    if (this.navigatorCallback) {
      this.navigatorCallback(destination)
      return destination
    }

    if (typeof window !== 'undefined') {
      if (destination.startsWith('http://') || destination.startsWith('https://')) {
        window.open(destination, '_blank')
      } else if (destination.startsWith('/')) {
        window.location.href = destination
      } else {
        window.location.hash = destination
      }
    }

    return destination
  }

  /**
   * Resolves @tauri-apps/api/core dynamically to avoid build-time hard dependency failure
   */
  private async resolveTauriInvoke(): Promise<((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null> {
    if (this.tauriChecked) {
      return this.tauriInvokeFn
    }

    this.tauriChecked = true

    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      try {
        // @ts-ignore
        const mod: any = await import(/* @vite-ignore */ '@tauri-apps/api/core')
        if (typeof mod?.invoke === 'function') {
          this.tauriInvokeFn = mod.invoke
          return this.tauriInvokeFn
        }
      } catch (e) {
        console.warn('[SduiActionDispatcher] @tauri-apps/api/core could not be imported:', e)
      }
    }

    return null
  }

  /**
   * Nested object property setter supporting dot notation: 'a.b.c'
   */
  public setNestedState(obj: SduiState, path: string, value: unknown): void {
    if (!obj || !path) return

    const parts = path.split('.')
    let curr = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in curr) || typeof curr[part] !== 'object' || curr[part] === null) {
        curr[part] = {}
      }
      curr = curr[part]
    }

    curr[parts[parts.length - 1]] = value
  }

  /**
   * Nested object property getter supporting dot notation: 'a.b.c'
   */
  public getNestedState(obj: SduiState, path: string): unknown {
    if (!obj || !path) return undefined

    const parts = path.split('.')
    let curr: any = obj

    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined
      curr = curr[part]
    }

    return curr
  }

  private registerBuiltinHandlers(): void {
    // Builtin initialization
  }

  private recordLog(log: SduiExecutionRecord): void {
    this.executionLogs.unshift(log)
    if (this.executionLogs.length > 100) {
      this.executionLogs.pop()
    }
  }

  /**
   * Retrieves past action execution history
   */
  public getExecutionLogs(): SduiExecutionRecord[] {
    return [...this.executionLogs]
  }

  /**
   * Clears past action execution history
   */
  public clearLogs(): void {
    this.executionLogs = []
  }
}

export const sduiActionDispatcher = SduiActionDispatcher.getInstance()
