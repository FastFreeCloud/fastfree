<template>
  <div v-if="showPasswordModal" class="wg-modal-backdrop" @click.self="showPasswordModal = false" @keydown.esc="showPasswordModal = false">
    <div class="wg-modal wg-password-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title" tabindex="-1">
      <div class="wg-modal-header">
        <div class="wg-modal-icon">
          <svg aria-hidden="true" class="wg-modal-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="wg-modal-title-group">
          <h3 id="password-modal-title" class="wg-modal-title">{{ t('wireguard.modalSecurityTitle') }}</h3>
          <p class="wg-modal-subtitle">{{ t('wireguard.modalSecurityDesc') }}</p>
        </div>
      </div>

      <form class="wg-password-body" @submit.prevent="handleUnlockAdvanced">
        <label class="wg-modal-label">{{ t('wireguard.masterPasswordLabel') }}</label>
        <div class="wg-password-wrapper">
          <input
            ref="passwordInputRef"
            v-model="adminPasswordInput"
            :type="showPasswordText ? 'text' : 'password'"
            class="wg-modal-input"
            :placeholder="t('wireguard.passwordPlaceholder')"
            autocomplete="off"
            required
          />
          <button
            type="button"
            class="wg-btn-eye"
            tabindex="-1"
            @click="showPasswordText = !showPasswordText"
          >
            <svg aria-hidden="true" v-if="showPasswordText" class="wg-eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <svg aria-hidden="true" v-else class="wg-eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        <div v-if="passwordError" class="wg-modal-error">
          <svg aria-hidden="true" class="wg-error-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ passwordError }}</span>
        </div>

        <div class="wg-modal-actions">
          <button
            type="button"
            class="wg-btn-cancel"
            :disabled="isVerifyingPassword"
            @click="showPasswordModal = false"
          >
            {{ t('wireguard.cancelBtn') }}
          </button>
          <button
            type="submit"
            class="wg-btn-confirm"
            :disabled="isVerifyingPassword || !adminPasswordInput.trim()"
          >
            <span v-if="isVerifyingPassword" class="wg-spinner-tiny"></span>
            <span v-else>{{ t('wireguard.authorizeBtn') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWireGuardScreen } from '../../composables/useWireGuardScreen';

const {
  t,
  showPasswordModal,
  adminPasswordInput,
  showPasswordText,
  passwordError,
  isVerifyingPassword,
  passwordInputRef,
  handleUnlockAdvanced,
} = useWireGuardScreen();
</script>
