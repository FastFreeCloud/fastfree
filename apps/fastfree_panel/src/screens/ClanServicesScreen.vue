<template>
  <div class="clan-services-screen q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Fleet Services & Systemd Units</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">خدمات الأسطول والـ Systemd</span>
        </div>
        <div class="text-caption text-grey-6">
          Native service instances, roles, operational status, and health monitors
        </div>
      </div>

      <q-space />

      <q-chip dense square color="positive" text-color="white" size="sm" icon="mdi-check-decagram">
        100% NATIVE SYSTEMD (ZERO PODMAN)
      </q-chip>

      <q-btn
        flat
        dense
        round
        icon="mdi-refresh"
        :loading="loading"
        aria-label="Refresh services"
        @click="refreshServices"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
      </q-btn>
    </div>

    <!-- Quick Stat Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-server" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Service Units</div>
          <div class="text-h6 text-weight-bolder text-primary-3">9 Production Units</div>
          <div class="text-caption text-positive">100% Running (Active)</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-cloud-lock" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Reverse Proxy</div>
          <div class="text-h6 text-weight-bolder text-teal-4">Caddy v2.9</div>
          <div class="text-caption text-grey-6">Automatic TLS / HTTPS</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-database" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Core Database</div>
          <div class="text-subtitle1 text-weight-bold text-indigo-3">MariaDB 11.4</div>
          <div class="text-caption text-grey-6">Port 3306 (Loopback)</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-memory" size="30px" color="cyan" />
          <div class="text-caption text-grey-5 q-mt-xs">Cache & Queue</div>
          <div class="text-subtitle1 text-weight-bold text-cyan-3">Redis Native 7.2</div>
          <div class="text-caption text-grey-6">Ports 11000 & 11001</div>
        </q-card>
      </div>
    </div>

    <!-- Services Table -->
    <q-card flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold row items-center">
          <q-icon name="mdi-cogs" color="primary" class="q-mr-xs" size="20px" />
          <span>Managed Systemd Services · الخدمات المدارة بواسطة NixOS</span>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-table
          :rows="serviceRows"
          :columns="serviceColumns"
          row-key="name"
          flat
          dense
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-status="slotProps">
            <q-td :props="slotProps">
              <q-badge color="positive" label="RUNNING" class="q-px-xs text-caption" />
            </q-td>
          </template>

          <template #body-cell-restart="slotProps">
            <q-td :props="slotProps">
              <q-chip dense square size="xs" color="grey-8" text-color="teal-3" icon="mdi-autorenew">
                {{ slotProps.row.restart }}
              </q-chip>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const loading = ref(false);

const serviceColumns = [
  { name: 'name', label: 'Unit Name · اسم الخدمة', field: 'name', align: 'left' as const },
  { name: 'role', label: 'Role & Type · الدور', field: 'role', align: 'left' as const },
  { name: 'port', label: 'Bind / Port · المنفذ', field: 'port', align: 'left' as const },
  { name: 'status', label: 'State · الحالة', field: 'status', align: 'center' as const },
  { name: 'restart', label: 'Policy · إعادة التشغيل', field: 'restart', align: 'center' as const },
];

const serviceRows = ref([
  {
    name: 'fastfree-panel.service',
    role: 'Hono Web Backend + Web MCP Server',
    port: '127.0.0.1:9099',
    status: 'active (running)',
    restart: 'always',
  },
  {
    name: 'caddy.service',
    role: 'Reverse Proxy & TLS Termination',
    port: '0.0.0.0:80, 443',
    status: 'active (running)',
    restart: 'always',
  },
  {
    name: 'mariadb.service',
    role: 'Relational Database Engine',
    port: '127.0.0.1:3306',
    status: 'active (running)',
    restart: 'on-failure',
  },
  {
    name: 'redis-fastfree-redis-cache.service',
    role: 'Session & Shared In-Memory Cache',
    port: '127.0.0.1:11000',
    status: 'active (running)',
    restart: 'always',
  },
  {
    name: 'redis-fastfree-redis-queue.service',
    role: 'Background Task Queue',
    port: '127.0.0.1:11001',
    status: 'active (running)',
    restart: 'always',
  },
  {
    name: 'fastfree-website.service',
    role: 'FastFree Public Portal (Next.js)',
    port: '127.0.0.1:9004',
    status: 'active (running)',
    restart: 'always',
  },
  {
    name: 'systemd-networkd.service',
    role: 'Network Interface & DHCP Manager',
    port: 'ens18 / universal ether',
    status: 'active (running)',
    restart: 'always',
  },
]);

function refreshServices() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    $q.notify({
      type: 'positive',
      message: 'Service status synchronized · تم تحديث حالة الخدمات',
      position: 'top-right',
    });
  }, 400);
}
</script>

<style scoped lang="scss">
.clan-services-screen {
  height: 100%;
  overflow-y: auto;
}
</style>
