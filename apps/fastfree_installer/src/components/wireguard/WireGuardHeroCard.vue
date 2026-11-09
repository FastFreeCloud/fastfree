<template>
  <div v-if="wireGuardConfig" class="wg-hero-card">
    <div class="wg-topology">
      <!-- Local Node -->
      <div class="wg-node wg-node-local">
        <div class="wg-node-icon">
          <svg aria-hidden="true" class="wg-node-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
        </div>
        <div class="wg-node-details">
          <span class="wg-node-type">{{ t('wireguard.localNode') }}</span>
          <span class="wg-node-name wg-font-mono">FastFree-{{ selectedClientId }}</span>
        </div>
      </div>

      <!-- Connecting Tunnel Pulse -->
      <div class="wg-tunnel-bridge">
        <div class="wg-pulse-line">
          <span class="wg-pulse-packet"></span>
          <span class="wg-pulse-packet wg-delayed"></span>
        </div>
        <div class="wg-tunnel-badge">
          <svg aria-hidden="true" class="wg-tunnel-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span class="wg-tunnel-text wg-font-mono">UDP {{ isAdvancedUnlocked ? manualPort : wireGuardConfig.listen_port }}</span>
        </div>
      </div>

      <!-- Central Controller Node -->
      <div class="wg-node wg-node-cloud">
        <div class="wg-node-icon wg-cloud-icon">
          <svg aria-hidden="true" class="wg-node-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
          </svg>
        </div>
        <div class="wg-node-details">
          <span class="wg-node-type">{{ t('wireguard.cloudController') }}</span>
          <span class="wg-node-name wg-font-mono">{{ isAdvancedUnlocked ? manualEndpoint : wireGuardConfig.controller_endpoint }}</span>
        </div>
      </div>
    </div>

    <!-- Live Status & Latency Probe -->
    <div class="wg-status-bar">
      <div class="wg-status-indicator">
        <span class="wg-status-dot" :class="{ 'wg-status-online': wireGuardConfig.latency_ms > 0 }"></span>
        <span class="wg-status-text">{{ wireGuardConfig.status }}</span>
        <span v-if="wireGuardConfig.latency_ms > 0" class="wg-latency-badge wg-font-mono">
          {{ wireGuardConfig.latency_ms }} ms
        </span>
      </div>

      <button
        type="button"
        class="wg-btn-ping"
        :disabled="isTestingPing"
        :title="t('wireguard.testPingNotice')" :aria-label="t('wireguard.testPingNotice')"
        @click="testHandshake"
      >
        <svg aria-hidden="true" class="wg-ping-svg" :class="{ 'wg-spinning': isTestingPing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        <span>{{ isTestingPing ? t('wireguard.testingPing') : t('wireguard.testPingBtn') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWireGuardScreen } from '../../composables/useWireGuardScreen';

const {
  t,
  wireGuardConfig,
  selectedClientId,
  isAdvancedUnlocked,
  manualPort,
  manualEndpoint,
  isTestingPing,
  testHandshake,
} = useWireGuardScreen();
</script>
