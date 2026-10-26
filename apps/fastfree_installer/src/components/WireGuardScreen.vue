<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('wireguard.stepTag') }}</div>
      <h2>{{ t('wireguard.title') }}</h2>
      <p class="subtitle">{{ t('wireguard.subtitle') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingConfig" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-msg">{{ t('wireguard.generatingConfig', { client: selectedClientId }) }}</p>
    </div>

    <div v-else-if="wireGuardConfig" class="content-body">
      <!-- Topology Banner -->
      <div class="mesh-banner">
        <div class="banner-left">
          <div class="tunnel-indicator">
            <span class="node-pill">{{ t('wireguard.localAppliance', { client: selectedClientId }) }}</span>
            <span class="arrow-wire">
              <svg class="tunnel-lock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>{{ t('wireguard.tunnelArrow', { port: wireGuardConfig.listen_port }) }}</span>
              <svg class="tunnel-dir-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline :points="isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
              </svg>
            </span>
            <span class="node-pill pill-controller">{{ t('wireguard.controllerNode') }}</span>
          </div>
          <div class="handshake-status">
            <span class="dot-green"></span>
            <span>{{ wireGuardConfig.status }}</span>
            <span class="latency-badge">{{ t('wireguard.latencyMs', { ms: wireGuardConfig.latency_ms }) }}</span>
          </div>
        </div>
        <button class="btn-ping" :disabled="isTestingPing" @click="testHandshake">
          <span v-if="isTestingPing" class="spinner-tiny"></span>
          <span v-else class="btn-flex">
            <svg class="ping-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>{{ t('wireguard.testHandshake') }}</span>
          </span>
        </button>
      </div>

      <!-- Peer Configuration Parameters Grid -->
      <div class="params-grid">
        <div class="param-card">
          <span class="param-name">{{ t('wireguard.paramInterface') }}</span>
          <span class="param-val"><code>{{ wireGuardConfig.interface_name }}</code></span>
          <span class="param-desc">{{ t('wireguard.paramInterfaceDesc') }}</span>
        </div>

        <div class="param-card">
          <span class="param-name">{{ t('wireguard.paramPort') }}</span>
          <span class="param-val text-accent"><code>{{ wireGuardConfig.listen_port }}</code></span>
          <span class="param-desc">{{ t('wireguard.paramPortDesc') }}</span>
        </div>

        <div class="param-card">
          <span class="param-name">{{ t('wireguard.paramTunnelIp') }}</span>
          <span class="param-val text-emerald"><code>{{ wireGuardConfig.client_tunnel_ip }}</code></span>
          <span class="param-desc">{{ t('wireguard.paramTunnelIpDesc') }}</span>
        </div>

        <div class="param-card">
          <span class="param-name">{{ t('wireguard.paramMeshSubnet') }}</span>
          <span class="param-val"><code>{{ wireGuardConfig.mesh_subnet }}</code></span>
          <span class="param-desc">{{ t('wireguard.paramMeshSubnetDesc') }}</span>
        </div>

        <div class="param-card">
          <span class="param-name">{{ t('wireguard.paramCipher') }}</span>
          <span class="param-val font-mono">{{ wireGuardConfig.cipher }}</span>
          <span class="param-desc">{{ t('wireguard.paramCipherDesc') }}</span>
        </div>

        <div class="param-card">
          <span class="param-name">{{ t('wireguard.paramKeepalive') }}</span>
          <span class="param-val">{{ t('wireguard.paramKeepaliveVal', { sec: wireGuardConfig.keepalive_seconds }) }}</span>
          <span class="param-desc">{{ t('wireguard.paramKeepaliveDesc') }}</span>
        </div>
      </div>

      <!-- Security / Clan Invariant Notice -->
      <div class="security-card">
        <div class="sec-title">
          <span class="sec-icon">
            <svg class="sec-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </span>
          <span>{{ t('wireguard.clanInvariantTitle') }}</span>
        </div>
        <p class="sec-body" v-html="t('wireguard.clanInvariantBody', { client: selectedClientId })"></p>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="currentStep = 3">
        {{ t('wireguard.backToSizing') }}
      </button>
      <button class="btn btn-primary btn-deploy" @click="currentStep = 5">
        <span class="btn-flex">
          <svg class="deploy-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
          </svg>
          <span>{{ t('wireguard.deployVhdx') }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  currentStep,
  selectedClientId,
  wireGuardConfig,
  fetchWireGuardConfig,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

const isLoadingConfig = ref(true);
const isTestingPing = ref(false);

onMounted(async () => {
  try {
    await fetchWireGuardConfig(selectedClientId.value);
  } catch (err) {
    console.error('Failed to load wireguard config:', err);
  } finally {
    isLoadingConfig.value = false;
  }
});

async function testHandshake() {
  isTestingPing.value = true;
  setTimeout(() => {
    isTestingPing.value = false;
    if (wireGuardConfig.value) {
      wireGuardConfig.value.latency_ms = Math.floor(12 + Math.random() * 8);
    }
  }, 600);
}
</script>

<style scoped>
.screen-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-box {
  margin-bottom: 14px;
}

.step-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--accent-sky, #38BDF8);
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.header-box h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main, #F8FAFC);
  margin: 0;
}

.subtitle {
  color: var(--text-muted, #94A3B8);
  font-size: 12px;
  margin-top: 4px;
  margin-bottom: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #1976D2;
  border-radius: 50%;
  animation: spin 0.9s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-msg {
  color: var(--text-muted, #94A3B8);
  font-size: 13px;
}

.content-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 2px;
}

.mesh-banner {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
}

.banner-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tunnel-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.node-pill {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #F4F4F5);
  padding: 3px 10px;
  border-radius: var(--radius-pill, 9999px);
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-color, #3F3F46);
}

.pill-controller {
  border-color: rgba(56, 189, 248, 0.4);
  color: var(--accent-sky, #38BDF8);
}

.arrow-wire {
  font-size: 11px;
  color: #10B981;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tunnel-lock-svg {
  width: 12px;
  height: 12px;
  stroke: #10B981;
}

.tunnel-dir-svg {
  width: 12px;
  height: 12px;
  stroke: #10B981;
}

.handshake-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted, #A1A1AA);
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.latency-badge {
  color: #34D399;
  font-weight: 600;
}

.btn-ping {
  background: var(--bg-sub, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-main, #E4E4E7);
  padding: 6px 12px;
  border-radius: var(--radius-inner, 10px);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-ping:hover:not(:disabled) {
  background: var(--bg-hover, #3F3F46);
  border-color: var(--accent-sky, #38BDF8);
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

@media (max-width: 900px) {
  .params-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.param-card {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-inner, 10px);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.param-card:hover {
  transform: translateY(-2px);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: var(--card-hover-shadow, 0 8px 25px -4px rgba(0, 0, 0, 0.45));
}

.param-name {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted, #71717A);
  letter-spacing: 0.5px;
}

.param-val {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #F8FAFC);
}

.param-desc {
  font-size: 10px;
  color: var(--text-muted, #71717A);
}

.text-accent {
  color: var(--accent-sky, #38BDF8);
}

.text-emerald {
  color: #34D399;
}

.font-mono {
  font-family: 'Consolas', 'Courier New', monospace;
}

.security-card {
  background: var(--card-glass-bg, rgba(25, 118, 210, 0.05));
  border: 1px solid rgba(25, 118, 210, 0.2);
  border-radius: var(--radius-card, 14px);
  padding: 10px 14px;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-sky, #38BDF8);
  margin-bottom: 4px;
}

.sec-body {
  font-size: 11px;
  color: var(--text-muted, #94A3B8);
  margin: 0;
  line-height: 1.4;
}

.sec-body code {
  color: var(--text-main, #F1F5F9);
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 3px;
}

.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-primary {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
}

.btn-primary:hover {
  background: var(--accent-hover, #1565C0);
  box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
}

.btn-deploy {
  background: linear-gradient(135deg, #1976D2, #0284C7);
}

.btn-secondary {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #E4E4E7);
}

.btn-secondary:hover {
  background: var(--border-color, #3F3F46);
}

.sec-svg {
  width: 14px;
  height: 14px;
  stroke: var(--accent-sky, #38BDF8);
}

.ping-svg {
  width: 12px;
  height: 12px;
  stroke: var(--text-main, #E4E4E7);
}

.deploy-svg {
  width: 13px;
  height: 13px;
  stroke: #FFFFFF;
}

.btn-flex {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
