<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <!-- 1. Ambient Lighting Orbs (CasaOS Atmosphere) -->
    <div class="ambient-orb-1" aria-hidden="true"></div>
    <div class="ambient-orb-2" aria-hidden="true"></div>

    <div class="content-body">
      <!-- 2. Unprovisioned VM Banner (If VM is not registered in Hyper-V) -->
      <div v-if="vmExists === false" class="unprovisioned-alert-banner">
        <div class="alert-content">
          <svg aria-hidden="true" class="alert-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>
            {{ isRtl
              ? `الآلة الافتراضية (FastFree-${selectedClientId}) غير منشأة بعد في Hyper-V.`
              : `Hyper-V VM (FastFree-${selectedClientId}) is not provisioned yet.`
            }}
          </span>
        </div>
        <div class="alert-actions">
          <button
            class="btn-create-vm"
            :disabled="isProvisioning"
            @click="handleInstantProvisioning"
          >
            <span v-if="isProvisioning" class="spinner-tiny"></span>
            <span>{{ isProvisioning ? (isRtl ? 'جارٍ الإنشاء...' : 'Creating...') : (isRtl ? 'إنشاء وتشغيل الآلة الآن' : 'Create VM Now') }}</span>
          </button>
        </div>
      </div>

      <!-- 3. Top Header Bar & Search / Diagnostic Bar -->
      <header class="casaos-header-bar">
        <div class="header-search-wrap">
          <svg aria-hidden="true" class="search-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="isRtl ? 'ابحث عن تطبيق سيادي، منفذ، أو خدمة...' : 'Search sovereign app, port, or service...'"
          />
          <button v-if="searchQuery" class="search-clear-btn" @click="searchQuery = ''">✕</button>
        </div>

        <div class="header-right-badges">
          <button
            type="button"
            class="btn-header-tool"
            :title="isRtl ? 'سجل تشخيص النظام' : 'System Terminal Console'" :aria-label="isRtl ? 'سجل تشخيص النظام' : 'System Terminal Console'"
            @click="isTerminalOpen = !isTerminalOpen"
          >
            <svg aria-hidden="true" class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span>{{ isRtl ? 'الطرفية' : 'Terminal' }}</span>
          </button>

          <span class="status-node-pill font-mono bidi-isolate" dir="ltr">
            <span class="node-status-dot" :class="{ 'is-active': isApplianceActive }"></span>
            <bdi>FastFree-{{ selectedClientId }}</bdi>
          </span>
        </div>
      </header>

      <!-- 4. CasaOS Main 2-Column Workspace Layout (280px sidebar + 1fr grid) -->
      <main class="casa-workspace-layout">
        <!-- Left Sidebar Column: Credentials, Gauges, FastFree VPN -->
        <aside class="casa-sidebar">
          <!-- Credentials & Access Card -->
          <div class="casa-card widget-creds">
            <div class="creds-header">
              <span class="creds-title">{{ isRtl ? 'بيانات الوصول المعتمدة' : 'Sovereign Node Access' }}</span>
              <button
                type="button"
                class="btn-copy-creds"
                :title="isRtl ? 'نسخ بيانات الدخول' : 'Copy Credentials'" :aria-label="isRtl ? 'نسخ بيانات الدخول' : 'Copy Credentials'"
                @click="copyCredentials"
              >
                <svg aria-hidden="true" v-if="!isCredsCopied" class="copy-svg-mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg aria-hidden="true" v-else class="copy-svg-mini text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{{ isCredsCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ' : 'Copy') }}</span>
              </button>
            </div>
            <div class="creds-body">
              <div class="cred-row">
                <span class="cred-label">{{ isRtl ? 'رابط البوابة:' : 'Portal URL:' }}</span>
                <span class="cred-val font-mono text-cyan bidi-isolate" dir="ltr"><bdi>http://{{ selectedClientId }}.fastfree.local</bdi></span>
              </div>
              <div class="cred-row">
                <span class="cred-label">{{ isRtl ? 'المستخدم:' : 'Username:' }}</span>
                <span class="cred-val font-mono text-emerald bidi-isolate" dir="ltr"><bdi>Administrator</bdi></span>
              </div>
            </div>
          </div>

          <!-- System Status & Radial Telemetry Dials -->
          <TelemetryDialCard
            :telemetry="liveTelemetry"
            :node-name="`FastFree-${selectedClientId}`"
            :is-rtl="isRtl"
          />

          <!-- WireGuard Mesh Tunnel Widget -->
          <div class="casa-card widget-wireguard">
            <div class="wg-top-row">
              <span class="wg-label">{{ isRtl ? 'شبكة FastFree VPN المشفرة' : 'FastFree VPN Mesh Network' }}</span>
              <span class="wg-ip font-mono bidi-isolate" dir="ltr"><bdi>{{ wireGuardConfig?.client_tunnel_ip || '10.24.0.2/32' }}</bdi></span>
            </div>
            <div class="wg-sub-row font-mono bidi-isolate" dir="ltr">
              <span><bdi>{{ isRtl ? 'المنفذ: ' : 'Port: ' }}UDP {{ wireGuardConfig?.listen_port || 51822 }}</bdi></span>
              <span class="bidi-isolate" dir="ltr"><bdi>client1.fastfree.cloud</bdi></span>
            </div>
          </div>
        </aside>

        <!-- Right Main Workspace: 8-App CasaOS Squircle Grid -->
        <section class="casa-workspace-main">
          <AppLaunchGrid
            :apps="filteredApps"
            :is-rtl="isRtl"
            :node-host="`${selectedClientId}.fastfree.local`"
            @launch="handleAppLaunch"
            @restart="handleAppRestart"
            @logs="handleAppLogs"
            @copy-url="handleCopyUrl"
          />
        </section>
      </main>
    </div>

    <!-- 5. Universal Standard Action Bar (56px) -->
    <div class="action-bar">
      <div class="action-bar-start">
        <div class="status-summary">
          <span class="status-live">
            <span :class="isApplianceActive ? 'dot-green' : 'dot-amber'"></span>
            <span class="font-mono text-xs bidi-isolate" dir="ltr"><bdi>FastFree-{{ selectedClientId }} ({{ isApplianceActive ? t('common.active') : (isRtl ? 'جاهز' : 'Ready') }})</bdi></span>
          </span>
          <button
            type="button"
            class="btn-vm-restart"
            :title="isRtl ? 'إعادة تشغيل الآلة' : 'Restart Hyper-V VM'" :aria-label="isRtl ? 'إعادة تشغيل الآلة' : 'Restart Hyper-V VM'"
            @click="handleVmAction('restart')"
          >
            <svg aria-hidden="true" class="vm-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>{{ isRtl ? 'إعادة تشغيل' : 'Restart' }}</span>
          </button>
        </div>
      </div>

      <!-- CENTER: Persistent FastFree 3D Precision Timepiece -->
      <div class="action-bar-center">
        <FastFreeTimepiece />
      </div>

      <div class="action-bar-end">
        <button class="btn btn-primary btn-portal" @click="launchPortal">
          <span class="btn-flex">
            <svg aria-hidden="true" class="portal-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>{{ isRtl ? 'دخول بوابة فاست فري ERP' : 'Open FastFree ERP Portal' }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- 6. Slide-Up Diagnostic Terminal Console -->
    <LiveConsoleModal
      :is-open="isTerminalOpen"
      :is-rtl="isRtl"
      :logs="consoleLogs"
      @close="isTerminalOpen = false"
      @clear="consoleLogs = []"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { openUrl } from '@tauri-apps/plugin-opener';
import FastFreeTimepiece from './FastFreeTimepiece.vue';
import {
  selectedClientId,
  wireGuardConfig,
  assignedCpuCores,
  assignedRamMb,
  targetDiskDrive,
  executeVmCommand,
  getVmRealState,
  provisionNode,
  type VmRealState,
} from '../composables/useDiscovery';
import { useI18n } from '../composables/useI18n';
import { TelemetryService } from '../domain/services/TelemetryService';
import { AppRegistryService } from '../domain/services/AppRegistryService';
import { ApplianceTelemetry } from '../domain/models/ApplianceTelemetry';
import { SystemLogEntry } from '../domain/models/SystemLogEntry';
import { SovereignApp } from '../domain/models/SovereignApp';

import TelemetryDialCard from './dashboard/TelemetryDialCard.vue';
import AppLaunchGrid from './dashboard/AppLaunchGrid.vue';
import LiveConsoleModal from './dashboard/LiveConsoleModal.vue';

const { t, isRtl } = useI18n();

// Domain Services
const telemetryService = TelemetryService.getInstance();
const appRegistryService = AppRegistryService.getInstance();

// Reactive State
const liveTelemetry = ref<ApplianceTelemetry>(telemetryService.currentTelemetry);
const allApps = ref<SovereignApp[]>(appRegistryService.getAllApps());
const searchQuery = ref('');
const consoleLogs = ref<SystemLogEntry[]>(SystemLogEntry.createDefaultSeed(selectedClientId.value));

const isTerminalOpen = ref(false);
const isCheckingVm = ref(false);
const isProvisioning = ref(false);
const vmExists = ref<boolean | null>(null);
const realVmState = ref<VmRealState | null>(null);
const isCredsCopied = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

const isApplianceActive = computed(() => {
  return realVmState.value?.state === 'Running' || realVmState.value?.state === '2';
});

const filteredApps = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return allApps.value;
  return allApps.value.filter(app =>
    app.getName(isRtl.value).toLowerCase().includes(q) ||
    app.port.toString().includes(q) ||
    app.descriptionAr.toLowerCase().includes(q) ||
    app.descriptionEn.toLowerCase().includes(q)
  );
});

async function copyCredentials() {
  try {
    const text = `URL: http://${selectedClientId.value}.fastfree.local\nUser: Administrator`;
    await navigator.clipboard.writeText(text);
    isCredsCopied.value = true;
    setTimeout(() => { isCredsCopied.value = false; }, 2000);
  } catch (err) {
    console.error('Failed to copy credentials', err);
  }
}

async function checkVmStatus() {
  isCheckingVm.value = true;
  try {
    const s = await getVmRealState(selectedClientId.value);
    realVmState.value = s;
    vmExists.value = s.exists;
  } catch {
    vmExists.value = false;
  } finally {
    isCheckingVm.value = false;
  }
}

function appendTerminalLog(source: any, msg: string) {
  consoleLogs.value.unshift(new SystemLogEntry(source, msg, 'info'));
}

function handleAppLaunch(app: SovereignApp) {
  appRegistryService.launchApp(app, `${selectedClientId.value}.fastfree.local`);
  appendTerminalLog('SYSTEM', `Launched application: ${app.getName(isRtl.value)} on port ${app.port}`);
}

function handleAppRestart(app: SovereignApp) {
  appendTerminalLog('SYSTEM', `Restart signal sent to ${app.getName(false)} unit.`);
}

function handleAppLogs(app: SovereignApp) {
  isTerminalOpen.value = true;
  appendTerminalLog('HYPER-V', `Attached log stream for unit ${app.id}.service (${selectedClientId.value})`);
}

function handleCopyUrl(url: string) {
  appendTerminalLog('SYSTEM', `Copied application endpoint URL: ${url}`);
}

async function launchPortal() {
  const url = `http://${selectedClientId.value}.fastfree.local`;
  try {
    await openUrl(url);
  } catch {
    window.open(url, '_blank');
  }
}

async function handleVmAction(action: 'start' | 'stop' | 'restart') {
  try {
    await executeVmCommand(action, selectedClientId.value);
    appendTerminalLog('HYPER-V', `Power command '${action}' dispatched to FastFree-${selectedClientId.value}`);
    await checkVmStatus();
  } catch (err: any) {
    appendTerminalLog('HYPER-V', `Error: ${err.message || err}`);
  }
}

async function handleInstantProvisioning() {
  if (isProvisioning.value) return;
  isProvisioning.value = true;
  try {
    const safeRam = Math.max(1024, Math.floor(((assignedRamMb.value || 2048) + 64) / 128) * 128);
    await provisionNode(selectedClientId.value, assignedCpuCores.value || 4, safeRam, targetDiskDrive.value || 'C:\\');
    appendTerminalLog('HYPER-V', `VM FastFree-${selectedClientId.value} provisioned and started.`);
    await checkVmStatus();
  } catch (err: any) {
    appendTerminalLog('HYPER-V', `Provisioning failed: ${err.message || err}`);
  } finally {
    isProvisioning.value = false;
  }
}

onMounted(async () => {
  await checkVmStatus();

  telemetryService.subscribe((t) => {
    liveTelemetry.value = t;
  });
  telemetryService.startPolling(selectedClientId.value);

  pollTimer = setInterval(async () => {
    if (!isCheckingVm.value && !isProvisioning.value) {
      await checkVmStatus();
    }
  }, 5000);
});

onUnmounted(() => {
  telemetryService.stopPolling();
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.screen-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
  color: #F8FAFC;
  font-family: 'Segoe UI Variable Display', 'Cairo', 'Segoe UI', Tahoma, system-ui, -apple-system, sans-serif;
  unicode-bidi: isolate;
}

.screen-container bdi,
.screen-container .bidi-isolate {
  unicode-bidi: isolate;
}

.is-rtl .screen-container {
  font-family: 'Cairo', 'Segoe UI', Tahoma, 'Noto Sans Arabic', system-ui, sans-serif;
}

.cred-val,
.wg-ip,
.status-node-pill,
.font-mono {
  unicode-bidi: isolate;
}

.cred-val[dir='ltr'],
.wg-ip[dir='ltr'],
.status-node-pill[dir='ltr'] {
  direction: ltr;
  unicode-bidi: isolate;
}

.content-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  padding: 4px 6px 12px 6px;
}

/* Ambient Lighting Orbs */
.ambient-orb-1 {
  position: absolute;
  top: -80px;
  right: 15%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(25, 118, 210, 0.12) 0%, transparent 70%);
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.ambient-orb-2 {
  position: absolute;
  bottom: -60px;
  left: 10%;
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%);
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

/* Unprovisioned Warning Banner */
.unprovisioned-alert-banner {
  position: relative;
  z-index: 20;
  width: 100%;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #F59E0B;
}

.alert-svg {
  width: 16px;
  height: 16px;
}

.btn-create-vm {
  background: #F59E0B;
  color: #070B14;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.2s;
}

.btn-create-vm:hover {
  opacity: 0.9;
}

/* Header Bar & Search */
.casaos-header-bar {
  position: relative;
  z-index: 15;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-search-wrap {
  position: relative;
  width: 320px;
  display: flex;
  align-items: center;
}

.search-svg {
  position: absolute;
  left: 12px;
  width: 14px;
  height: 14px;
  color: #94A3B8;
  pointer-events: none;
}

.is-rtl .search-svg {
  left: auto;
  right: 12px;
}

.search-input {
  width: 100%;
  height: 34px;
  padding: 0 14px 0 34px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #F8FAFC;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.is-rtl .search-input {
  padding: 0 34px 0 14px;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: #38BDF8;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.2);
}

.search-clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  font-size: 11px;
}

.is-rtl .search-clear-btn {
  right: auto;
  left: 10px;
}

.header-right-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-header-tool {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted, #94A3B8);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-header-tool:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38BDF8;
  color: #FFFFFF;
}

.tool-svg {
  width: 13px;
  height: 13px;
}

.status-node-pill {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #38BDF8;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 6px #F59E0B;
}

.node-status-dot.is-active {
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

/* Main 2-Column Workspace Layout */
.casa-workspace-layout {
  position: relative;
  z-index: 10;
  flex: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  align-items: start;
}

/* Left Sidebar */
.casa-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.casa-card {
  background: rgba(21, 31, 50, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.45);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.casa-card:hover {
  border-color: rgba(56, 189, 248, 0.25);
  box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.55);
}

/* Credentials Card */
.widget-creds {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.creds-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.creds-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #F8FAFC;
}

.btn-copy-creds {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38BDF8;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-copy-creds:hover {
  background: rgba(56, 189, 248, 0.22);
  color: #FFFFFF;
}

.copy-svg-mini {
  width: 11px;
  height: 11px;
}

.creds-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.cred-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cred-label {
  color: #94A3B8;
  font-size: 10.5px;
}

.cred-val {
  font-size: 11px;
}

.text-cyan {
  color: #06B6D4;
}

.text-emerald {
  color: #10B981;
}

/* WireGuard Widget */
.widget-wireguard {
  padding: 10px 14px;
}

.wg-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin-bottom: 4px;
}

.wg-label {
  color: #94A3B8;
}

.wg-ip {
  color: #10B981;
  font-weight: 700;
}

.wg-sub-row {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: #94A3B8;
}

/* Right Main Workspace */
.casa-workspace-main {
  display: flex;
  flex-direction: column;
}

/* Action Bar (Standard 56px) */
.action-bar {
  margin-top: auto;
  height: 56px;
  min-height: 56px;
  max-height: 56px;
  padding: 0 2px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-top: 1px solid var(--border-color, #27272A);
  box-sizing: border-box;
  flex-shrink: 0;
  animation: action-bar-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes action-bar-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.action-bar-start {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.action-bar-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-bar-end {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
}

.status-live {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.dot-amber {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F59E0B;
  box-shadow: 0 0 6px #F59E0B;
}

.btn-vm-restart {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted, #94A3B8);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-vm-restart:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38BDF8;
  color: #FFFFFF;
}

.vm-svg {
  width: 11px;
  height: 11px;
}

.btn-portal {
  background: linear-gradient(135deg, #1976D2, #0284C7);
  box-shadow: 0 4px 14px rgba(25, 118, 210, 0.35);
}

.btn-portal:hover {
  background: linear-gradient(135deg, #1565C0, #0369A1);
  box-shadow: 0 6px 18px rgba(25, 118, 210, 0.5);
}

.portal-svg {
  width: 13px;
  height: 13px;
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: inherit;
}

.btn-primary {
  background: var(--accent-primary, #1976D2);
  color: #FFFFFF;
}

.btn-flex {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.spinner-tiny {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #070B14;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 860px) {
  .casa-workspace-layout {
    grid-template-columns: 1fr;
  }
}
</style>