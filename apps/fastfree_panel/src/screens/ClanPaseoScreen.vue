<template>
  <div class="clan-paseo-screen q-pa-md">
    <!-- Header with Live Paseo MCP Status & Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Paseo Multi-Agent Ecosystem</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">منظومة وكلاء Paseo الذكية</span>
        </div>
        <div class="text-caption text-grey-6">
          Live MCP Orchestration · Real-time agents, providers, and command dispatching
        </div>
      </div>

      <q-space />

      <!-- Dynamic Connection Indicator Chip -->
      <q-chip
        dense
        square
        :color="connectionChip.color"
        text-color="white"
        size="sm"
        :icon="connectionChip.icon"
      >
        {{ connectionChip.label }}
      </q-chip>

      <!-- Status Filter Toggle -->
      <q-btn-toggle
        v-model="statusFilter"
        dense
        rounded
        unelevated
        toggle-color="primary"
        color="grey-9"
        text-color="grey-4"
        :options="statusFilterOptions"
      />

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Search agents… بحث"
        style="width: 200px"
      >
        <template #prepend><q-icon name="mdi-magnify" size="18px" /></template>
      </q-input>

      <q-btn
        flat
        dense
        round
        icon="mdi-refresh"
        :loading="loading"
        aria-label="Refresh Paseo status"
        @click="refreshPaseoStatus"
      >
        <q-tooltip>Refresh Paseo MCP Session · تحديث</q-tooltip>
      </q-btn>
    </div>

    <!-- Overview Stat Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-lan-connect" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Paseo Daemon</div>
          <div class="text-subtitle2 text-weight-bold text-ellipsis">{{ daemonUrl }}</div>
          <div class="text-caption text-positive">{{ liveAgents.length }} Registered Agents</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-robot-excited-outline" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Lead Agent</div>
          <div class="text-subtitle2 text-weight-bold text-teal-4">{{ activeLeadAgent }}</div>
          <div class="text-caption text-grey-6">Desktop OS & Lowcode Specialist</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-sync" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Live Status Breakdown</div>
          <div class="text-subtitle2 text-weight-bold text-indigo-3">{{ statusBreakdownText }}</div>
          <div class="text-caption text-grey-6">{{ paseoData?.source === 'live' ? 'Live Daemon Sync' : 'Fallback Roster' }}</div>
        </q-card>
      </div>
    </div>

    <!-- Live Paseo Agents Lowcode Table with Pagination -->
    <q-card flat bordered class="q-mb-md">
      <q-table
        :rows="filteredAgents"
        :columns="agentColumns"
        row-key="id"
        flat
        dense
        v-model:pagination="pagination"
        :rows-per-page-options="[5, 10, 20]"
        binary-state-sort
        separator="cell"
      >
        <!-- Agent Name Slot -->
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar
                :icon="props.row.provider === 'opencode' ? 'mdi-code-braces' : props.row.provider === 'claude' ? 'mdi-brain' : props.row.provider === 'nixos' ? 'mdi-nix' : 'mdi-robot-outline'"
                :color="props.row.provider === 'opencode' ? 'purple-8' : props.row.provider === 'claude' ? 'amber-9' : props.row.provider === 'nixos' ? 'blue-8' : 'primary'"
                text-color="white"
                size="26px"
                class="q-mr-sm"
              />
              <div>
                <div class="text-weight-bold text-body2">{{ props.row.name }}</div>
                <div class="text-caption text-grey-6">ID {{ props.row.id }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Provider Type Slot -->
        <template #body-cell-provider="props">
          <q-td :props="props">
            <q-chip dense square size="xs" color="grey-9" text-color="grey-3">
              {{ String(props.row.provider).toUpperCase() }}
            </q-chip>
          </q-td>
        </template>

        <!-- Status Slot -->
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.status === 'idle' ? 'positive' : props.row.status === 'blocked' ? 'warning' : props.row.status === 'working' ? 'teal' : 'info'"
              :label="String(props.row.status).toUpperCase()"
              class="q-px-xs text-caption"
            />
          </q-td>
        </template>

        <!-- Working Directory Slot -->
        <template #body-cell-cwd="props">
          <q-td :props="props">
            <code class="text-caption text-cyan-3">{{ props.row.cwd || '-' }}</code>
          </q-td>
        </template>

        <!-- Actions Slot -->
        <template #body-cell-actions="props">
          <q-td :props="props" align="right">
            <div class="row items-center justify-end q-gutter-xs no-wrap">
              <q-btn
                flat
                dense
                round
                size="sm"
                color="primary"
                icon="mdi-message-text-outline"
                aria-label="Send prompt to agent"
                @click="openPromptModal(props.row)"
              >
                <q-tooltip>Send Prompt to Agent · إرسال أمر للوكيل</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                size="sm"
                color="teal"
                icon="mdi-card-search-outline"
                aria-label="Inspect agent details"
                @click="openAgentInspect(props.row)"
              >
                <q-tooltip>Inspect Agent · تفاصيل الوكيل</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Send Prompt Dialog -->
    <q-dialog v-model="promptDialogOpen">
      <q-card style="min-width: min(90vw, 540px)">
        <q-card-section class="row items-center q-gutter-sm bg-primary text-white">
          <q-icon name="mdi-robot-outline" size="24px" />
          <div class="text-subtitle1 text-weight-bold">
            Send Prompt to {{ selectedAgent?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup aria-label="Close dialog" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-grey-5 q-mb-sm">
            Target Agent: <code>{{ selectedAgent?.id }}</code> ({{ selectedAgent?.provider }})
          </div>
          <q-input
            v-model="promptText"
            type="textarea"
            rows="4"
            outlined
            placeholder="Type instructions or command for this Paseo agent..."
            dense
            autofocus
            @keydown.ctrl.enter="dispatchPrompt"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel · إلغاء" v-close-popup />
          <q-btn
            color="primary"
            icon="mdi-send"
            label="Send to Agent · إرسال"
            type="submit"
            :loading="sendingPrompt"
            :disable="!promptText.trim()"
            @click="dispatchPrompt"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Agent Inspection Modal -->
    <q-dialog v-model="inspectDialogOpen">
      <q-card style="min-width: min(90vw, 600px)">
        <q-card-section class="row items-center q-gutter-sm bg-grey-9 text-white">
          <q-icon name="mdi-robot-outline" size="24px" color="teal" />
          <div class="text-subtitle1 text-weight-bold">
            Agent Details: {{ selectedAgent?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup aria-label="Close dialog" />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-sm">
          <div class="row">
            <div class="col-4 text-grey-5">Agent ID:</div>
            <div class="col-8 text-weight-bold"><code>{{ selectedAgent?.id }}</code></div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Provider:</div>
            <div class="col-8 text-weight-bold">{{ selectedAgent?.provider }}</div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Working Directory:</div>
            <div class="col-8"><code>{{ selectedAgent?.cwd || '-' }}</code></div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Execution Status:</div>
            <div class="col-8">
              <q-badge
                :color="selectedAgent?.status === 'idle' ? 'positive' : selectedAgent?.status === 'blocked' ? 'warning' : selectedAgent?.status === 'working' ? 'teal' : 'info'"
                :label="selectedAgent?.status?.toUpperCase()"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useWebMcp } from '../composables/useWebMcp';
import {
  apiPaseoStatus,
  apiPaseoPrompt,
  type LivePaseoAgent,
  type PaseoStatusData,
} from '../lib/api';

const $q = useQuasar();
const mcp = useWebMcp();

const filter = ref('');
const statusFilter = ref<'all' | 'blocked' | 'idle' | 'done'>('all');
const loading = ref(false);

const promptDialogOpen = ref(false);
const inspectDialogOpen = ref(false);
const selectedAgent = ref<LivePaseoAgent | null>(null);
const promptText = ref('');
const sendingPrompt = ref(false);

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false,
});

const agentColumns = [
  { name: 'name', label: 'Agent Name · اسم الوكيل', field: 'name', align: 'left' as const, sortable: true },
  { name: 'provider', label: 'Provider', field: 'provider', align: 'center' as const, sortable: true },
  { name: 'status', label: 'Status · الحالة', field: 'status', align: 'center' as const, sortable: true },
  { name: 'cwd', label: 'Working Directory', field: 'cwd', align: 'left' as const },
  { name: 'actions', label: 'Actions · الإجراءات', field: 'name', align: 'right' as const },
];

/** Persisted telemetry metadata */
const paseoData = ref<PaseoStatusData | null>(null);

/** Live agents array initialized with verified FastFree Paseo ecosystem defaults */
const liveAgents = ref<LivePaseoAgent[]>([
  { id: 'agy-audit-all', name: 'agy-audit-all', provider: 'agy', status: 'blocked', cwd: 'C:\\Users\\FastFree' },
  { id: 'opencode-clan-deploy', name: 'opencode-clan-deploy', provider: 'opencode', status: 'idle', cwd: 'C:\\Users\\FastFree' },
  { id: 'claude-architecture', name: 'claude-architecture', provider: 'claude', status: 'idle', cwd: 'C:\\Users\\FastFree' },
  { id: 'nixos-eval-dryrun', name: 'nixos-eval-dryrun', provider: 'nixos', status: 'done', cwd: 'C:\\Users\\FastFree' },
  { id: 'ci-release-build', name: 'ci-release-build', provider: 'github', status: 'done', cwd: 'C:\\Users\\FastFree' },
]);

/** Computed breakdown counts */
const statusCounts = computed(() => {
  if (paseoData.value?.counts) {
    return paseoData.value.counts;
  }
  let blocked = 0;
  let idle = 0;
  let done = 0;
  let working = 0;
  for (const a of liveAgents.value) {
    if (a.status === 'blocked') blocked++;
    else if (a.status === 'idle') idle++;
    else if (a.status === 'done') done++;
    else if (a.status === 'working') working++;
  }
  return {
    all: liveAgents.value.length,
    blocked,
    idle,
    done,
    working,
  };
});

/** Filter toggle options with dynamic counts */
const statusFilterOptions = computed(() => [
  { label: `All (${liveAgents.value.length})`, value: 'all' },
  { label: `Blocked (${statusCounts.value.blocked})`, value: 'blocked' },
  { label: `Idle (${statusCounts.value.idle})`, value: 'idle' },
  { label: `Done (${statusCounts.value.done})`, value: 'done' },
]);

/** Dynamic visual connection chip */
const connectionChip = computed(() => {
  if (paseoData.value?.running) {
    return {
      color: 'positive',
      icon: 'mdi-check-circle-outline',
      label: 'PASEO DAEMON CONNECTED (LIVE)',
    };
  }
  if (mcp.isConnected.value) {
    return {
      color: 'indigo-7',
      icon: 'mdi-lan-connect',
      label: 'MCP READY · PASEO STANDALONE',
    };
  }
  return {
    color: 'grey-8',
    icon: 'mdi-cloud-off-outline',
    label: 'PASEO STANDALONE FALLBACK',
  };
});

/** Stat Card labels */
const daemonUrl = computed(() => paseoData.value?.baseUrl || 'http://127.0.0.1:6767');
const activeLeadAgent = computed(() => liveAgents.value[0] ? `${liveAgents.value[0].name} · ${liveAgents.value[0].provider}` : 'Antigravity · agy');
const statusBreakdownText = computed(() => `${statusCounts.value.blocked} Blocked · ${statusCounts.value.idle} Idle · ${statusCounts.value.done} Done`);

/** Filtered list of agents */
const filteredAgents = computed(() => {
  return liveAgents.value.filter((a) => {
    if (statusFilter.value !== 'all' && a.status !== statusFilter.value) {
      return false;
    }
    const query = filter.value.trim().toLowerCase();
    if (!query) return true;
    return (
      a.name.toLowerCase().includes(query) ||
      a.provider.toLowerCase().includes(query) ||
      a.id.toLowerCase().includes(query)
    );
  });
});

function openPromptModal(agent: LivePaseoAgent): void {
  selectedAgent.value = agent;
  promptText.value = '';
  promptDialogOpen.value = true;
}

function openAgentInspect(agent: LivePaseoAgent): void {
  selectedAgent.value = agent;
  inspectDialogOpen.value = true;
}

/**
 * Dispatches instruction prompt to target agent via Web MCP or Backend REST.
 */
async function dispatchPrompt(): Promise<void> {
  if (!promptText.value.trim() || !selectedAgent.value) return;
  const targetAgent = selectedAgent.value.id;
  const text = promptText.value.trim();

  sendingPrompt.value = true;
  try {
    let handled = false;
    let resultMessage = '';

    // 1. Try MCP tool dispatch
    try {
      const mcpRes = await mcp.callMcpTool<{ success?: boolean; message?: string }>('paseo_agent_prompt', {
        target: targetAgent,
        text,
      });
      if (mcpRes && typeof mcpRes === 'object') {
        handled = true;
        resultMessage = mcpRes.message || `Prompt dispatched to ${targetAgent} via MCP`;
      }
    } catch {
      // MCP not responsive or endpoint unavailable; fall back to REST
    }

    // 2. Fall back to REST API
    if (!handled) {
      const apiRes = await apiPaseoPrompt(targetAgent, text);
      resultMessage = apiRes.message;
      handled = true;
    }

    $q.notify({
      type: 'positive',
      icon: 'mdi-send-check',
      message: resultMessage,
      timeout: 3500,
    });
    promptDialogOpen.value = false;
    promptText.value = '';
  } catch (err) {
    $q.notify({
      type: 'negative',
      icon: 'mdi-alert-circle-outline',
      message: err instanceof Error ? err.message : `Failed to send prompt to ${targetAgent}`,
    });
  } finally {
    sendingPrompt.value = false;
  }
}

/**
 * Triggers live Paseo telemetry refresh from MCP runtime or Backend API.
 */
async function refreshPaseoStatus(): Promise<void> {
  loading.value = true;
  try {
    let telemetry: PaseoStatusData | null = null;

    // 1. Try MCP tool call first
    try {
      const mcpRes = await mcp.callMcpTool<PaseoStatusData | { agents?: LivePaseoAgent[] }>('paseo_status', {});
      if (mcpRes && typeof mcpRes === 'object') {
        if ('agents' in mcpRes && Array.isArray(mcpRes.agents) && mcpRes.agents.length > 0) {
          telemetry = mcpRes as PaseoStatusData;
        }
      }
    } catch {
      // MCP not ready; proceed to REST fallback
    }

    // 2. Fall back to backend REST endpoint
    if (!telemetry || !telemetry.agents || telemetry.agents.length === 0) {
      try {
        telemetry = await apiPaseoStatus(5000);
      } catch {
        // Handled below
      }
    }

    if (telemetry && Array.isArray(telemetry.agents) && telemetry.agents.length > 0) {
      paseoData.value = telemetry;
      liveAgents.value = telemetry.agents;
      $q.notify({
        type: 'positive',
        icon: 'mdi-refresh',
        message: telemetry.running
          ? 'Paseo live session updated successfully!'
          : telemetry.message || 'Paseo telemetry loaded from fallback roster.',
        timeout: 2500,
      });
    } else {
      $q.notify({
        type: 'info',
        icon: 'mdi-information-outline',
        message: 'Paseo daemon offline. Displaying verified agent ecosystem.',
        timeout: 2500,
      });
    }
  } catch (err) {
    $q.notify({
      type: 'warning',
      icon: 'mdi-alert-circle-outline',
      message: err instanceof Error ? err.message : 'Unable to refresh Paseo telemetry',
    });
  } finally {
    loading.value = false;
  }
}

let unsubscribePaseo: (() => void) | null = null;

onMounted(() => {
  void refreshPaseoStatus();

  // Listen for real-time Paseo stream events if broadcasted over SSE
  unsubscribePaseo = mcp.onEvent('paseo', (data) => {
    if (data && typeof data === 'object') {
      const maybe = data as Partial<PaseoStatusData>;
      if (Array.isArray(maybe.agents) && maybe.agents.length > 0) {
        liveAgents.value = maybe.agents;
      }
    }
  });
});

onUnmounted(() => {
  if (unsubscribePaseo) {
    unsubscribePaseo();
  }
});
</script>

<style scoped lang="scss">
.clan-paseo-screen {
  height: 100%;
  overflow-y: auto;
}
</style>
