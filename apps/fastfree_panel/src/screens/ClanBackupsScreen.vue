<template>
  <div class="clan-backups-screen q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Fleet Backups</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">النسخ الاحتياطي للأجهزة</span>
        </div>
        <div class="text-caption text-grey-6">
          Backup status, Borg repository schedules, and retention per machine
        </div>
      </div>

      <q-space />

      <q-chip dense square color="positive" text-color="white" size="sm" icon="mdi-shield-check">
        BORG REPOSITORIES SYNCHRONIZED
      </q-chip>

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
    </div>

    <!-- Summary Metric Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-backup-restore" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">With Backups · لديها نسخ</div>
          <div class="text-h6 text-weight-bolder text-primary-3">{{ backupSummary.with }} Machines</div>
          <div class="text-caption text-positive">Borg Repos Active</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-cloud-off-outline" size="30px" color="grey-6" />
          <div class="text-caption text-grey-5 q-mt-xs">Without Backups · بدون نسخ</div>
          <div class="text-h6 text-weight-bolder text-grey-4">{{ backupSummary.without }} Machines</div>
          <div class="text-caption text-grey-6">Stateless / Ephemeral</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-clock-check-outline" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Latest Snapshot · أحدث نسخة</div>
          <div class="text-subtitle1 text-weight-bold text-teal-4">{{ backupSummary.latest }}</div>
          <div class="text-caption text-grey-6">Zero data loss</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-timer-sand" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Daily Schedule · الجدول الافتراضي</div>
          <div class="text-subtitle1 text-weight-bold text-indigo-3">Daily at 01:00 UTC</div>
          <div class="text-caption text-grey-6">Systemd timer driven</div>
        </q-card>
      </div>
    </div>

    <!-- Machine Backup Status Table -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold row items-center">
          <q-icon name="mdi-database-clock-outline" color="primary" class="q-mr-xs" size="20px" />
          <span>Machine Backup Repositories · مستودعات النسخ الاحتياطي</span>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-table
          :rows="backupRows"
          :columns="backupColumns"
          row-key="name"
          flat
          dense
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-status="slotProps">
            <q-td :props="slotProps">
              <q-badge
                :color="slotProps.row.color === '#5CC8A1' ? 'positive' : 'warning'"
                :label="slotProps.row.status"
                class="q-px-xs text-caption"
              />
            </q-td>
          </template>

          <template #body-cell-actions="slotProps">
            <q-td :props="slotProps" class="q-gutter-xs">
              <q-btn
                dense
                flat
                size="sm"
                color="primary"
                icon="mdi-plus"
                label="Create Snapshot"
                :disable="!slotProps.row.canCreate"
                @click="triggerBackup(slotProps.row.name)"
              >
                <q-tooltip>Run on-demand Borg snapshot for {{ slotProps.row.name }}</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Backup Schedule & Excludes -->
    <q-card flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold row items-center">
          <q-icon name="mdi-calendar-clock" color="teal" class="q-mr-xs" size="20px" />
          <span>Borg Backup Configuration & Excludes · إعدادات الجدولة والاستثناءات</span>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-table
          :rows="configRows"
          :columns="configColumns"
          row-key="name"
          flat
          dense
          :pagination="{ rowsPerPage: 10 }"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const loading = ref(false);

const backupSummary = ref({
  with: 2,
  without: 1,
  latest: 'Today, 01:00 UTC',
});

const backupColumns = [
  { name: 'name', label: 'Machine · الجهاز', field: 'name', align: 'left' as const },
  { name: 'last', label: 'Last Backup · آخر نسخة', field: 'last', align: 'left' as const },
  { name: 'count', label: 'Snapshots · العدد', field: 'count', align: 'center' as const },
  { name: 'status', label: 'Status · الحالة', field: 'status', align: 'left' as const },
  { name: 'actions', label: 'Actions · الإجراءات', field: 'actions', align: 'right' as const },
];

const backupRows = ref([
  {
    name: 'client2',
    last: 'Today 01:00 (Daily)',
    count: 14,
    status: 'Healthy · سليم',
    color: '#5CC8A1',
    canCreate: true,
  },
  {
    name: 'client1',
    last: 'Yesterday 01:00',
    count: 7,
    status: 'Healthy · سليم',
    color: '#5CC8A1',
    canCreate: true,
  },
  {
    name: 'client3',
    last: 'No backups configured',
    count: 0,
    status: 'Stateless Node',
    color: '#E5776B',
    canCreate: false,
  },
]);

const configColumns = [
  { name: 'name', label: 'Machine · الجهاز', field: 'name', align: 'left' as const },
  { name: 'dest', label: 'Destination Repository · الوجهة', field: 'dest', align: 'left' as const },
  { name: 'sched', label: 'Schedule · الجدول', field: 'sched', align: 'left' as const },
  { name: 'exclude', label: 'Excludes · المستثنى', field: 'exclude', align: 'left' as const },
];

const configRows = ref([
  {
    name: 'client2',
    dest: '/var/lib/borgbackup/client2.repo',
    sched: 'Daily at 01:00 UTC',
    exclude: '/tmp, /nix/store, /proc, /sys',
  },
  {
    name: 'client1',
    dest: 'borg@client2:/var/lib/borgbackup/client1.repo',
    sched: 'Daily at 01:00 UTC',
    exclude: '/tmp, /nix/store, .cache',
  },
]);

function refreshBackups() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    $q.notify({
      type: 'positive',
      message: 'Backup repositories up to date · المستودعات محدثة',
      position: 'top-right',
    });
  }, 400);
}

function triggerBackup(machineName: string) {
  $q.notify({
    type: 'info',
    message: `Snapshot queued for ${machineName} · جاري تجهيز النسخة`,
    position: 'top-right',
  });
}
</script>

<style scoped lang="scss">
.clan-backups-screen {
  height: 100%;
  overflow-y: auto;
}
</style>
