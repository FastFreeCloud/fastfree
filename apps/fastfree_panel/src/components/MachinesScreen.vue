<template>
  <q-layout view="hHh lpR fFf" class="ff-panel">
    <!-- ─── Header ─────────────────────────────────────────────── -->
    <q-header bordered class="ff-header">
      <q-toolbar class="q-px-md">
        <q-btn
          flat
          dense
          round
          icon="mdi-menu"
          aria-label="toggle drawer"
          @click="drawer = !drawer"
        />

        <div class="ff-title">
          <span>Machines</span>
          <span lang="ar" dir="rtl" class="ff-title-ar">الأجهزة</span>
        </div>

        <q-space />

        <q-chip
          dense
          square
          :color="statusColor"
          text-color="white"
          :label="statusLabel"
          class="q-mr-sm"
        />

        <q-btn flat dense round icon="mdi-refresh" aria-label="refresh" @click="fetchAll">
          <q-tooltip>Refresh · تحديث</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- ─── Drawer: the 17 designed screens ────────────────────── -->
    <q-drawer
      v-model="drawer"
      show-if-above
      bordered
      :width="248"
    >
      <q-list padding>
        <q-item-label header class="ff-item-header">
          <span>Clan</span>
          <span lang="ar" dir="rtl">كلان</span>
        </q-item-label>

        <q-item
          v-for="s in SCREENS"
          :key="s.id"
          clickable
          :active="routeId === s.id"
          active-class="ff-active"
          @click="select(s)"
        >
          <q-item-section avatar>
            <q-icon :name="s.icon" size="20px" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="row items-center no-wrap q-gutter-xs">
              <span class="ellipsis">{{ s.en }}</span>
              <q-badge
                v-if="s.id === 'machines'"
                :label="machines.length"
                class="ff-count"
              />
            </q-item-label>
            <q-item-label caption lang="ar" dir="rtl" class="ellipsis">
              {{ s.ar }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- ─── Page ───────────────────────────────────────────────── -->
    <q-page-container>
      <q-page padding>
        <!-- Not configured: Clan is absent -->
        <q-banner
          v-if="clanDown"
          rounded
          class="bg-grey-8 text-white q-mb-lg"
          avatar-icon="mdi-lan-disconnect"
        >
          <template #avatar><q-icon name="mdi-lan-disconnect" /></template>
          Clan CLI is not configured on this host.
          <span lang="ar" dir="rtl">‏CLI كلان غير مُهيّأ على هذا الجهاز.</span>
        </q-banner>

        <!-- Machines (default route) -->
        <template v-if="routeId === 'machines'">
          <div class="row items-center q-mb-md">
            <div>
              <div class="ff-h1">
                <span>Machines</span>
                <span lang="ar" dir="rtl" class="ff-h1-ar">الأجهزة</span>
              </div>
              <div class="ff-sub">
                <span>Managed by Clan</span>
                <span lang="ar" dir="rtl">مُدارة بواسطة كلان</span>
              </div>
            </div>
            <q-space />
            <q-input
              v-model="filter"
              dense
              outlined
              clearable
              debounce="200"
              placeholder="Search… بحث"
              class="ff-search"
            >
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </div>

          <q-banner
            v-if="loading"
            dense
            rounded
            class="bg-grey-8 text-grey-4 q-mb-md"
            icon="mdi-loading mdi-spin"
            label="Loading machines… جارٍ التحميل"
          />

          <EmptyState
            v-else-if="machines.length === 0"
            icon="mdi-server-off"
            :title="emptyTitle"
            :message="emptyMessage"
          />

          <div v-else class="row q-col-gutter-md">
            <div
              v-for="m in filtered"
              :key="m.name"
              class="col-12 col-sm-6 col-md-4 col-lg-3"
            >
              <q-card
                flat
                bordered
                class="cursor-pointer ff-card"
                v-ripple
                @click="openMachine(m)"
              >
                <q-card-section class="row items-center no-wrap">
                  <q-avatar
                    :icon="machineIcon(m)"
                    :color="machineColor(m)"
                    text-color="white"
                    size="44px"
                  />
                  <div class="q-ml-md ellipsis">
                    <div class="text-weight-medium ellipsis">{{ m.name }}</div>
                    <div class="text-caption text-grey-6 ellipsis">
                      {{ m.description || m.host || '—' }}
                    </div>
                  </div>
                </q-card-section>

                <q-card-section v-if="m.tags?.length" class="q-pt-none q-gutter-xs">
                  <q-chip
                    v-for="tag in m.tags"
                    :key="tag"
                    dense
                    square
                    size="sm"
                    color="grey-8"
                    text-color="grey-3"
                    :label="tag"
                  />
                </q-card-section>

                <q-card-actions align="right" class="q-pt-none">
                  <q-btn flat dense no-caps size="sm" label="Details · تفاصيل" />
                  <q-icon name="mdi-chevron-left" size="18px" />
                </q-card-actions>
              </q-card>
            </div>
          </div>
        </template>

        <!-- Placeholder for the other 16 designed screens -->
        <template v-else>
          <div class="ff-h1">
            <span>{{ active?.en }}</span>
            <span lang="ar" dir="rtl" class="ff-h1-ar">{{ active?.ar }}</span>
          </div>
          <q-separator class="q-my-md" />
          <EmptyState
            icon="mdi-hammer-wrench"
            :title="`${active?.en} is not wired yet`"
            :message="`This screen is designed but not implemented. / الشاشة مصممة ولم تُنفّذ بعد.`"
          />
        </template>
      </q-page>
    </q-page-container>

    <!-- ─── Footer ─────────────────────────────────────────────── -->
    <q-footer bordered class="ff-footer">
      <div class="row items-center justify-between q-px-md q-py-xs">
        <span class="text-caption">FastFree Panel · fastfree {{ version }}</span>
        <span class="text-caption text-grey-5">
          API {{ apiStatus }} · {{ uptimeLabel }}
        </span>
      </div>
    </q-footer>

    <!-- ─── Machine detail (lowcode DynamicTable on the real payload) ── -->
    <q-dialog v-model="detail">
      <q-card class="ff-card" style="min-width: min(94vw, 860px)">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="mdi-server" color="accent" />
          <div class="text-subtitle1">{{ detailTarget?.name }}</div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" aria-label="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="detailTarget">
          <DynamicTable
            :columns="detailColumns"
            :rows="detailRows"
            row-key="key"
            flat
            dense
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DynamicTable, EmptyState } from '../lib/lowcode'

const version = '2.2.0'

interface Machine {
  name: string
  description?: string
  host?: string
  tags?: string[]
  reachable?: boolean | null
}

interface ScreenDef {
  id: string
  en: string
  ar: string
  icon: string
}

/** The 17 designed screens from fastfree-panel-spa-v2.2.0/design. */
const SCREENS: ScreenDef[] = [
  { id: 'machines', en: 'Machines', ar: 'الأجهزة', icon: 'mdi-server' },
  { id: 'overview', en: 'Overview', ar: 'نظرة عامة', icon: 'mdi-view-dashboard-outline' },
  { id: 'machine', en: 'Machine detail', ar: 'تفاصيل الجهاز', icon: 'mdi-server-network' },
  { id: 'inventory', en: 'Inventory', ar: 'الجرد', icon: 'mdi-clipboard-list-outline' },
  { id: 'services', en: 'Services', ar: 'الخدمات', icon: 'mdi-cog-outline' },
  { id: 'state', en: 'State', ar: 'الحالة', icon: 'mdi-state-machine' },
  { id: 'vars', en: 'Vars', ar: 'المتغيرات', icon: 'mdi-variable-box' },
  { id: 'vars-health', en: 'Vars health', ar: 'صحة المتغيرات', icon: 'mdi-heart-pulse' },
  { id: 'backups', en: 'Backups', ar: 'النسخ الاحتياطية', icon: 'mdi-backup-restore' },
  { id: 'generations', en: 'Generations', ar: 'الأجيال', icon: 'mdi-counter' },
  { id: 'secrets', en: 'Secrets', ar: 'الأسرار', icon: 'mdi-key-outline' },
  { id: 'access', en: 'Access', ar: 'الوصول', icon: 'mdi-account-key-outline' },
  { id: 'network', en: 'Network', ar: 'الشبكة', icon: 'mdi-lan' },
  { id: 'monitoring', en: 'Monitoring', ar: 'المراقبة', icon: 'mdi-chart-line' },
  { id: 'build', en: 'Build', ar: 'البناء', icon: 'mdi-hammer-wrench' },
  { id: 'jobs', en: 'Jobs', ar: 'المهام', icon: 'mdi-play-circle-outline' },
  { id: 'settings', en: 'Settings', ar: 'الإعدادات', icon: 'mdi-cog-outline' },
]

const drawer = ref(true)
const routeId = ref('machines')
const loading = ref(false)
const clanDown = ref(false)
const apiStatus = ref('…')
const uptime = ref(0)
const machines = ref<Machine[]>([])
const filter = ref('')
const detail = ref(false)
const detailTarget = ref<Machine | null>(null)

const active = computed(() => SCREENS.find((s) => s.id === routeId.value))
const filtered = computed(() => {
  const q = filter.value?.trim().toLowerCase()
  if (!q) return machines.value
  return machines.value.filter((m) =>
    [m.name, m.description, m.host, ...(m.tags ?? [])]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)),
  )
})

const statusLabel = computed(() =>
  loading.value ? 'Loading · تحميل' : clanDown.value ? 'Clan offline' : `${machines.value.length} machines`,
)
const statusColor = computed(() =>
  loading.value ? 'warning' : clanDown.value ? 'negative' : 'positive',
)
const uptimeLabel = computed(() =>
  uptime.value ? `up ${Math.floor(uptime.value / 60)}m` : '',
)
const emptyTitle = computed(() =>
  clanDown.value ? 'Clan not configured · كلان غير مُهيّأ' : 'No machines · لا توجد أجهزة',
)
const emptyMessage = computed(() =>
  clanDown.value
    ? 'Set CLAN_DIR and install the clan CLI, then restart the backend. / اضبط CLAN_DIR وثبّت CLI كلان ثم أعد تشغيل الخادم.'
    : 'The inventory is empty. / الفارغ.',
)

const detailColumns = [
  { name: 'key', label: 'Field · الحقل', field: 'key', align: 'left' as const },
  { name: 'value', label: 'Value · القيمة', field: 'value', align: 'left' as const },
]
const detailRows = computed(() => {
  const m = detailTarget.value
  if (!m) return []
  const base: Record<string, string> = {
    name: m.name,
    description: m.description ?? '—',
    host: m.host ?? '—',
  }
  for (const tag of m.tags ?? []) base[`tag:${tag}`] = tag
  return Object.entries(base).map(([key, value]) => ({ key, value }))
})

function machineIcon(m: Machine): string {
  return m.tags?.includes('server') ? 'mdi-server' : 'mdi-linux-box'
}
function machineColor(m: Machine): string {
  if (m.reachable === false) return 'negative'
  if (m.reachable === true) return 'positive'
  return 'grey-7'
}
function select(s: ScreenDef): void {
  routeId.value = s.id
}
function openMachine(m: Machine): void {
  detailTarget.value = m
  detail.value = true
}

async function readJson(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
  } catch {
    return { ok: false, status: 0, body: null }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchAll(): Promise<void> {
  loading.value = true
  try {
    const health = await readJson('/api/v1/health')
    if (health.ok && health.body?.data) {
      apiStatus.value = '200 OK'
      uptime.value = Number(health.body.data.uptimeSeconds ?? 0)
    } else {
      apiStatus.value = `HTTP ${health.status || 'ERR'}`
    }

    const res = await readJson('/api/v1/machines')
    if (res.ok && res.body?.data) {
      const d = res.body.data
      machines.value = Array.isArray(d) ? d : (d.machines ?? [])
      clanDown.value = false
    } else {
      machines.value = []
      clanDown.value = res.status === 503 || res.status === 0
      if (res.status === 0) apiStatus.value = 'unreachable'
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.ff-panel {
  background: #0e1216;
  color: #e6eaee;
}
.ff-header {
  background: #141a21;
  border-bottom: 1px solid #2a323b;
}
/* Quasar hardcodes the drawer surface (`.q-drawer { background: #fff }`) and
   does not forward a fallthrough `class`, so the drawer is targeted from the
   layout root. q-item inherits its colour from it. */
.ff-panel :deep(.q-drawer) {
  background: #141a21;
  border-right: 1px solid #2a323b;
  color: #b4bdc6;
}
/* q-item inherits its colour, so the caption tone follows automatically. */
.ff-panel :deep(.q-drawer .q-item) {
  border-radius: 6px;
  margin: 2px 8px;
}
.ff-panel :deep(.q-drawer .q-item:hover) {
  background: rgba(255, 255, 255, 0.04);
}
.ff-count {
  background: rgba(106, 169, 255, 0.16);
  color: #6aa9ff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 6px;
}
.ff-search {
  min-width: 220px;
}
.ff-search :deep(.q-field__control) {
  background: #1a2027;
  height: 40px;
  border-radius: 8px;
}
/* QField writes its --q-field-* variables as inline styles on the root, so the
   concrete properties are addressed instead of the variables. */
.ff-search :deep(.q-field__control::before),
.ff-search :deep(.q-field__control::after) {
  border-color: #2a323b;
}
.ff-search :deep(.q-field__native) {
  color: #e6eaee;
}
.ff-search :deep(.q-field__native::placeholder) {
  color: #6f7b87;
}
.ff-search :deep(.q-field__prepend) {
  color: #8b97a3;
}
.ff-footer {
  background: #141a21;
  border-top: 1px solid #2a323b;
}
.ff-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
}
.ff-title-ar {
  color: #8b97a3;
  font-weight: 400;
  font-size: 14px;
}
.ff-h1 {
  display: flex;
  align-items: baseline;
  gap: 14px;
  font-size: 24px;
  font-weight: 600;
}
.ff-h1-ar {
  color: #8b97a3;
  font-weight: 400;
  font-size: 20px;
}
.ff-sub {
  display: flex;
  gap: 12px;
  color: #8b97a3;
  font-size: 13px;
}
.ff-item-header {
  color: #6aa9ff;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  gap: 8px;
}
.ff-card {
  background: #1a2027;
  border: 1px solid #2a323b;
  border-radius: 8px;
}
.ff-active {
  background: rgba(106, 169, 255, 0.12);
  color: #6aa9ff;
  border-left: 2px solid #6aa9ff;
}
</style>