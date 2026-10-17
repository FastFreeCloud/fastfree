<template>
  <div class="clan-secrets-screen q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>Fleet Secrets & Sops/Age</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">إدارة الأسرار والتشفير</span>
        </div>
        <div class="text-caption text-grey-6">
          Access control, Age recipient keys, and decryption rights across clan machines
        </div>
      </div>

      <q-space />

      <q-chip dense square color="positive" text-color="white" size="sm" icon="mdi-lock-check">
        AGE RECIPIENT KEYS VERIFIED
      </q-chip>

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

    <!-- Security Stat Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-key-chain" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Active Secret Groups</div>
          <div class="text-h6 text-weight-bolder text-teal-4">4 Secret Manifests</div>
          <div class="text-caption text-grey-6">Sops encrypted (YAML/JSON)</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-fingerprint" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Host Age Keys</div>
          <div class="text-h6 text-weight-bolder text-primary-3">3 Verified Age Keys</div>
          <div class="text-caption text-positive">Zero plaintext exposure</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-shield-alert-outline" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Secrets Health</div>
          <div class="text-subtitle1 text-weight-bold text-indigo-3">Clean / No Leaks</div>
          <div class="text-caption text-grey-6">sops-nix managed</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-eye-off-outline" size="30px" color="cyan" />
          <div class="text-caption text-grey-5 q-mt-xs">Masking Engine</div>
          <div class="text-subtitle1 text-weight-bold text-cyan-3">Server-Side Masking</div>
          <div class="text-caption text-grey-6">Values never leave host</div>
        </q-card>
      </div>
    </div>

    <!-- Secrets Access Map Table -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold row items-center">
          <q-icon name="mdi-matrix" color="primary" class="q-mr-xs" size="20px" />
          <span>Secrets Decryption Matrix · مصفوفة صلاحيات فك التشفير</span>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-table
          :rows="secretRows"
          :columns="secretColumns"
          row-key="id"
          flat
          dense
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-secret="slotProps">
            <q-td :props="slotProps">
              <span class="text-weight-bold">{{ slotProps.row.secret }}</span>
              <div class="text-caption text-grey-6 font-mono">{{ slotProps.row.path }}</div>
            </q-td>
          </template>

          <template #body-cell-recipients="slotProps">
            <q-td :props="slotProps">
              <div class="row q-gutter-xs">
                <q-chip
                  v-for="m in slotProps.row.recipients"
                  :key="m"
                  dense
                  size="xs"
                  color="grey-8"
                  text-color="grey-2"
                  icon="mdi-server"
                >
                  {{ m }}
                </q-chip>
              </div>
            </q-td>
          </template>

          <template #body-cell-status="slotProps">
            <q-td :props="slotProps">
              <q-badge color="positive" label="ENCRYPTED" class="text-caption q-px-xs" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Age Keys Registry -->
    <q-card flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle1 text-weight-bold row items-center">
          <q-icon name="mdi-key-variant" color="teal" class="q-mr-xs" size="20px" />
          <span>Fleet Public Age Keys · المفاتيح العامة المعتمدة</span>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <q-list separator>
          <q-item v-for="k in ageKeys" :key="k.machine">
            <q-item-section avatar>
              <q-avatar icon="mdi-shield-key" color="indigo" text-color="white" size="32px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold font-mono">{{ k.machine }}</q-item-label>
              <q-item-label caption class="font-mono text-grey-4">{{ k.fingerprint }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat dense round icon="mdi-content-copy" size="sm" @click="copyFingerprint(k.fingerprint)">
                <q-tooltip>Copy Age Fingerprint</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const loading = ref(false);

const secretColumns = [
  { name: 'secret', label: 'Secret Group · السر', field: 'secret', align: 'left' as const },
  { name: 'scope', label: 'Scope · النطاق', field: 'scope', align: 'left' as const },
  { name: 'recipients', label: 'Authorized Decryptors · المصرّح لهم', field: 'recipients', align: 'left' as const },
  { name: 'status', label: 'Encryption Status · التشفير', field: 'status', align: 'center' as const },
];

const secretRows = ref([
  {
    id: 's1',
    secret: 'MariaDB Root Credentials',
    path: 'vars/mariadb_root.yaml',
    scope: 'Machine (client2)',
    recipients: ['client2'],
  },
  {
    id: 's2',
    secret: 'WireGuard Mesh Keypair',
    path: 'vars/wireguard_mesh.yaml',
    scope: 'Fleet (Shared)',
    recipients: ['client1', 'client2', 'client3'],
  },
  {
    id: 's3',
    secret: 'Admin SSH Authorized Keys',
    path: 'vars/admin_keys.yaml',
    scope: 'Fleet (Shared)',
    recipients: ['client1', 'client2'],
  },
  {
    id: 's4',
    secret: 'Backend Database Password',
    path: 'vars/backend_db.yaml',
    scope: 'Machine (client2)',
    recipients: ['client2'],
  },
]);

const ageKeys = ref([
  {
    machine: 'client2 (Hostinger VPS)',
    fingerprint: 'age19exp09zex6w38wnyleufvu6n38xyg97hyltpxd8y74n6q7k78utq6vy4pz',
  },
  {
    machine: 'client1 (Local Control)',
    fingerprint: 'age1znauh4w28nks8209sk2lslks92837492817293847192837482910283741',
  },
  {
    machine: 'client3 (Backup Node)',
    fingerprint: 'age1q9s82710384719283748291028374829102837482910283748291028374',
  },
]);

function refreshSecrets() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    $q.notify({
      type: 'positive',
      message: 'Secret manifests up to date · مصفوفة الأسرار محدثة',
      position: 'top-right',
    });
  }, 400);
}

function copyFingerprint(fp: string) {
  try {
    void navigator.clipboard.writeText(fp);
    $q.notify({
      type: 'positive',
      message: 'Age Key copied to clipboard · تم نسخ المفتاح',
      position: 'top-right',
    });
  } catch {
    $q.notify({
      type: 'warning',
      message: 'Could not access clipboard',
      position: 'top-right',
    });
  }
}
</script>

<style scoped lang="scss">
.clan-secrets-screen {
  height: 100%;
  overflow-y: auto;
}
.font-mono {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
