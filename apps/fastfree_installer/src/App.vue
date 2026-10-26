<template>
  <div class="installer-app" :class="[`theme-${theme}`, { 'is-rtl': isRtl }]" :dir="isRtl ? 'rtl' : 'ltr'">
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

        <!-- Theme Mode Switcher -->
        <button
          class="tool-btn theme-btn"
          :title="`${t('app.themeToggle')}: ${currentThemeOption?.name}`"
          @click="cycleTheme"
        >
          <span class="tool-icon">{{ currentThemeOption?.icon || '🌓' }}</span>
          <span class="theme-label">{{ isRtl ? currentThemeOption?.nameAr : currentThemeOption?.name }}</span>
        </button>

        <!-- Bilingual Language Toggle -->
        <button
          class="tool-btn lang-btn"
          :title="t('app.langToggle')"
          @click="toggleLocale"
        >
          <span class="lang-tag" :class="{ active: locale === 'ar' }">عربي</span>
          <span class="lang-sep">|</span>
          <span class="lang-tag" :class="{ active: locale === 'en' }">EN</span>
        </button>
      </div>

      <!-- Window Minimize / Maximize / Close Controls -->
      <div class="window-controls">
        <button class="win-btn" :title="t('app.minimize')" @click="minimizeWindow">🗕</button>
        <button class="win-btn" title="Maximize / Restore" @click="toggleMaximize">🗖</button>
        <button class="win-btn close" :title="t('app.close')" @click="closeWindow">✕</button>
      </div>
    </header>

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
import { computed, onMounted } from 'vue';
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

const { t, locale, isRtl, toggleLocale, setLocale } = useI18n();
const { theme, cycleTheme, availableThemes } = useTheme();
const { isDiagnosticOpen, totalErrors, totalWarnings, logInfo } = useDiagnostics();

const currentThemeOption = computed(() => {
  return availableThemes.find(t => t.id === theme.value) || availableThemes[0];
});

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
      logInfo('App', 'Appliance is already provisioned; opening directly in Sovereign Control Center mode.');
    }
  } catch {
    // ignore
  }

  logInfo('App', `Installer application loaded in ${locale.value.toUpperCase()} mode.`);

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

async function toggleMaximize() {
  const isMax = await appWindow.isMaximized();
  if (isMax) {
    await appWindow.unmaximize();
  } else {
    await appWindow.maximize();
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
  /* Default: sovereign-dark */
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

.lang-btn {
  font-family: inherit;
  padding: 0 10px;
}

.lang-tag {
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.lang-tag.active {
  opacity: 1;
  color: var(--accent-sky);
  font-weight: 700;
}

.lang-sep {
  opacity: 0.3;
  margin: 0 3px;
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
</style>
