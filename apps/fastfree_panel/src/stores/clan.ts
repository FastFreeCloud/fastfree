// `defineStore` comes from Pinia, not from `#q-app`. The `#q-app` export of the
// same name is Quasar's SSR wrapper that *creates the Pinia instance* — it takes
// a single `StoreCallback` (see `src/stores/index.ts`) and is the wrong helper
// for defining an individual store.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useWebMcp } from '../composables/useWebMcp';
import {
  apiGlobalShow,
  apiHealth,
  apiMachines,
  PanelApiError,
  type GlobalSummary,
  type HealthData,
  type MachineSummary,
  type PanelErrorCode,
} from '../lib/api';

/** Live system health state, reconciling MCP events and the REST health probe. */
export type SystemHealth =
  | HealthData
  | ({
      status?: string;
      clanConfigured?: boolean;
      bootstrapAuthEnabled?: boolean;
      uptimeSeconds?: number;
    } & Record<string, unknown>);

/** Real-time deployment/update progress payload from Clan stream. */
export interface DeployProgress {
  stage?: string;
  percent?: number;
  message?: string;
  machine?: string;
  [key: string]: unknown;
}

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
  const mcp = useWebMcp();

  /** Machine roster; empty until the first successful load. */
  const machines = ref<MachineSummary[]>([]);
  /** Clan identity; `null` until the first successful load. */
  const global = ref<GlobalSummary | null>(null);

  /** Live system health from MCP or health probe. */
  const systemHealth = ref<SystemHealth | null>(null);
  /** `true` while a deployment, machine update, or rollback is in flight. */
  const isDeploying = ref(false);
  /** Real-time progress percentage, stage description, or payload. */
  const deployProgress = ref<number | string | DeployProgress | null>(null);

  /** Safe, user-presentable message for the most recent failure. */
  const error = ref<string | null>(null);
  /** Machine-readable companion to {@link error}, suitable for `t()` keys. */
  const errorCode = ref<PanelErrorCode | null>(null);

  /** Epoch milliseconds of the last successful load, or `null` if never loaded. */
  const lastUpdated = ref<number | null>(null);
  /** `true` once at least one payload has been received successfully. */
  const loaded = ref(false);

  // In-flight counter rather than a boolean: `refresh()` runs requests in
  // parallel, so a plain flag would clear `loading` when the first one settles.
  const inFlight = ref(0);
  const loading = computed(() => inFlight.value > 0);

  // Per-resource guards: a second fetch while one is running is a
  // no-op, which also makes a double-clicked `refresh()` harmless.
  const machinesPending = ref(false);
  const globalPending = ref(false);
  const healthPending = ref(false);
  const refreshPending = ref(false);

  const machineCount = computed(() => machines.value.length);
  /** `true` while any request or deployment is running — bind this to a disabled state. */
  const isRefreshing = computed(() => refreshPending.value || loading.value || isDeploying.value);

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

  // Subscribe to live reactive Clan stream events via MCP SSE
  mcp.onEvent('health', (data) => {
    if (data && typeof data === 'object') {
      systemHealth.value = {
        ...(systemHealth.value ?? {}),
        ...(data as Record<string, unknown>),
      };
    }
  });

  mcp.onEvent('deploy_progress', (data) => {
    if (typeof data === 'number' || typeof data === 'string') {
      deployProgress.value = data;
    } else if (data && typeof data === 'object') {
      deployProgress.value = data as DeployProgress;
    }
  });

  mcp.onEvent('deploy_start', () => {
    isDeploying.value = true;
  });

  mcp.onEvent('deploy_complete', () => {
    isDeploying.value = false;
    deployProgress.value = 100;
    void fetchMachines();
  });

  mcp.onEvent('deploy_error', (data) => {
    isDeploying.value = false;
    recordFailure(data);
  });

  mcp.onEvent('machines_updated', () => {
    void fetchMachines();
  });

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

  /** Fetches system health via MCP clan_health tool with fallback to apiHealth(). */
  async function fetchHealth(): Promise<SystemHealth | null> {
    if (healthPending.value) return systemHealth.value;

    healthPending.value = true;
    begin();
    try {
      try {
        const mcpHealth = await mcp.callMcpTool<SystemHealth>('clan_health', {});
        if (mcpHealth && typeof mcpHealth === 'object') {
          systemHealth.value = mcpHealth;
          clearError();
          return mcpHealth;
        }
      } catch {
        // Fall back to REST /api/v1/health
      }

      const rest = await apiHealth();
      systemHealth.value = rest;
      clearError();
      return rest;
    } catch (caught: unknown) {
      recordFailure(caught);
      return null;
    } finally {
      settle();
      healthPending.value = false;
    }
  }

  /**
   * Triggers a live machine deployment/update via MCP tool.
   * Sets `isDeploying` and updates `deployProgress`.
   */
  async function triggerMachineUpdate(machineName: string): Promise<unknown> {
    if (!machineName) {
      throw new Error('Machine name is required for update');
    }

    isDeploying.value = true;
    deployProgress.value = `Updating ${machineName}...`;
    begin();
    try {
      const result = await mcp.callMcpTool('clan_machines_update', { machine: machineName });
      deployProgress.value = 100;
      clearError();
      await fetchMachines();
      return result;
    } catch (caught: unknown) {
      recordFailure(caught);
      throw caught;
    } finally {
      isDeploying.value = false;
      settle();
    }
  }

  /**
   * Triggers a system or machine rollback via MCP tool.
   * Sets `isDeploying` and updates `deployProgress`.
   */
  async function triggerRollback(
    machineName?: string,
    options: Record<string, unknown> = {},
  ): Promise<unknown> {
    isDeploying.value = true;
    deployProgress.value = machineName ? `Rolling back ${machineName}...` : 'Rolling back system...';
    begin();
    try {
      const args: Record<string, unknown> = { ...options };
      if (machineName) {
        args.machine = machineName;
      }
      const result = await mcp.callMcpTool('clan_rollback', args);
      deployProgress.value = 100;
      clearError();
      await fetchMachines();
      return result;
    } catch (caught: unknown) {
      recordFailure(caught);
      throw caught;
    } finally {
      isDeploying.value = false;
      settle();
    }
  }

  /** Loads machines, global identity, and health in parallel. Safe to call repeatedly. */
  async function refresh(): Promise<void> {
    if (refreshPending.value) return;

    refreshPending.value = true;
    try {
      await Promise.all([fetchMachines(), fetchGlobal(), fetchHealth()]);
    } finally {
      refreshPending.value = false;
    }
  }

  /** Clears every field back to its initial state. */
  function reset(): void {
    machines.value = [];
    global.value = null;
    systemHealth.value = null;
    isDeploying.value = false;
    deployProgress.value = null;
    clearError();
    lastUpdated.value = null;
    loaded.value = false;
  }

  return {
    // state
    machines,
    global,
    systemHealth,
    isDeploying,
    deployProgress,
    error,
    errorCode,
    lastUpdated,
    loaded,
    mcpConnectionState: mcp.connectionState,
    isMcpConnected: mcp.isConnected,
    // computed
    loading,
    machineCount,
    isRefreshing,
    // actions
    fetchMachines,
    fetchGlobal,
    fetchHealth,
    triggerMachineUpdate,
    triggerRollback,
    refresh,
    reset,
  };
});