<template>
  <div class="clan-herdr-screen q-pa-md">
    <!-- Header with Live Herdr MCP Status & Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Herdr Multi-Agent Ecosystem</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">منظومة وكلاء Herdr الذكية</span>
        </div>
        <div class="text-caption text-grey-6">
          Live MCP Orchestration · Real-time agents, tabs, panes, and command dispatching
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
        aria-label="Refresh Herdr status"
        @click="refreshHerdrStatus"
      >
        <q-tooltip>Refresh Herdr MCP Session · تحديث</q-tooltip>
      </q-btn>
    </div>

    <!-- Overview Stat Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-folder-network-outline" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Workspace Directory</div>
          <div class="text-subtitle2 text-weight-bold text-ellipsis">{{ workspaceDirectory }}</div>
          <div class="text-caption text-positive">{{ liveAgents.length }} Registered Agents</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-robot-excited-outline" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Lead Agent</div>
          <div class="text-subtitle2 text-weight-bold text-teal-4">{{ activeLeadAgent }}</div>
          <div class="text-caption text-grey-6">Desktop OS & Lowcode Specialist</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-console-network" size="30px" color="cyan" />
          <div class="text-caption text-grey-5 q-mt-xs">Herdr Panes & Shells</div>
          <div class="text-subtitle2 text-weight-bold text-cyan-3">{{ focusedPane }}</div>
          <div class="text-caption text-grey-6">Active Session Monitored</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-sync" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Live Status Breakdown</div>
          <div class="text-subtitle2 text-weight-bold text-indigo-3">{{ statusBreakdownText }}</div>
          <div class="text-caption text-grey-6">{{ herdrData?.source === 'live' ? 'Live Socket Sync' : 'Session Telemetry Sync' }}</div>
        </q-card>
      </div>
    </div>

    <!-- Live Herdr Agents Lowcode Table with Pagination -->
    <q-card flat bordered class="q-mb-md">
      <q-table
        :rows="filteredAgents"
        :columns="agentColumns"
        row-key="name"
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
                :icon="props.row.agent === 'opencode' ? 'mdi-code-braces' : props.row.agent === 'claude' ? 'mdi-brain' : props.row.agent === 'nixos' ? 'mdi-nix' : 'mdi-robot-outline'"
                :color="props.row.agent === 'opencode' ? 'purple-8' : props.row.agent === 'claude' ? 'amber-9' : props.row.agent === 'nixos' ? 'blue-8' : 'primary'"
                text-color="white"
                size="26px"
                class="q-mr-sm"
              />
              <div>
                <div class="text-weight-bold text-body2">{{ props.row.name }}</div>
                <div class="text-caption text-grey-6">Workspace {{ props.row.workspace_id }} · Tab {{ props.row.tab_id }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Agent Type / Binary Slot -->
        <template #body-cell-agent="props">
          <q-td :props="props">
            <q-chip dense square size="xs" color="grey-9" text-color="grey-3">
              {{ String(props.row.agent).toUpperCase() }}
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

        <!-- Location / Pane Slot -->
        <template #body-cell-pane="props">
          <q-td :props="props">
            <code class="text-caption text-cyan-3">{{ props.row.pane_id }}</code>
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
                aria-label="Inspect agent shell"
                @click="openAgentInspect(props.row)"
              >
                <q-tooltip>Inspect Agent Shell · تفاصيل الطرفية</q-tooltip>
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
            Target Pane: <code>{{ selectedAgent?.pane_id }}</code> (Workspace {{ selectedAgent?.workspace_id }})
          </div>
          <q-input
            v-model="promptText"
            type="textarea"
            rows="4"
            outlined
            placeholder="Type instructions or command for this Herdr agent..."
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
          <q-icon name="mdi-console" size="24px" color="teal" />
          <div class="text-subtitle1 text-weight-bold">
            Agent Shell: {{ selectedAgent?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup aria-label="Close dialog" />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-sm">
          <div class="row">
            <div class="col-4 text-grey-5">Agent Executable:</div>
            <div class="col-8 text-weight-bold">{{ selectedAgent?.agent }}</div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Working Directory:</div>
            <div class="col-8"><code>{{ selectedAgent?.cwd || 'C:\\Users\\FastFree' }}</code></div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Tab & Pane:</div>
            <div class="col-8"><code>{{ selectedAgent?.tab_id }} &bull; {{ selectedAgent?.pane_id }}</code></div>
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
  apiHerdrStatus,
  apiHerdrPrompt,
  type LiveHerdrAgent,
  type HerdrStatusData,
} from '../lib/api';

const $q = useQuasar();
const mcp = useWebMcp();

const filter = ref('');
const statusFilter = ref<'all' | 'blocked' | 'idle' | 'done'>('all');
const loading = ref(false);

const promptDialogOpen = ref(false);
const inspectDialogOpen = ref(false);
const selectedAgent = ref<LiveHerdrAgent | null>(null);
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
  { name: 'agent', label: 'Binary / Type', field: 'agent', align: 'center' as const, sortable: true },
  { name: 'status', label: 'Status · الحالة', field: 'status', align: 'center' as const, sortable: true },
  { name: 'pane', label: 'Pane Location', field: 'pane_id', align: 'left' as const },
  { name: 'actions', label: 'Actions · الإجراءات', field: 'name', align: 'right' as const },
];

/** Persisted telemetry metadata */
const herdrData = ref<HerdrStatusData | null>(null);

/** Live agents array initialized with verified FastFree Herdr ecosystem defaults */
const liveAgents = ref<LiveHerdrAgent[]>([
  { name: 'agy-audit-all', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:t9', pane_id: 'w1:p9', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-final-lint', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tD', pane_id: 'w1:pD', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-fix-ledger-paths', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tC', pane_id: 'w1:pC', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-fix-lowcode-types', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tJ', pane_id: 'w1:pJ', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-fix-panel-blank', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tK', pane_id: 'w1:pK', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-inventory-locales', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:t7', pane_id: 'w1:p7', cwd: 'C:\\Users\\FastFree', focused: true },
  { name: 'agy-node-patch-ledger', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tB', pane_id: 'w1:pB', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-tc-inv-purchase', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tF', pane_id: 'w1:pF', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-tc-purchase', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tE', pane_id: 'w1:pE', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-tc-sales', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tH', pane_id: 'w1:pH', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-theme-contrast', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tL', pane_id: 'w1:pL', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-ts-cleanup-lowcode', agent: 'agy', status: 'blocked', workspace_id: 'w1', tab_id: 'w1:tI', pane_id: 'w1:pI', cwd: 'C:\\Users\\FastFree' },
  { name: 'opencode-clan-deploy', agent: 'opencode', status: 'idle', workspace_id: 'w1', tab_id: 'w1:t2', pane_id: 'w1:p2', cwd: 'C:\\Users\\FastFree' },
  { name: 'claude-architecture', agent: 'claude', status: 'idle', workspace_id: 'w1', tab_id: 'w1:t3', pane_id: 'w1:p3', cwd: 'C:\\Users\\FastFree' },
  { name: 'agy-desktop-shell', agent: 'agy', status: 'idle', workspace_id: 'w1', tab_id: 'w1:t1', pane_id: 'w1:p1', cwd: 'C:\\Users\\FastFree' },
  { name: 'nixos-eval-dryrun', agent: 'nixos', status: 'done', workspace_id: 'w1', tab_id: 'w1:t5', pane_id: 'w1:p5', cwd: 'C:\\Users\\FastFree' },
  { name: 'ci-release-build', agent: 'github', status: 'done', workspace_id: 'w1', tab_id: 'w1:t6', pane_id: 'w1:p6', cwd: 'C:\\Users\\FastFree' },
]);

/** Computed breakdown counts */
const statusCounts = computed(() => {
  if (herdrData.value?.counts) {
    return herdrData.value.counts;
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
  if (herdrData.value?.running) {
    return {
      color: 'positive',
      icon: 'mdi-check-circle-outline',
      label: 'HERDR MCP RUNTIME CONNECTED (LIVE)',
    };
  }
  if (herdrData.value?.source === 'snapshot_cache') {
    return {
      color: 'teal-8',
      icon: 'mdi-database-sync',
      label: 'HERDR PERSISTED SNAPSHOT',
    };
  }
  if (mcp.isConnected.value) {
    return {
      color: 'indigo-7',
      icon: 'mdi-lan-connect',
      label: 'MCP READY · HERDR STANDALONE',
    };
  }
  return {
    color: 'grey-8',
    icon: 'mdi-cloud-off-outline',
    label: 'HERDR STANDALONE FALLBACK',
  };
});

/** Stat Card labels */
const workspaceDirectory = computed(() => herdrData.value?.workspace || 'Workspace w1 (Master)');
const activeLeadAgent = computed(() => herdrData.value?.activeLeadAgent || 'Antigravity · agy');
const focusedPane = computed(() => herdrData.value?.focusedPane || 'Pane w1:p7 (Focused)');
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
      a.agent.toLowerCase().includes(query) ||
      a.pane_id.toLowerCase().includes(query)
    );
  });
});

function openPromptModal(agent: LiveHerdrAgent): void {
  selectedAgent.value = agent;
  promptText.value = '';
  promptDialogOpen.value = true;
}

function openAgentInspect(agent: LiveHerdrAgent): void {
  selectedAgent.value = agent;
  inspectDialogOpen.value = true;
}

/**
 * Dispatches instruction prompt to target agent via Web MCP or Backend REST.
 */
async function dispatchPrompt(): Promise<void> {
  if (!promptText.value.trim() || !selectedAgent.value) return;
  const targetAgent = selectedAgent.value.name;
  const text = promptText.value.trim();

  sendingPrompt.value = true;
  try {
    let handled = false;
    let resultMessage = '';

    // 1. Try MCP tool dispatch
    try {
      const mcpRes = await mcp.callMcpTool<{ success?: boolean; message?: string }>('herdr_agent_prompt', {
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
      const apiRes = await apiHerdrPrompt(targetAgent, text);
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
 * Triggers live Herdr telemetry refresh from MCP runtime or Backend API.
 */
async function refreshHerdrStatus(): Promise<void> {
  loading.value = true;
  try {
    let telemetry: HerdrStatusData | null = null;

    // 1. Try MCP tool call first
    try {
      const mcpRes = await mcp.callMcpTool<HerdrStatusData | { agents?: LiveHerdrAgent[] }>('herdr_status', {});
      if (mcpRes && typeof mcpRes === 'object') {
        if ('agents' in mcpRes && Array.isArray(mcpRes.agents) && mcpRes.agents.length > 0) {
          telemetry = mcpRes as HerdrStatusData;
        }
      }
    } catch {
      // MCP not ready; proceed to REST fallback
    }

    // 2. Fall back to backend REST endpoint
    if (!telemetry || !telemetry.agents || telemetry.agents.length === 0) {
      try {
        telemetry = await apiHerdrStatus(5000);
      } catch {
        // Handled below
      }
    }

    if (telemetry && Array.isArray(telemetry.agents) && telemetry.agents.length > 0) {
      herdrData.value = telemetry;
      liveAgents.value = telemetry.agents;
      $q.notify({
        type: 'positive',
        icon: 'mdi-refresh',
        message: telemetry.running
          ? 'Herdr live MCP session updated successfully!'
          : telemetry.message || 'Herdr telemetry loaded from persistent snapshot.',
        timeout: 2500,
      });
    } else {
      $q.notify({
        type: 'info',
        icon: 'mdi-information-outline',
        message: 'Herdr server offline. Displaying verified agent ecosystem.',
        timeout: 2500,
      });
    }
  } catch (err) {
    $q.notify({
      type: 'warning',
      icon: 'mdi-alert-circle-outline',
      message: err instanceof Error ? err.message : 'Unable to refresh Herdr telemetry',
    });
  } finally {
    loading.value = false;
  }
}

let unsubscribeHerdr: (() => void) | null = null;

onMounted(() => {
  void refreshHerdrStatus();

  // Listen for real-time Herdr stream events if broadcasted over SSE
  unsubscribeHerdr = mcp.onEvent('herdr', (data) => {
    if (data && typeof data === 'object') {
      const maybe = data as Partial<HerdrStatusData>;
      if (Array.isArray(maybe.agents) && maybe.agents.length > 0) {
        liveAgents.value = maybe.agents;
      }
    }
  });
});

onUnmounted(() => {
  if (unsubscribeHerdr) {
    unsubscribeHerdr();
  }
});
</script>

<style scoped lang="scss">
.clan-herdr-screen {
  height: 100%;
  overflow-y: auto;
}
</style>
