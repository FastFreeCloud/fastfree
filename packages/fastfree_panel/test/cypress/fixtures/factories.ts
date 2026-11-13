/**
 * Cypress test data — browser-safe re-export of the shared fixture library.
 *
 * The factories live in `tests/fixtures/` at the monorepo root so Vitest unit
 * tests and Cypress E2E/component specs share one source of truth. This module
 * exists so specs keep importing from `../fixtures/factories`.
 *
 * The library has no runtime imports (domain types are `import type`), so it
 * bundles into the browser without pulling in the Frappe SDK, Dexie or Vue.
 */
export * from '../../../../../tests/fixtures/index'
