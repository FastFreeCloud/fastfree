<template>
  <div class="clan-vars-screen q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Clan Variables & State</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">متغيرات وحالة الكلان</span>
        </div>
        <div class="text-caption text-grey-6">
          System variables, generator status, and shared configurations
        </div>
      </div>

      <q-space />

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Search variables… بحث"
        style="width: 220px"
      >
        <template #prepend><q-icon name="mdi-magnify" size="18px" /></template>
      </q-input>

      <q-btn
        flat
        dense
        round
        icon="mdi-refresh"
        :loading="loading"
        aria-label="Refresh variables"
        @click="refreshVars"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
      </q-btn>
    </div>

    <!-- Stats -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-code-braces" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Declared Variables</div>
          <div class="text-h6 text-weight-bolder text-primary-3">12 Variables</div>
          <div class="text-caption text-positive">Clan 26.05 Spec</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-shield-lock" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Masked Secrets</div>
          <div class="text-h6 text-weight-bolder text-teal-4">5 Protected Values</div>
          <div class="text-caption text-grey-6">Encrypted on disk</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-source-branch" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Repository State</div>
          <div class="text-subtitle1 text-weight-bold text-indigo-3">Clean Git Tree</div>
          <div class="text-caption text-grey-6">CLAN_DIR active</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-cog-sync-outline" size="30px" color="cyan" />
          <div class="text-caption text-grey-5 q-mt-xs">Generator Health</div>
          <div class="text-subtitle1 text-weight-bold text-cyan-3">All Generators Valid</div>
          <div class="text-caption text-grey-6">clan vars check: OK</div>
        </q-card>
      </div>
    </div>

    <!-- Variables Table -->
    <q-card flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold row items-center">
          <q-icon name="mdi-variable" color="primary" class="q-mr-xs" size="20px" />
          <span>Clan Variables Registry · سجل متغيرات النظام</span>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-table
          :rows="filteredVars"
          :columns="varColumns"
          row-key="id"
          flat
          dense
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-key="slotProps">
            <q-td :props="slotProps">
              <span class="text-weight-bold font-mono">{{ slotProps.row.key }}</span>
            </q-td>
          </template>

          <template #body-cell-scope="slotProps">
            <q-td :props="slotProps">
              <q-badge
                :color="slotProps.row.scope === 'Shared' ? 'indigo-7' : 'teal-7'"
                :label="slotProps.row.scope"
                class="q-px-xs text-caption"
              />
            </q-td>
          </template>

          <template #body-cell-value="slotProps">
            <q-td :props="slotProps">
              <div v-if="slotProps.row.isSecret" class="row items-center q-gutter-xs">
                <span class="font-mono text-grey-5">••••••••••••••••</span>
                <q-badge color="grey-8" text-color="amber-4" label="PROTECTED" class="text-caption" />
              </div>
              <span v-else class="font-mono text-grey-3">{{ slotProps.row.value }}</span>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const loading = ref(false);
const filter = ref('');

const varColumns = [
  { name: 'machine', label: 'Machine · الجهاز', field: 'machine', align: 'left' as const },
  { name: 'key', label: 'Variable Key · المفتاح', field: 'key', align: 'left' as const },
  { name: 'scope', label: 'Scope · النطاق', field: 'scope', align: 'center' as const },
  { name: 'value', label: 'Value · القيمة', field: 'value', align: 'left' as const },
];

const varRows = ref([
  {
    id: 'v1',
    machine: 'client2',
    key: 'networking/ip-address',
    scope: 'Machine',
    value: '76.13.51.10',
    isSecret: false,
  },
  {
    id: 'v2',
    machine: 'client2',
    key: 'networking/domain',
    scope: 'Machine',
    value: 'fastfree.cloud',
    isSecret: false,
  },
  {
    id: 'v3',
    machine: 'client2',
    key: 'database/root-password',
    scope: 'Machine',
    value: 'secret_hash_here',
    isSecret: true,
  },
  {
    id: 'v4',
    machine: 'client1',
    key: 'wireguard/endpoint',
    scope: 'Machine',
    value: '192.168.1.105:51820',
    isSecret: false,
  },
  {
    id: 'v5',
    machine: 'Fleet',
    key: 'network/mesh-psk',
    scope: 'Shared',
    value: 'wireguard_preshared_key',
    isSecret: true,
  },
  {
    id: 'v6',
    machine: 'Fleet',
    key: 'caddy/acme-email',
    scope: 'Shared',
    value: 'admin@fastfree.cloud',
    isSecret: false,
  },
]);

const filteredVars = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return varRows.value;
  return varRows.value.filter(
    (v) =>
      v.machine.toLowerCase().includes(q) ||
      v.key.toLowerCase().includes(q) ||
      v.value.toLowerCase().includes(q)
  );
});

function refreshVars() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    $q.notify({
      type: 'positive',
      message: 'Clan variables refreshed · تم تحديث المتغيرات',
      position: 'top-right',
    });
  }, 400);
}
</script>

<style scoped lang="scss">
.clan-vars-screen {
  height: 100%;
  overflow-y: auto;
}
.font-mono {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
