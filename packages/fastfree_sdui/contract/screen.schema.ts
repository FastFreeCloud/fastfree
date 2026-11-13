/**
 * Server-Driven UI (SDUI) Contract — Zod screen schema
 * FastFree ERP · shared between the delivery server and the client engine
 *
 * The schemas mirror `./types.ts` field-for-field:
 * - `SduiScreenSchema.parse()` accepts every screen the engine renders today
 *   (installer, panel, sales, accounting) and rejects structurally broken
 *   payloads before they reach `SduiNode.vue`.
 * - Unknown keys pass through wherever the TypeScript contract carries an
 *   index signature (`[key: string]: unknown`) — e.g. the `clan` spec block on
 *   installer screens — so validation is never destructive.
 * - The only semantic rule beyond shape is `tauri:invoke` → `command`, the
 *   exact rule `SduiActionDispatcher.handleTauriInvoke` throws on at runtime.
 *
 * Widget catalog: `SDUI_WIDGET_CATALOG` mirrors `SduiRegistry.registerDefaults`
 * (packages/fastfree_lowcode/src/runtime/sdui/SduiRegistry.ts). Resolution
 * follows the same three steps as `SduiRegistry.resolve`: exact key →
 * kebab-case → case-insensitive.
 */

import { z } from 'zod'
import type { SduiAction, SduiNode, SduiScreen, SduiScreenMeta } from './types'

// ── Widget catalog ───────────────────────────────────────────────────────────

/**
 * Every widget type the default `SduiRegistry` can resolve, mirroring its
 * `registerDefaults()` call set. Kebab-case (`q-card`), mixed-case (`Q-BTN`)
 * and lowercase (`qcard`) variants resolve automatically through the same
 * normalization the registry applies.
 */
export const SDUI_WIDGET_CATALOG = [
  // Quasar components (canonical PascalCase keys)
  'QCard',
  'QCardSection',
  'QCardActions',
  'QBtn',
  'QSlider',
  'QInput',
  'QToggle',
  'QIcon',
  'QBanner',
  'QLinearProgress',
  'QChip',
  'QBadge',
  'QSeparator',
  // Ergonomic aliases registered alongside the Quasar components
  'button',
  'btn',
  'card',
  'banner',
  'progress',
  'chip',
  'separator',
  'input',
  'slider',
  'toggle',
  'icon',
  'badge',
  'row',
  // HTML primitives
  'div',
  'span',
] as const

export type SduiWidgetType = (typeof SDUI_WIDGET_CATALOG)[number]

/** Same normalization `SduiRegistry.toKebabCase` applies. */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z])(?=[a-z])/g, '$1-$2')
    .toLowerCase()
}

function buildWidgetResolver(catalog: readonly string[]): (type: string) => boolean {
  // `SduiRegistry.register()` auto-registers the kebab-case alias of every key
  // ('QCard' → 'q-card'), and `resolve()` matches exact → kebab-case →
  // case-insensitive. Reproduce that full resolution surface here.
  const registered = new Set<string>()
  for (const key of catalog) {
    registered.add(key)
    registered.add(toKebabCase(key))
  }
  const byLower = new Map<string, string>()
  for (const key of registered) byLower.set(key.toLowerCase(), key)
  return (type: string): boolean => {
    if (!type) return false
    const trimmed = type.trim()
    // 1. direct match → 2. kebab-case → 3. case-insensitive (registry parity)
    return registered.has(trimmed) || registered.has(toKebabCase(trimmed)) || byLower.has(trimmed.toLowerCase())
  }
}

/**
 * Whether a widget `type` key resolves inside a catalog (default:
 * `SDUI_WIDGET_CATALOG`) using `SduiRegistry.resolve` semantics. An empty
 * string is *not* known here — the schema rejects empty types before this
 * runs, while the registry degrades them to a `div` at render time.
 */
export function isKnownSduiWidget(type: string, catalog: readonly string[] = SDUI_WIDGET_CATALOG): boolean {
  return buildWidgetResolver(catalog)(type)
}

// ── Leaf schemas ─────────────────────────────────────────────────────────────

/** `string | { ar?: string; en?: string; [key: string]: any }` */
export const SduiTextSchema = z.union([z.string(), z.record(z.string(), z.any())])

/** `string | string[] | Record<string, boolean>` */
export const SduiClassSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.boolean()),
])

/** `string | Record<string, string | number>` */
export const SduiStyleSchema = z.union([
  z.string(),
  z.record(z.string(), z.union([z.string(), z.number()])),
])

/**
 * `SduiAction` — passthrough keeps custom action keys (`screen`, signed
 * payloads, …) intact; `open_sdui_screen` & friends stay open unions, exactly
 * like `SduiActionType = … | (string & {})`.
 */
export const SduiActionSchema: z.ZodType<SduiAction, z.ZodTypeDef, any> = z
  .object({
    type: z.string().min(1),
    command: z.string().optional(),
    payload: z.any().optional(),
    target: z.string().optional(),
  })
  .passthrough()
  .superRefine((action, ctx) => {
    // The single hard requirement SduiActionDispatcher enforces at dispatch
    // time: handleTauriInvoke throws when `command` is missing. 'notify' and
    // 'navigate' degrade gracefully (defaults / no-op), so the contract stays
    // permissive for them.
    if (action.type === 'tauri:invoke' && !action.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['command'],
        message: "tauri:invoke requires a command name (SduiActionDispatcher.handleTauriInvoke)",
      })
    }
  })

/** `SduiNode` — recursive; passthrough preserves the `[key: string]: unknown` index signature. */
export const SduiNodeSchema: z.ZodType<SduiNode, z.ZodTypeDef, any> = z.object({
  type: z.string().min(1),
  id: z.string().optional(),
  text: SduiTextSchema.optional(),
  props: z.record(z.string(), z.any()).optional(),
  class: SduiClassSchema.optional(),
  style: SduiStyleSchema.optional(),
  children: z.array(z.lazy(() => SduiNodeSchema)).optional(),
  events: z.record(z.string(), z.union([SduiActionSchema, z.array(SduiActionSchema)])).optional(),
  model: z.string().optional(),
}).passthrough()

/**
 * `SduiScreenMeta` — closed (`.strict()`): the TypeScript interface has no
 * index signature, so unknown keys fail instead of silently drifting. The
 * delivery server stamps `meta` at publish time; screens without `meta`
 * (every screen today) keep validating.
 */
export const SduiScreenMetaSchema: z.ZodType<SduiScreenMeta, z.ZodTypeDef, any> = z
  .object({
    app: z.string().min(1),
    module: z.string().optional(),
    minAppVersion: z.string().optional(),
    locales: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),
    updatedAt: z.number(),
  })
  .strict()

/**
 * `SduiScreen` — passthrough preserves screen-level extensions such as the
 * installer's `clan` spec block. `versionHash` stays optional here; the
 * delivery server (SDUI-03) makes it mandatory on the wire (StoredScreen).
 */
export const SduiScreenSchema = z
  .object({
    id: z.string().min(1),
    versionHash: z.string().optional(),
    title: SduiTextSchema.optional(),
    root: SduiNodeSchema,
    state: z.record(z.string(), z.any()).optional(),
    meta: SduiScreenMetaSchema.optional(),
  })
  .passthrough()

export type ParsedSduiScreen = z.infer<typeof SduiScreenSchema>

// ── Traversal ────────────────────────────────────────────────────────────────

/**
 * Depth-first walk over a screen's node tree. `path` is the Zod-style
 * location of the node, e.g. `['root', 'children', 2, 'children', 0]`.
 */
export function walkSduiNodes(
  root: SduiNode,
  visit: (node: SduiNode, path: (string | number)[]) => void,
  path: (string | number)[] = ['root'],
): void {
  visit(root, path)
  if (Array.isArray(root.children)) {
    root.children.forEach((child, index) => {
      walkSduiNodes(child, visit, [...path, 'children', index])
    })
  }
}

// ── Checked screen schemas & helpers ─────────────────────────────────────────

export interface SduiScreenSchemaOptions {
  /**
   * Allowed widget type keys, resolved with `SduiRegistry.resolve` semantics
   * (exact → kebab-case → case-insensitive). Default: `SDUI_WIDGET_CATALOG`.
   */
  allowedTypes?: readonly string[]
}

/**
 * Screen schema with widget-catalog enforcement on top of the structural
 * contract. `SduiScreenSchema` alone stays permissive (any non-empty type
 * string) because the registry renders unknown types as a visible fallback
 * rather than failing; this factory is what the SDUI-02 verifier and the
 * publish pipeline use to reject screens referencing unregistered widgets.
 */
export function createSduiScreenSchema(
  options: SduiScreenSchemaOptions = {},
): z.ZodType<SduiScreen, z.ZodTypeDef, any> {
  const resolveWidget = buildWidgetResolver(options.allowedTypes ?? SDUI_WIDGET_CATALOG)
  return SduiScreenSchema.superRefine((screen, ctx) => {
    walkSduiNodes(screen.root, (node, path) => {
      if (!resolveWidget(node.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, 'type'],
          message: `Unknown widget type "${node.type}" — not in the widget catalog (SduiRegistry)`,
        })
      }
    })
  })
}

/** One human-readable validation failure. */
export interface SduiScreenIssue {
  /** Dotted path to the offending field, e.g. `root.children.2.events.click`. */
  path: string
  /** Zod message. */
  message: string
  /** Zod issue code, e.g. `invalid_type`, `custom`. */
  code: string
}

export type SduiScreenValidation =
  | { ok: true; screen: SduiScreen }
  | { ok: false; issues: SduiScreenIssue[] }

/**
 * Validate a screen payload against the full contract (structure + widget
 * catalog). Never throws — returns every issue at once so the SDUI-02
 * verifier can report whole screens, not first-failure.
 */
export function validateSduiScreen(
  screen: unknown,
  options: SduiScreenSchemaOptions = {},
): SduiScreenValidation {
  const result = createSduiScreenSchema(options).safeParse(screen)
  if (result.success) {
    return { ok: true, screen: result.data }
  }
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(screen)',
      message: issue.message,
      code: issue.code,
    })),
  }
}

/** Throwing variant of {@link validateSduiScreen} for hot paths. */
export function parseSduiScreen(screen: unknown, options: SduiScreenSchemaOptions = {}): SduiScreen {
  return createSduiScreenSchema(options).parse(screen)
}
