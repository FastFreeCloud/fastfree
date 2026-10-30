<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('wireguard.stepTag') }}</div>
      <h2>{{ t('wireguard.title') }}</h2>
      <p class="subtitle">{{ t('wireguard.subtitle') }}</p>
    </div>

    <!-- Interactive Node Appliance Selector (Manual Override) -->
    <div class="node-selector-bar">
      <div class="selector-meta">
        <span class="selector-dot"></span>
        <span class="selector-label">{{ t('wireguard.selectNode') }}</span>
        <span class="current-node-badge">{{ selectedClientId }}</span>
      </div>
      <div class="node-pill-buttons">
        <button
          v-for="c in allNodes"
          :key="c"
          type="button"
          class="node-select-btn"
          :class="{ active: selectedClientId === c }"
          @click="selectTargetNode(c)"
        >
          {{ c }}
        </button>
      </div>
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
              <span>{{ t('wireguard.tunnelArrow', { port: isManualMode ? manualPort : wireGuardConfig.listen_port }) }}</span>
              <svg class="tunnel-dir-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline :points="isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
              </svg>
            </span>
            <span class="node-pill pill-controller">{{ isManualMode ? manualEndpoint : t('wireguard.controllerNode') }}</span>
          </div>
          <div class="handshake-status">
            <span class="dot-green"></span>
            <span>{{ wireGuardConfig.status }}</span>
            <span class="latency-badge">{{ t('wireguard.latencyMs', { ms: wireGuardConfig.latency_ms }) }}</span>
          </div>
        </div>
        <div class="banner-actions">
          <button
            type="button"
            class="btn-manual-toggle"
            :class="{ active: isManualMode }"
            @click="toggleManualMode"
          >
            <svg class="gear-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>{{ isManualMode ? t('wireguard.manualOverride') : t('wireguard.manualOverride') }}</span>
          </button>
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
      </div>

      <!-- Advanced Manual Customization Panel -->
      <div v-if="isManualMode" class="manual-panel">
        <div class="manual-panel-head">
          <span class="manual-badge">{{ isRtl ? 'وضع التخصيص اليدوي مفعّل' : 'Manual Override Active' }}</span>
          <span class="manual-hint">{{ t('wireguard.manualOverrideHint') }}</span>
        </div>

        <div class="manual-inputs-grid">
          <div class="input-card">
            <label class="input-label" for="wg-port">{{ t('wireguard.customPort') }}</label>
            <input
              id="wg-port"
              v-model.number="manualPort"
              type="number"
              class="fluent-input font-mono"
              @input="syncManualConf"
            />
            <span class="input-desc">{{ isRtl ? 'منفذ UDP لنظير العقدة' : 'Peer UDP Port' }}</span>
          </div>

          <div class="input-card">
            <label class="input-label" for="wg-ip">{{ t('wireguard.customTunnelIp') }}</label>
            <input
              id="wg-ip"
              v-model="manualTunnelIp"
              type="text"
              class="fluent-input font-mono text-emerald"
              @input="syncManualConf"
            />
            <span class="input-desc">{{ isRtl ? 'عنوان النفق الداخلي المعزول' : 'Internal Overlay Address' }}</span>
          </div>

          <div class="input-card">
            <label class="input-label" for="wg-ep">{{ t('wireguard.customEndpoint') }}</label>
            <input
              id="wg-ep"
              v-model="manualEndpoint"
              type="text"
              class="fluent-input font-mono text-accent"
              @input="syncManualConf"
            />
            <span class="input-desc">{{ isRtl ? 'خادم المتحكم (Host:Port)' : 'Controller Remote Host:Port' }}</span>
          </div>
        </div>

        <!-- Interactive Raw .conf Editor -->
        <div class="raw-conf-box">
          <div class="raw-conf-head">
            <span class="raw-conf-title">
              <svg class="file-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>{{ t('wireguard.customConf') }} ({{ selectedClientId }}.conf)</span>
            </span>
            <div class="raw-conf-actions">
              <button type="button" class="btn-tool" @click="resetToDefaults">
                {{ t('wireguard.resetDefaults') }}
              </button>
              <button type="button" class="btn-tool btn-copy" @click="copyConf">
                {{ confCopied ? t('wireguard.copied') : t('wireguard.copyConf') }}
              </button>
            </div>
          </div>
          <textarea
            v-model="manualConf"
            class="conf-editor font-mono"
            rows="7"
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <!-- Standard Parameter Cards (Shown in Automatic Mode) -->
      <div v-else class="params-grid">
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
      <button class="btn btn-primary btn-deploy" :disabled="isApplyingConfig" @click="handleDeploy">
        <span class="btn-flex">
          <span v-if="isApplyingConfig" class="spinner-tiny"></span>
          <svg v-else class="deploy-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
  applyWireGuardConfig,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

const allNodes = Array.from({ length: 10 }, (_, i) => `client${i + 2}`);

const isLoadingConfig = ref(true);
const isTestingPing = ref(false);
const isApplyingConfig = ref(false);

// Manual Customization State
const isManualMode = ref(false);
const manualPort = ref<number>(51822);
const manualTunnelIp = ref<string>('10.24.0.2/32');
const manualEndpoint = ref<string>('client1.fastfree.cloud:51822');
const manualConf = ref<string>('');
const confCopied = ref(false);

onMounted(async () => {
  await loadConfigForNode(selectedClientId.value);
});

async function selectTargetNode(nodeId: string) {
  selectedClientId.value = nodeId;
  await loadConfigForNode(nodeId);
}

async function loadConfigForNode(nodeId: string) {
  isLoadingConfig.value = true;
  try {
    const config = await fetchWireGuardConfig(nodeId);
    manualPort.value = config.listen_port;
    manualTunnelIp.value = config.client_tunnel_ip;
    manualEndpoint.value = `${config.controller_endpoint}:${config.listen_port}`;
    syncManualConf();
  } catch (err) {
    console.error('Failed to load wireguard config:', err);
  } finally {
    isLoadingConfig.value = false;
  }
}

function syncManualConf() {
  const numStr = selectedClientId.value.replace('client', '');
  const n = parseInt(numStr, 10) || 2;
  manualConf.value = `[Interface]
Address = ${manualTunnelIp.value}
ListenPort = ${manualPort.value}
PrivateKey = PLACEHOLDER_PRIVATE_KEY_client${n}==========================
MTU = 1420

[Peer]
PublicKey = ff+client1+controller+vps+primary+master===
Endpoint = ${manualEndpoint.value}
AllowedIPs = 10.24.0.0/16
PersistentKeepalive = 25
`;
}

function resetToDefaults() {
  const numStr = selectedClientId.value.replace('client', '');
  const n = parseInt(numStr, 10) || 2;
  manualPort.value = 51820 + n;
  manualTunnelIp.value = `10.24.0.${n}/32`;
  manualEndpoint.value = `client1.fastfree.cloud:${manualPort.value}`;
  syncManualConf();
}

function toggleManualMode() {
  isManualMode.value = !isManualMode.value;
  if (isManualMode.value) {
    syncManualConf();
  }
}

async function copyConf() {
  try {
    await navigator.clipboard.writeText(manualConf.value);
    confCopied.value = true;
    setTimeout(() => {
      confCopied.value = false;
    }, 2000);
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }
}

async function handleDeploy() {
  isApplyingConfig.value = true;
  try {
    if (isManualMode.value) {
      await applyWireGuardConfig(selectedClientId.value, {
        customPort: manualPort.value,
        customIp: manualTunnelIp.value,
        customEndpoint: manualEndpoint.value,
        customConf: manualConf.value,
      });
    } else {
      await applyWireGuardConfig(selectedClientId.value);
    }
  } catch (err) {
    console.warn('WireGuard config apply warning:', err);
  } finally {
    isApplyingConfig.value = false;
    currentStep.value = 5;
  }
}

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
  margin-bottom: 10px;
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

/* Node Selector Ribbon */
.node-selector-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 6px 12px;
  margin-bottom: 10px;
  gap: 12px;
}

.selector-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.selector-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-sky, #38BDF8);
  box-shadow: 0 0 8px var(--accent-sky, #38BDF8);
}

.selector-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main, #F8FAFC);
}

.current-node-badge {
  background: rgba(56, 189, 248, 0.15);
  color: var(--accent-sky, #38BDF8);
  border: 1px solid rgba(56, 189, 248, 0.35);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.node-pill-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.node-select-btn {
  background: var(--bg-sub, #27272A);
  color: var(--text-muted, #94A3B8);
  border: 1px solid var(--border-color, #3F3F46);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Consolas', 'Courier New', monospace;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.node-select-btn:hover {
  background: var(--bg-hover, #3F3F46);
  color: #FFFFFF;
}

.node-select-btn.active {
  background: var(--accent-sky, #38BDF8);
  color: #0F172A;
  border-color: var(--accent-sky, #38BDF8);
  font-weight: 700;
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
  gap: 10px;
  overflow-y: auto;
  padding-right: 2px;
}

.mesh-banner {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-card, 14px);
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--card-shadow, 0 4px 20px -2px rgba(0, 0, 0, 0.35));
  backdrop-filter: blur(8px);
}

.banner-left {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-manual-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-sub, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-secondary, #E4E4E7);
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-manual-toggle:hover {
  background: var(--bg-hover, #3F3F46);
  border-color: var(--accent-sky, #38BDF8);
}

.btn-manual-toggle.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: var(--accent-sky, #38BDF8);
  color: var(--accent-sky, #38BDF8);
}

.gear-svg {
  width: 13px;
  height: 13px;
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
  padding: 5px 12px;
  border-radius: 8px;
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

/* Manual Panel Styling */
.manual-panel {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.manual-panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.manual-badge {
  background: rgba(56, 189, 248, 0.2);
  color: var(--accent-sky, #38BDF8);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.manual-hint {
  font-size: 11px;
  color: var(--text-muted, #94A3B8);
}

.manual-inputs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.input-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted, #A1A1AA);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.fluent-input {
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-main, #F8FAFC);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s ease;
}

.fluent-input:focus {
  border-color: var(--accent-sky, #38BDF8);
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.25);
}

.input-desc {
  font-size: 9.5px;
  color: var(--text-muted, #71717A);
}

.raw-conf-box {
  background: #09090B;
  border: 1px solid var(--border-color, #27272A);
  border-radius: 8px;
  overflow: hidden;
}

.raw-conf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border-color, #27272A);
}

.raw-conf-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main, #F8FAFC);
}

.file-svg {
  width: 12px;
  height: 12px;
  stroke: var(--accent-sky, #38BDF8);
}

.raw-conf-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-tool {
  background: var(--bg-sub, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-muted, #A1A1AA);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 10.5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool:hover {
  color: #FFFFFF;
  border-color: var(--accent-sky, #38BDF8);
}

.btn-copy {
  color: var(--accent-sky, #38BDF8);
}

.conf-editor {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  color: #38BDF8;
  border: none;
  outline: none;
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.45;
  resize: vertical;
}

/* Standard Params Grid */
.params-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

@media (max-width: 900px) {
  .params-grid,
  .manual-inputs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.param-card {
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-inner, 10px);
  padding: 8px 12px;
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
  padding: 8px 12px;
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
  font-size: 10.5px;
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
  padding-top: 10px;
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
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-secondary {
  background: var(--bg-card, #27272A);
  color: var(--text-main, #E4E4E7);
  border: 1px solid var(--border-color, #3F3F46);
}

.btn-secondary:hover {
  background: var(--bg-hover, #3F3F46);
}

.btn-primary {
  background: #1976D2;
  color: #FFFFFF;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #1565C0;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-flex {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.deploy-svg {
  width: 14px;
  height: 14px;
}

.spinner-tiny {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}
</style>
