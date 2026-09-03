"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVpn = useVpn;
const vue_1 = require("vue");
const wireguard_service_1 = require("./wireguard.service");
function useVpn() {
    const connected = (0, vue_1.ref)(false);
    const loading = (0, vue_1.ref)(false);
    const status = (0, vue_1.ref)(null);
    const error = (0, vue_1.ref)(null);
    let statusInterval = null;
    async function connect(config) {
        loading.value = true;
        error.value = null;
        try {
            await wireguard_service_1.WireGuardService.connect(config);
            connected.value = true;
            await refreshStatus();
        }
        catch (e) {
            error.value = e instanceof Error ? e.message : 'Connection failed';
            connected.value = false;
        }
        finally {
            loading.value = false;
        }
    }
    async function disconnect() {
        loading.value = true;
        error.value = null;
        try {
            await wireguard_service_1.WireGuardService.disconnect();
            connected.value = false;
            status.value = null;
        }
        catch (e) {
            error.value = e instanceof Error ? e.message : 'Disconnect failed';
        }
        finally {
            loading.value = false;
        }
    }
    async function refreshStatus() {
        try {
            status.value = await wireguard_service_1.WireGuardService.getStatus();
            connected.value = status.value.connected;
        }
        catch {
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
    (0, vue_1.onMounted)(() => {
        void refreshStatus();
    });
    (0, vue_1.onUnmounted)(() => {
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
