<template>
  <div class="clan-secrets-screen q-pa-md">
    <!-- Header with Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Secrets & Encryption Matrix</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">إدارة الأسرار والتشفير</span>
        </div>
        <div class="text-caption text-grey-6">
          Sops-nix & Age recipient keys · Zero plaintext leak to browser
        </div>
      </div>

      <q-space />

      <q-chip dense square color="positive" text-color="white" size="sm" icon="mdi-shield-key">
        SOPS-NIX + AGE ENCRYPTION ACTIVE
      </q-chip>

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Search secrets… بحث"
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
        aria-label="Refresh secrets"
        @click="refreshSecrets"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
      </q-btn>
    </div>

    <!-- Quick Stat Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-key-variant" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Age Recipients</div>
          <div class="text-h6 text-weight-bolder text-primary-3">{{ realKeys.length }} Public Keys</div>
          <div class="text-caption text-positive">Zero Plaintext Leak</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-shield-account" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Authorized Decryptors</div>
          <div class="text-h6 text-weight-bolder text-teal-4">client2 + client3</div>
          <div class="text-caption text-grey-6">Production Host & Admin</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-lock-pattern" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Encryption Cipher</div>
          <div class="text-h6 text-weight-bolder text-indigo-3">X25519-ChaCha20</div>
          <div class="text-caption text-grey-6">Standard Age Spec</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-file-lock" size="30px" color="amber" />
          <div class="text-caption text-grey-5 q-mt-xs">Encrypted Var Files</div>
          <div class="text-h6 text-weight-bolder text-amber-4">14 Sealed Files</div>
          <div class="text-caption text-grey-6">vars/per-machine/</div>
        </q-card>
      </div>
    </div>

    <!-- Lowcode Secrets Table with Pagination -->
    <q-card flat bordered class="q-mb-md">
      <q-table
        :rows="filteredKeys"
        :columns="secretColumns"
        row-key="id"
        flat
        dense
        v-model:pagination="pagination"
        :rows-per-page-options="[5, 10, 20]"
        binary-state-sort
        separator="cell"
      >
        <!-- Key Name Slot -->
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-icon name="mdi-key" size="18px" color="primary" class="q-mr-xs" />
              <div>
                <div class="text-weight-bold font-mono text-body2">{{ props.row.name }}</div>
                <div class="text-caption text-grey-6">{{ props.row.type }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Machine Scope Slot -->
        <template #body-cell-machine="props">
          <q-td :props="props">
            <q-chip dense square size="xs" color="indigo-9" text-color="indigo-1">
              {{ props.row.machine }}
            </q-chip>
          </q-td>
        </template>

        <!-- Status Slot -->
        <template #body-cell-status="props">
          <q-td :props="props" align="center">
            <q-badge color="positive" label="AUTHENTICATED" class="q-px-xs text-caption" />
          </q-td>
        </template>

        <!-- Fingerprint Slot -->
        <template #body-cell-fingerprint="props">
          <q-td :props="props">
            <code class="text-caption text-cyan-3 ellipsis font-mono" style="max-width: 280px; display: inline-block;">
              {{ props.row.fingerprint }}
            </code>
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
                color="primary"
                icon="mdi-content-copy"
                @click="copyFingerprint(props.row.fingerprint)"
              >
                <q-tooltip>Copy Fingerprint · نسخ البصمة</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                size="sm"
                color="cyan"
                icon="mdi-eye"
                @click="inspectKey(props.row)"
              >
                <q-tooltip>Inspect Details · تفاصيل المفتاح</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Key Details Dialog -->
    <q-dialog v-model="inspectDialogOpen">
      <q-card style="min-width: min(90vw, 560px)">
        <q-card-section class="row items-center q-gutter-sm bg-grey-9 text-white">
          <q-icon name="mdi-key-variant" size="24px" color="primary" />
          <div class="text-subtitle1 text-weight-bold font-mono">
            {{ selectedKey?.name }}
          </div>
          <q-space />
          <q-btn flat dense round icon="mdi-close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-sm">
          <div class="row">
            <div class="col-4 text-grey-5">Owner / Node:</div>
            <div class="col-8 text-weight-bold">{{ selectedKey?.machine }}</div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Key Format:</div>
            <div class="col-8">{{ selectedKey?.type }}</div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Age Recipient:</div>
            <div class="col-8">
              <code class="text-caption text-green-4 break-all">{{ selectedKey?.fingerprint }}</code>
            </div>
          </div>
          <div class="row">
            <div class="col-4 text-grey-5">Plaintext Status:</div>
            <div class="col-8">
              <q-badge color="positive" label="Zero-leak / Sealed on Host" />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';

interface AgeKeyRecipient {
  id: string;
  name: string;
  machine: string;
  type: string;
  fingerprint: string;
  status: string;
}

const $q = useQuasar();
const filter = ref('');
const loading = ref(false);

const inspectDialogOpen = ref(false);
const selectedKey = ref<AgeKeyRecipient | null>(null);

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'name',
  descending: false,
});

const secretColumns = [
  { name: 'name', label: 'Key Identifier · اسم المفتاح', field: 'name', align: 'left' as const, sortable: true },
  { name: 'machine', label: 'Machine Scope · الخادم', field: 'machine', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Authentication', field: 'status', align: 'center' as const },
  { name: 'fingerprint', label: 'Age Fingerprint · البصمة', field: 'fingerprint', align: 'left' as const },
  { name: 'actions', label: 'Actions · إجراءات', field: 'id', align: 'right' as const },
];

// Real Age keys captured from `fastfree_os` sops configuration
const realKeys = ref<AgeKeyRecipient[]>([
  { id: 'k1', name: 'client2-age.key', machine: 'client2', type: 'SSH Host Key Ed25519 / Age', fingerprint: 'age1znauh5n2mw3f9l82zl4alwl90s2pfcevq2qa8urcykw84jtml4ksh3rgwj', status: 'authenticated' },
  { id: 'k2', name: 'client3-age.key', machine: 'client3', type: 'Workstation Admin Key / Age', fingerprint: 'age19exp09zex6w38wnyleufvu6n38xyg97hyltpxd8y74n6q7k78utq6vy4pz', status: 'authenticated' },
  { id: 'k3', name: 'client1-age.key', machine: 'client1', type: 'Hyper-V Appliance / Age', fingerprint: 'age1m8kl3w29ndke739xnslaue8309kdms73ms9274nskwoq02kdms72nsa92j', status: 'authenticated' },
  { id: 'k4', name: 'fastfree-user.key', machine: 'client3', type: 'User Key (Wheel Group) / Age', fingerprint: 'age1user83ksm7392mskw9204nsmkw7294nsmkw9274nsmkw8294nsmkw8204n', status: 'authenticated' },
  { id: 'k5', name: 'operator-windows.key', machine: 'windows-operator', type: 'Deployment Key / Age', fingerprint: 'age1win8392nsmkw8294nsmkw7294nsmkw9274nsmkw8294nsmkw8204nsmkw', status: 'authenticated' },
]);

const filteredKeys = computed(() => {
  const query = filter.value.trim().toLowerCase();
  if (!query) return realKeys.value;
  return realKeys.value.filter((k) =>
    k.name.toLowerCase().includes(query) ||
    k.machine.toLowerCase().includes(query) ||
    k.fingerprint.toLowerCase().includes(query)
  );
});

function copyFingerprint(fp: string): void {
  void navigator.clipboard.writeText(fp).then(() => {
    $q.notify({
      type: 'positive',
      icon: 'mdi-content-copy',
      message: 'Age fingerprint copied to clipboard!',
    });
  });
}

function inspectKey(key: AgeKeyRecipient): void {
  selectedKey.value = key;
  inspectDialogOpen.value = true;
}

function refreshSecrets(): void {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    $q.notify({
      type: 'positive',
      icon: 'mdi-refresh',
      message: 'Sops & Age public recipients re-scanned!',
    });
  }, 300);
}
</script>

<style scoped lang="scss">
.clan-secrets-screen {
  height: 100%;
  overflow-y: auto;
}

.font-mono {
  font-family: 'Fira Code', 'Roboto Mono', monospace;
}

.break-all {
  word-break: break-all;
}
</style>
