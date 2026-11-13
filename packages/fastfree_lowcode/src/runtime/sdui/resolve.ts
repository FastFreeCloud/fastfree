/**
 * SDUI Resolution Engine
 * ----------------------
 * Pure, framework-free resolvers shared by SduiNode.vue:
 *   1. resolveLocalized()  — dual-language { ar, en } resolution (recursive).
 *   2. evaluateString()    — {{ expression }} interpolation from shared state.
 *   3. resolveCssVariables() — tokens.css `var(--token)` resolution per theme.
 *
 * Kept dependency-free (no Vue / Quasar imports) so it can be unit-tested with
 * Vitest and reused by the schema verification tooling.
 */

export type SduiResolveLocale = string
export type SduiResolveState = Record<string, any>

/**
 * Expression helpers available to `{{ ... }}` payloads. They keep schemas
 * declarative (no computed fields duplicated into state) while staying pure
 * functions of the shared state.
 */
export const sduiExpressionHelpers = {
  /** Number of truthy entries in a module/flags object. */
  enabledCount(obj: Record<string, any> | undefined | null): number {
    if (!obj || typeof obj !== 'object') return 0
    return Object.values(obj).filter(Boolean).length
  },
  /** Number of keys in an object. */
  count(obj: Record<string, any> | undefined | null): number {
    if (!obj || typeof obj !== 'object') return 0
    return Object.keys(obj).length
  },
  /** Round to `digits` decimal places. */
  round(value: number, digits = 0): number {
    const factor = Math.pow(10, digits)
    return Math.round((Number(value) || 0) * factor) / factor
  },
  /** Format a number with a fixed number of decimals. */
  fixed(value: number, digits = 0): string {
    return (Number(value) || 0).toFixed(digits)
  },
} as const

export type SduiExpressionHelpers = typeof sduiExpressionHelpers

/**
 * Walk a dot-separated path inside a state object.
 * Returns undefined when any segment is missing.
 */
export function lookupPath(path: string, state: SduiResolveState | undefined): any {
  if (!path) return undefined
  const parts = path.split('.')
  let current: any = state
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

/**
 * Evaluate a single `{{ expression }}` payload against the shared state.
 *
 * Supports the full expression grammar the schemas use: paths, literals,
 * `||` / `??` fallbacks, arithmetic, comparisons, ternaries and string
 * concatenation. Evaluation is sandboxed through a `with (state)` function and
 * falls back to a plain path lookup when the expression cannot be evaluated
 * (CSP-restricted webviews, malformed input, undefined identifiers).
 */
export function evaluateExpression(expression: string, state: SduiResolveState = {}): any {
  const expr = (expression ?? '').trim()
  if (!expr) return ''

  // Fast path: a bare path (state.cpuCores, cpuCores, assignedRam) needs no eval.
  if (/^[\w.]+$/.test(expr)) {
    return lookupPath(expr, state)
  }

  try {
    // `with` keeps bare identifiers (cpuCores) working while `state.` paths
    // remain available for explicit references. Helpers are injected as a
    // parameter so schemas can call enabledCount(state.modules) etc.
    const fn = new Function(
      'state',
      'helpers',
      `with (state || {}) { return (${expr}); }`
    ) // eslint-disable-line no-new-func
    return fn(state, sduiExpressionHelpers)
  } catch {
    return lookupPath(expr, state)
  }
}

/**
 * Replace every `{{ expression }}` occurrence in a string with its evaluated
 * value. Missing values render as an empty string (never a literal `{{ }}`).
 */
export function evaluateString(str: string, state?: SduiResolveState): string {
  if (typeof str !== 'string' || str.indexOf('{{') === -1) return str

  return str.replace(/\{\{\s*([\s\S]+?)\s*\}\}/g, (_match, expression: string) => {
    const value = evaluateExpression(expression, state)
    return value === undefined || value === null ? '' : String(value)
  })
}

/**
 * Resolve a dual-language `{ ar, en }` value for the active locale.
 *
 * - Strings are passed through evaluateString().
 * - Objects carrying `ar`/`en` keys pick the active locale, then fall back to
 *   `ar`, then `en`, then the first string value in the object.
 * - Arrays and plain objects are resolved recursively so nested prop bags and
 *   class/style maps localise correctly.
 */
export function resolveLocalized(
  value: any,
  locale: SduiResolveLocale = 'ar',
  state?: SduiResolveState
): any {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return evaluateString(value, state)
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveLocalized(item, locale, state))
  }

  if (typeof value === 'object') {
    const record = value as Record<string, any>

    if ('ar' in record || 'en' in record) {
      const raw =
        record[locale] ??
        record.ar ??
        record.en ??
        Object.values(record).find((v) => typeof v === 'string')
      return typeof raw === 'string' ? evaluateString(raw, state) : raw
    }

    const resolved: Record<string, any> = {}
    for (const [key, child] of Object.entries(record)) {
      resolved[key] = resolveLocalized(child, locale, state)
    }
    return resolved
  }

  return value
}

/**
 * Read every `--token` custom property from the active theme's computed style.
 * Values come straight from tokens.css / App.vue, so the SDUI layer always
 * resolves the same pixels the browser paints.
 */
export function readThemeTokens(): Map<string, string> {
  const tokens = new Map<string, string>()
  if (typeof document === 'undefined') return tokens

  const computed = getComputedStyle(document.documentElement)
  for (let i = 0; i < computed.length; i++) {
    const property = computed.item(i)
    if (property && property.startsWith('--')) {
      const value = computed.getPropertyValue(property).trim()
      if (value) tokens.set(property, value)
    }
  }
  return tokens
}

interface TokenCache {
  theme: string
  tokens: Map<string, string>
}

let tokenCache: TokenCache | null = null

/**
 * Cached token lookup keyed by the active `data-theme` attribute, so theme
 * switches invalidate the cache without a page reload.
 */
export function getCachedThemeTokens(force = false): Map<string, string> {
  const theme =
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || 'dark'
      : 'dark'

  if (!force && tokenCache && tokenCache.theme === theme) {
    return tokenCache.tokens
  }

  tokenCache = { theme, tokens: readThemeTokens() }
  return tokenCache.tokens
}

/**
 * Replace `var(--token)` / `var(--token, fallback)` references with the live
 * tokens.css value for the active theme. Unknown tokens keep their fallback or
 * the original reference so the browser can still resolve them.
 */
export function resolveCssVariables(input: string): string {
  if (typeof input !== 'string' || input.indexOf('var(') === -1) return input

  const tokens = getCachedThemeTokens()
  return input.replace(
    /var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*?))?\)/g,
    (match, name: string, fallback?: string) => {
      const value = tokens.get(name)
      if (value !== undefined && value !== '') return value
      if (typeof fallback === 'string' && fallback.trim() !== '') return fallback.trim()
      return match
    }
  )
}

/**
 * Full resolution pipeline for an SDUI node value:
 * localize -> interpolate -> resolve theme tokens.
 */
export function resolveNodeValue(
  value: any,
  locale: SduiResolveLocale = 'ar',
  state?: SduiResolveState
): any {
  const localized = resolveLocalized(value, locale, state)
  if (typeof localized === 'string') {
    return resolveCssVariables(localized)
  }
  if (Array.isArray(localized)) {
    return localized.map((item) =>
      typeof item === 'string' ? resolveCssVariables(item) : item
    )
  }
  if (localized && typeof localized === 'object') {
    const resolved: Record<string, any> = {}
    for (const [key, child] of Object.entries(localized)) {
      resolved[key] =
        typeof child === 'string' ? resolveCssVariables(child) : child
    }
    return resolved
  }
  return localized
}
