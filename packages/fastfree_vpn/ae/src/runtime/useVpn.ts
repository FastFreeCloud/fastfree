import { ref, onMounted, onUnmounted } from 'vue';
import { WireGuardService } from './wireguard.service';
import type { WgConfig, WgStatus } from './types';

export function useVpn() {
  const connected = ref(false);
  const loading = ref(false);
  const status = ref<WgStatus | null>(null);
  const error = ref<string | null>(null);
  let statusInterval: ReturnType<typeof setInterval> | null = null;

  async function connect(config: WgConfig) {
    loading.value = true;
    error.value = null;
    try {
      await WireGuardService.connect(config);
      connected.value = true;
      await refreshStatus();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Connection failed';
      connected.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function disconnect() {
    loading.value = true;
    error.value = null;
    try {
      await WireGuardService.disconnect();
      connected.value = false;
      status.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Disconnect failed';
    } finally {
      loading.value = false;
    }
  }

  async function refreshStatus() {
    try {
      status.value = await WireGuardService.getStatus();
      connected.value = status.value.connected;
    } catch {
      connected.value = false;
    }
  }

  function startStatusPolling(intervalMs = 5000) {
    stopStatusPolling();
    statusInterval = setInterval(refreshStatus, intervalMs);
  }

  function stopStatusPolling() {
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
  }

  onMounted(() => {
    void refreshStatus();
  });

  onUnmounted(() => {
    stopStatusPolling();
  });

  return {
    connected,
    loading,
    status,
    error,
    connect,
    disconnect,
    refreshStatus,
    startStatusPolling,
    stopStatusPolling
  };
}
