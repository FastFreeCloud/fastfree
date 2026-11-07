<template>
  <div class="clan-omnigent-screen q-pa-md" data-source-path="apps/fastfree_panel/src/screens/ClanOmnigentScreen.vue" data-studio-screen="true">
    <!-- Header with Live Omnigent Status & Actions -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h6 text-weight-bold text-white row items-center q-gutter-sm">
          <q-icon name="mdi-sitemap" color="primary" size="28px" />
          <span>Omnigent Meta-Harness & Subagents Studio</span>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Multi-agent orchestration, Hindsight persistent memory, and Human-in-the-Loop governance
        </div>
      </div>

      <div class="row items-center q-gutter-sm">
        <q-btn
          outline
          color="primary"
          icon="mdi-send"
          label="Dispatch Session"
          @click="showDispatchModal = true"
        />
        <q-btn
          round
          flat
          dense
          color="grey-4"
          icon="mdi-refresh"
          :loading="loading"
          @click="loadAllData"
        >
          <q-tooltip>Refresh Telemetry</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Telemetry Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="metric-card bg-dark text-white">
          <q-card-section>
            <div class="text-caption text-grey-5">Omnigent Server</div>
            <div class="text-h6 q-mt-xs row items-center justify-between">
              <span class="text-primary text-weight-bold">Port 8090</span>
              <q-badge color="positive" label="ONLINE" />
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Local Meta-Harness</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="metric-card bg-dark text-white">
          <q-card-section>
            <div class="text-caption text-grey-5">Active Sessions / Subagents</div>
            <div class="text-h6 q-mt-xs row items-center justify-between">
              <span>{{ sessions.length }} Sessions</span>
              <q-badge color="info" :label="`${totalSubagents} Subagents`" />
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Worktree-isolated runners</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="metric-card bg-dark text-white">
          <q-card-section>
            <div class="text-caption text-grey-5">Spend & Token Budget</div>
            <div class="text-h6 q-mt-xs row items-center justify-between">
              <span class="text-warning text-weight-bold">${{ costSummary?.totalCostUsd?.toFixed(4) || '0.0000' }}</span>
              <q-badge color="warning" :label="`${((costSummary?.totalTokens || 0) / 1000).toFixed(1)}k tokens`" />
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Budget Ceiling: $10.00</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="metric-card bg-dark text-white">
          <q-card-section>
            <div class="text-caption text-grey-5">Hindsight Memory Bank</div>
            <div class="text-h6 q-mt-xs row items-center justify-between">
              <span class="text-positive text-weight-bold">fastfree-core</span>
              <q-badge color="positive" label="RETAIN ACTIVE" />
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Secret Sanitizer Engaged</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey-4 bg-dark-subtle rounded-borders q-mb-md"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab name="sessions" icon="mdi-sitemap" label="Sessions & Subagents" />
      <q-tab name="approvals" icon="mdi-shield-check" label="Approvals Gate">
        <q-badge v-if="pendingApprovals.length > 0" color="negative" floating>
          {{ pendingApprovals.length }}
        </q-badge>
      </q-tab>
      <q-tab name="costs" icon="mdi-chart-line" label="Cost & Token Telemetry" />
      <q-tab name="memory" icon="mdi-brain" label="Hindsight Memory Explorer" />
    </q-tabs>

    <!-- Tab 1: Sessions & Subagents Hierarchy -->
    <div v-if="activeTab === 'sessions'">
      <div v-for="sess in sessions" :key="sess.id" class="q-mb-md">
        <q-card flat bordered class="bg-dark text-white">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-subtitle1 text-weight-bold">{{ sess.name }}</div>
              <div class="text-caption text-grey-5 row items-center q-gutter-sm q-mt-xs">
                <span>Supervisor: {{ sess.supervisor }}</span>
                <span>•</span>
                <span>Worktree: <code>{{ sess.worktreePath || 'main' }}</code></span>
                <span>•</span>
                <span>Cost: ${{ sess.totalCostUsd.toFixed(4) }} ({{ (sess.totalTokens / 1000).toFixed(1) }}k tokens)</span>
              </div>
            </div>
            <q-badge :color="sess.status === 'COMPLETED' ? 'positive' : 'info'" :label="sess.status" />
          </q-card-section>

          <q-separator dark />

          <!-- Subagent Tree Table -->
          <q-card-section>
            <div class="text-caption text-grey-4 text-weight-bold q-mb-sm">Coordinated Subagents</div>
            <div class="row q-col-gutter-sm">
              <div v-for="sub in sess.subagents" :key="sub.id" class="col-12 col-md-4">
                <q-card flat bordered class="bg-grey-10 text-white q-pa-sm subagent-card">
                  <div class="row items-center justify-between q-mb-xs">
                    <span class="text-weight-bold text-caption text-primary">{{ sub.name }}</span>
                    <q-badge color="grey-8" :label="sub.model" />
                  </div>
                  <div class="text-caption text-grey-4">{{ sub.role }}</div>
                  <div class="text-caption text-grey-5 q-mt-xs">{{ sub.currentTask }}</div>
                  <div class="row items-center justify-between q-mt-sm text-caption text-grey-6">
                    <span>Status: <b class="text-positive">{{ sub.status }}</b></span>
                    <span>${{ sub.costUsd.toFixed(4) }}</span>
                  </div>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Tab 2: Approvals Gate -->
    <div v-if="activeTab === 'approvals'">
      <q-card flat bordered class="bg-dark text-white">
        <q-card-section>
          <div class="text-h6 text-weight-bold row items-center justify-between">
            <span>Human-In-The-Loop Approval Gates</span>
            <span class="text-caption text-grey-5">Zero execution without operator consent</span>
          </div>
        </q-card-section>

        <q-separator dark />

        <div v-if="pendingApprovals.length === 0" class="q-pa-lg text-center text-grey-5">
          <q-icon name="mdi-check-decagram" size="48px" color="positive" class="q-mb-sm" />
          <div>No pending approval gates. All systems operating within authorized boundaries.</div>
        </div>

        <q-list v-else separator dark>
          <q-item v-for="appr in pendingApprovals" :key="appr.id" class="q-pa-md">
            <q-item-section>
              <div class="row items-center justify-between q-mb-xs">
                <span class="text-weight-bold text-subtitle2">{{ appr.title }}</span>
                <q-badge color="warning" :label="appr.tier" />
              </div>
              <div class="text-caption text-grey-4 q-mb-xs">{{ appr.description }}</div>
              <div v-if="appr.command" class="q-mt-xs">
                <code>{{ appr.command.join(' ') }}</code>
              </div>
              <div v-if="appr.diff" class="q-mt-xs q-pa-sm bg-black rounded-borders text-caption font-mono">
                <pre class="q-ma-none text-grey-4">{{ appr.diff }}</pre>
              </div>
            </q-item-section>

            <q-item-section side class="row items-center q-gutter-sm">
              <q-btn
                color="positive"
                dense
                icon="mdi-check"
                label="Approve"
                @click="decideApproval(appr.id, 'APPROVE')"
              />
              <q-btn
                color="negative"
                outline
                dense
                icon="mdi-close"
                label="Reject"
                @click="decideApproval(appr.id, 'REJECT')"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>

    <!-- Tab 3: Cost & Token Telemetry -->
    <div v-if="activeTab === 'costs'">
      <q-card flat bordered class="bg-dark text-white q-pa-md">
        <div class="text-h6 text-weight-bold q-mb-md">Model Breakdown & Financial Telemetry</div>
        <div v-if="costSummary?.modelBreakdown" class="row q-col-gutter-md">
          <div
            v-for="(data, modelName) in costSummary.modelBreakdown"
            :key="modelName"
            class="col-12 col-sm-6 col-md-3"
          >
            <q-card flat bordered class="bg-grey-10 text-white q-pa-sm">
              <div class="text-weight-bold text-primary">{{ modelName }}</div>
              <div class="text-caption text-grey-5 q-mt-xs">
                Tokens: {{ (data.tokens / 1000).toFixed(1) }}k
              </div>
              <div class="text-subtitle2 text-weight-bold text-warning q-mt-xs">
                ${{ data.costUsd.toFixed(4) }}
              </div>
            </q-card>
          </div>
        </div>
      </q-card>
    </div>

    <!-- Tab 4: Hindsight Memory Explorer -->
    <div v-if="activeTab === 'memory'">
      <q-card flat bordered class="bg-dark text-white q-pa-md">
        <div class="text-h6 text-weight-bold q-mb-sm">Hindsight Long-Term Memory Explorer</div>
        <div class="text-caption text-grey-5 q-mb-md">
          Query cross-session memories across World Facts, Agent Experiences, Entity Summaries, and Evolving Beliefs.
        </div>

        <div class="row q-gutter-sm q-mb-md">
          <q-input
            v-model="memorySearchQuery"
            dark
            outlined
            dense
            placeholder="Type a semantic query (e.g. NixOS Clan topology, LowCode composables)..."
            class="col"
            @keyup.enter="searchMemory"
          />
          <q-btn color="primary" label="Recall Memory" icon="mdi-brain" @click="searchMemory" />
        </div>

        <div v-if="memoryResults" class="q-mt-md">
          <div v-if="memoryResults.redacted" class="q-mb-sm">
            <q-banner dense class="bg-warning text-black rounded-borders">
              Secret Filter Active: Potentially sensitive tokens were sanitized before memory lookup.
            </q-banner>
          </div>

          <div class="row q-col-gutter-sm">
            <div v-for="res in memoryResults.results" :key="res.id" class="col-12 col-md-6">
              <q-card flat bordered class="bg-grey-10 text-white q-pa-sm">
                <div class="row items-center justify-between q-mb-xs">
                  <q-badge color="primary" :label="res.stratum" />
                  <span class="text-caption text-grey-6">Confidence: {{ (res.confidence * 100).toFixed(0) }}%</span>
                </div>
                <div class="text-caption text-grey-3 q-mt-xs">{{ res.content }}</div>
                <div class="text-caption text-grey-6 q-mt-xs">{{ new Date(res.timestamp).toLocaleDateString() }}</div>
              </q-card>
            </div>
          </div>
        </div>
      </q-card>
    </div>

    <!-- Dispatch Session Modal -->
    <q-dialog v-model="showDispatchModal">
      <q-card dark class="bg-dark text-white" style="min-width: 500px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Dispatch Omnigent Multi-Agent Session</div>
          <div class="text-caption text-grey-5">
            Will spawn supervisor and coordinated subagents in an isolated worktree.
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="dispatchPrompt"
            dark
            outlined
            type="textarea"
            rows="4"
            label="Mission Prompt & Architectural Goal"
            placeholder="e.g. Audit accounting package, run vue-tsc, and retain LowCode invariants..."
          />
          <div>
            <div class="text-caption text-grey-5 q-mb-xs">Session Budget Ceiling: ${{ dispatchBudget }} USD</div>
            <q-slider v-model="dispatchBudget" :min="1" :max="25" :step="1" label color="primary" />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-5" v-close-popup />
          <q-btn color="primary" label="Dispatch Now" :loading="dispatching" @click="dispatchNewSession" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import {
  apiOmnigentSessions,
  apiOmnigentDispatch,
  apiPendingApprovals,
  apiDecideApproval,
  apiCostSummary,
  apiHindsightQuery,
  type OmnigentSession,
  type PendingApproval,
  type CostSummaryData,
  type HindsightQueryResult,
} from '../lib/api';

const $q = useQuasar();

const loading = ref(false);
const activeTab = ref('sessions');

const sessions = ref<OmnigentSession[]>([]);
const pendingApprovals = ref<PendingApproval[]>([]);
const costSummary = ref<CostSummaryData | null>(null);

const showDispatchModal = ref(false);
const dispatchPrompt = ref('');
const dispatchBudget = ref(10);
const dispatching = ref(false);

const memorySearchQuery = ref('');
const memoryResults = ref<HindsightQueryResult | null>(null);

const totalSubagents = computed(() => {
  return sessions.value.reduce((acc, s) => acc + (s.subagents?.length || 0), 0);
});

async function loadAllData(): Promise<void> {
  loading.value = true;
  try {
    const [sessRes, apprRes, costRes] = await Promise.all([
      apiOmnigentSessions().catch(() => ({ sessions: [] })),
      apiPendingApprovals().catch(() => ({ approvals: [] })),
      apiCostSummary().catch(() => null),
    ]);
    sessions.value = sessRes.sessions;
    pendingApprovals.value = apprRes.approvals;
    costSummary.value = costRes;
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to fetch Omnigent telemetry',
    });
  } finally {
    loading.value = false;
  }
}

async function decideApproval(id: string, decision: 'APPROVE' | 'REJECT'): Promise<void> {
  try {
    await apiDecideApproval(id, decision);
    $q.notify({
      type: 'positive',
      message: `Approval request ${decision === 'APPROVE' ? 'Approved' : 'Rejected'} successfully!`,
    });
    void loadAllData();
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Decision registration failed',
    });
  }
}

async function dispatchNewSession(): Promise<void> {
  if (!dispatchPrompt.value.trim()) return;
  dispatching.value = true;
  try {
    const created = await apiOmnigentDispatch(dispatchPrompt.value, dispatchBudget.value);
    $q.notify({
      type: 'positive',
      message: `Session "${created.name}" dispatched successfully!`,
    });
    showDispatchModal.value = false;
    dispatchPrompt.value = '';
    void loadAllData();
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to dispatch session',
    });
  } finally {
    dispatching.value = false;
  }
}

async function searchMemory(): Promise<void> {
  if (!memorySearchQuery.value.trim()) return;
  try {
    memoryResults.value = await apiHindsightQuery(memorySearchQuery.value);
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Memory recall failed',
    });
  }
}

onMounted(() => {
  void loadAllData();
  void searchMemory(); // pre-load initial memory items
});
</script>

<style scoped>
.clan-omnigent-screen {
  color: #fff;
}
.metric-card {
  border-radius: 8px;
  background-color: #121214 !important;
  border-color: #27272a;
}
.subagent-card {
  border-radius: 6px;
  border-color: #3f3f46;
}
.bg-dark-subtle {
  background-color: #18181b;
}
.font-mono {
  font-family: monospace;
}
</style>
