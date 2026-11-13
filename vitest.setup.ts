/**
 * Global Vitest setup — loaded once per test file by every workspace project.
 *
 * Keep this dependency-free: it runs in the Node test environment for every
 * package, so it must not import browser-only or workspace packages.
 */
import { afterEach, vi } from 'vitest'

// Pin the timezone so date assertions are stable on every developer machine
// and in CI. `vitest.config.ts` also exports TZ through `test.env`.
process.env.TZ ||= 'UTC'

afterEach(() => {
  // Tests that create spies with `vi.spyOn` get them restored automatically;
  // `vi.fn()` mocks are owned by each test's `beforeEach`/`vi.clearAllMocks`.
  vi.restoreAllMocks()
})
