/**
 * Shared test-data factory primitives.
 *
 * Framework-agnostic by design: this module (and every module under
 * `tests/fixtures/`) must run unchanged in Vitest's Node environment and in a
 * Cypress browser bundle. That means **no runtime imports** — domain types are
 * pulled in with `import type` only, so they are erased before bundling.
 */

/** A factory builds one object; overrides are shallow-merged on top. */
export type Factory<T> = (overrides?: Partial<T>) => T

const sequences = new Map<string, number>()

/**
 * Reset every auto-increment sequence. Call from a global `beforeEach` when a
 * test needs deterministic ids/names across runs.
 */
export function resetFactories(): void {
  sequences.clear()
}

/** Next 1-based value for a named sequence. */
export function seq(key = 'default'): number {
  const next = (sequences.get(key) ?? 0) + 1
  sequences.set(key, next)
  return next
}

/** Unique token such as `emp-1`, `emp-2`. */
export function unique(key: string): string {
  return `${key}-${seq(key)}`
}

/**
 * Define a factory. `defaults` is a function (not a literal) so every call
 * produces fresh nested objects — arrays and objects are never shared between
 * two instances.
 */
export function defineFactory<T>(defaults: (index: number) => T): Factory<T> {
  return (overrides: Partial<T> = {}): T => ({
    ...defaults(seq('factory')),
    ...overrides,
  })
}

/** Build `count` items, optionally varying each with a callback. */
export function buildList<T>(
  factory: Factory<T>,
  count: number,
  overrides: Partial<T> | ((index: number) => Partial<T>) = {},
): T[] {
  return Array.from({ length: count }, (_, index) =>
    factory(typeof overrides === 'function' ? overrides(index) : overrides),
  )
}

/** Sum a numeric field across a list (used to keep totals consistent). */
export function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((total, item) => total + fn(item), 0)
}

/** ISO `YYYY-MM-DD` for a Date (defaults to today). */
export function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** ISO date `days` from today (negative = past). */
export function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

/** Epoch millis `ms` from now (negative = past). */
export function millisFromNow(ms: number): number {
  return Date.now() + ms
}
