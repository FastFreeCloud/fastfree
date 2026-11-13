/**
 * ScreenLoader — client-side loader for server-driven screens (lowcode layer).
 *
 * Wraps the shared, dependency-free implementation in
 * `fastfree-sdui/client/ScreenLoader` and binds it to the lowcode two-tier
 * cache (`SduiCacheManager`, L1 memory + L2 IndexedDB) by default, so fetched
 * screens flow through the existing SWR detection layer instead of a parallel
 * store. `SduiCacheManager` is never bypassed or replaced — only used as the
 * cache backend, which keeps its contract and behaviour intact.
 *
 * Bundled/offline fallback screens are still supported via `fallbackScreens`,
 * and the shared API (load / invalidate / preload / forceRefresh) is preserved
 * unchanged.
 */
import { SduiCacheManager } from './SduiCacheManager'
import { ScreenLoader as BaseScreenLoader } from 'fastfree-sdui/client'
import type {
  ScreenLoaderOptions,
  LoadOptions,
  SduiScreenLike,
  ScreenLoaderCache,
} from 'fastfree-sdui/client'

export class ScreenLoader extends BaseScreenLoader {
  constructor(options: ScreenLoaderOptions = {}) {
    // Default to the lowcode cache manager unless the caller explicitly opts
    // into another backend (or `null` for no caching).
    const cache =
      options.cache === undefined ? SduiCacheManager.getInstance() : options.cache
    super({ ...options, cache })
  }
}

export default ScreenLoader

// Re-export the shared types and functional helper, keeping the historical
// import paths (`.../sdui/ScreenLoader`) working for both value and type uses.
export type {
  SduiScreenLike,
  ScreenLoaderCache,
  ScreenLoaderOptions,
  LoadOptions,
} from 'fastfree-sdui/client'

export { loadScreen } from 'fastfree-sdui/client'