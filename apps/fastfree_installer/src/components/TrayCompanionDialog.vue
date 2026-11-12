<template>
  <div class="tray-flyout-container" :dir="isRtl ? 'rtl' : 'ltr'" :class="{ 'is-rtl': isRtl }">
    <!-- Header with Official Logo -->
    <div class="tray-header">
      <div class="tray-brand">
        <img src="/logo.svg" class="tray-logo-img" alt="FastFree" />
        <div class="tray-brand-info">
          <span class="tray-brand-title">FastFree Companion</span>
          <span class="tray-brand-sub">{{ isRtl ? 'مرافق النظام السيادي' : 'Sovereign Node Companion' }}</span>
        </div>
      </div>
      <button class="tray-close-btn" :title="isRtl ? 'إخفاء' : 'Hide'" :aria-label="isRtl ? 'إخفاء' : 'Hide'" @click="hideDialog">
        <svg aria-hidden="true" viewBox="0 0 10 10" class="btn-svg">
          <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.2" />
          <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
    </div>

    <!-- Live Node Status Card — real Hyper-V state only, no synthetic claims -->
    <div class="tray-status-card" :class="{ 'is-live': vmState === 'Running' }">
      <div class="status-indicator">
        <span class="pulse-dot" :class="{ 'is-live': vmState === 'Running' }"></span>
        <div class="status-texts">
          <span class="status-title">{{ vmStateText }}</span>
          <span class="status-sub font-mono">Hyper-V</span>
        </div>
      </div>
      <span class="version-badge font-mono">v{{ currentAppVersion }}</span>
    </div>

    <!-- Quick Action Items List -->
    <div class="tray-actions-list">
      <!-- 1. Open ERP Portal -->
      <button class="tray-action-item portal-action" @click="handleOpenPortal">
        <div class="action-icon portal-icon">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </div>
        <div class="action-text">
          <span class="action-title">{{ isRtl ? 'دخول بوابة ERP السحابية' : 'Open ERP Web Portal' }}</span>
          <span class="action-desc font-mono">client2.fastfree.local</span>
        </div>
        <span class="action-arrow">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline :points="isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
          </svg>
        </span>
      </button>

      <!-- 2. Open Main Control Center -->
      <button class="tray-action-item" @click="handleOpenControlCenter">
        <div class="action-icon control-icon">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </div>
        <div class="action-text">
          <span class="action-title">{{ isRtl ? 'لوحة التحكم المركزية' : 'Control Center' }}</span>
          <span class="action-desc">{{ isRtl ? 'إعدادات العقدة وتفاصيل التثبيت' : 'Node setup & diagnostics' }}</span>
        </div>
      </button>

      <!-- 3. VM Controls Group -->
      <div class="tray-vm-controls">
        <span class="group-label">{{ isRtl ? 'التحكم بمحرك Hyper-V' : 'Hyper-V VM Controls' }}</span>
        <div class="vm-buttons-row">
          <button class="vm-btn btn-start" :disabled="vmBusy" @click="handleVmAction('start')" :title="isRtl ? 'تشغيل العقدة' : 'Start VM'" :aria-label="isRtl ? 'تشغيل العقدة' : 'Start VM'">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
            <span>{{ isRtl ? 'تشغيل' : 'Start' }}</span>
          </button>
          <button class="vm-btn btn-restart" :disabled="vmBusy" @click="handleVmAction('restart')" :title="isRtl ? 'إعادة تشغيل العقدة' : 'Restart VM'" :aria-label="isRtl ? 'إعادة تشغيل العقدة' : 'Restart VM'">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>{{ isRtl ? 'إعادة تشغيل' : 'Restart' }}</span>
          </button>
          <button class="vm-btn btn-stop" :disabled="vmBusy" @click="handleVmAction('stop')" :title="isRtl ? 'إيقاف العقدة' : 'Stop VM'" :aria-label="isRtl ? 'إيقاف العقدة' : 'Stop VM'">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2"></rect>
            </svg>
            <span>{{ isRtl ? 'إيقاف' : 'Stop' }}</span>
          </button>
        </div>
      </div>

      <!-- 4. Check Updates -->
      <button class="tray-action-item" @click="handleCheckUpdates">
        <div class="action-icon update-icon">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </div>
        <div class="action-text">
          <span class="action-title">{{ isRtl ? 'فحص وتثبيت التحديثات' : 'Check for Updates' }}</span>
        </div>
      </button>

      <!-- 5. Exit App -->
      <button class="tray-action-item exit-action" @click="handleExitApp">
        <div class="action-icon exit-icon">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
        </div>
        <div class="action-text">
          <span class="action-title">{{ isRtl ? 'إغلاق التطبيق نهائياً' : 'Exit Application' }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { exit } from '@tauri-apps/plugin-process';
import { useI18n } from '../composables/useI18n';

const { isRtl } = useI18n();
// Real values only: version comes from the Tauri app manifest, node state
// from a live `get_vm_real_state` probe. Neither is ever fabricated.
const currentAppVersion = ref('—');
const vmState = ref<string | null>(null);
const vmBusy = ref(false);

const vmStateText = computed(() => {
  if (vmState.value === null) return isRtl.value ? 'جارٍ فحص حالة العقدة…' : 'Checking node status…';
  if (vmState.value === 'Running') return isRtl.value ? 'العقدة تعمل' : 'Node running';
  return isRtl.value ? `حالة العقدة: ${vmState.value}` : `Node state: ${vmState.value}`;
});

async function hideDialog() {
  try {
    const win = getCurrentWebviewWindow();
    await win.hide();
  } catch (e) {
    console.error('Failed to hide tray dialog:', e);
  }
}

async function handleOpenPortal() {
  try {
    await openUrl('http://client2.fastfree.local');
    await hideDialog();
  } catch (e) {
    console.error('Failed to open ERP portal:', e);
  }
}

async function handleOpenControlCenter() {
  try {
    await invoke('show_main_window');
    await hideDialog();
  } catch (e) {
    console.error('Failed to open control center:', e);
  }
}

async function handleVmAction(action: 'start' | 'stop' | 'restart') {
  vmBusy.value = true;
  try {
    await invoke('manage_vm', { action, clientId: 'client2' });
  } catch (e) {
    console.error(`Failed to execute VM action ${action}:`, e);
  } finally {
    vmBusy.value = false;
  }
}

async function handleCheckUpdates() {
  try {
    await invoke('show_main_window');
    const win = getCurrentWebviewWindow();
    await win.emit('trigger-check-updates');
    await hideDialog();
  } catch (e) {
    console.error('Failed to check updates from tray:', e);
  }
}

async function handleExitApp() {
  try {
    await exit(0);
  } catch (e) {
    console.error('Failed to exit application:', e);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    hideDialog();
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  try {
    currentAppVersion.value = (await getVersion()) || '—';
  } catch (e) {
    // Leave the honest placeholder instead of inventing a version.
    console.error('Failed to read app version:', e);
  }
  try {
    const res = await invoke<{ state: string }>('get_vm_real_state', { clientId: 'client2' });
    vmState.value = res.state || null;
  } catch (e) {
    // Unknown stays unknown — renders the neutral "checking" state.
    console.error('Failed to read VM state from tray:', e);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.tray-flyout-container {
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  background: var(--surface-overlay);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: var(--card-glass-border);
  border-color: var(--accent-sky-border-strong);
  border-radius: 16px;
  box-shadow: var(--shadow-modal-wide);
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  gap: 10px;
  user-select: none;
  font-family: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
  color: #F8FAFC;
  overflow: hidden;
}

.is-rtl {
  font-family: 'Cairo', 'Segoe UI Variable Text', system-ui, sans-serif;
}

.tray-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.tray-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tray-logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 10px rgba(56, 189, 248, 0.5));
}

.tray-brand-info {
  display: flex;
  flex-direction: column;
}

.tray-brand-title {
  font-size: 13.5px;
  font-weight: 800;
  letter-spacing: -0.2px;
  background: linear-gradient(135deg, #FFFFFF 40%, #38BDF8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tray-brand-sub {
  font-size: 10px;
  color: #94A3B8;
  font-weight: 600;
}

.tray-close-btn {
  background: transparent;
  border: none;
  color: #94A3B8;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tray-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
}

.btn-svg {
  width: 10px;
  height: 10px;
}

/* Status Card — neutral until the live Hyper-V probe confirms "Running". */
.tray-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--white-06);
  border: var(--card-glass-border);
  border-radius: 10px;
  padding: 8px 12px;
}

.tray-status-card.is-live {
  background: var(--accent-emerald-soft);
  border: var(--card-glass-border);
  border-color: var(--accent-emerald-border);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 9px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}

.pulse-dot.is-live {
  background: var(--accent-emerald);
  box-shadow: 0 0 8px var(--accent-emerald-strong);
  animation: pulse-dot-glow 2s ease-in-out infinite;
}

@keyframes pulse-dot-glow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.85);
  }
}

.status-texts {
  display: flex;
  flex-direction: column;
}

.status-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main);
}

.tray-status-card.is-live .status-title {
  color: var(--accent-emerald);
}

.status-sub {
  font-size: 9px;
  color: var(--text-muted);
}

.version-badge {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--accent-sky);
  background: var(--accent-sky-soft);
  border: var(--card-glass-border);
  padding: 1px 6px;
  border-radius: 4px;
}

/* Actions List */
.tray-actions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tray-action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 8px 10px;
  color: #F8FAFC;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: start;
}

.tray-action-item:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateY(-1px);
}

.portal-action {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(16, 185, 129, 0.08));
  border-color: rgba(56, 189, 248, 0.35);
}

.portal-action:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(16, 185, 129, 0.15));
  border-color: rgba(56, 189, 248, 0.55);
}

.action-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon svg {
  width: 16px;
  height: 16px;
}

.portal-icon {
  background: rgba(56, 189, 248, 0.18);
  color: #38BDF8;
}

.control-icon {
  background: rgba(147, 51, 234, 0.18);
  color: #A855F7;
}

.update-icon {
  background: rgba(245, 158, 11, 0.18);
  color: #FBBF24;
}

.exit-icon {
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
}

.action-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.action-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #F8FAFC;
}

.action-desc {
  font-size: 9.5px;
  color: #94A3B8;
}

.action-arrow {
  color: #64748B;
  display: flex;
  align-items: center;
}

.action-arrow svg {
  width: 14px;
  height: 14px;
}

/* VM Controls Group */
.tray-vm-controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 6px 8px;
}

.group-label {
  font-size: 9.5px;
  font-weight: 700;
  color: #94A3B8;
  padding-inline-start: 2px;
}

.vm-buttons-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.vm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.06);
}

.vm-btn svg {
  width: 11px;
  height: 11px;
}

.vm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.vm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-start:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.4);
  color: #10B981;
}

.btn-restart:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38BDF8;
}

.btn-stop:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #EF4444;
}

.exit-action:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.35);
}
</style>