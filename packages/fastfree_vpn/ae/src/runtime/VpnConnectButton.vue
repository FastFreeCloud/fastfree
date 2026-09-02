<template>
  <q-btn
    :icon="connected ? 'link_off' : 'link'"
    :color="connected ? 'red' : 'green'"
    :label="connected ? 'Disconnect VPN' : 'Connect VPN'"
    :loading="loading"
    :disable="loading"
    @click="handleToggle"
  />
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

const { connected, loading, connect, disconnect } = useVpn();

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
