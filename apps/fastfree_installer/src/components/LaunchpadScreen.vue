<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('launchpad.stepTag') }}</div>
      <h2>{{ t('launchpad.title') }}</h2>
      <p class="subtitle">{{ t('launchpad.subtitle') }}</p>
    </div>

    <div class="content-body">
      <!-- Success Hero Banner -->
      <div class="hero-success-card">
        <div class="success-icon-badge">✓</div>
        <div class="hero-text">
          <div class="node-title-row">
            <h3>{{ t('launchpad.nodeLive', { client: selectedClientId }) }}</h3>
            <span class="live-status-pill">
              <span class="dot-live"></span>
              <span>{{ t('launchpad.onlineOperational') }}</span>
            </span>
          </div>
          <p class="node-sub-text">
            {{ t('launchpad.nodeSub') }}
          </p>
        </div>
      </div>

      <!-- Endpoints and Credentials Grid -->
      <div class="endpoints-grid">
        <div class="endpoint-card">
          <div class="ep-header">
            <span class="ep-icon">🌐</span>
            <span class="ep-label">{{ t('launchpad.localPortalAddress') }}</span>
          </div>
          <div class="ep-url font-mono">http://{{ selectedClientId }}.fastfree.local</div>
          <div class="ep-actions">
            <button class="btn-copy" @click="copyText(`http://${selectedClientId}.fastfree.local`)">
              {{ copiedText === `http://${selectedClientId}.fastfree.local` ? t('common.copied') : t('common.copy') }}
            </button>
            <button class="btn-launch-sm" @click="launchPortal">{{ t('launchpad.openPortal') }}</button>
          </div>
        </div>

        <div class="endpoint-card">
          <div class="ep-header">
            <span class="ep-icon">🔒</span>
            <span class="ep-label">{{ t('launchpad.wgOverlayIp') }}</span>
          </div>
          <div class="ep-url font-mono">{{ wireGuardConfig?.client_tunnel_ip || '10.24.0.2/32' }}</div>
          <div class="ep-actions">
            <button class="btn-copy" @click="copyText(wireGuardConfig?.client_tunnel_ip || '10.24.0.2')">
              {{ copiedText?.startsWith('10.24') ? t('common.copied') : t('common.copy') }}
            </button>
            <span class="ep-note">{{ t('launchpad.udpPort', { port: wireGuardConfig?.listen_port || 51822 }) }}</span>
          </div>
        </div>
      </div>

      <!-- Companion Tray Information & VM Quick Controls -->
      <div class="companion-card">
        <div class="comp-title-row">
          <div class="comp-title">
            <span class="comp-icon">📥</span>
            <span>{{ t('launchpad.companionActive') }}</span>
          </div>
          <div class="vm-power-controls">
            <button
              class="btn-vm-action"
              :disabled="vmActionBusy"
              title="Restart Guest VM"
              @click="handleVmAction('restart')"
            >
              {{ t('launchpad.restartVm') }}
            </button>
            <button
              class="btn-vm-action btn-danger"
              :disabled="vmActionBusy"
              title="Stop Guest VM"
              @click="handleVmAction('stop')"
            >
              {{ t('launchpad.stopVm') }}
            </button>
          </div>
        </div>
        <p class="comp-desc">
          {{ t('launchpad.companionDesc') }}
        </p>
      </div>

      <div v-if="actionNotice" class="notice-pill">
        <span>{{ actionNotice }}</span>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="handleMinimizeToTray">
        {{ t('launchpad.minimizeToTray') }}
      </button>
      <button class="btn btn-primary btn-portal" @click="launchPortal">
        {{ t('launchpad.openErpPortal') }}
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
import { useI18n } from '../composables/useI18n';
import { logInfo, logError, logSuccess } from '../composables/useDiagnostics';

const { t, isRtl } = useI18n();

const copiedText = ref<string | null>(null);
const vmActionBusy = ref(false);
const actionNotice = ref('');

async function launchPortal() {
  const url = `http://${selectedClientId.value}.fastfree.local`;
  logInfo('Launchpad', `Opening FastFree portal at ${url}`);
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
  actionNotice.value = action === 'restart'
    ? t('launchpad.vmRestarting', { client: selectedClientId.value })
    : t('launchpad.vmStopping', { client: selectedClientId.value });

  try {
    const res = await executeVmCommand(action, selectedClientId.value);
    actionNotice.value = res.message || t('launchpad.vmSuccess');
    logSuccess('VM', `VM ${action} succeeded for ${selectedClientId.value}`);
  } catch (err) {
    const msg = `VM command failed: ${err}`;
    actionNotice.value = msg;
    logError('VM', msg);
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
  margin-bottom: 12px;
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

.content-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.hero-success-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(25, 118, 210, 0.08));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.success-icon-badge {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #10B981;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
}

.hero-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.node-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.node-title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main, #F8FAFC);
}

.live-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34D399;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.dot-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.node-sub-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted, #94A3B8);
  line-height: 1.4;
}

.endpoints-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.endpoint-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ep-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ep-icon {
  font-size: 14px;
}

.ep-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #A1A1AA);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ep-url {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-sky, #38BDF8);
  word-break: break-all;
}

.font-mono {
  font-family: 'Consolas', 'Courier New', monospace;
}

.ep-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.btn-copy {
  background: var(--bg-sub, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-secondary, #D4D4D8);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-copy:hover {
  background: var(--bg-hover, #3F3F46);
  color: var(--text-main, #FFFFFF);
}

.btn-launch-sm {
  background: rgba(25, 118, 210, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: var(--accent-sky, #38BDF8);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-launch-sm:hover {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
}

.ep-note {
  font-size: 10px;
  color: var(--text-muted, #71717A);
  margin-inline-start: auto;
}

.companion-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comp-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main, #F4F4F5);
}

.comp-icon {
  font-size: 13px;
}

.vm-power-controls {
  display: flex;
  gap: 6px;
}

.btn-vm-action {
  background: var(--bg-sub, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-secondary, #D4D4D8);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-vm-action:hover:not(:disabled) {
  background: var(--bg-hover, #3F3F46);
  color: var(--text-main, #FFFFFF);
}

.btn-vm-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger:hover:not(:disabled) {
  background: #DC2626;
  border-color: #EF4444;
  color: #FFFFFF;
}

.comp-desc {
  font-size: 11px;
  color: var(--text-muted, #94A3B8);
  margin: 0;
  line-height: 1.4;
}

.notice-pill {
  background: rgba(25, 118, 210, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: var(--accent-sky, #38BDF8);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.action-bar {
  margin-top: auto;
  padding-top: 12px;
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

.btn-portal {
  background: linear-gradient(135deg, #10B981, #059669);
}

.btn-portal:hover {
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4);
}

.btn-secondary {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #E4E4E7);
}

.btn-secondary:hover {
  background: var(--border-color, #3F3F46);
}
</style>
