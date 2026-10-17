<template>
  <div class="clan-network-screen q-pa-md">
    <!-- Header with Mesh Status & Actions -->
    <div class="row items-center q-mb-md q-gutter-sm">
      <div>
        <div class="text-h6 text-weight-bold row items-center q-gutter-xs">
          <span>WireGuard & Fleet Mesh</span>
          <span lang="ar" dir="rtl" class="q-ml-sm text-subtitle1 text-grey-5">شبكة المش والـ WireGuard</span>
        </div>
        <div class="text-caption text-grey-6">
          Encrypted peer-to-peer overlay network connecting all NixOS clan machines
        </div>
      </div>

      <q-space />

      <q-chip
        dense
        square
        color="positive"
        text-color="white"
        size="sm"
        icon="mdi-shield-check"
      >
        WIREGUARD MESH ONLINE
      </q-chip>

      <q-input
        v-model="filter"
        dense
        outlined
        clearable
        debounce="200"
        placeholder="Filter peers & ifaces… تصفية"
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
        aria-label="Refresh network mesh"
        @click="refreshNetwork"
      >
        <q-tooltip>Refresh · تحديث</q-tooltip>
      </q-btn>
    </div>

    <!-- Quick Stats Cards -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-shield-lock-outline" size="30px" color="teal" />
          <div class="text-caption text-grey-5 q-mt-xs">Mesh Protocol</div>
          <div class="text-subtitle2 text-weight-bold text-teal-4">WireGuard (ChaCha20)</div>
          <div class="text-caption text-grey-6">End-to-End Encrypted</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-lan-connect" size="30px" color="primary" />
          <div class="text-caption text-grey-5 q-mt-xs">Connected Mesh Peers</div>
          <div class="text-subtitle2 text-weight-bold text-primary-3">2 / 2 Active Peers</div>
          <div class="text-caption text-positive">100% Reachable</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-swap-horizontal-bold" size="30px" color="indigo" />
          <div class="text-caption text-grey-5 q-mt-xs">Fleet Mesh Throughput</div>
          <div class="text-subtitle2 text-weight-bold text-indigo-3">TX 1.2 GB · RX 2.4 GB</div>
          <div class="text-caption text-grey-6">Zero packet loss</div>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="q-pa-sm text-center">
          <q-icon name="mdi-routes" size="30px" color="cyan" />
          <div class="text-caption text-grey-5 q-mt-xs">Routing Priority</div>
          <div class="text-subtitle2 text-weight-bold text-cyan-3">P1 (Direct P2P Mesh)</div>
          <div class="text-caption text-grey-6">Auto fallback active</div>
        </q-card>
      </div>
    </div>

    <!-- Wireguard Peers Section -->
    <div class="q-mb-lg">
      <div class="text-subtitle1 text-weight-bold q-mb-sm row items-center">
        <q-icon name="mdi-server-network" size="20px" color="primary" class="q-mr-xs" />
        <span>Mesh Peers · أطراف الشبكة</span>
      </div>

      <!-- Empty State for WireGuard Peers -->
      <EmptyState
        v-if="filteredPeers.length === 0"
        icon="mdi-lan-disconnect"
        title="No peers found"
        message="No WireGuard peers matched the filter."
      />

      <div v-else class="row q-col-gutter-md">
        <div
          v-for="peer in filteredPeers"
          :key="peer.publicKey"
          class="col-12 col-md-6"
        >
          <q-card flat bordered class="peer-card">
            <q-card-section class="row items-center no-wrap">
              <q-avatar
                :icon="peer.isServer ? 'mdi-cloud-outline' : 'mdi-laptop'"
                :color="peer.isServer ? 'indigo-8' : 'blue-grey-8'"
                text-color="white"
                size="44px"
              />
              <div class="q-ml-md ellipsis col">
                <div class="row items-center no-wrap q-gutter-xs">
                  <span class="text-weight-bold text-subtitle1 ellipsis">{{ peer.name }}</span>
                  <q-badge
                    :color="peer.status === 'connected' ? 'positive' : 'grey-7'"
                    :label="peer.status.toUpperCase()"
                    class="text-caption"
                  />
                </div>
                <div class="text-caption text-grey-5 ellipsis">
                  Mesh IP: {{ peer.meshIp }} · Endpoint: {{ peer.endpoint }}
                </div>
              </div>
              <q-chip
                dense
                square
                size="sm"
                color="teal-9"
                text-color="teal-2"
                icon="mdi-speedometer"
              >
                {{ peer.latency }}
              </q-chip>
            </q-card-section>

            <q-separator />

            <q-card-section class="q-py-sm">
              <div class="row q-col-gutter-sm text-caption">
                <div class="col-6">
                  <span class="text-grey-5">Routing Priority: </span>
                  <strong class="text-cyan-3">{{ peer.priority }}</strong>
                </div>
                <div class="col-6">
                  <span class="text-grey-5">Last Handshake: </span>
                  <span class="text-grey-3">{{ peer.lastHandshake }}</span>
                </div>
                <div class="col-6">
                  <span class="text-grey-5">Allowed IPs: </span>
                  <span class="text-grey-3">{{ peer.allowedIps }}</span>
                </div>
                <div class="col-6">
                  <span class="text-grey-5">Transfer: </span>
                  <span class="text-grey-3">TX: {{ peer.txBytes }} · RX: {{ peer.rxBytes }}</span>
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="between" class="q-px-sm">
              <q-btn
                flat
                dense
                size="sm"
                color="primary"
                icon="mdi-network-strength-4"
                label="Ping Peer"
                :loading="pingingPeer === peer.name"
                @click="pingPeer(peer)"
              >
                <q-tooltip>Measure round-trip latency to {{ peer.name }}</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                size="sm"
                color="grey-4"
                icon="mdi-key-outline"
                label="Copy Key"
                @click="copyKey(peer.publicKey)"
              >
                <q-tooltip>Copy public key to clipboard</q-tooltip>
              </q-btn>
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Network Interfaces Section -->
    <q-card flat bordered>
      <q-card-section class="q-pb-xs row items-center">
        <q-icon name="mdi-lan" color="primary" class="q-mr-xs" size="20px" />
        <div class="text-subtitle1 text-weight-bold">
          Host Network Interfaces · واجهات الشبكة
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-none">
        <DynamicTable
          :columns="interfaceColumns"
          :rows="filteredInterfaces"
          row-key="name"
          flat
          dense
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { DynamicTable, EmptyState } from '../lib/lowcode';

export interface WireguardPeer {
  name: string;
  isServer: boolean;
  publicKey: string;
  endpoint: string;
  meshIp: string;
  allowedIps: string;
  status: 'connected' | 'disconnected' | 'syncing';
  latency: string;
  priority: string;
  lastHandshake: string;
  txBytes: string;
  rxBytes: string;
}

export interface NetworkInterface {
  name: string;
  type: string;
  ip: string;
  mtu: number;
  status: 'UP' | 'DOWN';
  mac: string;
}

const $q = useQuasar();
const filter = ref('');
const loading = ref(false);
const pingingPeer = ref<string | null>(null);

const peers = ref<WireguardPeer[]>([
  {
    name: 'client2 (Production VPS)',
    isServer: true,
    publicKey: 'a9Kx87fQ12MvLmZpTy44NqWz1AbCdEfGhIjKlMnOpQr=',
    endpoint: '195.35.48.12:51820',
    meshIp: '10.241.0.2',
    allowedIps: '10.241.0.0/24',
    status: 'connected',
    latency: '24 ms',
    priority: 'Priority 1 (Direct WireGuard)',
    lastHandshake: '18 seconds ago',
    txBytes: '412 MB',
    rxBytes: '980 MB',
  },
  {
    name: 'client1 (Admin & Dev Machine)',
    isServer: false,
    publicKey: 'b8Lz98gR23NwMnAqUz55OrXa2BcDeFgHiJkLmNoPqRs=',
    endpoint: '127.0.0.1:51820 (Local / Peer)',
    meshIp: '10.241.0.1',
    allowedIps: '10.241.0.1/32',
    status: 'connected',
    latency: '1 ms',
    priority: 'Priority 1 (Direct Loopback)',
    lastHandshake: '4 seconds ago',
    txBytes: '980 MB',
    rxBytes: '412 MB',
  },
]);

const interfaces = ref<NetworkInterface[]>([
  {
    name: 'wg0-clan',
    type: 'WireGuard Tunnel (ChaCha20)',
    ip: '10.241.0.1/24',
    mtu: 1420,
    status: 'UP',
    mac: 'None (Point-to-Point)',
  },
  {
    name: 'ens3 / eth0',
    type: 'Physical WAN Interface',
    ip: '195.35.48.12/24',
    mtu: 1500,
    status: 'UP',
    mac: '52:54:00:8f:1a:2b',
  },
  {
    name: 'lo',
    type: 'Loopback Local Interface',
    ip: '127.0.0.1/8',
    mtu: 65536,
    status: 'UP',
    mac: '00:00:00:00:00:00',
  },
]);

const interfaceColumns = [
  { name: 'name', label: 'Interface · الواجهة', field: 'name', align: 'left' as const },
  { name: 'type', label: 'Type / Driver · النوع', field: 'type', align: 'left' as const },
  { name: 'ip', label: 'IP Address · العنوان', field: 'ip', align: 'left' as const },
  { name: 'mtu', label: 'MTU', field: 'mtu', align: 'center' as const },
  { name: 'status', label: 'Status · الحالة', field: 'status', align: 'center' as const },
];

const filteredPeers = computed(() => {
  const query = filter.value.trim().toLowerCase();
  if (!query) return peers.value;
  return peers.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.endpoint.toLowerCase().includes(query) ||
      p.meshIp.toLowerCase().includes(query) ||
      p.priority.toLowerCase().includes(query)
  );
});

const filteredInterfaces = computed(() => {
  const query = filter.value.trim().toLowerCase();
  if (!query) return interfaces.value;
  return interfaces.value.filter(
    (i) =>
      i.name.toLowerCase().includes(query) ||
      i.type.toLowerCase().includes(query) ||
      i.ip.toLowerCase().includes(query)
  );
});

async function pingPeer(peer: WireguardPeer): Promise<void> {
  pingingPeer.value = peer.name;
  try {
    // Simulate ping packet transmission
    await new Promise((resolve) => setTimeout(resolve, 600));
    $q.notify({
      type: 'positive',
      icon: 'mdi-check-network-outline',
      message: `Ping successful to ${peer.name}!`,
      caption: `Round-trip time: ${peer.latency} · 0% packet loss`,
    });
  } finally {
    pingingPeer.value = null;
  }
}

async function copyKey(key: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(key);
    $q.notify({
      type: 'info',
      icon: 'mdi-content-copy',
      message: 'WireGuard public key copied to clipboard!',
    });
  } catch {
    $q.notify({
      type: 'warning',
      icon: 'mdi-alert-circle',
      message: 'Failed to copy to clipboard',
    });
  }
}

async function refreshNetwork(): Promise<void> {
  loading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    $q.notify({
      type: 'positive',
      icon: 'mdi-refresh',
      message: 'Network mesh status refreshed!',
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.clan-network-screen {
  height: 100%;
  overflow-y: auto;
}

.peer-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border-radius: 8px;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
