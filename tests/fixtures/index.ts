/**
 * FastFree ERP — shared test data fixtures and factories.
 *
 * One framework-agnostic source of truth consumed by both Vitest unit tests
 * (via the `@fastfree/test-fixtures` alias) and Cypress E2E/component specs
 * (via a relative re-export from `test/cypress/fixtures/factories.ts`).
 *
 * Design rules:
 * - **No runtime imports.** Domain types use `import type`, so the whole
 *   barrel bundles cleanly into a Cypress browser bundle without pulling in
 *   the Frappe SDK, Dexie, or Vue.
 * - Every factory returns a fully-populated, internally consistent record;
 *   override only the fields a test cares about.
 * - Deliberately inconsistent records live in `scenarios.ts`, not here.
 *
 * ```ts
 * import { accounting, buildList } from '@fastfree/test-fixtures'
 * const entries = buildList(accounting.journalEntry, 3)
 * ```
 */

// Core primitives and API envelopes are collision-free — export directly.
export * from './core'
export * from './api'
export * from './panel'
export * from './scenarios'

// Domain factories are namespaced: several modules expose a `supplier`
// factory, and namespaces keep every entity addressable.
export * as auth from './auth'
export * as accounting from './accounting'
export * as crm from './crm'
export * as hr from './hr'
export * as inventory from './inventory'
export * as purchase from './purchase'
export * as sales from './sales'
