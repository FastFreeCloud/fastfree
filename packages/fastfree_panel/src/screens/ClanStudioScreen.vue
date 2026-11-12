<template>
  <div class="design-studio-screen fit column q-pa-md overflow-hidden" data-source-path="packages/fastfree_panel/src/screens/ClanStudioScreen.vue" data-studio-screen="true">    <!-- Header -->
    <div class="row items-center justify-between q-mb-md no-wrap">
      <div>
        <div class="text-h6 text-weight-bold text-white row items-center q-gutter-sm no-wrap">
          <q-icon name="mdi-creation-outline" color="cyan" size="26px" />
          <span>FastFree Design Studio · استوديو التصميم الذكي</span>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Natural-language design requests executed by OpenCode inside an isolated worktree — human review required before merge
        </div>
      </div>
      <div class="row items-center q-gutter-sm no-wrap">
        <q-badge v-if="health" :color="health.opencode ? 'positive' : 'warning'" outline class="q-px-sm q-py-xs">
          <q-icon :name="health.opencode ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'" size="13px" class="q-mr-xs" />
          {{ health.opencode ? 'OpenCode CLI ✓' : 'OpenCode Offline' }}
          <q-tooltip>المزوّد نفسه لازم حصة سارية (OpenCode Go) — لو خلق «Free usage limit» انتظر التجديد أو أضف مزود.</q-tooltip>
        </q-badge>
        <q-btn flat round dense icon="mdi-refresh" :loading="loadingProbe" color="grey-4" @click="probe" />
      </div>
    </div>

    <!-- Honest guard banner: never auto-merge -->
    <q-banner rounded dense class="q-mb-md bg-warning text-dark row items-center">
      <template #avatar>
        <q-icon name="mdi-shield-check-outline" />
      </template>
      كل التعديلات تُنفذ في worktree معزول للمراجعة البشرية — لا يحدث أي دمج أو push تلقائي أبداً.
    </q-banner>

    <!-- Live Omnigent Server — REAL probe result, never mocked -->
    <q-card flat bordered class="q-mb-md bg-blue-grey-10 text-white">
      <q-card-section class="row items-center justify-between no-wrap q-py-sm">
        <div class="row items-center q-gutter-sm">
          <q-icon name="mdi-server-network" color="cyan" size="20px" />
          <div>
            <div class="text-caption text-grey-5">Omnigent Local Server (Live)</div>
            <div class="text-caption">
              <q-badge :color="omnigent?.reachable ? 'positive' : 'warning'" outline>
                {{ omnigent?.reachable ? 'LIVE' : (omnigent ? 'UNREACHABLE' : 'probing…') }}
              </q-badge>
              <span class="q-ml-sm text-grey-6" dir="ltr">{{ omnigent?.baseUrl ?? 'http://127.0.0.1:6767' }}</span>
            </div>
          </div>
        </div>
        <q-btn flat dense round icon="mdi-refresh" :loading="loadingOmnigent" size="sm" @click="loadOmnigentStatus" />
      </q-card-section>
      <q-card-section v-if="omnigent" class="q-pt-none q-pb-sm">
        <div v-if="omnigent.reachable" class="row q-col-gutter-sm text-center">
          <div class="col-4 col-sm-2">
            <div class="text-subtitle2 text-cyan">{{ omnigent.singleUser ? 'Single' : 'Multi' }}</div>
            <div class="text-caption text-grey-5">user mode</div>
          </div>
          <div class="col-4 col-sm-2">
            <div class="text-subtitle2 text-cyan">v{{ omnigent.serverVersion ?? '?' }}</div>
            <div class="text-caption text-grey-5">server</div>
          </div>
          <div class="col-4 col-sm-2">
            <div class="text-subtitle2 text-cyan">{{ omnigent.agentCount }}</div>
            <div class="text-caption text-grey-5">agents</div>
          </div>
          <div class="col-4 col-sm-2">
            <div class="text-subtitle2 text-cyan">{{ omnigent.harnessCount }}</div>
            <div class="text-caption text-grey-5">harnesses</div>
          </div>
          <div class="col-4 col-sm-2">
            <div class="text-subtitle2 text-cyan">{{ omnigent.sessionCount ?? '—' }}</div>
            <div class="text-caption text-grey-5">sessions</div>
          </div>
          <div class="col-4 col-sm-2">
            <div class="text-subtitle2 text-cyan">${{ omnigent.usage?.totalCostUsd?.toFixed(2) ?? '0.00' }}</div>
            <div class="text-caption text-grey-5">usage</div>
          </div>
        </div>
        <div v-else class="text-caption text-warning">الخادم غير قابل للوصول — شغله عبر: omnigent server --background --no-open</div>
      </q-card-section>
    </q-card>

    <div class="row col q-col-gutter-md overflow-hidden min-h-0">
      <!-- LEFT: dispatch console -->
      <div class="col-12 col-md-5 column min-h-0">
        <q-card flat bordered class="bg-dark text-white column col min-h-0">
          <q-card-section class="q-pb-sm row items-center justify-between">
            <div class="text-subtitle2 text-cyan">1) وصف الطلب · Design Request</div>
            <q-badge v-if="activeTask" color="info" outline>
              <q-spinner-dots size="14px" class="q-mr-xs" /> {{ activeTask.phase }}
            </q-badge>
          </q-card-section>

          <q-card-section class="q-pt-none column col min-h-0">
            <q-input
              v-model="title"
              dense
              outlined
              dark
              class="q-mb-sm"
              placeholder="عنوان المهمة (اختياري) · Task title"
              maxlength="120"
            />

            <q-input
              v-model="prompt"
              dense
              outlined
              dark
              type="textarea"
              autogrow
              class="studio-prompt"
              placeholder="مثال: أعد تصميم هيكل رأس شاشة الأجهزة في ClanMachinesScreen.vue مع الحفاظ على RTL والأداء، وحافظ على كل واجهات الـ props الحالية."
              maxlength="4000"
              counter
            />

            <div class="q-mt-sm row q-gutter-xs">
              <q-chip
                v-for="preset in PRESETS"
                :key="preset.label"
                clickable
                outline
                color="cyan"
                text-color="cyan"
                size="sm"
                @click="prompt = preset.prompt"
              >
                {{ preset.label }}
              </q-chip>
            </div>

            <q-input
              v-model="target"
              dense
              outlined
              dark
              class="q-mt-sm"
              label="الملف المستهدف (ضمن المونوريبو) · Target file"
              placeholder="src/screens/ClanMachinesScreen.vue"
              hint="Optional — the agent reads it before editing."
            />

            <div class="row q-gutter-sm q-mt-md">
              <q-btn
                unelevated
                color="cyan"
                text-color="grey-10"
                icon="mdi-rocket-launch"
                :label="$q.lang.isoName === 'ar' ? 'تنفيذ المهمة في worktree معزول' : 'Run in isolated worktree'"
                :loading="inFlight"
                :disable="!prompt.trim() || (health ? !health.opencode : false)"
                class="col"
                @click="dispatch"
              />
              <q-btn
                v-if="activeTask"
                flat
                color="negative"
                icon="mdi-stop-circle-outline"
                label="إلغاء"
                :loading="cancelLoading"
                @click="cancelActive"
              />
            </div>

            <div class="row q-gutter-sm q-mt-md items-center">
              <q-btn
                flat
                outline
                color="cyan"
                :icon="inspectorOn ? 'mdi-eye-off-outline' : 'mdi-inspect'"
                :label="inspectorOn ? 'إيقاف المفتش البصري' : 'وضع المفتش · اضغط على أي عنصر في الواجهة'"
                dense
                @click="toggleInspector"
              />
            </div>

            <q-card v-if="inspected" flat bordered class="q-mt-xs bg-blue-grey-10 q-pa-sm">
              <div class="row items-center q-gutter-xs no-wrap">
                <q-icon name="mdi-crosshairs-gps" color="cyan" size="18px" />
                <div class="text-caption text-cyan text-weight-bold">Visual Inspector · المفتش البصري</div>
                <q-space />
                <q-btn flat dense round icon="mdi-close" size="sm" @click="inspected = null" />
              </div>
              <div class="text-caption text-grey-4 q-mt-xs">&lt;{{ inspected.tagName }}&gt; — {{ inspected.classes.split(' ').filter(Boolean).slice(0, 3).join(' · ') || 'بدون classes' }}</div>
              <div class="text-caption text-grey-2 q-mt-xs" dir="ltr" style="text-align:left; word-break:break-all">{{ inspected.sourcePath ?? 'العنصر غير مربوط بشاشة مسجلة' }}</div>
              <div class="row items-center q-gutter-xs q-mt-sm">
                <q-btn flat dense color="cyan" icon="mdi-file-tree-outline" label="استهدف هذا الملف" @click="adoptInspectedTarget" />
                <q-btn flat dense color="grey-4" icon="mdi-content-copy" label="نسخ المسار" @click="copyInspectedPath" />
              </div>
            </q-card>

            <q-banner v-if="health && !health.opencode" dense class="q-mt-md bg-negative text-white" rounded>
              <template #avatar><q-icon name="mdi-alert-circle-outline" /></template>
              OpenCode CLI غير متوفر في بيئة الـ Backend — نفّذ <code>opencode --version</code> للتحقق.
            </q-banner>
          </q-card-section>
        </q-card>
      </div>

      <!-- RIGHT: history + live execution log -->
      <div class="col-12 col-md-7 column min-h-0">
        <q-card flat bordered class="bg-dark text-white col column min-h-0">
          <q-card-section class="row items-center justify-between q-pb-sm">
            <div class="text-subtitle2 text-cyan">2) سجل التنفيذ الحي · Execution Log</div>
            <div class="row q-gutter-xs items-center">
              <q-btn flat dense round icon="mdi-content-copy" color="grey-4">
                <q-tooltip>انسخ أمر التنفيذ للصق يدوياً (bash)</q-tooltip>
                <q-menu>
                  <q-list dense>
                    <q-item clickable v-close-popup @click="copyAttachCommand">
                      <q-item-section>انسخ أمر OpenCode اليدوي</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="copyDiffCommand">
                      <q-item-section>انسخ أمر git diff للـ worktree</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
              <q-btn flat dense round icon="mdi-delete-outline" color="grey-4" :disable="!selectedTask || selectedTask.status === 'running'" @click="discardSelected">
                <q-tooltip>حذف الـ worktree (لا يسترجع التعديلات)</q-tooltip>
              </q-btn>
            </div>
          </q-card-section>

          <!-- Tasks strip -->
          <q-card-section class="q-py-sm">
            <div class="row q-gutter-xs wrap">
              <q-chip
                v-for="task in tasks"
                :key="task.id"
                clickable
                :outline="selectedTaskId !== task.id"
                :color="taskChipColor(task.status)"
                text-color="white"
                @click="selectedTaskId = task.id"
              >
                <q-icon :name="taskChipIcon(task.status)" size="15px" class="q-mr-xs" />
                <span class="ellipsis" style="max-width: 180px">{{ task.title }}</span>
              </q-chip>
              <div v-if="tasks.length === 0" class="text-caption text-grey-6 q-pa-sm">
                لا توجد مهام بعد — أرسل أول طلب من العمود الأيسر.
              </div>
            </div>
          </q-card-section>

          <q-separator dark />

          <!-- Selected task detail -->
          <q-card-section class="col column min-h-0 overflow-auto">
            <template v-if="selectedTask">
              <div class="row items-center q-gutter-md q-mb-xs">
                <q-badge :color="taskChipColor(selectedTask.status)" class="q-py-xs q-px-sm text-uppercase">
                  {{ selectedTask.status }}
                </q-badge>
                <span class="text-caption text-grey-5 ellipsis">{{ selectedTask.id }}</span>
                <q-space />
                <span class="text-caption text-grey-6">{{ elapsed(selectedTask) }}</span>
              </div>
              <div class="text-caption text-grey-4 q-mb-sm">{{ selectedTask.phase }}</div>

              <div class="text-caption text-grey-5">Worktree</div>
              <code class="block text-cyan q-mb-sm studio-worktree">{{ selectedTask.worktreePath }}</code>

              <div class="row items-center justify-between q-mb-xs">
                <div class="text-caption text-grey-5">ملفات معدلة (git diff)</div>
                <q-chip dense size="sm" color="grey-9" text-color="grey-4">
                  {{ selectedTask.changedFiles.length }} ملف
                </q-chip>
              </div>
              <div v-if="selectedTask.changedFiles.length" class="row q-gutter-xs wrap q-mb-sm">
                <q-chip v-for="file in selectedTask.changedFiles" :key="file" dense size="sm" color="blue-grey-9" text-color="blue-grey-2">{{ file }}</q-chip>
              </div>
              <div v-else class="text-caption text-grey-6 q-mb-sm">لا توجد اختلافات حتى الآن — المنفذ ما زال يعمل أو فشل قبل أي تحرير.</div>

              <div class="text-caption text-grey-5 q-mb-xs">Log tail</div>
              <pre class="studio-log col min-h-0">{{ selectedTask.logTail.join('\n') || '…اتصال بالـ Backend Desktop…' }}</pre>

              <div v-if="selectedTask.diffStat" class="text-caption text-grey-5 q-mt-sm q-mb-xs">git diff --stat</div>
              <pre v-if="selectedTask.diffStat" class="studio-log studio-diff">{{ selectedTask.diffStat }}</pre>

              <q-banner v-if="selectedTask.status === 'succeeded'" class="q-mt-sm bg-positive text-dark" rounded dense>
                <template #avatar><q-icon name="mdi-check-circle-outline" /></template>
                اكتمل التنفيذ — راجع الـ diff، ثم ادمج يدوياً بعد المراجعة (لا دمج تلقائي).
              </q-banner>
              <q-banner v-if="selectedTask.status === 'failed'" class="q-mt-sm bg-negative text-white" rounded dense>
                <template #avatar><q-icon name="mdi-alert-circle-outline" /></template>
                فشل التنفيذ: {{ selectedTask.error ?? 'سبب غير معروف — راجع سجل التنفيذ.' }}
              </q-banner>
            </template>
            <div v-else class="column items-center justify-center col text-grey-6">
              <q-icon name="mdi-creation" size="48px" color="grey-8" />
              <div class="text-subtitle2 q-mt-sm">اختر مهمة لعرض تفاصيل تنفيذها</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import {
  apiStudioCancel,
  apiStudioDispatch,
  apiStudioDiscard,
  apiStudioHealth,
  apiStudioOmnigentStatus,
  apiStudioTasks,
  type StudioHealthData,
  type StudioOmnigentStatus,
  type StudioTaskView,
} from '../lib/api';
import {
  disableInspector,
  enableInspector,
  isInspectorEnabled,
  type StudioInspection,
} from '../studio/inspector';

const $q = useQuasar();

const health = ref<StudioHealthData | null>(null);
const omnigent = ref<StudioOmnigentStatus | null>(null);
const loadingProbe = ref(false);
const loadingOmnigent = ref(false);
const inFlight = ref(false);
const cancelLoading = ref(false);
const prompt = ref('');
const title = ref('');
const target = ref('src/screens/ClanMachinesScreen.vue');
const tasks = ref<StudioTaskView[]>([]);
const selectedTaskId = ref<string | null>(null);
const inspected = ref<StudioInspection | null>(null);
const inspectorOn = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const PRESETS = [
  { label: 'إعادة تصميم الواجهة', prompt: 'Redesign the visual structure of src/screens/ClanMachinesScreen.vue with a modern, professional enterprise layout (cards, spacing, hierarchy) while preserving every existing prop, emit, function name, and RTL behavior. Keep the diff minimal and focused on template/styles only where possible.' },
  { label: 'تنسيق RTL + تايبوع', prompt: 'Audit and fix RTL alignment, logical properties and typography in the target screen. Do not change logic. Report exactly which files changed.' },
  { label: 'تحسين الأداء', prompt: 'Optimize rendering performance of the target screen (computed memoization, stable identities, remove redundant watchers) without changing behavior. Preserve the public component API.' },
  { label: 'مراجعة + إصلاح الأخطاء', prompt: 'Review the target file for bugs, incorrect Arabic copy, unhandled errors and accessibility gaps, then fix them minimally. Keep the component API stable.' },
];

const selectedTask = computed<StudioTaskView | null>(() => tasks.value.find((task) => task.id === selectedTaskId.value) ?? null);
const activeTask = computed<StudioTaskView | null>(() => tasks.value.find((task) => task.status === 'queued' || task.status === 'running') ?? null);

function taskChipColor(status: StudioTaskView['status']): string {
  switch (status) {
    case 'running':
    case 'queued':
      return 'cyan-8';
    case 'succeeded':
      return 'positive';
    case 'failed':
      return 'negative';
    case 'cancelled':
      return 'grey-7';
    default:
      return 'grey-8';
  }
}

function taskChipIcon(status: StudioTaskView['status']): string {
  switch (status) {
    case 'queued':
      return 'mdi-timer-sand';
    case 'running':
      return 'mdi-progress-wrench';
    case 'succeeded':
      return 'mdi-check-circle-outline';
    case 'failed':
      return 'mdi-alert-circle-outline';
    case 'cancelled':
      return 'mdi-cancel';
    default:
      return 'mdi-help-circle-outline';
  }
}

function elapsed(task: StudioTaskView): string {
  const from = new Date(task.startedAt ?? task.createdAt).getTime();
  const to = task.finishedAt ? new Date(task.finishedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((to - from) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

async function loadOmnigentStatus(): Promise<void> {
  loadingOmnigent.value = true;
  try {
    omnigent.value = await apiStudioOmnigentStatus();
  } catch {
    omnigent.value = {
      reachable: false,
      baseUrl: 'http://127.0.0.1:6767',
      serverVersion: null,
      accountsEnabled: null,
      singleUser: null,
      agentCount: 0,
      harnessCount: 0,
      harnessIds: [],
      sessionCount: null,
      usage: null,
      probedAt: new Date().toISOString(),
    };
  } finally {
    loadingOmnigent.value = false;
  }
}

async function probe(): Promise<void> {
  loadingProbe.value = true;
  try {
    health.value = await apiStudioHealth();
  } catch (err) {
    health.value = null;
    $q.notify({ type: 'warning', message: friendly(err) });
  } finally {
    loadingProbe.value = false;
  }
}

async function refreshTasks(): Promise<void> {
  try {
    const data = await apiStudioTasks();
    tasks.value = data.tasks;
    if (!selectedTaskId.value && tasks.value.length > 0) {
      selectedTaskId.value = tasks.value[0]?.id ?? null;
    }
  } catch (err) {
    // Polling failures are intentionally quiet unless fatal; a full refresh button exists.
    console.warn('Studio tasks refresh failed:', err);
  }
}

async function dispatch(): Promise<void> {
  if (!prompt.value.trim()) return;
  inFlight.value = true;
  try {
    const created = await apiStudioDispatch({
      ...(title.value.trim() ? { title: title.value.trim() } : {}),
      prompt: prompt.value.trim(),
      ...(target.value.trim() ? { target: target.value.trim() } : {}),
    });
    $q.notify({ type: 'positive', message: `المهمة ${created.id} بدأت داخل worktree معزول` });
    prompt.value = '';
    title.value = '';
    await refreshTasks();
    selectedTaskId.value = created.id;
    startPolling();
  } catch (err) {
    $q.notify({ type: 'negative', message: friendly(err) });
  } finally {
    inFlight.value = false;
  }
}

async function cancelActive(): Promise<void> {
  if (!activeTask.value) return;
  cancelLoading.value = true;
  try {
    await apiStudioCancel(activeTask.value.id);
    $q.notify({ type: 'info', message: `أُلغيت المهمة ${activeTask.value.id}` });
    await refreshTasks();
  } catch (err) {
    $q.notify({ type: 'negative', message: friendly(err) });
  } finally {
    cancelLoading.value = false;
  }
}

function copyAttachCommand(): void {
  const task = selectedTask.value;
  const cmd = task
    ? `cd "${task.worktreePath}" && opencode run --auto --title fastfree-${task.id} "<your prompt here>"`
    : 'opencode run --auto "<your prompt here>"';
  void copy(cmd);
}

function copyDiffCommand(): void {
  const task = selectedTask.value;
  const cmd = task ? `git -C "${task.worktreePath}" diff HEAD` : 'git diff HEAD';
  void copy(cmd);
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    $q.notify({ type: 'positive', message: 'تم النسخ إلى الحافظة' });
  } catch (err) {
    $q.notify({ type: 'negative', message: friendly(err) });
  }
}

function discardSelected(): void {
  const task = selectedTask.value;
  if (!task || task.status === 'running') return;
  $q.dialog({
    title: 'حذف الـ Worktree',
    message: `سيُزال worktree المهمة ${task.id} مع كل تعديلاته نهائياً. لا يمكن التراجع. متابعة؟`,
    ok: { label: 'حذف نهائي', color: 'negative', flat: true },
    cancel: { label: 'إلغاء', flat: true },
  }).onOk(() => {
    void (async () => {
      try {
        await apiStudioDiscard(task.id);
        $q.notify({ type: 'info', message: `تم حذف worktree ${task.id}` });
        selectedTaskId.value = null;
        await refreshTasks();
      } catch (err) {
        $q.notify({ type: 'negative', message: friendly(err) });
      }
    })();
  });
}

function friendly(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 240);
  if (typeof err === 'string') return err.slice(0, 240);
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
    return (err as { message: string }).message.slice(0, 240);
  }
  return 'خطأ غير معروف في الاتصال بالـ Backend';
}

function toggleInspector(): void {
  if (inspectorOn.value) {
    disableInspector();
    inspectorOn.value = false;
    return;
  }
  enableInspector((inspection) => {
    inspected.value = inspection;
    inspectorOn.value = isInspectorEnabled();
    $q.notify({ type: 'info', message: inspection.sourcePath ? `العنصر مربوط بـ ${inspection.sourcePath}` : 'عنصر غير مربوط بملف مصدر' });
    disableInspector();
    inspectorOn.value = false;
  });
  inspectorOn.value = true;
}

function adoptInspectedTarget(): void {
  const path = inspected.value?.sourcePath;
  if (!path) {
    $q.notify({ type: 'warning', message: 'لا يوجد مصدر مربوط بهذا العنصر' });
    return;
  }
  target.value = path;
  $q.notify({ type: 'positive', message: 'تم اعتماد هذا الملف كهدف الاستوديو' });
}

async function copyInspectedPath(): Promise<void> {
  const path = inspected.value?.sourcePath;
  if (!path) return;
  try {
    await navigator.clipboard.writeText(path);
    $q.notify({ type: 'positive', message: 'تم نسخ مسار الملف' });
  } catch {
    $q.notify({ type: 'negative', message: 'تعذر نسخ المسار — راجع صلاحيات الحافظة' });
  }
}

function startPolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void refreshTasks();
    if (!activeTask.value && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }, 2500);
}

onMounted(async () => {
  await probe();
  await loadOmnigentStatus();
  await refreshTasks();
  if (activeTask.value) startPolling();
});

onUnmounted(() => {
  disableInspector();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
});
</script>

<style scoped>
.design-studio-screen {
  height: 100%;
}

.studio-prompt :deep(textarea) {
  min-height: 120px;
  font-family: inherit;
}

.studio-worktree {
  direction: ltr;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 11px;
  background: rgba(8, 145, 178, 0.08);
  border: 1px solid rgba(8, 145, 178, 0.3);
  border-radius: 8px;
  padding: 6px 10px;
}

.studio-log {
  background: #05090d;
  color: #8be9fd;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.55;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
}

.studio-diff {
  color: #b5f5c6;
  max-height: 140px;
}
</style>
