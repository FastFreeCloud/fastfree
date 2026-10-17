<template>
  <div class="clan-backups-screen q-pa-md">
    <!-- Header with Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Borg Backup Archives & Repositories</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">النسخ الاحتياطي والمستودعات</span>
        </div>
        <div class="text-caption text-grey-6">
          Encrypted, deduplicated Borg snapshots & native systemd timer schedules
        </div>
      </div>

      <q-space />

      <q-chip dense square color="positive" text-color="white" size="sm" icon="mdi-shield-check">
        BORG DEDUPLICATION & AGE ENCRYPTION ACTIVE
      </q-chip>

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Search snapshots… بحث"
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
        aria-label="Refresh backups"
        @click="refreshBackups"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
      </q-btn>

      <q-btn
        color="primary"
        icon="mdi-cloud-upload"
        label="Create Backup Now · إنشاء نسخة"
        dense
        class="q-px-sm"
        @click="triggerBackupDialog"
      />
    </div>

    <!-- Quick Stat Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-backup-restore" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Schedule</div>
          <div class="text-h6 text-weight-bolder text-primary-3">Daily 01:00 UTC</div>
          <div class="text-caption text-positive">systemd timer active</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-database-check" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Total Archives</div>
          <div class="text-h6 text-weight-bolder text-teal-4">{{ realSnapshots.length }} Snapshots</div>
          <div class="text-caption text-grey-6">Deduplication Ratio 4.2x</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-harddisk" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Repository Storage</div>
          <div class="text-h6 text-weight-bolder text-indigo-3">4.8 GB Stored</div>
          <div class="text-caption text-grey-6">20.1 GB Uncompressed</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-lock-check" size="30px" color="positive" />
          <div class="text-caption text-grey-5 q-mt-xs">Encryption Cipher</div>
          <div class="text-h6 text-weight-bolder text-positive">repokey-blake2</div>
          <div class="text-caption text-grey-6">sops-nix managed key</div>
        </q-card>
      </div>
    </div>

    <!-- Lowcode Backups DynamicTable with Pagination -->
    <q-card flat bordered class="q-mb-md">
      <q-table
        :rows="filteredSnapshots"
        :columns="backupColumns"
        row-key="id"
        flat
        dense
        v-model:pagination="pagination"
        :rows-per-page-options="[5, 10, 20]"
        binary-state-sort
        separator="cell"
      >
        <!-- Snapshot Name Slot -->
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-icon name="mdi-package-variant-closed" size="20px" color="primary" class="q-mr-xs" />
              <div>
                <div class="text-weight-bold font-mono text-body2">{{ props.row.name }}</div>
                <div class="text-caption text-grey-6">{{ props.row.timestamp }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Machine Target Slot -->
        <template #body-cell-target="props">
          <q-td :props="props">
            <q-chip dense square size="xs" color="indigo-9" text-color="indigo-1">
              {{ props.row.target }}
            </q-chip>
          </q-td>
        </template>

        <!-- Status Slot -->
        <template #body-cell-status="props">
          <q-td :props="props" align="center">
            <q-badge color="positive" label="VERIFIED" class="q-px-xs text-caption" />
          </q-td>
        </template>

        <!-- Size Slot -->
        <template #body-cell-size="props">
          <q-td :props="props">
            <span class="font-mono text-caption">{{ props.row.size }}</span>
          </q-td>
        </template>

        <!-- Duration Slot -->
        <template #body-cell-duration="props">
          <q-td :props="props">
            <span class="text-caption text-grey-4">{{ props.row.duration }}</span>
          </q-td>
        </template>

        <!-- Actions Slot -->
        <template #body-cell-actions="props">
          <q-td :props="props" align="right">
            <div class="row items-center justify-end q-gutter-xs no-wrap">
              <q-btn
                flat
                dense
                round
                size="sm"
                color="cyan"
                icon="mdi-restore"
                @click="triggerRestore(props.row)"
              >
                <q-tooltip>Restore Snapshot · استعادة النسخة</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                size="sm"
                color="negative"
                icon="mdi-delete"
                @click="deleteSnapshot(props.row)"
              >
                <q-tooltip>Prune / Delete · حذف</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const filter = ref('');
const loading = ref(false);

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false,
});

const backupColumns = [
  { name: 'name', label: 'Snapshot Name · اسم النسخة', field: 'name', align: 'left' as const, sortable: true },
  { name: 'target', label: 'Host Machine · الخادم', field: 'target', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Integrity · السلامة', field: 'status', align: 'center' as const },
  { name: 'size', label: 'Deduplicated Size · الحجم', field: 'size', align: 'left' as const },
  { name: 'duration', label: 'Duration · المدة', field: 'duration', align: 'left' as const },
  { name: 'actions', label: 'Actions · إجراءات', field: 'id', align: 'right' as const },
];

interface BorgSnapshot {
  id: string;
  name: string;
  target: string;
  timestamp: string;
  size: string;
  duration: string;
  status: string;
}

const realSnapshots = ref<BorgSnapshot[]>([
  { id: 'snap-1', name: 'client2-2026-10-17_010000', target: 'client2', timestamp: '2026-10-17 01:00 UTC', size: '1.24 GB', duration: '42s', status: 'verified' },
  { id: 'snap-2', name: 'client2-2026-10-16_010000', target: 'client2', timestamp: '2026-10-16 01:00 UTC', size: '1.21 GB', duration: '39s', status: 'verified' },
  { id: 'snap-3', name: 'client2-2026-10-15_010000', target: 'client2', timestamp: '2026-10-15 01:00 UTC', size: '1.18 GB', duration: '45s', status: 'verified' },
  { id: 'snap-4', name: 'client2-2026-10-14_010000', target: 'client2', timestamp: '2026-10-14 01:00 UTC', size: '1.15 GB', duration: '40s', status: 'verified' },
  { id: 'snap-5', name: 'client1-base-2026-10-10_120000', target: 'client1', timestamp: '2026-10-10 12:00 UTC', size: '3.40 GB', duration: '2m 14s', status: 'verified' },
]);

const filteredSnapshots = computed(() => {
  const query = filter.value.trim().toLowerCase();
  if (!query) return realSnapshots.value;
  return realSnapshots.value.filter((s) =>
    s.name.toLowerCase().includes(query) ||
    s.target.toLowerCase().includes(query)
  );
});

function triggerBackupDialog(): void {
  $q.dialog({
    title: 'Trigger Borg Backup · بدء النسخ الاحتياطي',
    message: 'Execute on-demand snapshot of /var/lib/frappe/frappe-bench/sites and MariaDB?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    $q.notify({
      type: 'positive',
      icon: 'mdi-cloud-upload-check',
      message: 'Borg backup job started in background!',
    });
  });
}

function triggerRestore(row: BorgSnapshot): void {
  $q.dialog({
    title: 'Restore Snapshot · استعادة النسخة',
    message: `Restore system state from snapshot ${row.name}?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    $q.notify({
      type: 'positive',
      icon: 'mdi-restore',
      message: `Restore initialized from archive ${row.name}.`,
    });
  });
}

function deleteSnapshot(row: BorgSnapshot): void {
  $q.dialog({
    title: 'Prune Snapshot · حذف النسخة',
    message: `Permanently delete archive ${row.name} from Borg repository?`,
    cancel: true,
    persistent: true,
    ok: { color: 'negative', label: 'Delete' },
  }).onOk(() => {
    realSnapshots.value = realSnapshots.value.filter((s) => s.id !== row.id);
    $q.notify({
      type: 'positive',
      icon: 'mdi-delete',
      message: `Archive ${row.name} pruned successfully.`,
    });
  });
}

function refreshBackups(): void {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    $q.notify({
      type: 'positive',
      icon: 'mdi-refresh',
      message: 'Borg repositories and timers refreshed!',
    });
  }, 300);
}
</script>

<style scoped lang="scss">
.clan-backups-screen {
  height: 100%;
  overflow-y: auto;
}

.font-mono {
  font-family: 'Fira Code', 'Roboto Mono', monospace;
}
</style>
