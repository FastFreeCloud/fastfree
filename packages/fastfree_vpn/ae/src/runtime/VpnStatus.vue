<template>
  <div class="vpn-status">
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center q-gutter-sm">
          <q-icon
            :name="connected ? 'link' : 'link_off'"
            :color="connected ? 'green' : 'grey'"
            size="24px"
          />
          <div>
            <div class="text-subtitle2">
              {{ connected ? 'VPN Connected' : 'VPN Disconnected' }}
            </div>
            <div v-if="status" class="text-caption text-grey">
              {{ status.serverEndpoint }} — {{ formatBytes(status.bytesIn) }} in / {{ formatBytes(status.bytesOut) }} out
            </div>
          </div>
          <q-space />
          <q-btn
            :icon="connected ? 'link_off' : 'link'"
            :color="connected ? 'red' : 'green'"
            :label="connected ? 'Disconnect' : 'Connect'"
            :loading="loading"
            @click="handleToggle"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { useVpn } from '../composables/useVpn';
import type { WgConfig } from '../types';

const props = defineProps<{
  config: WgConfig;
}>();

const emit = defineEmits<{
  connected: [];
  disconnected: [];
  error: [message: string];
}>();

const { connected, loading, status, connect, disconnect } = useVpn();

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function handleToggle() {
  if (connected.value) {
    await disconnect();
    emit('disconnected');
  } else {
    await connect(props.config);
    if (connected.value) {
      emit('connected');
    } else {
      emit('error', 'Connection failed');
    }
  }
}
</script>
