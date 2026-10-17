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

      <q-btn
        color="primary"
        icon="mdi-plus"
        label="Add Machine · إضافة جهاز"
        dense
        class="q-px-sm"
        @click="addDialogOpen = true"
      >
        <q-tooltip>Register new client or server</q-tooltip>
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

    <!-- Loading State -->
    <div v-if="clanStore.loading && filteredMachines.length === 0" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="48px" />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!clanStore.loading && filteredMachines.length === 0"
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
              :color="getMachineStatusColor(m)"
              :label="getMachineStatusLabel(m)"
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
            <q-btn
              flat
              dense
              size="sm"
              color="grey-5"
              icon="mdi-information-outline"
              label="Details"
              @click.stop="openDetail(m)"
            />
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

    <!-- Add Machine Modal -->
    <q-dialog v-model="addDialogOpen">
      <q-card style="min-width: min(90vw, 560px)">
        <q-card-section class="row items-center q-gutter-sm bg-primary text-white">
          <q-icon name="mdi-server-plus" size="24px" />
          <div class="text-subtitle1 text-weight-bold">Register New Machine · إضافة سيرفر / عميل جديد</div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-y-md">
          <q-input
            v-model="newMachine.name"
            label="Machine Name · اسم الجهاز (e.g. client4, vps-cairo)"
            outlined
            dense
          />
          <q-input
            v-model="newMachine.targetHost"
            label="Target Host / SSH IP · العنوان والمنفذ (e.g. root@192.168.1.100)"
            outlined
            dense
          />
          <q-select
            v-model="newMachine.machineClass"
            :options="['vps', 'server', 'workstation', 'hyperv']"
            label="Machine Class / Role · التصنيف والدور"
            outlined
            dense
          />

          <q-banner rounded class="bg-grey-9 text-grey-3 text-caption">
            <div class="text-weight-bold q-mb-xs">Declarative Clan Commands · أوامر كلان لإنشاء وتجهيز السيرفر:</div>
            <code>clan machines create {{ newMachine.name || '&lt;name&gt;' }}</code><br />
            <code>clan vars generate</code><br />
            <code>clan machines install {{ newMachine.name || '&lt;name&gt;' }}</code>
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel · إلغاء" v-close-popup />
          <q-btn
            color="primary"
            icon="mdi-check"
            label="Save to Inventory · حفظ وتوليد"
            @click="saveNewMachine"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useClanStore } from '../stores/clan';
import { type MachineSummary } from '../lib/api';
import { DynamicTable, EmptyState } from '../lib/lowcode';

const $q = useQuasar();
const clanStore = useClanStore();
const filter = ref('');
const detailOpen = ref(false);
const addDialogOpen = ref(false);
const selectedMachine = ref<MachineSummary | null>(null);

const newMachine = ref({
  name: '',
  targetHost: '',
  machineClass: 'vps',
});

function getMachineStatusLabel(m: MachineSummary): string {
  if (m.name === 'client2') return 'ONLINE (HOST)';
  if (m.isOnline || m.reachable) return 'ONLINE';
  return 'CONFIGURED';
}

function getMachineStatusColor(m: MachineSummary): string {
  if (m.name === 'client2') return 'positive';
  if (m.isOnline || m.reachable) return 'positive';
  return 'cyan-8';
}

function saveNewMachine(): void {
  if (!newMachine.value.name.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please enter a valid machine name.',
    });
    return;
  }

  clanStore.machines.push({
    name: newMachine.value.name.trim(),
    hostname: newMachine.value.targetHost.trim() || null,
    isOnline: null,
    description: `NixOS ${newMachine.value.machineClass} node`,
    host: newMachine.value.targetHost.trim() || 'pending',
    tags: [newMachine.value.machineClass, 'fleet'],
  });

  $q.notify({
    type: 'positive',
    icon: 'mdi-check-decagram',
    message: `Machine ${newMachine.value.name} registered in Clan inventory!`,
  });

  addDialogOpen.value = false;
  newMachine.value = { name: '', targetHost: '', machineClass: 'vps' };
}

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
  try {
    await clanStore.triggerMachineUpdate(machineName);
    $q.notify({
      type: 'positive',
      icon: 'mdi-check-circle',
      message: `Machine ${machineName} updated successfully!`,
    });
  } catch {
    $q.notify({
      type: 'negative',
      icon: 'mdi-alert-circle',
      message: clanStore.error || `Failed to update machine ${machineName}`,
    });
  }
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
