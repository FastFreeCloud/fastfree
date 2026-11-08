<template>
  <div v-if="showAdvancedModal" class="modal-backdrop" @click.self="showAdvancedModal = false" @keydown.esc="showAdvancedModal = false">
    <div class="modal-card modal-card-lg" role="dialog" aria-modal="true" aria-labelledby="endpoint-modal-title" tabindex="-1">
      <div class="modal-header">
        <div class="modal-icon-badge">
          <svg aria-hidden="true" class="modal-shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <div class="modal-title-group">
          <h3 id="endpoint-modal-title" class="modal-title">{{ t('wireguard.modalAdvancedTitle') }}</h3>
          <p class="modal-subtitle">{{ t('wireguard.modalAdvancedDesc') }}</p>
        </div>
      </div>

      <div class="modal-body-advanced">
        <!-- Input Row: Port, IP, Endpoint -->
        <div class="adv-inputs-grid">
          <div class="adv-field">
            <label class="adv-label">{{ t('wireguard.inputPortLabel') }}</label>
            <input
              v-model.number="manualPort"
              type="number"
              class="adv-input font-mono"
              placeholder="51820"
              @input="syncManualConf"
            />
          </div>
          <div class="adv-field">
            <label class="adv-label">{{ t('wireguard.inputIpLabel') }}</label>
            <input
              v-model="manualTunnelIp"
              type="text"
              class="adv-input font-mono"
              placeholder="10.24.0.2/32"
              @input="syncManualConf"
            />
          </div>
          <div class="adv-field">
            <label class="adv-label">{{ t('wireguard.inputEndpointLabel') }}</label>
            <input
              v-model="manualEndpoint"
              type="text"
              class="adv-input font-mono"
              placeholder="client1.fastfree.cloud:51820"
              @input="syncManualConf"
            />
          </div>
        </div>

        <!-- Raw Conf Editor -->
        <div class="adv-conf-box">
          <div class="conf-box-header">
            <span class="conf-header-title font-mono">{{ selectedClientId }}.conf</span>
            <div class="conf-box-actions">
              <button type="button" class="btn-conf-action" @click="resetToDefaults">
                <svg aria-hidden="true" class="conf-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
                <span>{{ t('wireguard.resetDefaultsBtn') }}</span>
              </button>
              <button type="button" class="btn-conf-action" :class="{ copied: confCopied }" @click="copyConf">
                <svg aria-hidden="true" class="conf-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>{{ confCopied ? t('wireguard.copiedBtn') : t('wireguard.copyConfBtn') }}</span>
              </button>
            </div>
          </div>
          <textarea
            v-model="manualConf"
            class="conf-textarea font-mono"
            rows="10"
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <div class="modal-actions-adv">
        <button type="button" class="btn-modal-cancel" @click="lockAgain">
          <svg aria-hidden="true" class="lock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>{{ t('wireguard.relockBtn') }}</span>
        </button>
        <button type="button" class="btn-modal-confirm" @click="saveAndCloseAdvanced">
          {{ t('wireguard.saveApplyBtn') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWireGuardScreen } from '../../composables/useWireGuardScreen';

const {
  t,
  showAdvancedModal,
  selectedClientId,
  manualPort,
  manualTunnelIp,
  manualEndpoint,
  manualConf,
  confCopied,
  syncManualConf,
  resetToDefaults,
  copyConf,
  lockAgain,
  saveAndCloseAdvanced,
} = useWireGuardScreen();
</script>
