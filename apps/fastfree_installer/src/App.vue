<template>
  <div class="installer-app">
    <!-- Custom Draggable Titlebar -->
    <header data-tauri-drag-region class="titlebar">
      <div class="brand">
        <span class="logo-dot"></span>
        <span class="title">FastFree Sovereign Node Setup & Companion</span>
        <span class="version-tag">v26.05</span>
      </div>
      <div class="window-controls">
        <button class="win-btn" title="Minimize" @click="minimizeWindow">−</button>
        <button class="win-btn close" title="Minimize to Tray" @click="closeWindow">✕</button>
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
import {
  currentStep,
  loadingDiscovery,
  fetchSystemDiscovery,
  dismissSplash,
  minimizeToTray,
} from './composables/useDiscovery';

const appWindow = getCurrentWindow();

onMounted(async () => {
  try {
    await fetchSystemDiscovery();
  } catch (err) {
    console.error('System discovery failed:', err);
  } finally {
    loadingDiscovery.value = false;
    await dismissSplash();
  }
});

function minimizeWindow() {
  appWindow.minimize();
}

async function closeWindow() {
  // If provisioning is complete or at launchpad, minimize cleanly to tray
  if (currentStep.value >= 5) {
    await minimizeToTray();
  } else {
    appWindow.close();
  }
}
</script>

<style>
/* Global Resets */
*, *::before, *::after {
  box-sizing: border-box;
}

body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #09090B;
  color: #F4F4F5;
  user-select: none;
  overflow: hidden;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #18181B;
}

::-webkit-scrollbar-thumb {
  background: #27272A;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3F3F46;
}
</style>

<style scoped>
.installer-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0F172A;
  color: #F8FAFC;
  border: 1px solid #27272A;
  border-radius: 10px;
  overflow: hidden;
}

.titlebar {
  height: 40px;
  background: #18181B;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid #27272A;
  user-select: none;
  cursor: grab;
}

.titlebar:active {
  cursor: grabbing;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1976D2;
  box-shadow: 0 0 8px #38BDF8;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: #F4F4F5;
  letter-spacing: 0.3px;
}

.version-tag {
  font-size: 10px;
  font-weight: 700;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.15);
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.window-controls {
  display: flex;
  align-items: center;
}

.win-btn {
  background: transparent;
  border: none;
  color: #A1A1AA;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.win-btn:hover {
  background: #27272A;
  color: #FFFFFF;
}

.win-btn.close:hover {
  background: #E11D48;
  color: #FFFFFF;
}

.content-wrapper {
  flex: 1;
  padding: 22px 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
</style>
