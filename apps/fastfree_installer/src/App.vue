<template>
  <div class="installer-app" @contextmenu.prevent :class="[`theme-${theme}`, { 'is-rtl': isRtl }]" :dir="isRtl ? 'rtl' : 'ltr'">
    <!-- Custom Draggable Titlebar -->
    <header data-tauri-drag-region class="titlebar">
      <div class="brand">
        <div class="brand-icon-wrap">
          <span class="brand-icon">⚡</span>
        </div>
        <div class="brand-text">
          <span class="title">{{ t('app.title') }}</span>
          <span class="version-tag">{{ t('app.version') }}</span>
        </div>
      </div>

      <!-- Center Titlebar Tools (Language, Theme, Diagnostic HUD) -->
      <div class="titlebar-tools">
        <!-- Live Diagnostic HUD Button -->
        <button
          class="tool-btn hud-btn"
          :class="{ 'has-errors': totalErrors > 0, 'has-warns': totalWarnings > 0 && totalErrors === 0 }"
          :title="t('app.diagHud')"
          @click="isDiagnosticOpen = !isDiagnosticOpen"
        >
          <span class="tool-icon">📡</span>
          <span class="hud-label">{{ t('diagnostics.hudBadge') }}</span>
          <span v-if="totalErrors > 0" class="mini-pill pill-err">{{ totalErrors }}</span>
          <span v-else-if="totalWarnings > 0" class="mini-pill pill-warn">{{ totalWarnings }}</span>
        </button>

        <!-- Professional Theme Icon Button -->
        <button
          class="tool-btn icon-btn theme-btn"
          :title="isRtl ? 'تبديل المظهر' : 'Toggle Theme'"
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

        <!-- Professional Language Icon Button -->
        <button
          class="tool-btn icon-btn lang-btn"
          :title="locale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'"
          @click="toggleLocale"
        >
          <svg class="tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span class="lang-code">{{ locale === 'ar' ? 'EN' : 'ع' }}</span>
        </button>
      </div>

      <!-- Window Minimize / Close Controls -->
      <div class="window-controls">
        <button class="win-btn" :title="t('app.minimize')" @click="minimizeWindow">🗕</button>
        <button class="win-btn close" :title="t('app.close')" @click="closeWindow">✕</button>
      </div>
    </header>

    <!-- Floating Live Auto-Update Alert Banner -->
    <transition name="slide-down">
      <div v-if="updateAvailable" class="update-banner">
        <div class="update-info">
          <span class="update-pulse-icon">🚀</span>
          <div class="update-texts">
            <span class="update-head">{{ isRtl ? 'تحديث جديد متوفر!' : 'New Update Available!' }}</span>
            <span class="update-tag">v{{ updateVersion }}</span>
            <span class="update-desc">{{ isRtl ? 'تم إصدار تحسينات أداء وتأمين جديدة وجاهزة للتثبيت المباشر.' : 'Performance & security updates ready to install.' }}</span>
          </div>
        </div>

        <div class="update-actions">
          <div v-if="isDownloadingUpdate" class="progress-box">
            <div class="progress-bar-fill" :style="{ width: `${downloadProgress}%` }"></div>
            <span class="progress-pct">{{ downloadProgress }}%</span>
          </div>
          <button
            v-else
            class="btn-install-update"
            @click="installPendingUpdate"
          >
            ⚡ {{ isRtl ? 'تثبيت التحديث وإعادة التشغيل' : 'Update & Restart' }}
          </button>
          <button v-if="!isDownloadingUpdate" class="btn-dismiss-update" @click="updateAvailable = false">✕</button>
        </div>
      </div>
    </transition>

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

    <!-- Diagnostic HUD Drawer Overlay -->
    <DiagnosticConsole />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import StepProgress from './components/StepProgress.vue';
import HostDiscovery from './components/HostDiscovery.vue';
import LicenseScreen from './components/LicenseScreen.vue';
import NodeSizing from './components/NodeSizing.vue';
import WireGuardScreen from './components/WireGuardScreen.vue';
import ProvisioningScreen from './components/ProvisioningScreen.vue';
import LaunchpadScreen from './components/LaunchpadScreen.vue';
import DiagnosticConsole from './components/DiagnosticConsole.vue';
import {
  currentStep,
  loadingDiscovery,
  fetchSystemDiscovery,
  dismissSplash,
  minimizeToTray,
} from './composables/useDiscovery';
import { useI18n } from './composables/useI18n';
import { useTheme } from './composables/useTheme';
import { useDiagnostics } from './composables/useDiagnostics';
import {
  checkForUpdates,
  updateAvailable,
  updateVersion,
  isDownloadingUpdate,
  downloadProgress,
  installPendingUpdate,
} from './composables/useAutoUpdater';

const { t, locale, isRtl, toggleLocale, setLocale } = useI18n();
const { theme, cycleTheme } = useTheme();
const { isDiagnosticOpen, totalErrors, totalWarnings, logInfo } = useDiagnostics();

const appWindow = getCurrentWindow();

onMounted(async () => {
  const bootStart = Date.now();
  try {
    const savedLocale = localStorage.getItem('fastfree_installer_locale');
    if (savedLocale === 'ar' || savedLocale === 'en') {
      setLocale(savedLocale);
    }
  } catch {
    // restricted storage fallback
  }

  // If appliance was already provisioned on this node, boot directly to Launchpad
  try {
    const isProvisioned = localStorage.getItem('fastfree_provisioned') === 'true';
    if (isProvisioned) {
      currentStep.value = 6;
      logInfo('App', 'Appliance is already provisioned; opening directly in Control Center mode.');
    }
  } catch {
    // ignore
  }

  logInfo('App', `Installer application loaded in ${locale.value.toUpperCase()} mode.`);

  // Proactively check for updates in background
  setTimeout(() => {
    checkForUpdates(true);
  }, 2500);

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
  appWindow.minimize();
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
  --border-color: #1E293B;
  --border-highlight: #334155;
  --text-main: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;
  --accent-primary: #1976D2;
  --accent-hover: #1565C0;
  --accent-emerald: #10B981;
  --accent-sky: #38BDF8;
}

html[data-theme="light"],
.theme-light {
  --bg-app: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-sub: #F1F5F9;
  --bg-header: #FFFFFF;
  --bg-stream: #F8FAFC;
  --bg-hover: #E2E8F0;
  --border-color: #E2E8F0;
  --border-highlight: #CBD5E1;
  --text-main: #0F172A;
  --text-secondary: #334155;
  --text-muted: #64748B;
  --accent-primary: #1976D2;
  --accent-hover: #1565C0;
  --accent-emerald: #059669;
  --accent-sky: #0284C7;
}

html[data-theme="oled-black"],
.theme-oled-black {
  --bg-app: #000000;
  --bg-card: #0A0A0A;
  --bg-sub: #050505;
  --bg-header: #000000;
  --bg-stream: #000000;
  --bg-hover: #171717;
  --border-color: #262626;
  --border-highlight: #404040;
  --text-main: #FFFFFF;
  --text-secondary: #D4D4D8;
  --text-muted: #71717A;
  --accent-primary: #1976D2;
  --accent-hover: #1565C0;
  --accent-emerald: #10B981;
  --accent-sky: #38BDF8;
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'IBM Plex Sans Arabic', 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
  border-radius: 10px;
  overflow: hidden;
  transition: background-color 0.25s ease, color 0.25s ease;
}

.titlebar {
  height: 48px;
  background: var(--bg-header);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  cursor: grab;
  position: relative;
  z-index: 50;
}

.titlebar:active {
  cursor: grabbing;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1976D2, #38BDF8);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
}

.brand-icon {
  font-size: 14px;
}

.brand-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: 0.3px;
}

.version-tag {
  font-size: 10px;
  font-weight: 700;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
  padding: 2px 7px;
  border-radius: 6px;
  letter-spacing: 0.5px;
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
  padding: 1px 5px;
  border-radius: 10px;
  font-size: 9px;
  font-weight: 700;
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
  align-items: center;
  -webkit-app-region: no-drag;
}

.win-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 36px;
  height: 32px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  border-radius: 4px;
}

.win-btn:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.win-btn.close:hover {
  background: #E11D48;
  color: #FFFFFF;
}

.content-wrapper {
  flex: 1;
  padding: 20px 32px 28px 32px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  max-width: 1350px;
  width: 100%;
  margin: 0 auto;
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
  width: 140px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-bar-fill {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  bottom: 0;
  background: #10B981;
  transition: width 0.2s ease;
}

.progress-pct {
  position: relative;
  font-size: 10px;
  font-weight: 700;
  color: #FFFFFF;
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
</style>
