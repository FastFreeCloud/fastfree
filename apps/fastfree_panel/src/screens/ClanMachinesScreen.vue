<template>
  <div class="clan-machines-screen q-pa-md">
    <!-- Header with Search & Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold">
          <span>Machines</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">الأجهزة</span>
        </div>
        <div class="text-caption text-grey-6">
          Managed by Clan & NixOS · مُدارة بواسطة كلان
        </div>
      </div>

      <q-space />

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Search machines… بحث"
        style="width: 240px"
      >
        <template #prepend><q-icon name="mdi-magnify" size="18px" /></template>
      </q-input>

      <q-btn
        flat
        dense
        round
        icon="mdi-refresh"
        :loading="clanStore.loading"
        aria-label="Refresh machines"
        @click="clanStore.fetchMachines"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
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

    <!-- Empty State -->
    <EmptyState
      v-if="!clanStore.loading && filteredMachines.length === 0"
      icon="mdi-server-off"
      title="No machines found"
      message="No machines are currently registered or matched the filter."
    />

    <!-- Machines Grid -->
    <div v-else class="row q-col-gutter-md">
      <div
        v-for="m in filteredMachines"
        :key="m.name"
        class="col-12 col-sm-6 col-md-4"
      >
        <q-card
          flat
          bordered
          class="machine-card cursor-pointer"
          v-ripple
          @click="openDetail(m)"
        >
          <q-card-section class="row items-center no-wrap">
            <q-avatar
              :icon="getMachineIcon(m)"
              :color="getMachineColor(m)"
              text-color="white"
              size="42px"
            />
            <div class="q-ml-md ellipsis col">
              <div class="text-weight-bold text-body1 ellipsis">{{ m.name }}</div>
              <div class="text-caption text-grey-6 ellipsis">
                {{ m.description || m.host || 'NixOS Node' }}
              </div>
            </div>
            <q-badge
              :color="m.reachable ? 'positive' : 'grey-7'"
              :label="m.reachable ? 'ONLINE' : 'ACTIVE'"
              class="q-px-xs text-caption"
            />
          </q-card-section>

          <q-card-section v-if="m.tags?.length" class="q-pt-none q-gutter-xs">
            <q-chip
              v-for="tag in m.tags"
              :key="tag"
              dense
              square
              size="xs"
              color="grey-8"
              text-color="grey-3"
              :label="tag"
            />
          </q-card-section>

          <q-separator />

          <q-card-actions align="between" class="q-px-sm">
            <q-btn
              flat
              dense
              size="sm"
              color="primary"
              icon="mdi-cog-sync"
              label="Update"
              :loading="clanStore.isDeploying"
              @click.stop="handleUpdate(m.name)"
            >
              <q-tooltip>Run clan machines update {{ m.name }}</q-tooltip>
            </q-btn>
            <q-btn flat dense size="sm" color="grey-5" icon="mdi-information-outline" label="Details" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Machine Detail Modal -->
    <q-dialog v-model="detailOpen">
      <q-card style="min-width: min(90vw, 680px)">
        <q-card-section class="row items-center q-gutter-sm bg-grey-9 text-white">
          <q-icon name="mdi-server" size="24px" color="primary" />
          <div class="text-subtitle1 text-weight-bold">{{ selectedMachine?.name }}</div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedMachine">
          <DynamicTable
            :columns="detailColumns"
            :rows="detailRows"
            row-key="key"
            flat
            dense
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            color="primary"
            icon="mdi-cloud-sync"
            label="Update Machine · تحديث الجهاز"
            :loading="clanStore.isDeploying"
            @click="handleUpdate(selectedMachine?.name || '')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useClanStore } from '../stores/clan';
import { type MachineSummary } from '../lib/api';
import { DynamicTable, EmptyState } from '../lib/lowcode';

const clanStore = useClanStore();
const filter = ref('');
const detailOpen = ref(false);
const selectedMachine = ref<MachineSummary | null>(null);

const detailColumns = [
  { name: 'property', label: 'Property · الخاصية', field: 'property', align: 'left' as const },
  { name: 'value', label: 'Value · القيمة', field: 'value', align: 'left' as const },
];

const filteredMachines = computed(() => {
  const query = filter.value.trim().toLowerCase();
  if (!query) return clanStore.machines;
  return clanStore.machines.filter((m) =>
    m.name.toLowerCase().includes(query) ||
    m.description?.toLowerCase().includes(query) ||
    m.host?.toLowerCase().includes(query)
  );
});

const detailRows = computed(() => {
  if (!selectedMachine.value) return [];
  const m = selectedMachine.value;
  return [
    { key: 'name', property: 'Machine Name', value: m.name },
    { key: 'host', property: 'Target Host / IP', value: m.host || '127.0.0.1' },
    { key: 'description', property: 'Description', value: m.description || 'Clan managed NixOS host' },
    { key: 'tags', property: 'Assigned Tags', value: m.tags?.join(', ') || 'production, vps' },
    { key: 'reachable', property: 'Network Status', value: m.reachable ? 'Online (Ping OK)' : 'Configured' },
  ];
});

function getMachineIcon(m: MachineSummary): string {
  if (m.name.includes('vps') || m.name.includes('client2')) return 'mdi-cloud-outline';
  if (m.name.includes('client1')) return 'mdi-laptop';
  return 'mdi-server';
}

function getMachineColor(m: MachineSummary): string {
  if (m.name.includes('client2')) return 'indigo-8';
  return 'blue-grey-8';
}

function openDetail(m: MachineSummary): void {
  selectedMachine.value = m;
  detailOpen.value = true;
}

async function handleUpdate(machineName: string): Promise<void> {
  if (!machineName) return;
  await clanStore.triggerMachineUpdate(machineName);
}

onMounted(() => {
  if (clanStore.machines.length === 0) {
    void clanStore.fetchMachines();
  }
});
</script>

<style scoped lang="scss">
.clan-machines-screen {
  height: 100%;
  overflow-y: auto;
}

.machine-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border-radius: 8px;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
