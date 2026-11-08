<template>
  <div v-if="showPasswordModal" class="modal-backdrop" @click.self="showPasswordModal = false" @keydown.esc="showPasswordModal = false">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="transfer-modal-title" tabindex="-1">
      <div class="modal-header">
        <div class="modal-icon-badge">
          <svg aria-hidden="true" class="modal-shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="modal-title-group">
          <h3 id="transfer-modal-title" class="modal-title">
            {{ isRtl ? 'تصريح أمان FastFree لنقل الترخيص' : 'FastFree Master Transfer Gate' }}
          </h3>
          <p class="modal-subtitle">
            {{ isRtl
              ? 'يتطلب إلغاء الترخيص من الجهاز السابق ونقله إلى هذا الجهاز تفويضاً رسمياً بإدخال كلمة المرور الإدارية للشركة.'
              : 'Revoking a license from another machine requires administrative authorization from FastFree.'
            }}
          </p>
        </div>
      </div>

      <form class="modal-body" @submit.prevent="handleConfirmTransfer">
        <label class="modal-label">
          {{ isRtl ? 'كلمة المرور الإدارية للشركة (Master Password)' : 'Company Master Password' }}
        </label>
        <div class="password-input-wrapper">
          <input
            ref="passwordInputRef"
            v-model="adminPasswordInput"
            :type="showPasswordText ? 'text' : 'password'"
            class="modal-input"
            :placeholder="isRtl ? 'أدخل كلمة مرور FastFree...' : 'Enter Master Password...'"
            autocomplete="off"
            required
          />
          <button
            type="button"
            class="btn-toggle-eye"
            tabindex="-1"
            @click="showPasswordText = !showPasswordText"
          >
            <svg aria-hidden="true" v-if="showPasswordText" class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <svg aria-hidden="true" v-else class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        <div v-if="modalError" class="modal-error-box">
          <div class="modal-error-header">
            <svg aria-hidden="true" class="error-mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span class="modal-error-title">{{ isRtl ? 'حدث خطأ أثناء إلغاء ونقل الترخيص' : 'Error Revoking & Transferring License' }}</span>
            <button
              type="button"
              class="btn-copy-error"
              :title="isRtl ? 'نسخ نص الخطأ بالكامل' : 'Copy Full Error Text'" :aria-label="isRtl ? 'نسخ نص الخطأ بالكامل' : 'Copy Full Error Text'"
              @click="copyError(modalError, true)"
            >
              <svg aria-hidden="true" v-if="!isModalErrorCopied" class="copy-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg aria-hidden="true" v-else class="copy-svg check-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{{ isModalErrorCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الخطأ' : 'Copy') }}</span>
            </button>
          </div>
          <div class="modal-error-body">
            <code class="error-code-block">{{ modalError }}</code>
          </div>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-modal-cancel"
            :disabled="isTransferring"
            @click="showPasswordModal = false"
          >
            {{ isRtl ? 'إلغاء' : 'Cancel' }}
          </button>
          <button
            type="submit"
            class="btn-modal-confirm"
            :disabled="isTransferring || !adminPasswordInput.trim()"
          >
            <span v-if="isTransferring" class="spinner-tiny"></span>
            <span v-else>{{ isRtl ? 'تأكيد وإلغاء الترخيص القديم' : 'Authorize & Revoke Old License' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLicenseManager } from '../../composables/useLicenseManager';

const {
  isRtl,
  showPasswordModal,
  adminPasswordInput,
  showPasswordText,
  modalError,
  passwordInputRef,
  isModalErrorCopied,
  isTransferring,
  copyError,
  handleConfirmTransfer,
} = useLicenseManager();
</script>

<style scoped>
@import '../../assets/styles/license-modals.css';
</style>
