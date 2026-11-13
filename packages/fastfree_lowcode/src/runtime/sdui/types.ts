/**
 * Server-Driven UI (SDUI) Type Definitions — compatibility re-export
 * FastFree ERP Lowcode Engine
 *
 * The canonical contract lives in the shared package `fastfree-sdui`
 * (packages/fastfree_sdui/contract/types.ts) so the delivery server and the
 * client engine can never drift apart (docs/sdui/PLAN.md §4.1, §12.1).
 *
 * This module keeps every historical import path working unchanged:
 * - `quasar-app-extension-fastfree-lowcode` (runtime barrel → sdui/index.ts)
 * - `quasar-app-extension-fastfree-lowcode/src/runtime/sdui/types`
 *
 * The re-export is type-only: nothing from fastfree-sdui enters an app bundle
 * at runtime, and the frozen SduiNode/SduiScreen shapes are preserved exactly
 * (type/props/children/events/model + id/text/class/style) — only the optional
 * `SduiScreen.meta` layer is added, per PLAN.md §5.
 */

export type {
  SduiActionType,
  SduiAction,
  SduiNode,
  SduiScreen,
  SduiScreenMeta,
  SduiState,
  SduiCacheEntry,
  CachedScreenRecord,
  SduiActionContext,
  SduiActionHandler,
} from 'fastfree-sdui/contract'
