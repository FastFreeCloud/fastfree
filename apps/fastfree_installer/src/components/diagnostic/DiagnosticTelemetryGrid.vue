<template>
  <div class="telemetry-grid">
    <!-- ── Telemetry toolbar: live status + refresh ── -->
    <div class="telemetry-toolbar">
      <div class="tele-live-pill" :class="{ 'is-live': probeOk, 'is-stale': !probeOk }">
        <span class="tele-dot"></span>
        <span>
          {{
            probeLoading
              ? (isRtl ? 'جارٍ الفحص الحي...' : 'Probing live...')
              : probeOk
              ? (isRtl ? 'بيانات حية من الجهاز' : 'Live host data')
              : (isRtl ? 'بيانات تقديرية (تعذر الفحص الحي)' : 'Static config (probe unavailable)')
          }}
        </span>
        <span v-if="lastUpdatedText" class="tele-updated font-mono" dir="ltr">{{ lastUpdatedText }}</span>
      </div>

      <button
        type="button"
        class="pill-btn btn-tele-refresh"
        title="Manual refresh"
        @click="refreshNow"
      >
        <svg aria-hidden="true" class="mini-svg" :class="{ 'spin-tele': probeLoading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        <span>{{ isRtl ? 'تحديث فوري' : 'Refresh now' }}</span>
      </button>

      <button
        type="button"
        class="pill-btn btn-tele-auto"
        :class="{ active: autoPoll }"
        @click="autoPoll = !autoPoll"
      >
        <span class="auto-dot"></span>
        <span>{{ autoPoll ? (isRtl ? 'تلقائي · كل 15ث' : 'Auto · every 15s') : (isRtl ? 'تلقائي · موقف' : 'Auto · off') }}</span>
      </button>
    </div>

    <!-- ── CARD 1: Live host performance ── -->
    <div class="telem-card card-live">
      <h5>{{ isRtl ? 'أداء الجهاز الحي' : 'Live Host Performance' }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ isRtl ? 'استهلاك CPU:' : 'CPU Load:' }}</span>
          <strong :class="loadClass(cpuPercent, 60, 85)" class="t-val-num">{{ fmtPct(cpuPercent) }}</strong>
        </div>
        <div class="t-bar-row">
          <div class="t-bar"><i :style="barStyle(cpuPercent, 100)" :class="barClass(cpuPercent)"></i></div>
        </div>

        <div class="t-row">
          <span>{{ isRtl ? 'الذاكرة المستخدمة:' : 'RAM Used:' }}</span>
          <strong :class="loadClass(ramUsedPct, 70, 88)" class="t-val-num">
            {{ ramUsed ? `${fmtInt(ramUsed.usedMb)} / ${fmtInt(ramUsed.totalMb)} MB` : '—' }}
          </strong>
        </div>
        <div class="t-bar-row">
          <div class="t-bar"><i :style="barStyle(ramUsedPct, 100)" :class="barClass(ramUsedPct)"></i></div>
        </div>

        <div class="t-row">
          <span>{{ isRtl ? 'منذ الإقلاع:' : 'System Uptime:' }}</span>
          <strong class="t-val-num">{{ fmtUptime(uptimeHours) }}</strong>
        </div>
        <div class="t-row">
          <span>{{ isRtl ? 'الأنوية المنطقية:' : 'Logical Cores:' }}</span>
          <strong class="t-val-num">{{ coreCount ?? '—' }}</strong>
        </div>
      </div>
    </div>

    <!-- ── CARD 2: Hyper-V subsystem (live status + counts) ── -->
    <div class="telem-card">
      <h5>{{ t('auto.hyper_v_subsystem') }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ t('telemetry.vmms_service') }}</span>
          <strong :class="vmmsStatus === 'Running' ? 'text-emerald' : 'text-red'">
            {{ vmmsStatus || 'Unknown' }}
            <small v-if="vmmsKnown" class="t-static-hint">({{ isRtl ? 'حقيقي' : 'live' }})</small>
          </strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.group_membership') }}</span>
          <strong :class="inGroup === true ? 'text-emerald' : inGroup === false ? 'text-amber' : 'text-dim-soft'">
            {{ inGroup === true ? (isRtl ? 'عضو — Hyper-V Administrators' : 'Member — Hyper-V Administrators')
               : inGroup === false ? (isRtl ? 'غير عضو' : 'Not a member')
               : 'Hyper-V Administrators' }}
          </strong>
        </div>
        <div class="t-row">
          <span>{{ isRtl ? 'عدد الآلات الافتراضية:' : 'Hyper-V VM Count:' }}</span>
          <strong class="text-sky t-val-num">{{ vmCount ?? (isRtl ? 'غير متاح' : 'N/A') }}</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.target_node') }}</span>
          <strong class="text-sky text-truncate">{{ selectedClientId || 'client1' }}</strong>
        </div>
      </div>
    </div>

    <!-- ── CARD 3: Storage (real drive capacities) ── -->
    <div class="telem-card">
      <h5>{{ t('auto.storage_volumes') }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ t('telemetry.target_drive') }}</span>
          <strong>{{ targetDiskDrive || 'G:\\' }} <small v-if="driveKnown" class="t-static-hint">({{ isRtl ? 'حقيقي' : 'live' }})</small></strong>
        </div>
        <div class="t-row">
          <span>{{ isRtl ? 'المساحة الحرة:' : 'Free Space:' }}</span>
          <strong :class="loadClass(driveUsedPct, 85, 92)" class="t-val-num">
            {{ driveKnown ? `${fmtNum(driveFreeGb)} / ${fmtNum(driveTotalGb)} GB` : '—' }}
          </strong>
        </div>
        <div class="t-bar-row">
          <div class="t-bar"><i :style="barStyle(driveUsedPct, 100)" :class="barClass(driveUsedPct)"></i></div>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.vm_directory') }}</span>
          <strong class="text-truncate">{{ targetDiskDrive || 'G:' }}\FastFree\VMs</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.boot_disk_format') }}</span>
          <strong class="t-static-val">Dynamic VHDX (Gen 2)</strong>
        </div>
      </div>
    </div>

    <!-- ── CARD 4: Network & Security ── -->
    <div class="telem-card">
      <h5>{{ t('auto.overlay_network') }}</h5>
      <div class="telem-rows font-mono">
        <div class="t-row">
          <span>{{ t('telemetry.virtual_switch') }}</span>
          <strong class="text-sky">{{ vmSwitchName || '—' }}</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.udp_listen_port') }}</span>
          <strong>{{ (wireGuardConfig?.listen_port ?? null) || '—' }}</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.firewall_scope') }}</span>
          <strong>{{ wgRulePorts || '—' }}</strong>
        </div>
        <div class="t-row">
          <span>{{ isRtl ? 'نظام التشغيل:' : 'Host OS:' }}</span>
          <strong class="text-truncate" :title="osName">{{ osName || '—' }}</strong>
        </div>
        <div class="t-row">
          <span>{{ t('telemetry.secure_boot') }}</span>
          <strong :class="secureBoot === true ? 'text-emerald' : secureBoot === false ? 'text-amber' : 'text-dim-soft'">
            {{ secureBoot === true ? (isRtl ? 'مفعّل' : 'Enabled')
               : secureBoot === false ? (isRtl ? 'معطّل' : 'Disabled') : '—' }}
          </strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../composables/useI18n';
import { selectedClientId, targetDiskDrive, browserPreviewMode, wireGuardConfig } from '../../composables/useDiscovery';
import { logWarn } from '../../composables/useDiagnostics';

interface HostTelemetryProbe {
  cpu_percent: number | null;
  ram_total_mb: number | null;
  ram_used_mb: number | null;
  uptime_hours: number | null;
  core_count: number | null;
  vmms_status: string;
  vm_count: number | null;
  in_hyperv_group: boolean | null;
  secure_boot: boolean | null;
  drive: string;
  drive_total_gb: number | null;
  drive_free_gb: number | null;
  os_name: string;
  collected_at: string;
}

const { t, isRtl } = useI18n();

const POLL_MS = 15_000;
const PROBE_TIMEOUT_MS = 20_000;
const probe = ref<HostTelemetryProbe | null>(null);
const probeLoading = ref(false);
const probeOk = ref(false);
const probeError = ref('');
const autoPoll = ref(true);
/** Real Hyper-V switch name from get_vm_real_state; null renders "—". */
const vmSwitchName = ref<string | null>(null);
/** Real firewall rule ports from check_wireguard_firewall_rule; null = "—". */
const wgRulePorts = ref<string | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;
/** Latest-wins ticket: only the most recent probe call may paint results. */
let probeRunId = 0;

async function invokeWithTimeout<T>(cmd: string, args: Record<string, unknown>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('probe timeout')), ms);
  });
  try {
    return await Promise.race([invoke<T>(cmd, args), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function probeNow() {
  if (probeLoading.value) return;
  // Browser preview has no backend bridge — keep the "—" placeholders honest.
  if (browserPreviewMode.value) {
    probeOk.value = false;
    return;
  }
  probeLoading.value = true;
  const rid = ++probeRunId;
  try {
    const res = await invokeWithTimeout<HostTelemetryProbe>('probe_host_telemetry', {
      drive: targetDiskDrive.value || null,
    }, PROBE_TIMEOUT_MS);
    if (rid !== probeRunId) return; // superseded
    probe.value = res;
    probeOk.value = true;
    probeError.value = '';
  } catch (e: unknown) {
    if (rid !== probeRunId) return;
    probeOk.value = false;
    probeError.value = String(e);
    logWarn('Telemetry', 'Host telemetry probe failed; showing "—".', probeError.value);
  } finally {
    if (rid === probeRunId) probeLoading.value = false;
  }
  // Side probes (fire-and-forget): real switch + firewall ports. Failures
  // leave the refs as null → the UI renders "—", never a fabricated value.
  try {
    const vmRes = await invoke<{ switch_name?: string }>('get_vm_real_state', { clientId: selectedClientId.value });
    vmSwitchName.value = vmRes?.switch_name || null;
  } catch {
    vmSwitchName.value = null;
  }
  try {
    const rule = await invoke<{ local_ports?: string | null }>('check_wireguard_firewall_rule');
    wgRulePorts.value = rule?.local_ports || null;
  } catch {
    wgRulePorts.value = null;
  }
}

function refreshNow() {
  // Manual refresh always re-probes immediately (even if auto poll is off).
  probeNow();
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(probeNow, POLL_MS);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Auto-poll lifecycle charted to the toggle + component lifetime.
watch(autoPoll, (on) => (on ? startPoll() : stopPoll()));
onMounted(() => {
  probeNow();
  if (autoPoll.value) startPoll();
});
onUnmounted(stopPoll);

const lastUpdatedText = computed(() => {
  if (!probe.value?.collected_at) return '';
  const secs = Number(probe.value.collected_at);
  if (!Number.isFinite(secs)) return '';
  const d = new Date(secs * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
});

const cpuPercent = computed(() =>
  probeOk.value ? (probe.value?.cpu_percent ?? null) : null
);
const ramUsed = computed(() => {
  if (!probeOk.value) return null;
  const p = probe.value;
  if (!p?.ram_used_mb || !p?.ram_total_mb) return null;
  return { usedMb: p.ram_used_mb, totalMb: p.ram_total_mb };
});
const ramUsedPct = computed(() => {
  const r = ramUsed.value;
  return r ? Math.round((r.usedMb / r.totalMb) * 100) : null;
});
const uptimeHours = computed(() => (probeOk.value ? (probe.value?.uptime_hours ?? null) : null));
const coreCount = computed(() => (probeOk.value ? (probe.value?.core_count ?? null) : null));

const vmmsStatus = computed(() =>
  probeOk.value ? (probe.value?.vmms_status ?? 'Unknown') : ''
);
const vmmsKnown = computed(() => probeOk.value && !!probe.value?.vmms_status && probe.value.vmms_status !== 'Unknown');
const vmCount = computed(() => (probeOk.value ? (probe.value?.vm_count ?? null) : null));
const inGroup = computed(() => (probeOk.value ? (probe.value?.in_hyperv_group ?? null) : null));
const secureBoot = computed(() => (probeOk.value ? (probe.value?.secure_boot ?? null) : null));
const driveFreeGb = computed(() => (probeOk.value ? (probe.value?.drive_free_gb ?? null) : null));
const driveTotalGb = computed(() => (probeOk.value ? (probe.value?.drive_total_gb ?? null) : null));
const driveKnown = computed(() => probeOk.value && driveFreeGb.value !== null && driveTotalGb.value !== null && !!driveTotalGb.value);
const driveUsedPct = computed(() => {
  if (!driveKnown.value || !driveTotalGb.value) return null;
  const free = driveFreeGb.value ?? 0;
  return Math.round(((driveTotalGb.value - free) / driveTotalGb.value) * 100);
});
const osName = computed(() => (probeOk.value ? (probe.value?.os_name ?? '') : ''));

// ── formatting helpers ──
function fmtPct(v: number | null): string {
  return v === null || v === undefined ? '—' : `${Math.round(v)}%`;
}
function fmtInt(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}
function fmtNum(v: number | null): string {
  return v === null || v === undefined ? '—' : v.toLocaleString('en-US');
}
function fmtUptime(hours: number | null): string {
  if (hours === null || hours === undefined) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return `${h}h ${m}m`;
}

function loadClass(value: number | null, warnAt: number, dangerAt: number): string {
  if (value === null) return 'text-dim-soft';
  if (value >= dangerAt) return 'text-red';
  if (value >= warnAt) return 'text-amber';
  return 'text-emerald';
}

function barClass(value: number | null): string {
  if (value === null) return 'bar-ok';
  if (value >= 88) return 'bar-danger';
  if (value >= 70) return 'bar-warn';
  return 'bar-ok';
}

function barStyle(value: number | null, max: number) {
  if (value === null) return { width: '0%' };
  const clamped = Math.max(2, Math.min(100, Math.round((value / max) * 100)));
  return { width: `${clamped}%` };
}
</script>
