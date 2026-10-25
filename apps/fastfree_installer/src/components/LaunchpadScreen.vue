<template>
  <div class="screen-container">
    <div class="header-box">
      <div class="step-tag">Step 6 of 6 — Complete</div>
      <h2>FastFree Sovereign Node Launchpad & Companion</h2>
      <p class="subtitle">
        Your sovereign ERP appliance is fully active, encrypted via WireGuard mesh, and ready for production use.
      </p>
    </div>

    <div class="content-body">
      <!-- Success Hero Banner -->
      <div class="hero-success-card">
        <div class="success-icon-badge">✓</div>
        <div class="hero-text">
          <div class="node-title-row">
            <h3>{{ selectedClientId }} Sovereign Node is Live</h3>
            <span class="live-status-pill">
              <span class="dot-live"></span>
              <span>Online & Operational</span>
            </span>
          </div>
          <p class="node-sub-text">
            Sovereign Hyper-V Virtual Machine running NixOS Clan 26.05 with encrypted WireGuard mesh connection to controller.
          </p>
        </div>
      </div>

      <!-- Endpoints and Credentials Grid -->
      <div class="endpoints-grid">
        <div class="endpoint-card">
          <div class="ep-header">
            <span class="ep-icon">🌐</span>
            <span class="ep-label">Local ERP Portal Address</span>
          </div>
          <div class="ep-url font-mono">http://{{ selectedClientId }}.fastfree.local</div>
          <div class="ep-actions">
            <button class="btn-copy" @click="copyText(`http://${selectedClientId}.fastfree.local`)">
              {{ copiedText === `http://${selectedClientId}.fastfree.local` ? 'Copied ✓' : 'Copy URL' }}
            </button>
            <button class="btn-launch-sm" @click="launchPortal">Open ➔</button>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="ep-header">
            <span class="ep-icon">🔒</span>
            <span class="ep-label">WireGuard Mesh Overlay IP</span>
          </div>
          <div class="ep-url font-mono">{{ wireGuardConfig?.client_tunnel_ip || '10.24.0.2/32' }}</div>
          <div class="ep-actions">
            <button class="btn-copy" @click="copyText(wireGuardConfig?.client_tunnel_ip || '10.24.0.2')">
              {{ copiedText?.startsWith('10.24') ? 'Copied ✓' : 'Copy IP' }}
            </button>
            <span class="ep-note">UDP Port {{ wireGuardConfig?.listen_port || 51822 }}</span>
          </div>
        </div>
      </div>

      <!-- Companion Tray Information & VM Quick Controls -->
      <div class="companion-card">
        <div class="comp-title-row">
          <div class="comp-title">
            <span class="comp-icon">📥</span>
            <span>Windows System Tray Companion Active</span>
          </div>
          <div class="vm-power-controls">
            <button
              class="btn-vm-action"
              :disabled="vmActionBusy"
              title="Restart Guest VM"
              @click="handleVmAction('restart')"
            >
              🔄 Restart VM
            </button>
            <button
              class="btn-vm-action btn-danger"
              :disabled="vmActionBusy"
              title="Stop Guest VM"
              @click="handleVmAction('stop')"
            >
              ⏹ Stop VM
            </button>
          </div>
        </div>
        <p class="comp-desc">
          When this window is closed or minimized, FastFree continues running silently in your Windows System Tray.
          Right-click the tray icon to quickly open the portal, restart the Hyper-V guest, or check for updates.
        </p>
      </div>

      <div v-if="actionNotice" class="notice-pill">
        <span>{{ actionNotice }}</span>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="handleMinimizeToTray">
        Minimize to System Tray 📥
      </button>
      <button class="btn btn-primary btn-portal" @click="launchPortal">
        Open FastFree ERP Portal 🌐
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  selectedClientId,
  wireGuardConfig,
  executeVmCommand,
  minimizeToTray,
} from '../composables/useDiscovery';

const copiedText = ref<string | null>(null);
const vmActionBusy = ref(false);
const actionNotice = ref('');

async function launchPortal() {
  const url = `http://${selectedClientId.value}.fastfree.local`;
  try {
    await openUrl(url);
  } catch (err) {
    console.warn('Fallback window.open:', err);
    window.open(url, '_blank');
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedText.value = text;
    setTimeout(() => {
      copiedText.value = null;
    }, 2000);
  } catch (err) {
    console.error('Clipboard copy error:', err);
  }
}

async function handleVmAction(action: 'start' | 'stop' | 'restart') {
  vmActionBusy.value = true;
  actionNotice.value = `Executing VM ${action} command...`;
  try {
    const res = await executeVmCommand(action, selectedClientId.value);
    actionNotice.value = res.message;
  } catch (err) {
    actionNotice.value = `VM command failed: ${err}`;
  } finally {
    vmActionBusy.value = false;
    setTimeout(() => {
      actionNotice.value = '';
    }, 4000);
  }
}

async function handleMinimizeToTray() {
  await minimizeToTray();
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
  color: #10B981;
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

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.hero-success-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(25, 118, 210, 0.1) 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.success-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #10B981;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.node-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #F8FAFC;
}

.live-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #34D399;
  background: rgba(16, 185, 129, 0.15);
  padding: 3px 9px;
  border-radius: 12px;
}

.dot-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.node-sub-text {
  font-size: 12px;
  color: #94A3B8;
  margin: 0;
  line-height: 1.4;
}

.endpoints-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.endpoint-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ep-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ep-icon {
  font-size: 14px;
}

.ep-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #A1A1AA;
}

.ep-url {
  font-size: 13px;
  font-weight: 600;
  color: #38BDF8;
  background: #09090B;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #27272A;
}

.font-mono {
  font-family: 'Consolas', monospace;
}

.ep-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-copy {
  background: #27272A;
  border: 1px solid #3F3F46;
  color: #E4E4E7;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}

.btn-copy:hover {
  background: #3F3F46;
}

.btn-launch-sm {
  background: #1976D2;
  border: none;
  color: #FFFFFF;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-launch-sm:hover {
  background: #1565C0;
}

.ep-note {
  font-size: 11px;
  color: #71717A;
}

.companion-card {
  background: #18181B;
  border: 1px solid #27272A;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comp-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comp-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #E4E4E7;
}

.comp-icon {
  font-size: 14px;
}

.vm-power-controls {
  display: flex;
  gap: 8px;
}

.btn-vm-action {
  background: #27272A;
  border: 1px solid #3F3F46;
  color: #D4D4D8;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}

.btn-vm-action:hover:not(:disabled) {
  background: #3F3F46;
  color: #FFFFFF;
}

.btn-vm-action.btn-danger:hover:not(:disabled) {
  background: #7F1D1D;
  border-color: #EF4444;
  color: #FCA5A5;
}

.comp-desc {
  font-size: 11px;
  color: #94A3B8;
  margin: 0;
  line-height: 1.4;
}

.notice-pill {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38BDF8;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  text-align: center;
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
  padding: 11px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #27272A;
  color: #E4E4E7;
}

.btn-secondary:hover {
  background: #3F3F46;
}

.btn-portal {
  background: linear-gradient(135deg, #1976D2 0%, #059669 100%);
  color: #FFFFFF;
  padding: 11px 28px;
  font-size: 14px;
}

.btn-portal:hover {
  background: linear-gradient(135deg, #1565C0 0%, #047857 100%);
  box-shadow: 0 2px 14px rgba(16, 185, 129, 0.4);
}
</style>
