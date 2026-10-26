<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <!-- Header Box -->
    <div class="header-box">
      <div class="step-tag-live">
        <span class="live-dot-pulse"></span>
        <span>{{ isRtl ? 'لوحة التحكم السيادية للعقدة — Hyper-V' : 'FastFree Sovereign Node Control Center — Hyper-V' }}</span>
      </div>
      <h2>{{ t('launchpad.title') }}</h2>
      <p class="subtitle">{{ t('launchpad.subtitle') }}</p>
    </div>

    <div class="content-body">
      <!-- Master Live Status Hero -->
      <div class="hero-success-card">
        <div class="success-icon-badge">✓</div>
        <div class="hero-text">
          <div class="node-title-row">
            <h3>{{ selectedClientId }} — {{ licenseState?.company_name || 'FastFree Enterprise Node' }}</h3>
            <span class="live-status-pill">
              <span class="dot-live"></span>
              <span>{{ t('launchpad.onlineOperational') }}</span>
            </span>
          </div>
          <p class="node-sub-text">
            {{ isRtl ? 'تم اكتمال نشر وتثبيت البيئة السيادية بنجاح. تعمل الآلة الافتراضية بنظام NixOS Clan 26.05 مع اتصال دائم بشبكة واير جارد.' : 'Sovereign appliance deployed and running smoothly on NixOS Clan 26.05 with persistent WireGuard mesh tunnel.' }}
          </p>
        </div>
      </div>

      <!-- Comprehensive Appliance Telemetry Grid (All Information) -->
      <div class="telemetry-grid">
        <!-- 1. License & Entity -->
        <div class="spec-card">
          <div class="spec-header">
            <span class="spec-icon">📜</span>
            <span class="spec-title">{{ isRtl ? 'بيانات الترخيص والمؤسسة' : 'License & Client Entity' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'المنشأة:' : 'Entity:' }}</span>
            <span class="spec-v font-bold">{{ licenseState?.company_name || 'Enterprise Sovereign Client' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'الفئة:' : 'Tier:' }}</span>
            <span class="spec-v text-accent uppercase font-bold">{{ licenseState?.tier_name || 'Enterprise' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'المفتاح:' : 'Key:' }}</span>
            <span class="spec-v font-mono text-xs">{{ licenseState?.key || 'ACTIVE-KEY' }}</span>
          </div>
        </div>

        <!-- 2. Hardware Allocation -->
        <div class="spec-card">
          <div class="spec-header">
            <span class="spec-icon">⚡</span>
            <span class="spec-title">{{ isRtl ? 'الموارد المخصصة للعتاد' : 'Allocated Hardware Resources' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'الأنوية:' : 'vCPU Cores:' }}</span>
            <span class="spec-v font-bold text-accent">{{ assignedCpuCores }} {{ t('common.cores') }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'الذاكرة (RAM):' : 'Memory (RAM):' }}</span>
            <span class="spec-v font-bold text-emerald">{{ (assignedRamMb / 1024).toFixed(0) }} {{ t('common.gb') }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'القرص:' : 'Storage:' }}</span>
            <span class="spec-v font-mono text-xs truncate" :title="`${targetDiskDrive}FastFree\\VMs\\${selectedClientId}.vhdx`">
              {{ targetDiskDrive }}FastFree\VMs\{{ selectedClientId }}.vhdx
            </span>
          </div>
        </div>

        <!-- 3. Network & WireGuard Mesh -->
        <div class="spec-card">
          <div class="spec-header">
            <span class="spec-icon">🔒</span>
            <span class="spec-title">{{ isRtl ? 'الشبكة والنفق المشفر' : 'WireGuard Mesh Network' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'عنوان النفق:' : 'Tunnel IP:' }}</span>
            <span class="spec-v font-mono text-emerald font-bold">{{ wireGuardConfig?.client_tunnel_ip || '10.24.0.2/32' }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'منفذ UDP:' : 'UDP Port:' }}</span>
            <span class="spec-v font-mono text-accent font-bold">{{ wireGuardConfig?.listen_port || 51822 }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-k">{{ isRtl ? 'المتحكم:' : 'Controller:' }}</span>
            <span class="spec-v font-mono text-xs">client1.fastfree.cloud</span>
          </div>
        </div>
      </div>

      <!-- Quick Access Endpoints & Web Portals -->
      <div class="endpoints-grid">
        <!-- Local Web Portal Card -->
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
            <button class="btn-launch-sm" @click="launchPortal">{{ t('launchpad.openPortal') }} ↗</button>
          </div>
        </div>

        <!-- WireGuard Gateway Card -->
        <div class="endpoint-card">
          <div class="ep-header">
            <span class="ep-icon">🛡️</span>
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

      <!-- Appliance Power & Operation Center -->
      <div class="companion-card">
        <div class="comp-title-row">
          <div class="comp-title">
            <span class="comp-icon">⚙️</span>
            <span>{{ isRtl ? 'إدارة وتحكم الآلة الافتراضية (Hyper-V Power)' : 'Hyper-V Sovereign VM Power Management' }}</span>
          </div>
          <div class="vm-power-controls">
            <button
              class="btn-vm-action btn-start"
              :disabled="vmActionBusy"
              title="Start Sovereign VM"
              @click="handleVmAction('start')"
            >
              ▶ {{ isRtl ? 'تشغيل' : 'Start' }}
            </button>
            <button
              class="btn-vm-action"
              :disabled="vmActionBusy"
              title="Restart Guest VM"
              @click="handleVmAction('restart')"
            >
              🔄 {{ t('launchpad.restartVm') }}
            </button>
            <button
              class="btn-vm-action btn-danger"
              :disabled="vmActionBusy"
              title="Stop Guest VM"
              @click="handleVmAction('stop')"
            >
              ⏹ {{ t('launchpad.stopVm') }}
            </button>
          </div>
        </div>
        <p class="comp-desc">
          {{ t('launchpad.companionDesc') }}
        </p>
      </div>

      <!-- Action Status Notice Pill -->
      <div v-if="actionNotice" class="notice-pill">
        <span>{{ actionNotice }}</span>
      </div>
    </div>

    <!-- Master Action Bar (No Back Button; Locked Post-Provisioning) -->
    <div class="action-bar">
      <button class="btn btn-secondary" @click="handleMinimizeToTray">
        📥 {{ t('launchpad.minimizeToTray') }}
      </button>
      <button class="btn btn-primary btn-portal" @click="launchPortal">
        🚀 {{ t('launchpad.openErpPortal') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  selectedClientId,
  wireGuardConfig,
  licenseState,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  executeVmCommand,
  minimizeToTray,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';
import { logInfo, logError, logSuccess } from '../composables/useDiagnostics';

const { t, isRtl } = useI18n();

const copiedText = ref<string | null>(null);
const vmActionBusy = ref(false);
const actionNotice = ref('');

onMounted(() => {
  // Store persistent provisioning flag to keep user on Launchpad on any future launch
  try {
    localStorage.setItem('fastfree_provisioned', 'true');
  } catch (err) {
    console.warn('Storage error:', err);
  }
});

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
    : action === 'start'
    ? (isRtl.value ? `جارٍ بدء تشغيل العقدة السيادية ${selectedClientId.value}...` : `Starting sovereign VM ${selectedClientId.value}...`)
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

.step-tag-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #10B981;
  letter-spacing: 0.8px;
  margin-bottom: 4px;
}

.live-dot-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 8px #10B981;
  animation: pulse-dot 1.8s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
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
  overflow-y: hidden;
  padding-right: 2px;
}

.hero-success-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(25, 118, 210, 0.08));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.success-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #10B981;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
}

.hero-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.node-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-title-row h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #FFFFFF);
}

.node-sub-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary, #CBD5E1);
  line-height: 1.4;
}

.live-status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 600;
  color: #34D399;
  background: rgba(16, 185, 129, 0.15);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.dot-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10B981;
}

/* 3-Column Specifications Grid */
.telemetry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.spec-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.spec-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary, #E4E4E7);
  margin-bottom: 2px;
}

.spec-icon {
  font-size: 13px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.spec-k {
  color: var(--text-muted, #71717A);
}

.spec-v {
  color: var(--text-main, #F8FAFC);
}

.font-bold {
  font-weight: 700;
}

.text-accent {
  color: #38BDF8;
}

.text-emerald {
  color: #34D399;
}

.uppercase {
  text-transform: uppercase;
}

.font-mono {
  font-family: 'Consolas', 'Courier New', monospace;
}

.truncate {
  max-width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-xs {
  font-size: 10px;
}

/* Endpoints Grid */
.endpoints-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.endpoint-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 10px 14px;
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
  font-size: 13px;
}

.ep-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted, #94A3B8);
}

.ep-url {
  font-size: 13px;
  font-weight: 700;
  color: #38BDF8;
}

.ep-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.btn-copy {
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-secondary, #D4D4D8);
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 10.5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-copy:hover {
  background: var(--border-color, #3F3F46);
  color: #FFFFFF;
}

.btn-launch-sm {
  background: rgba(25, 118, 210, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38BDF8;
  padding: 3px 10px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-launch-sm:hover {
  background: rgba(25, 118, 210, 0.35);
  color: #FFFFFF;
}

.ep-note {
  font-size: 10px;
  color: var(--text-muted, #71717A);
  font-family: 'Consolas', 'Courier New', monospace;
}

/* Companion VM Controls Card */
.companion-card {
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 10px;
  padding: 10px 14px;
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
  font-weight: 700;
  color: var(--text-main, #FFFFFF);
}

.vm-power-controls {
  display: flex;
  gap: 6px;
}

.btn-vm-action {
  background: var(--bg-sub, #09090B);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-secondary, #D4D4D8);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-vm-action:hover:not(:disabled) {
  background: var(--border-color, #3F3F46);
  color: #FFFFFF;
}

.btn-vm-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-start {
  color: #34D399;
  border-color: rgba(16, 185, 129, 0.3);
}

.btn-start:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.15);
}

.btn-danger {
  color: #F87171;
}

.btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

.comp-desc {
  margin: 0;
  font-size: 10.5px;
  color: var(--text-muted, #71717A);
  line-height: 1.4;
}

.notice-pill {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #38BDF8;
  font-size: 11px;
  padding: 6px 12px;
  border-radius: 6px;
  text-align: center;
}

/* Action Bar */
.action-bar {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
}

.btn {
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 12.5px;
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

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover, #1565C0);
  box-shadow: 0 4px 14px rgba(25, 118, 210, 0.4);
}

.btn-secondary {
  background: var(--bg-sub, #27272A);
  color: var(--text-main, #E4E4E7);
}

.btn-secondary:hover {
  background: var(--border-color, #3F3F46);
}
</style>
