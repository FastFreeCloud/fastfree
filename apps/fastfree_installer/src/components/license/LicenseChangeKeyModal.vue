<template>
  <div v-if="showChangeKeyModal" class="modal-backdrop" @click.self="showChangeKeyModal = false">
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-icon-badge key-badge">
          <svg class="modal-shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="7.5" cy="15.5" r="5.5"></circle>
            <path d="m21 2-9.6 9.6"></path>
            <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
          </svg>
        </div>
        <div class="modal-title-group">
          <h3 class="modal-title">
            {{ isRtl ? 'تحديث أو تغيير مفتاح ترخيص فاست فري' : 'Update FastFree License Key' }}
          </h3>
          <p class="modal-subtitle">
            {{ isRtl
              ? 'أدخل مفتاح الاشتراك الجديد لاعتماده وتحديث صلاحيات العقدة السيادية فورياً.'
              : 'Enter the new enterprise license key to verify and re-bind this appliance.'
            }}
          </p>
        </div>
      </div>

      <form class="modal-body" @submit.prevent="handleChangeKeySubmit">
        <div class="current-key-hint">
          <span class="hint-label">{{ isRtl ? 'المفتاح النشط حالياً:' : 'Current Active Key:' }}</span>
          <code class="hint-code font-mono" dir="ltr">{{ licenseState?.key }}</code>
        </div>

        <label class="modal-label" for="new-license-input">
          {{ isRtl ? 'مفتاح الترخيص الجديد' : 'New License Key' }}
        </label>
        <div class="input-wrapper modal-input-wrapper">
          <input
            id="new-license-input"
            ref="newKeyInputRef"
            v-model="newLicenseInput"
            type="text"
            dir="ltr"
            class="modal-input font-mono"
            :placeholder="t('license.placeholder')"
            autocomplete="off"
            spellcheck="false"
            required
          />
          <button
            v-if="!newLicenseInput"
            type="button"
            class="btn-paste"
            :title="t('license.pasteBtn')"
            @click="handlePasteNewKey"
          >
            <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>{{ t('license.pasteBtn') }}</span>
          </button>
          <button
            v-else
            type="button"
            class="btn-clear"
            title="Clear"
            @click="newLicenseInput = ''"
          >
            <svg class="btn-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div v-if="changeKeyError" class="modal-error-box">
          <svg class="mini-err-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ changeKeyError }}</span>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-modal-cancel"
            :disabled="isVerifyingNewKey"
            @click="showChangeKeyModal = false"
          >
            {{ isRtl ? 'إلغاء' : 'Cancel' }}
          </button>
          <button
            type="submit"
            class="btn-modal-confirm"
            :disabled="isVerifyingNewKey || !newLicenseInput.trim()"
          >
            <span v-if="isVerifyingNewKey" class="spinner-tiny"></span>
            <span v-else>{{ isRtl ? 'التحقق وتحديث الترخيص' : 'Verify & Update' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLicenseManager } from '../../composables/useLicenseManager';

const {
  t,
  isRtl,
  licenseState,
  showChangeKeyModal,
  newLicenseInput,
  isVerifyingNewKey,
  changeKeyError,
  newKeyInputRef,
  handlePasteNewKey,
  handleChangeKeySubmit,
} = useLicenseManager();
</script>
