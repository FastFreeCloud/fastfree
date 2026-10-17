/**
 * The single import surface for `fastfree_lowcode`
 * (published as `quasar-app-extension-fastfree-lowcode`).
 *
 * WHY DEEP `#lc/*` PATHS AND NOT THE PACKAGE BARREL
 * ------------------------------------------------
 * Importing the package barrel — `quasar-app-extension-fastfree-lowcode` — is
 * actively harmful for this app:
 *
 *  1. It side-effect-imports two global stylesheets, so merely importing a
 *     formatting helper would inject package CSS into the whole application.
 *  2. It transitively pulls in `dexie` (IndexedDB) and `exceljs` (a very large
 *     XLSX writer). The panel needs none of that, and both inflate the
 *     production bundle.
 *
 * `fastfree_lowcode` also ships raw TypeScript/Vue with no build step, so deep
 * paths are the intended consumption style. `quasar.config.ts` maps
 * `#lc/*` -> `packages/fastfree_lowcode/src/runtime/*` for the bundler and for
 * TypeScript, which makes deep imports first-class here.
 *
 * CONSEQUENCE: this file is the ONLY place in `src/` allowed to import from
 * `#lc/*`. Everything else imports from `~/lib/lowcode`, so the alias is
 * declared once and a future upstream restructure has exactly one file to fix.
 */

/**
 * Locale-aware number formatting.
 *
 * @example
 * const { formatNumber, formatCurrency, formatPercent } = useFormatNumber();
 */
export { useFormatNumber } from '#lc/composables/useFormatNumber';

/**
 * Shared status helpers.
 *
 * NOTE: `useStatusHelpers` REQUIRES a namespace argument — the i18n prefix used
 * to build the lookup key `${namespace}.status.<status>` (e.g. `'clan'`).
 * It resolves through the lowcode translation registry, not the app's
 * vue-i18n instance, so it is only useful for namespaces the lowcode runtime
 * actually knows about.
 *
 * @example
 * const { translateStatus, statusColor, statusOptions } = useStatusHelpers('sales');
 */
export { useStatusHelpers } from '#lc/composables/useStatusHelpers';

/** Field validators returning `(val: unknown) => boolean | string`. */
export { VALIDATORS } from '#lc/utils/validators';

/** Stateless formatters: number, currency, date, dateTime, percent, fileSize. */
export { formatters } from '#lc/utils/formatters';

export type { FormatterOptions } from '#lc/utils/formatters';

import DynamicTable from '#lc/components/DynamicTable.vue';
import EmptyState from '#lc/components/EmptyState.vue';
import DesktopShell from '#lc/components/DesktopShell.vue';
import DesktopDock from '#lc/components/DesktopDock.vue';
import DesktopHeader from '#lc/components/DesktopHeader.vue';
import WindowPanel from '#lc/components/WindowPanel.vue';
import GroupWorkspace from '#lc/components/GroupWorkspace.vue';

export {
  DynamicTable,
  EmptyState,
  DesktopShell,
  DesktopDock,
  DesktopHeader,
  WindowPanel,
  GroupWorkspace,
};

export { useDesktopStore } from '#lc/composables/useDesktopStore';
export type { WindowInfo } from '#lc/composables/useDesktopStore';
export { useGroupsStore, registerGroup, registerGroupPage } from '#lc/composables/useGroupsStore';
export { registerScreen, registerScreens, getScreenComponent } from '#lc/composables/screen-registry';
export { useLcI18n } from '#lc/i18n';