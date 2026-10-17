// `defineStore` comes from Pinia, not from `#q-app`. The `#q-app` export of the
// same name is Quasar's SSR wrapper that *creates the Pinia instance* — it takes
// a single `StoreCallback` (see `src/stores/index.ts`) and is the wrong helper
// for defining an individual store.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
  apiGlobalShow,
  apiMachines,
  PanelApiError,
  type GlobalSummary,
  type MachineSummary,
  type PanelErrorCode,
} from '../lib/api';

/**
 * Safe, generic messages per error code.
 *
 * Two properties matter here:
 *  - they never leak transport details (URLs, stack text, raw server strings),
 *    so they are always safe to render;
 *  - they are short and self-contained, so a page may pass one straight to
 *    `$q.notify` or display it untranslated as a fallback.
 *
 * `errorCode` on the store is the machine-readable companion, so a UI that
 * prefers `t(`errors.${errorCode}`)` can localise properly and only fall back
 * to `error` when the key is missing.
 */
const SAFE_ERROR_MESSAGES: Record<PanelErrorCode, string> = {
  VALIDATION_ERROR: 'The request was rejected as invalid.',
  UNAUTHORIZED: 'Authentication is required to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please try again shortly.',
  TIMEOUT: 'The server took too long to respond.',
  UPSTREAM_ERROR: 'The server reported an upstream failure.',
  NOT_CONFIGURED: 'The server is not fully configured.',
  INTERNAL: 'The server encountered an internal error.',
  NETWORK: 'Unable to reach the server.',
  UNKNOWN: 'An unexpected error occurred.',
};

/** Reduces any thrown value to a safe message plus a code usable as an i18n key. */
function describeError(error: unknown): { code: PanelErrorCode; message: string } {
  if (error instanceof PanelApiError) {
    return { code: error.code, message: SAFE_ERROR_MESSAGES[error.code] };
  }
  return { code: 'UNKNOWN', message: SAFE_ERROR_MESSAGES.UNKNOWN };
}

export const useClanStore = defineStore('clan', () => {
  /** Machine roster; empty until the first successful load. */
  const machines = ref<MachineSummary[]>([]);
  /** Clan identity; `null` until the first successful load. */
  const global = ref<GlobalSummary | null>(null);

  /** Safe, user-presentable message for the most recent failure. */
  const error = ref<string | null>(null);
  /** Machine-readable companion to {@link error}, suitable for `t()` keys. */
  const errorCode = ref<PanelErrorCode | null>(null);

  /** Epoch milliseconds of the last successful load, or `null` if never loaded. */
  const lastUpdated = ref<number | null>(null);
  /** `true` once at least one payload has been received successfully. */
  const loaded = ref(false);

  // In-flight counter rather than a boolean: `refresh()` runs two requests in
  // parallel, so a plain flag would clear `loading` when the first one settles.
  const inFlight = ref(0);
  const loading = computed(() => inFlight.value > 0);

  // Per-resource guards: a second `fetchMachines()` while one is running is a
  // no-op, which also makes a double-clicked `refresh()` harmless.
  const machinesPending = ref(false);
  const globalPending = ref(false);
  const refreshPending = ref(false);

  const machineCount = computed(() => machines.value.length);
  /** `true` while any request is running — bind this to a disabled state. */
  const isRefreshing = computed(() => refreshPending.value || loading.value);

  function begin(): void {
    inFlight.value += 1;
  }

  function settle(): void {
    inFlight.value -= 1;
  }

  function clearError(): void {
    error.value = null;
    errorCode.value = null;
  }

  function recordFailure(caught: unknown): void {
    const described = describeError(caught);
    error.value = described.message;
    errorCode.value = described.code;
  }

  /** Loads the machine roster. Never throws; failures land in `error`/`errorCode`. */
  async function fetchMachines(): Promise<void> {
    if (machinesPending.value) return;

    machinesPending.value = true;
    begin();
    try {
      const data = await apiMachines();
      machines.value = data.machines;
      lastUpdated.value = Date.now();
      loaded.value = true;
      clearError();
    } catch (caught: unknown) {
      recordFailure(caught);
    } finally {
      settle();
      machinesPending.value = false;
    }
  }

  /** Loads the clan identity. Never throws; failures land in `error`/`errorCode`. */
  async function fetchGlobal(): Promise<void> {
    if (globalPending.value) return;

    globalPending.value = true;
    begin();
    try {
      const data = await apiGlobalShow();
      global.value = data;
      lastUpdated.value = Date.now();
      loaded.value = true;
      clearError();
    } catch (caught: unknown) {
      recordFailure(caught);
    } finally {
      settle();
      globalPending.value = false;
    }
  }

  /** Loads both resources in parallel. Safe to call repeatedly. */
  async function refresh(): Promise<void> {
    if (refreshPending.value) return;

    refreshPending.value = true;
    try {
      await Promise.all([fetchMachines(), fetchGlobal()]);
    } finally {
      refreshPending.value = false;
    }
  }

  /** Clears every field back to its initial state. */
  function reset(): void {
    machines.value = [];
    global.value = null;
    clearError();
    lastUpdated.value = null;
    loaded.value = false;
  }

  return {
    // state
    machines,
    global,
    error,
    errorCode,
    lastUpdated,
    loaded,
    // computed
    loading,
    machineCount,
    isRefreshing,
    // actions
    fetchMachines,
    fetchGlobal,
    refresh,
    reset,
  };
});