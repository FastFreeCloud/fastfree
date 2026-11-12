/**
 * Server-Driven UI (SDUI) Type Definitions
 * FastFree ERP Lowcode Engine
 */

export type SduiActionType =
  | 'tauri:invoke'
  | 'state:set'
  | 'notify'
  | 'navigate'
  | (string & {})

export interface SduiAction {
  /**
   * Action discriminator:
   * - 'tauri:invoke': invoke Rust backend IPC command
   * - 'state:set': mutate local state at target path
   * - 'notify': display UI notification / toast
   * - 'navigate': routing or URL redirection
   */
  type: SduiActionType
  /** Command name for IPC invocations or notification message */
  command?: string
  /** Payload / arguments / options passed to action handler */
  payload?: any
  /** State path (e.g. 'cpu' or 'server.memory') or route destination */
  target?: string
  [key: string]: unknown
}

export interface SduiNode {
  /**
   * Component type key (e.g. 'QCard', 'QBtn', 'QSlider', 'div', etc.)
   */
  type: string
  /** Unique element identifier */
  id?: string
  /** Static or dynamic text / label (supports dual-language object & {{ expression }}) */
  text?: string | { ar?: string; en?: string; [key: string]: any }
  /** Component props passed directly to component (v-bind) */
  props?: Record<string, any>
  /** CSS class bindings (string, array or object) */
  class?: string | string[] | Record<string, boolean>
  /** Inline CSS style (string or object) */
  style?: string | Record<string, string | number>
  /** Child nodes rendered recursively in default slot */
  children?: SduiNode[]
  /** Event listeners mapping (e.g. { click: SduiAction, change: SduiAction[] }) */
  events?: Record<string, SduiAction | SduiAction[]>
  /** State model binding path for two-way data sync (v-model) */
  model?: string
  [key: string]: unknown
}

export interface SduiScreen {
  /** Unique screen ID */
  id: string
  /** Content hash or version identifier for cache invalidation */
  versionHash?: string
  /** Screen title or header display text (string or dual-language) */
  title?: string | { ar?: string; en?: string; [key: string]: any }
  /** Root SDUI node */
  root: SduiNode
  /** Initial state dictionary */
  state?: Record<string, any>
  [key: string]: unknown
}

export type SduiState = Record<string, any>

export interface SduiCacheEntry {
  screen: SduiScreen
  timestamp: number
}

export interface CachedScreenRecord {
  id: string
  versionHash: string
  updatedAt: number
  screen: SduiScreen
}

export interface SduiActionContext {
  state: SduiState
  event?: Event | unknown
  node?: SduiNode
  dispatch?: (action: SduiAction) => Promise<unknown>
}

export type SduiActionHandler = (
  action: SduiAction,
  context: SduiActionContext
) => Promise<unknown> | unknown
