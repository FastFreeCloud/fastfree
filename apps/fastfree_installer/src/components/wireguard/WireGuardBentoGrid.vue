<template>
  <div v-if="wireGuardConfig" class="wg-bento-grid">
    <!-- Tile 1: WireGuard Network Specs -->
    <div class="wg-bento-card">
      <div class="wg-bento-header">
        <svg aria-hidden="true" class="wg-bento-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span class="wg-bento-title">{{ t('wireguard.specsTitle') }}</span>
      </div>
      <div class="wg-specs-list">
        <div class="wg-spec-item">
          <span class="wg-spec-label">{{ t('wireguard.clientIpLabel') }}</span>
          <code class="wg-spec-val wg-font-mono">{{ wireGuardConfig.client_tunnel_ip }}</code>
        </div>
        <div class="wg-spec-item">
          <span class="wg-spec-label">{{ t('wireguard.listenPortLabel') }}</span>
          <code class="wg-spec-val wg-font-mono">{{ wireGuardConfig.listen_port }}</code>
        </div>
        <div class="wg-spec-item">
          <span class="wg-spec-label">{{ t('wireguard.cipherLabel') }}</span>
          <span class="wg-spec-val wg-font-mono wg-text-cyan">{{ wireGuardConfig.cipher }}</span>
        </div>
      </div>
    </div>

    <!-- Tile 2: Windows Defender Firewall Protection -->
    <div class="wg-bento-card">
      <div class="wg-bento-header">
        <svg aria-hidden="true" class="wg-bento-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span class="wg-bento-title">{{ t('wireguard.firewallTitle') }}</span>
      </div>
      <div class="wg-specs-list">
        <div class="wg-spec-item">
          <span class="wg-spec-label">{{ t('wireguard.firewallRuleLabel') }}</span>
          <span class="wg-spec-pill" :class="{ 'wg-pill-active': firewallStatus?.enabled }">
            <span class="wg-dot-green"></span>
            {{ firewallStatus?.enabled ? t('wireguard.ruleAllowed') : t('wireguard.ruleConfiguring') }}
          </span>
        </div>
        <div class="wg-spec-item">
          <span class="wg-spec-label">{{ t('wireguard.allowedPortsLabel') }}</span>
          <code class="wg-spec-val wg-font-mono">{{ firewallStatus?.local_ports || '51820-51835 UDP' }}</code>
        </div>
        <div class="wg-spec-item">
          <span class="wg-spec-label">{{ t('wireguard.secretStorageLabel') }}</span>
          <span class="wg-spec-val wg-text-muted">{{ t('wireguard.secretStorageDesc') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWireGuardScreen } from '../../composables/useWireGuardScreen';

const { t, wireGuardConfig, firewallStatus } = useWireGuardScreen();
</script>
