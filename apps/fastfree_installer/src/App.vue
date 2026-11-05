<template>
  <TrayCompanionDialog v-if="isTrayView" />
  <div v-else class="installer-app" @contextmenu.prevent :class="[`theme-${theme}`, { 'is-rtl': isRtl }]" :dir="isRtl ? 'rtl' : 'ltr'">
    <!-- Custom Draggable Titlebar (Windows 11 Fluent 2 Clean Branding) -->
    <header data-tauri-drag-region class="titlebar">
      <div class="brand">
        <img src="/logo.svg" class="brand-logo-img" alt="FastFree" />
        <div class="brand-text">
          <span class="brand-company-title">FastFree</span>
          <span class="version-tag">v{{ currentAppVersion }}</span>
        </div>
      </div>

      <!-- Center Titlebar Tools (Language, Theme, Diagnostic HUD - Clean Icons Only) -->
      <div class="titlebar-tools">
        <!-- Full System Diagnostics & Step Audit Button -->
        <button
          class="tool-btn icon-btn audit-btn"
          :title="isRtl ? 'استكشاف المشاكل وتدقيق خطوات التثبيت' : 'Full Diagnostics & Step Audit'"
          @click="openHub('audit')"
        >
          <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </button>

        <!-- Live Diagnostic HUD Icon Button -->
        <button
          class="tool-btn icon-btn hud-btn"
          :class="{ 'has-errors': totalErrors > 0, 'has-warns': totalWarnings > 0 && totalErrors === 0 }"
          :title="isRtl ? 'مركز التشخيص والسجلات الجنائية' : 'Live Forensic Diagnostics'"
          @click="openHub('logs')"
        >
          <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span v-if="totalErrors > 0" class="mini-pill pill-err">{{ totalErrors }}</span>
          <span v-else-if="totalWarnings > 0" class="mini-pill pill-warn">{{ totalWarnings }}</span>
        </button>

        <!-- Theme Toggle Button -->
        <button
          class="tool-btn icon-btn theme-btn"
          title="Toggle Theme"
          @click="cycleTheme"
        >
          <!-- Sun icon when dark -->
          <svg v-if="theme !== 'light'" class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <!-- Moon icon when light -->
          <svg v-else class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>

        <!-- Language Toggle Button (Pure Code EN / AR) -->
        <button
          class="tool-btn icon-btn lang-btn"
          title="Switch Language"
          @click="toggleLocale"
        >
          <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span class="lang-code">{{ locale === 'ar' ? 'EN' : 'AR' }}</span>
        </button>
      </div>

      <!-- Native Windows Fluent Caption Buttons -->
      <div class="window-controls">
        <button class="win-btn" title="Minimize" @click="minimizeWindow">
          <svg class="caption-svg" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
        <button class="win-btn close" title="Close" @click="closeWindow">
          <svg class="caption-svg" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.1" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.1" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Mandatory Enforced System Update Screen (Locks wizard until updated) -->
    <MandatoryUpdateGate v-if="updateAvailable" />

    <!-- Normal Wizard Flow (Only active when NO update is pending) -->
    <template v-else>
      <!-- Top Step Progress Navigation -->
      <StepProgress />

      <!-- Active Step Content Area -->
      <main class="content-wrapper">
        <transition name="fade-slide" mode="out-in">
          <HostDiscovery v-if="currentStep === 1" key="step-1" />
          <LicenseScreen v-else-if="currentStep === 2" key="step-2" />
          <NodeSizing v-else-if="currentStep === 3" key="step-3" />
          <WireGuardScreen v-else-if="currentStep === 4" key="step-4" />
          <ProvisioningScreen v-else-if="currentStep === 5" key="step-5" />
          <LaunchpadScreen v-else-if="currentStep === 6" key="step-6" />
        </transition>
      </main>
    </template>

    <!-- Unified Diagnostic, Step Audit & Self-Healing Hub -->
    <UnifiedDiagnosticHub
      v-if="showHubModal"
      :initial-tab="hubInitialTab"
      @close="showHubModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import StepProgress from './components/StepProgress.vue';
import HostDiscovery from './components/HostDiscovery.vue';
import LicenseScreen from './components/LicenseScreen.vue';
import NodeSizing from './components/NodeSizing.vue';
import WireGuardScreen from './components/WireGuardScreen.vue';
import ProvisioningScreen from './components/ProvisioningScreen.vue';
import LaunchpadScreen from './components/LaunchpadScreen.vue';
import UnifiedDiagnosticHub from './components/UnifiedDiagnosticHub.vue';
import MandatoryUpdateGate from './components/MandatoryUpdateGate.vue';
import TrayCompanionDialog from './components/TrayCompanionDialog.vue';
import {
  currentStep,
  loadingDiscovery,
  fetchSystemDiscovery,
  dismissSplash,
  minimizeToTray,
  selectedClientId,
  isProvisioningDone,
} from './composables/useDiscovery';
import { useI18n } from './composables/useI18n';
import { useTheme } from './composables/useTheme';
import { useDiagnostics } from './composables/useDiagnostics';
import {
  checkForUpdates,
  updateAvailable,
  currentAppVersion,
  initAppVersion,
  startAutoUpdatePolling,
} from './composables/useAutoUpdater';

const { locale, isRtl, toggleLocale, setLocale } = useI18n();
const { theme, cycleTheme } = useTheme();
const { totalErrors, totalWarnings, logInfo, logWarn } = useDiagnostics();

const showHubModal = ref(false);
const hubInitialTab = ref<'audit' | 'logs' | 'telemetry'>('audit');

function openHub(tab: 'audit' | 'logs' | 'telemetry' = 'audit') {
  hubInitialTab.value = tab;
  showHubModal.value = true;
}

const isTrayView = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'tray';

let appWindow: any = null;
try {
  appWindow = getCurrentWindow();
} catch {
  // Browser preview mode fallback
}

onMounted(async () => {
  const bootStart = Date.now();
  await initAppVersion();
  try {
    const savedLocale = localStorage.getItem('fastfree_installer_locale');
    if (savedLocale === 'ar' || savedLocale === 'en') {
      setLocale(savedLocale);
    }
  } catch {
    // restricted storage fallback
  }

  // Verify if appliance was already provisioned OR if a FastFree VM already exists in Hyper-V
  try {
    const targetClient = selectedClientId.value || localStorage.getItem('fastfree_wizard_client_id') || 'client1';
    const exists = await invoke<boolean>('check_vm_exists', { clientId: targetClient });
    if (exists) {
      // Check if VM has a real bootable disk or if it needs automated repair/provisioning
      try {
        const vmState = await invoke<any>('get_vm_real_state', { clientId: targetClient });
        if (vmState && vmState.is_empty_disk) {
          logWarn('App', `VM FastFree-${targetClient} exists in Hyper-V but disk is missing or empty. Auto-routing to Provisioning for seamless background deployment.`);
          isProvisioningDone.value = false;
          currentStep.value = 5;
        } else {
          isProvisioningDone.value = true;
          try {
            localStorage.setItem('fastfree_provisioned', 'true');
            localStorage.setItem('fastfree_wizard_client_id', targetClient);
          } catch {}
          currentStep.value = 6;
          logInfo('App', `Appliance FastFree-${targetClient} verified in Hyper-V; opening directly in Control Center mode.`);
        }
      } catch {
        isProvisioningDone.value = true;
        currentStep.value = 6;
      }
    } else {
      const isProvisioned = localStorage.getItem('fastfree_provisioned') === 'true';
      if (isProvisioned) {
        logWarn('App', `Appliance flag was set in storage but VM FastFree-${targetClient} was not found in Hyper-V. Starting at Discovery for fresh setup.`);
        try {
          localStorage.removeItem('fastfree_provisioned');
        } catch {}
      }
      currentStep.value = 1;
    }
  } catch (err) {
    logWarn('App', `Failed to verify Hyper-V VM state on startup: ${err}`);
  }

  logInfo('App', `Installer application loaded in ${locale.value.toUpperCase()} mode.`);

  // Proactively check for updates on startup
  setTimeout(() => {
    checkForUpdates(true);
  }, 2500);

  // Initialize automated background polling (every 30 minutes)
  startAutoUpdatePolling(30);

  // Listen to manual update check requests from Windows Taskbar Tray Menu (near clock)
  try {
    await listen('trigger-check-updates', async () => {
      logInfo('Tray', 'Manual update check requested from taskbar tray menu');
      await checkForUpdates(false);
    });
  } catch (err) {
    console.warn('Tray event listener notice:', err);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
      e.preventDefault();
    }
  });

  try {
    await fetchSystemDiscovery();
  } catch (err) {
    console.error('System discovery failed:', err);
  } finally {
    // Ensure splash displays gracefully for at least 2500ms
    const elapsed = Date.now() - bootStart;
    const minSplashDuration = 2500;
    if (elapsed < minSplashDuration) {
      await new Promise(resolve => setTimeout(resolve, minSplashDuration - elapsed));
    }
    loadingDiscovery.value = false;
    await dismissSplash();
  }
});

function minimizeWindow() {
  if (appWindow) {
    appWindow.minimize();
  }
}

async function closeWindow() {
  // Never terminate the app; always minimize cleanly to system tray
  await minimizeToTray();
}
</script>

<style>
/* Global Resets & Theme CSS Variables */
*, *::before, *::after {
  box-sizing: border-box;
}

:root {
  /* Default: dark */
  --bg-app: #0B1120;
  --bg-card: #151F32;
  --bg-sub: #0F172A;
  --bg-header: #0A0F1D;
  --bg-stream: #080C17;
  --bg-hover: #1E293B;
  --border-color: rgba(255, 255, 255, 0.08);
  --border-highlight: #334155;
  --text-main: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;
  --accent-primary: #1976D2;
  --accent-hover: #1565C0;
  --accent-emerald: #10B981;
  --accent-sky: #38BDF8;

  /* Curved Glassmorphism Tokens */
  --radius-card: 14px;
  --radius-hero: 16px;
  --radius-inner: 10px;
  --radius-pill: 9999px;
  --card-glass-bg: linear-gradient(145deg, rgba(21, 31, 50, 0.85) 0%, rgba(15, 23, 42, 0.75) 100%);
  --card-glass-border: 1px solid rgba(255, 255, 255, 0.08);
  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35);
  --card-hover-shadow: 0 8px 25px -4px rgba(0, 0, 0, 0.45), 0 0 15px rgba(25, 118, 210, 0.15);
}

html[data-theme="light"],
.theme-light {
  --bg-app: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-sub: #F1F5F9;
  --bg-header: #FFFFFF;
  --bg-stream: #F8FAFC;
  --bg-hover: #E2E8F0;
  --border-color: rgba(0, 0, 0, 0.08);
  --border-highlight: #CBD5E1;
  --text-main: #0F172A;
  --text-secondary: #334155;
  --text-muted: #64748B;
  --accent-primary: #1976D2;
  --accent-hover: #1565C0;
  --accent-emerald: #059669;
  --accent-sky: #0284C7;

  --card-glass-bg: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  --card-glass-border: 1px solid rgba(0, 0, 0, 0.08);
  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06);
  --card-hover-shadow: 0 8px 25px -4px rgba(0, 0, 0, 0.1), 0 0 15px rgba(25, 118, 210, 0.1);
}

html[data-theme="oled-black"],
.theme-oled-black {
  --bg-app: #000000;
  --bg-card: #0A0A0A;
  --bg-sub: #050505;
  --bg-header: #000000;
  --bg-stream: #000000;
  --bg-hover: #171717;
  --border-color: rgba(255, 255, 255, 0.08);
  --border-highlight: #404040;
  --text-main: #FFFFFF;
  --text-secondary: #D4D4D8;
  --text-muted: #71717A;
  --accent-primary: #1976D2;
  --accent-hover: #1565C0;
  --accent-emerald: #10B981;
  --accent-sky: #38BDF8;

  --card-glass-bg: linear-gradient(145deg, rgba(14, 14, 14, 0.9) 0%, rgba(8, 8, 8, 0.85) 100%);
  --card-glass-border: 1px solid rgba(255, 255, 255, 0.08);
  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.7);
  --card-hover-shadow: 0 8px 25px -4px rgba(0, 0, 0, 0.8), 0 0 15px rgba(25, 118, 210, 0.2);
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Segoe UI Variable Text', 'Segoe UI Variable Display', 'IBM Plex Sans Arabic', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-app);
  color: var(--text-main);
  user-select: none;
  overflow: hidden;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-header);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-highlight);
}
</style>

<style scoped>
.installer-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-app);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-hero, 16px);
  box-shadow: 0 24px 60px -10px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
  overflow: hidden;
  transition: background-color 0.25s ease, color 0.25s ease;
}

.titlebar {
  height: 40px;
  background: var(--bg-header);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  padding-inline-start: 16px;
  padding-inline-end: 0;
  border-bottom: 1px solid var(--border-color);
  border-top-left-radius: var(--radius-hero, 16px);
  border-top-right-radius: var(--radius-hero, 16px);
  user-select: none;
  cursor: grab;
  position: relative;
  z-index: 50;
  backdrop-filter: blur(12px);
}

.titlebar:active {
  cursor: grabbing;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 10px rgba(56, 189, 248, 0.55));
  animation: logo-gentle-breathe 4s ease-in-out infinite;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), filter 0.25s ease;
  cursor: pointer;
}

.brand-logo-img:hover {
  transform: scale(1.14);
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.9));
}

@keyframes logo-gentle-breathe {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 8px rgba(56, 189, 248, 0.45));
  }
  50% {
    transform: scale(1.06);
    filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 12px rgba(56, 189, 248, 0.7));
  }
}

.brand-text {
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand-company-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.2px;
  background: linear-gradient(135deg, #FFFFFF 40%, #38BDF8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif;
}

.version-tag {
  font-size: 10px;
  font-weight: 700;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.28);
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.6px;
}

.titlebar-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
}

.tool-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  height: 30px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tool-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-highlight);
  color: var(--text-main);
  transform: translateY(-1px);
}

.tool-icon {
  font-size: 13px;
}

.hud-btn.has-errors {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.12);
  color: #F87171;
}

.hud-btn.has-warns {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.12);
  color: #FBBF24;
}

.mini-pill {
  position: absolute;
  top: -3px;
  right: -3px;
  padding: 1px 5px;
  border-radius: 10px;
  font-size: 8.5px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.pill-err {
  background: #DC2626;
  color: #FFFFFF;
}

.pill-warn {
  background: #D97706;
  color: #FFFFFF;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  position: relative;
}

.tool-svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-btn:hover .tool-svg {
  transform: scale(1.12) rotate(8deg);
}

.lang-code {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 8.5px;
  font-weight: 800;
  color: var(--accent-sky);
  line-height: 1;
  background: var(--bg-card);
  padding: 1px 2px;
  border-radius: 3px;
  border: 1px solid rgba(56, 189, 248, 0.4);
}

.window-controls {
  display: flex;
  align-items: stretch;
  height: 40px;
  -webkit-app-region: no-drag;
}

.win-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 46px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.1s ease, color 0.1s ease;
  padding: 0;
}

.caption-svg {
  width: 10px;
  height: 10px;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
}

.win-btn.close:hover {
  background: #C42B1C;
  color: #FFFFFF;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  padding: clamp(12px, 2vh, 18px) clamp(16px, 2.5vw, 28px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  width: 100%;
}

/* Step transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.22s ease-out;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.is-rtl .fade-slide-enter-from {
  transform: translateX(-12px);
}

.is-rtl .fade-slide-leave-to {
  transform: translateX(12px);
}

/* Auto-Update Floating Banner */
.update-banner {
  background: linear-gradient(90deg, #1E1B4B 0%, #172554 100%);
  border-bottom: 1px solid rgba(56, 189, 248, 0.4);
  padding: 8px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  z-index: 40;
}

.update-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.update-pulse-icon {
  font-size: 18px;
  animation: pulse-icon 2s infinite ease-in-out;
}

@keyframes pulse-icon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.update-texts {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-head {
  font-size: 12px;
  font-weight: 700;
  color: #38BDF8;
}

.update-tag {
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
  background: #1976D2;
  padding: 1px 6px;
  border-radius: 4px;
}

.update-desc {
  font-size: 11px;
  color: #94A3B8;
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-install-update {
  background: #10B981;
  color: #FFFFFF;
  border: none;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-install-update:hover {
  background: #059669;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
}

.btn-direct-download {
  background: rgba(255, 255, 255, 0.08);
  color: #38BDF8;
  border: 1px solid rgba(56, 189, 248, 0.35);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-direct-download:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38BDF8;
  color: #FFFFFF;
}

.btn-dismiss-update {
  background: none;
  border: none;
  color: #64748B;
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
}

.btn-dismiss-update:hover {
  color: #F8FAFC;
}

.progress-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  color: #38BDF8;
}

.progress-bytes {
  font-weight: 600;
}

.progress-pct {
  font-weight: 700;
  color: #10B981;
}

.progress-track-sm {
  width: 120px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-track-sm .progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10B981, #38BDF8);
  transition: width 0.2s ease;
}

.btn-sm-download {
  padding: 3px 8px;
  font-size: 10.5px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease-out;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

/* Master Password Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  background: #18181B;
  border: 1px solid rgba(56, 189, 248, 0.35);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(56, 189, 248, 0.15);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 24px;
  color: #FAFAFA;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-sizing: border-box;
}

.modal-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  position: relative;
}

.modal-icon-badge {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #38BDF8;
}

.modal-shield-svg {
  width: 22px;
  height: 22px;
}

.modal-title-text {
  flex: 1;
}

.modal-title-text h4 {
  font-size: 15px;
  font-weight: 700;
  color: #F8FAFC;
  margin: 0 0 4px 0;
}

.modal-title-text p {
  font-size: 11.5px;
  color: #94A3B8;
  margin: 0;
  line-height: 1.4;
}

.btn-close-modal {
  position: absolute;
  inset-inline-end: -6px;
  top: -6px;
  background: transparent;
  border: none;
  color: #71717A;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close-modal:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #F8FAFC;
}

.close-svg {
  width: 18px;
  height: 18px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-label {
  font-size: 11px;
  font-weight: 600;
  color: #CBD5E1;
  text-transform: uppercase;
  margin-bottom: 6px;
  display: block;
}

.pwd-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.modal-input {
  width: 100%;
  background: #09090B;
  border: 1px solid #3F3F46;
  border-radius: 8px;
  padding: 10px 42px 10px 14px;
  font-size: 13px;
  color: #F8FAFC;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}

.installer-app.is-rtl .modal-input {
  padding: 10px 14px 10px 42px;
}

.modal-input:focus {
  border-color: #38BDF8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.btn-toggle-eye {
  position: absolute;
  inset-inline-end: 10px;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-toggle-eye:hover {
  color: #F8FAFC;
}

.eye-svg {
  width: 18px;
  height: 18px;
}

.modal-error-text {
  font-size: 11px;
  color: #F87171;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 6px;
  padding: 6px 10px;
  margin-top: 6px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
</style>
