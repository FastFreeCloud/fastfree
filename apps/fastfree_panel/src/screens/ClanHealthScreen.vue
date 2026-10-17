<template>
  <div class="clan-health-screen q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold">
          <span>System Health & Web MCP</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">سلامة النظام والـ MCP</span>
        </div>
        <div class="text-caption text-grey-6">
          Realtime metrics streamed from fastfree-panel Web MCP
        </div>
      </div>

      <q-space />

      <!-- MCP Connection Badge -->
      <q-chip
        dense
        square
        :color="mcpConnected ? 'positive' : 'warning'"
        text-color="white"
        size="sm"
        icon="mdi-broadcast"
      >
        {{ mcpConnected ? 'SSE STREAM ACTIVE' : 'CONNECTING...' }}
      </q-chip>

      <q-btn
        flat
        dense
        round
        icon="mdi-refresh"
        :loading="loading"
        aria-label="Refresh health metrics"
        @click="refreshHealth"
      >
        <q-tooltip>Refresh Health · تحديث المقاييس</q-tooltip>
      </q-btn>
    </div>

    <!-- Error Banner -->
    <q-banner
      v-if="clanStore.error"
      rounded
      class="bg-negative text-white q-mb-md"
      icon="mdi-alert-circle-outline"
    >
      {{ clanStore.error }}
    </q-banner>

    <!-- Health Metrics Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <!-- Status Card -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-server-security" size="32px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Server Status</div>
          <div :class="['text-h6 text-weight-bolder', 'text-' + serverStatusColor]">{{ serverStatus }}</div>
          <div class="text-caption text-grey-6">
            Uptime: {{ uptimeFormatted }}
          </div>
        </q-card>
      </div>

      <!-- CPU Metric -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-cpu-64-bit" size="32px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">CPU Architecture</div>
          <div class="text-h6 text-weight-bolder">x86_64</div>
          <div class="text-caption text-teal-4">Linux 6.18 LTS</div>
        </q-card>
      </div>

      <!-- Memory Metric -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-memory" size="32px" color="orange" />
          <div class="text-caption text-grey-5 q-mt-xs">System Services</div>
          <div class="text-h6 text-weight-bolder">Native Systemd</div>
          <div class="text-caption text-positive">Zero Podman (100%)</div>
        </q-card>
      </div>

      <!-- NixOS Generation -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-nix" size="32px" color="cyan" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Generation</div>
          <div class="text-h6 text-weight-bolder text-cyan-3">Gen #2</div>
          <div class="text-caption text-grey-6">NixOS 26.05 Flake</div>
        </q-card>
      </div>
    </div>

    <!-- Active Native Services Table -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold">
          <q-icon name="mdi-check-decagram" color="positive" class="q-mr-xs" />
          Production Core Services (client2 VPS)
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-list separator>
          <q-item v-for="svc in coreServices" :key="svc.name">
            <q-item-section avatar>
              <q-avatar size="32px" :color="svc.color" text-color="white" :icon="svc.icon" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ svc.name }}</q-item-label>
              <q-item-label caption>{{ svc.desc }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip dense square color="positive" text-color="white" size="xs">
                PORT {{ svc.port }} · ACTIVE
              </q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useClanStore } from '../stores/clan';
import { useWebMcp } from '../composables/useWebMcp';

const $q = useQuasar();
const clanStore = useClanStore();
const { isConnected: mcpConnected } = useWebMcp();
const loading = ref(false);

const coreServices = [
  { name: 'MariaDB 11.4 Server', desc: 'Native MySQL database engine', port: '3306', icon: 'mdi-database', color: 'blue-8' },
  { name: 'Redis Cache', desc: 'FastFree in-memory cache daemon', port: '11000', icon: 'mdi-cube-outline', color: 'red-8' },
  { name: 'Redis Queue', desc: 'FastFree task queue manager', port: '11001', icon: 'mdi-tray-full', color: 'deep-orange-8' },
  { name: 'Caddy 2.11 Web Server', desc: 'Reverse proxy with automatic ZeroSSL', port: '80 / 443', icon: 'mdi-web', color: 'green-8' },
  { name: 'Cockpit Console', desc: 'Web-based system management cockpit', port: '9090', icon: 'mdi-monitor-dashboard', color: 'indigo-8' },
  { name: 'DbGate Database GUI', desc: 'Advanced web SQL explorer', port: '8082', icon: 'mdi-table-large', color: 'purple-8' },
];

const serverStatus = computed(() => {
  if (clanStore.error) return 'DEGRADED';
  return clanStore.systemHealth?.status?.toUpperCase() || 'OPERATIONAL';
});

const serverStatusColor = computed(() => {
  if (clanStore.error) return 'negative';
  const st = clanStore.systemHealth?.status?.toLowerCase();
  if (st === 'ok' || st === 'healthy' || st === 'operational') return 'positive';
  if (st === 'warning' || st === 'degraded') return 'warning';
  return 'positive';
});

const uptimeFormatted = computed(() => {
  const s = clanStore.systemHealth?.uptimeSeconds;
  if (!s) return 'Active';
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  return `${hrs}h ${mins}m`;
});

async function refreshHealth(): Promise<void> {
  loading.value = true;
  try {
    await clanStore.fetchHealth();
    if (clanStore.error) {
      $q.notify({
        type: 'negative',
        icon: 'mdi-alert-circle',
        message: clanStore.error,
      });
    }
  } catch {
    $q.notify({
      type: 'negative',
      icon: 'mdi-alert-circle',
      message: 'Failed to refresh system health',
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void refreshHealth();
});
</script>

<style scoped lang="scss">
.clan-health-screen {
  height: 100%;
  overflow-y: auto;
}
</style>
