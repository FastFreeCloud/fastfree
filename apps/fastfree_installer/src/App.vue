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
          <span class="version-tag">v{{ currentAppVersion }}</span>
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

      <!-- Native Windows Fluent Caption Buttons -->
      <div class="window-controls">
        <button class="win-btn" :title="t('app.minimize')" @click="minimizeWindow">
          <svg class="caption-svg" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
        <button class="win-btn close" :title="t('app.close')" @click="closeWindow">
          <svg class="caption-svg" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.1" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.1" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Mandatory Enforced System Update Screen (Locks wizard until updated) -->
    <div v-if="updateAvailable" class="mandatory-update-container">
      <div class="mandatory-card">
        <div class="mandatory-icon-badge">⚡</div>
        <div class="mandatory-header">
          <div class="mandatory-badge-tag">
            <span class="live-dot-pulse"></span>
            <span>{{ isRtl ? 'تحديث إلزامي مطلوب للنظام' : 'Mandatory System Update Required' }}</span>
          </div>
          <h2>{{ isRtl ? `تحديث جديد متوفر: v${updateVersion}` : `New Release Available: v${updateVersion}` }}</h2>
          <p class="mandatory-sub">
            {{ isRtl
              ? 'يتطلب الاستمرار في تهيئة واستخدام عقد فاست فري الترقية إلى الإصدار الأحدث لضمان استقرار محرك Hyper-V ومزامنة النفق المشفر.'
              : 'Upgrading to the latest release is required to ensure Hyper-V compatibility, WireGuard mesh synchronicity, and system stability.'
            }}
          </p>
        </div>

        <div class="version-bridge-card">
          <div class="version-node current">
            <span class="node-label">{{ isRtl ? 'النسخة الحالية' : 'Current Version' }}</span>
            <span class="node-ver font-mono">v{{ currentAppVersion }}</span>
          </div>
          <div class="bridge-arrow">➔</div>
          <div class="version-node target">
            <span class="node-label">{{ isRtl ? 'النسخة الإلزامية' : 'Required Version' }}</span>
            <span class="node-ver font-mono text-emerald">v{{ updateVersion }}</span>
          </div>
        </div>

        <div v-if="updateNotes" class="notes-box">
          <div class="notes-title">{{ isRtl ? 'ملاحظات الإصدار الجديد:' : 'Release Highlights:' }}</div>
          <div class="notes-content">{{ updateNotes }}</div>
        </div>

        <div v-if="isDownloadingUpdate" class="download-progress-card">
          <div class="dp-header">
            <span class="dp-text">{{ isRtl ? 'جارٍ تنزيل وتثبيت التحديث...' : 'Downloading & installing update...' }}</span>
            <span class="dp-stats font-mono">{{ downloadedBytesFormatted }} / {{ totalBytesFormatted }} ({{ downloadProgress }}%)</span>
          </div>
          <div class="progress-track-lg">
            <div class="progress-bar-lg" :style="{ width: `${downloadProgress}%` }"></div>
          </div>
        </div>

        <div v-if="updateError" class="update-error-alert">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ updateError }}</span>
        </div>

        <div class="mandatory-actions">
          <button
            class="btn btn-primary btn-update-hero"
            :disabled="isDownloadingUpdate"
            @click="installPendingUpdate"
          >
            <span v-if="isDownloadingUpdate" class="spinner-tiny"></span>
            <span v-else>⚡ {{ isRtl ? 'تثبيت التحديث الآن وإعادة التشغيل' : 'Install Update & Restart Now' }}</span>
          </button>
          <button
            v-if="manualDownloadUrl"
            class="btn btn-secondary"
            :disabled="isDownloadingUpdate"
            @click="openManualDownload"
          >
            🌐 {{ isRtl ? 'تحميل مباشر كملف مستقل' : 'Download Direct Installer' }}
          </button>
        </div>

        <div class="mandatory-footer-notice">
          🔒 {{ isRtl ? 'تم قفل الانتقال في المعالج لحين تطبيق التحديث لضمان تكامل النظام.' : 'Setup wizard navigation is locked until the update is applied.' }}
        </div>
      </div>
    </div>

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

    <!-- Diagnostic HUD Drawer Overlay -->
    <DiagnosticConsole />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
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
  updateNotes,
  updateError,
  isDownloadingUpdate,
  downloadProgress,
  downloadedBytesFormatted,
  totalBytesFormatted,
  installPendingUpdate,
  currentAppVersion,
  initAppVersion,
  manualDownloadUrl,
  openManualDownload,
  startAutoUpdatePolling,
} from './composables/useAutoUpdater';

const { t, locale, isRtl, toggleLocale, setLocale } = useI18n();
const { theme, cycleTheme } = useTheme();
const { isDiagnosticOpen, totalErrors, totalWarnings, logInfo, logWarn } = useDiagnostics();

const appWindow = getCurrentWindow();

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

  // Verify if appliance was already provisioned AND VM actually exists in Hyper-V
  try {
    const isProvisioned = localStorage.getItem('fastfree_provisioned') === 'true';
    if (isProvisioned) {
      const exists = await invoke<boolean>('check_vm_exists', { clientId: 'client2' });
      if (exists) {
        currentStep.value = 6;
        logInfo('App', 'Appliance verified in Hyper-V; opening directly in Control Center mode.');
      } else {
        logWarn('App', 'Appliance flag was set but VM FastFree-client2 was not found in Hyper-V. Starting at Discovery for fresh setup.');
        try {
          localStorage.removeItem('fastfree_provisioned');
        } catch {}
        currentStep.value = 1;
      }
    }
  } catch {
    // ignore
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

.mandatory-update-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 70%);
  overflow-y: auto;
}

.mandatory-card {
  width: 100%;
  max-width: 620px;
  background: var(--bg-card, #1E293B);
  border: 1px solid rgba(56, 189, 248, 0.3);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.15);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  backdrop-filter: blur(16px);
}

.mandatory-icon-badge {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2));
  border: 1px solid rgba(245, 158, 11, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #F59E0B;
}

.mandatory-header h2 {
  margin: 6px 0 0 0;
  font-size: 20px;
  font-weight: 700;
  color: #F8FAFC;
}

.mandatory-badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.mandatory-sub {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.5;
}

.version-bridge-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
}

.version-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.node-label {
  font-size: 11px;
  color: #64748B;
  font-weight: 600;
}

.node-ver {
  font-size: 15px;
  font-weight: 700;
  color: #F8FAFC;
}

.bridge-arrow {
  font-size: 18px;
  color: #38BDF8;
}

.notes-box {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
}

.notes-title {
  font-weight: 600;
  color: #38BDF8;
  margin-bottom: 4px;
}

.notes-content {
  color: #CBD5E1;
  line-height: 1.4;
  white-space: pre-wrap;
  max-height: 80px;
  overflow-y: auto;
}

.download-progress-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dp-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.dp-text {
  color: #F8FAFC;
  font-weight: 600;
}

.dp-stats {
  color: #38BDF8;
  font-weight: 700;
}

.progress-track-lg {
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar-lg {
  height: 100%;
  background: linear-gradient(90deg, #10B981, #38BDF8);
  transition: width 0.2s ease;
}

.update-error-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  padding: 10px 12px;
  color: #FCA5A5;
  font-size: 12px;
}

.mandatory-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.btn-update-hero {
  flex: 1;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
}

.mandatory-footer-notice {
  text-align: center;
  font-size: 11px;
  color: #64748B;
  font-weight: 500;
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
