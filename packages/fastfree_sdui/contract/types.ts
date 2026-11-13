/**
 * Server-Driven UI (SDUI) Contract — canonical type definitions
 * FastFree ERP · shared between the delivery server and the client engine
 *
 * This module is the single source of truth for the screen contract
 * (docs/sdui/PLAN.md §5). `packages/fastfree_lowcode/src/runtime/sdui/types.ts`
 * re-exports it unchanged so the engine, the installer app and every module
 * schema keep compiling against the exact same shapes — the drift risk called
 * out in PLAN §11 ("انحراف العقد بين الخادم والعميل") is structurally
 * eliminated.
 *
 * Compatibility rule (MISSION.md rule 1): the existing `SduiNode` /
 * `SduiScreen` fields are frozen — additions go into `SduiScreenMeta` and new
 * layers only. Every screen that validates today must validate tomorrow.
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

/**
 * Platform metadata for a screen (PLAN.md §5). Optional on every screen —
 * existing screens keep validating without it; the delivery server (SDUI-03)
 * stamps it at publish time.
 */
export interface SduiScreenMeta {
  /** Target application (installer/panel/erp/...) */
  app: string
  /** Module (sales/accounting/...) */
  module?: string
  /** Minimum app version required to render this screen */
  minAppVersion?: string
  /** Supported locales (default: ar, en) */
  locales?: string[]
  /** Free-form tags for search & targeting */
  tags?: string[]
  /** Last content edit timestamp (epoch ms) */
  updatedAt: number
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
  /** Platform metadata (optional; PLAN.md §5) */
  meta?: SduiScreenMeta
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
