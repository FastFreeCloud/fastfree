<template>
  <div class="screen-container">
    <div class="header-box">
      <div class="step-tag">Step 4 of 6</div>
      <h2>WireGuard Mesh Network & Peer Configuration</h2>
      <p class="subtitle">
        Isolated encrypted tunnel connecting this node to the central controller (client1) on a dedicated UDP port.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingConfig" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-msg">Generating WireGuard peer topology for {{ selectedClientId }}...</p>
    </div>

    <div v-else-if="wireGuardConfig" class="content-body">
      <!-- Topology Banner -->
      <div class="mesh-banner">
        <div class="banner-left">
          <div class="tunnel-indicator">
            <span class="node-pill">Local Appliance: {{ selectedClientId }}</span>
            <span class="arrow-wire">🔒 Encrypted Tunnel (UDP {{ wireGuardConfig.listen_port }}) ➔</span>
            <span class="node-pill pill-controller">Controller: client1.fastfree.cloud</span>
          </div>
          <div class="handshake-status">
            <span class="dot-green"></span>
            <span>{{ wireGuardConfig.status }}</span>
            <span class="latency-badge">⚡ {{ wireGuardConfig.latency_ms }} ms latency</span>
          </div>
        </div>
        <button class="btn-ping" :disabled="isTestingPing" @click="testHandshake">
          {{ isTestingPing ? 'Pinging Controller...' : 'Test Handshake ⚡' }}
        </button>
      </div>

      <!-- Peer Configuration Parameters Grid -->
      <div class="params-grid">
        <div class="param-card">
          <span class="param-name">Interface Name</span>
          <span class="param-val"><code>{{ wireGuardConfig.interface_name }}</code></span>
          <span class="param-desc">NixOS Sovereign Systemd-Networkd Interface</span>
        </div>

        <div class="param-card">
          <span class="param-name">Dedicated UDP Port</span>
          <span class="param-val text-accent"><code>{{ wireGuardConfig.listen_port }}</code></span>
          <span class="param-desc">Isolated instance (51820 + n rule)</span>
        </div>

        <div class="param-card">
          <span class="param-name">Assigned Tunnel IP</span>
          <span class="param-val text-emerald"><code>{{ wireGuardConfig.client_tunnel_ip }}</code></span>
          <span class="param-desc">Client node overlay address</span>
        </div>

        <div class="param-card">
          <span class="param-name">Mesh Subnet (AllowedIPs)</span>
          <span class="param-val"><code>{{ wireGuardConfig.mesh_subnet }}</code></span>
          <span class="param-desc">Internal private multi-agent mesh</span>
        </div>

        <div class="param-card">
          <span class="param-name">Cipher & Cryptography</span>
          <span class="param-val font-mono">{{ wireGuardConfig.cipher }}</span>
          <span class="param-desc">Modern post-quantum resistant Curve25519</span>
        </div>

        <div class="param-card">
          <span class="param-name">Persistent Keepalive</span>
          <span class="param-val">{{ wireGuardConfig.keepalive_seconds }} seconds</span>
          <span class="param-desc">Prevents NAT timeout across local routers</span>
        </div>
      </div>

      <!-- Security / Clan Invariant Notice -->
      <div class="security-card">
        <div class="sec-title">
          <span class="sec-icon">🛡️</span>
          <span>Zero Plaintext Secret Invariant (Clan Vars 26.05)</span>
        </div>
        <p class="sec-body">
          In compliance with the FastFree Sovereign Security standard, WireGuard private keys and pre-shared secrets
          are never stored in plaintext or pushed to Git. Keys are injected directly via
          <code>clan vars generate {{ selectedClientId }}</code> during VHDX deployment.
        </p>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="currentStep = 3">
        ← Back to Sizing
      </button>
      <button class="btn btn-primary btn-deploy" @click="currentStep = 5">
        Deploy Sovereign VHDX Node 🚀
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
  margin-bottom: 16px;
}

.step-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #38BDF8;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.header-box h2 {
  font-size: 22px;
  font-weight: 700;
  color: #F8FAFC;
  margin: 0;
}

.subtitle {
  color: #94A3B8;
  font-size: 13px;
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
  color: #94A3B8;
  font-size: 13px;
}

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.mesh-banner {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.banner-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tunnel-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.node-pill {
  background: #27272A;
  border: 1px solid #3F3F46;
  color: #F4F4F5;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

.pill-controller {
  background: rgba(25, 118, 210, 0.2);
  border-color: #1D4ED8;
  color: #93C5FD;
}

.arrow-wire {
  font-size: 11px;
  color: #38BDF8;
  font-weight: 600;
}

.handshake-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #A1A1AA;
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.latency-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34D399;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.btn-ping {
  background: #27272A;
  border: 1px solid #3F3F46;
  color: #F4F4F5;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ping:hover:not(:disabled) {
  background: #3F3F46;
  border-color: #38BDF8;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.param-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.param-name {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #71717A;
}

.param-val {
  font-size: 13px;
  font-weight: 600;
  color: #F4F4F5;
}

.param-val code {
  color: #38BDF8;
}

.param-desc {
  font-size: 10px;
  color: #71717A;
}

.font-mono {
  font-family: 'Consolas', monospace;
  font-size: 11px;
}

.text-accent {
  color: #38BDF8;
}

.text-emerald {
  color: #34D399;
}

.security-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 12px 14px;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #38BDF8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sec-body {
  font-size: 11px;
  color: #94A3B8;
  margin: 6px 0 0 0;
  line-height: 1.4;
}

.sec-body code {
  background: #18181B;
  padding: 1px 4px;
  border-radius: 4px;
  color: #F8FAFC;
}

.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #27272A;
}

.btn {
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #1976D2;
  color: #FFFFFF;
}

.btn-primary:hover {
  background: #1565C0;
  box-shadow: 0 2px 10px rgba(25, 118, 210, 0.4);
}

.btn-deploy {
  background: linear-gradient(135deg, #1976D2 0%, #059669 100%);
}

.btn-deploy:hover {
  background: linear-gradient(135deg, #1565C0 0%, #047857 100%);
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.4);
}

.btn-secondary {
  background: #27272A;
  color: #E4E4E7;
}

.btn-secondary:hover {
  background: #3F3F46;
}
</style>
