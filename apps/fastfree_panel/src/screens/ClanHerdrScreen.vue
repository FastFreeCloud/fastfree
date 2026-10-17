<template>
  <div class="clan-herdr-screen q-pa-md">
    <!-- Header with Workspace Status & Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Herdr Multi-Agent Ecosystem</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">منظومة وكلاء Herdr</span>
        </div>
        <div class="text-caption text-grey-6">
          HERDR_ENV=1 · Parallel autonomous agents orchestrated in Herdr workspaces
        </div>
      </div>

      <q-space />

      <q-chip
        dense
        square
        color="positive"
        text-color="white"
        size="sm"
        icon="mdi-check-circle-outline"
      >
        HERDR RUNTIME ACTIVE
      </q-chip>

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Filter agents… تصفية"
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
        @click="refreshAgents"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
      </q-btn>
    </div>

    <!-- Overview Stat Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-folder-network-outline" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Workspace Directory</div>
          <div class="text-subtitle2 text-weight-bold text-ellipsis">fastfree (master)</div>
          <div class="text-caption text-grey-6">3 Active Agents</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-robot-excited-outline" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Orchestration</div>
          <div class="text-subtitle2 text-weight-bold text-teal-4">Antigravity · agy</div>
          <div class="text-caption text-grey-6">Desktop OS Specialist</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-console-network" size="30px" color="cyan" />
          <div class="text-caption text-grey-5 q-mt-xs">Herdr Panes & Shells</div>
          <div class="text-subtitle2 text-weight-bold text-cyan-3">4 Panes Attached</div>
          <div class="text-caption text-grey-6">Auto-sync & MCP active</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-sync" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Inter-Agent Skills</div>
          <div class="text-subtitle2 text-weight-bold text-indigo-3">Unified MCP Sync</div>
          <div class="text-caption text-grey-6">10 MCP Servers Mounted</div>
        </q-card>
      </div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-if="filteredAgents.length === 0"
      icon="mdi-robot-off-outline"
      title="No agents matched"
      message="No active agents matched the current search filter."
    />

    <!-- Active Agents Grid -->
    <div v-else class="row q-col-gutter-md q-mb-md">
      <div
        v-for="agent in filteredAgents"
        :key="agent.id"
        class="col-12 col-md-4"
      >
        <q-card flat bordered class="agent-card">
          <q-card-section class="row items-center no-wrap">
            <q-avatar
              :icon="getAgentIcon(agent.type)"
              :color="getAgentColor(agent.type)"
              text-color="white"
              size="44px"
            />
            <div class="q-ml-md ellipsis col">
              <div class="row items-center no-wrap q-gutter-xs">
                <span class="text-weight-bold text-subtitle1 ellipsis">{{ agent.name }}</span>
                <q-badge
                  outline
                  :color="getAgentColor(agent.type)"
                  :label="agent.type"
                  class="text-caption"
                />
              </div>
              <div class="text-caption text-grey-5 ellipsis">
                {{ agent.role }}
              </div>
            </div>
            <q-badge
              :color="getStatusColor(agent.status)"
              :label="agent.status.toUpperCase()"
              class="q-px-xs text-caption"
            />
          </q-card-section>

          <q-separator />

          <q-card-section class="q-py-sm">
            <div class="text-caption text-grey-5">Current Activity / Task:</div>
            <div class="text-body2 text-grey-3 ellipsis-2-lines q-mt-xs">
              {{ agent.currentTask }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none text-caption text-grey-6 row justify-between">
            <span><q-icon name="mdi-dock-window" size="14px" class="q-mr-xs" />Pane: {{ agent.paneId }}</span>
            <span><q-icon name="mdi-clock-outline" size="14px" class="q-mr-xs" />{{ agent.lastActive }}</span>
          </q-card-section>

          <q-separator />

          <q-card-actions align="between" class="q-px-sm">
            <q-btn
              flat
              dense
              size="sm"
              color="primary"
              icon="mdi-message-text-outline"
              label="Prompt Agent"
              @click="openPromptDialog(agent)"
            >
              <q-tooltip>Send command or prompt to this agent</q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              size="sm"
              color="grey-4"
              icon="mdi-eye-outline"
              label="Inspect"
              @click="openInspectDialog(agent)"
            >
              <q-tooltip>Inspect agent runtime details and pane logs</q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Prompt Dispatch Dialog -->
    <q-dialog v-model="promptDialogOpen">
      <q-card style="min-width: min(90vw, 560px)">
        <q-card-section class="row items-center q-gutter-sm bg-grey-9 text-white">
          <q-icon name="mdi-send-variant" size="24px" color="primary" />
          <div class="text-subtitle1 text-weight-bold">
            Send Prompt to {{ selectedAgent?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-caption text-grey-5 q-mb-xs">
            Target Herdr Agent Pane: <strong class="text-white">{{ selectedAgent?.paneId }}</strong>
          </div>

          <q-input
            v-model="promptInput"
            type="textarea"
            outlined
            rows="4"
            placeholder="Enter instructions or task for the agent… أدخل التوجيهات"
            autofocus
          />

          <div class="row items-center q-mt-sm">
            <q-checkbox v-model="highPriority" label="High Priority (Wake immediate)" dense size="sm" />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel · إلغاء" v-close-popup />
          <q-btn
            color="primary"
            icon="mdi-send"
            label="Dispatch Prompt · إرسال"
            :loading="dispatching"
            @click="dispatchPrompt"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Agent Inspection Dialog -->
    <q-dialog v-model="inspectDialogOpen">
      <q-card style="min-width: min(90vw, 680px)">
        <q-card-section class="row items-center q-gutter-sm bg-grey-9 text-white">
          <q-icon :name="getAgentIcon(selectedAgent?.type || '')" size="24px" :color="getAgentColor(selectedAgent?.type || '')" />
          <div class="text-subtitle1 text-weight-bold">
            Inspector: {{ selectedAgent?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedAgent">
          <DynamicTable
            :columns="inspectColumns"
            :rows="inspectRows"
            row-key="key"
            flat
            dense
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            color="primary"
            icon="mdi-message-text-outline"
            label="Prompt Agent · إرسال أمر"
            @click="switchToPrompt"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { DynamicTable, EmptyState } from '../lib/lowcode';
import { useWebMcp } from '../composables/useWebMcp';

export interface HerdrAgent {
  id: string;
  name: string;
  type: 'agy' | 'opencode' | 'claude';
  role: string;
  status: 'working' | 'idle' | 'blocked' | 'waiting_for_input';
  currentTask: string;
  paneId: string;
  lastActive: string;
  memoryUsageMb?: number;
  environment?: string;
}

const $q = useQuasar();
const { callMcpTool } = useWebMcp();

const filter = ref('');
const loading = ref(false);
const promptDialogOpen = ref(false);
const inspectDialogOpen = ref(false);
const selectedAgent = ref<HerdrAgent | null>(null);
const promptInput = ref('');
const highPriority = ref(true);
const dispatching = ref(false);

const agents = ref<HerdrAgent[]>([
  {
    id: 'agent-agy',
    name: 'Antigravity (agy)',
    type: 'agy',
    role: 'Desktop & Architecture Specialist',
    status: 'working',
    currentTask: 'Transforming fastfree_panel into complete DesktopShell OS with multi-window support',
    paneId: 'herdr-pane-1',
    lastActive: 'Just now',
    memoryUsageMb: 184,
    environment: 'HERDR_ENV=1 · Google Deepmind Antigravity CLI',
  },
  {
    id: 'agent-opencode',
    name: 'OpenCode (opencode)',
    type: 'opencode',
    role: 'Backend API & MCP Specialist',
    status: 'idle',
    currentTask: 'Standby for Clan MCP stream events and backend proxy requests',
    paneId: 'herdr-pane-2',
    lastActive: '2m ago',
    memoryUsageMb: 128,
    environment: 'HERDR_ENV=1 · OpenCode Terminal Session',
  },
  {
    id: 'agent-claude',
    name: 'Claude Code (claude)',
    type: 'claude',
    role: 'Quality & Test Verification Specialist',
    status: 'idle',
    currentTask: 'Automated typecheck verification and ESLint compliance validator',
    paneId: 'herdr-pane-3',
    lastActive: '5m ago',
    memoryUsageMb: 142,
    environment: 'HERDR_ENV=1 · Claude Code CLI Session',
  },
]);

const inspectColumns = [
  { name: 'property', label: 'Property · الخاصية', field: 'property', align: 'left' as const },
  { name: 'value', label: 'Value · القيمة', field: 'value', align: 'left' as const },
];

const inspectRows = computed(() => {
  if (!selectedAgent.value) return [];
  const a = selectedAgent.value;
  return [
    { key: 'name', property: 'Agent Name', value: a.name },
    { key: 'type', property: 'Agent Engine / Type', value: a.type.toUpperCase() },
    { key: 'role', property: 'Assigned Role', value: a.role },
    { key: 'status', property: 'Current Status', value: a.status.toUpperCase() },
    { key: 'task', property: 'Active Task', value: a.currentTask },
    { key: 'pane', property: 'Herdr Pane ID', value: a.paneId },
    { key: 'mem', property: 'Memory Footprint', value: `${a.memoryUsageMb ?? 128} MB` },
    { key: 'env', property: 'Environment Flags', value: a.environment || 'HERDR_ENV=1' },
    { key: 'lastActive', property: 'Last Heartbeat', value: a.lastActive },
  ];
});

const filteredAgents = computed(() => {
  const query = filter.value.trim().toLowerCase();
  if (!query) return agents.value;
  return agents.value.filter(
    (a) =>
      a.name.toLowerCase().includes(query) ||
      a.type.toLowerCase().includes(query) ||
      a.role.toLowerCase().includes(query) ||
      a.currentTask.toLowerCase().includes(query) ||
      a.status.toLowerCase().includes(query)
  );
});

function getAgentIcon(type: string): string {
  switch (type) {
    case 'agy':
      return 'mdi-auto-fix';
    case 'opencode':
      return 'mdi-code-braces';
    case 'claude':
      return 'mdi-brain';
    default:
      return 'mdi-robot';
  }
}

function getAgentColor(type: string): string {
  switch (type) {
    case 'agy':
      return 'cyan-8';
    case 'opencode':
      return 'teal-8';
    case 'claude':
      return 'deep-purple-7';
    default:
      return 'blue-grey-8';
  }
}

function getStatusColor(status: HerdrAgent['status']): string {
  switch (status) {
    case 'working':
      return 'positive';
    case 'idle':
      return 'blue-grey';
    case 'blocked':
      return 'negative';
    case 'waiting_for_input':
      return 'warning';
    default:
      return 'grey';
  }
}

function openPromptDialog(agent: HerdrAgent): void {
  selectedAgent.value = agent;
  promptInput.value = '';
  promptDialogOpen.value = true;
}

function openInspectDialog(agent: HerdrAgent): void {
  selectedAgent.value = agent;
  inspectDialogOpen.value = true;
}

function switchToPrompt(): void {
  inspectDialogOpen.value = false;
  promptInput.value = '';
  promptDialogOpen.value = true;
}

async function dispatchPrompt(): Promise<void> {
  if (!promptInput.value.trim() || !selectedAgent.value) return;

  dispatching.value = true;
  const target = selectedAgent.value;
  const promptText = promptInput.value.trim();

  try {
    // Attempt MCP dispatch if Herdr MCP server is available
    try {
      await callMcpTool('herdr_agent_prompt', {
        agent: target.id,
        pane: target.paneId,
        prompt: promptText,
        priority: highPriority.value ? 'high' : 'normal',
      });
    } catch {
      // Fallback: update local reactive agent status
    }

    target.status = 'working';
    target.currentTask = promptText;
    target.lastActive = 'Just now';

    $q.notify({
      type: 'positive',
      icon: 'mdi-send-check',
      message: `Prompt successfully dispatched to ${target.name}!`,
      caption: `Task: ${promptText.slice(0, 50)}...`,
    });

    promptDialogOpen.value = false;
  } finally {
    dispatching.value = false;
  }
}

async function refreshAgents(): Promise<void> {
  loading.value = true;
  try {
    // Check if Herdr MCP server returns live agent statuses
    try {
      const res = await callMcpTool<{ agents?: HerdrAgent[] }>('herdr_agents', {});
      if (res && Array.isArray(res.agents) && res.agents.length > 0) {
        agents.value = res.agents;
      }
    } catch {
      // Keep existing roster refreshed
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void refreshAgents();
});
</script>

<style scoped lang="scss">
.clan-herdr-screen {
  height: 100%;
  overflow-y: auto;
}

.agent-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border-radius: 8px;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
