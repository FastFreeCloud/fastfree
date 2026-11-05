<template>
  <div class="input-section-root">
    <div
      class="input-card"
      :class="{ 'is-verifying': isVerifying }"
    >
      <div class="input-header-row">
        <label class="input-label" for="license-input">
          <span class="label-icon">
            <svg class="ui-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="7.5" cy="15.5" r="5.5"></circle>
              <path d="m21 2-9.6 9.6"></path>
              <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
            </svg>
          </span>
          <span>{{ t('license.licenseInputLabel') }}</span>
        </label>
        <div class="cloud-status-badge">
          <span class="status-dot-pulse"></span>
          <span>{{ t('license.cloudRegistryStatus') }}</span>
        </div>
      </div>

      <div class="input-row">
        <div class="input-wrapper">
          <input
            id="license-input"
            v-model="licenseInput"
            type="text"
            dir="ltr"
            :placeholder="t('license.placeholder')"
            class="text-input font-mono"
            :disabled="isVerifying"
            autofocus
            spellcheck="false"
            autocomplete="off"
            @keyup.enter="handleVerify"
          />
          <button
            v-if="!licenseInput"
            type="button"
            class="btn-paste"
            :title="t('license.pasteBtn')"
            @click="handlePaste"
          >
            <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            @click="licenseInput = ''"
          >
            <svg class="btn-svg-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <button
          class="btn btn-action"
          :disabled="isVerifying || !licenseInput.trim()"
          @click="handleVerify"
        >
          <span v-if="isVerifying" class="spinner-sm"></span>
          <span v-else>{{ t('license.verifyBtn') }}</span>
        </button>
      </div>

      <!-- Hardware Identity Card (HWID) shown when not verified -->
      <div class="hwid-card">
        <div class="hwid-info">
          <span class="hwid-label">{{ t('license.hwidLabel') }}</span>
          <code class="hwid-val font-mono" dir="ltr">{{ machineHwid || 'Loading HWID...' }}</code>
        </div>
        <button
          type="button"
          class="btn-copy-hwid"
          :class="{ copied: hwidCopied }"
          @click="copyHwid"
        >
          <span v-if="hwidCopied" class="btn-content">
            <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{{ t('license.hwidCopied') }}</span>
          </span>
          <span v-else class="btn-content">
            <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{{ t('license.copyHwid') }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- Verification Error Banner -->
    <div v-if="errorMessage" class="error-banner">
      <span class="error-icon">
        <svg class="ui-svg-err" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </span>
      <div class="error-details">
        <div class="error-header-row">
          <strong>{{ t('license.verFailed') }}</strong>
          <button
            type="button"
            class="btn-copy-error-banner"
            :title="isRtl ? 'نسخ تفاصيل الخطأ' : 'Copy error details'"
            @click="copyError(errorMessage, false)"
          >
            <svg v-if="!isErrorCopied" class="copy-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg v-else class="copy-svg check-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{{ isErrorCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الخطأ' : 'Copy') }}</span>
          </button>
        </div>
        <p class="error-msg-text">{{ errorMessage }}</p>

        <!-- Transfer License Button if Bound to Another Device / User -->
        <div v-if="isHwidMismatch" class="error-transfer-box">
          <p class="transfer-tip">
            {{ isRtl
              ? 'هل قمت باستبدال هذا الجهاز أو ترقيته؟ يمكنك إلغاء الترخيص من جهازك السابق وتنشيطه على هذا الجهاز فوراً:'
              : 'Did you replace or upgrade your previous machine? You can revoke the license from your previous device and activate it here:'
            }}
          </p>
          <button
            type="button"
            class="btn-transfer-license"
            :disabled="isTransferring"
            @click="openTransferModal"
          >
            <svg class="transfer-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>{{ isRtl ? 'إلغاء الترخيص من جهازي الآخر وتنشيطه هنا' : 'Revoke License from Other Device & Activate Here' }}</span>
          </button>
        </div>

        <div v-else class="error-support-tip">
          {{ t('license.supportNotice') }}
        </div>
      </div>
    </div>

    <!-- Sovereign Enterprise Architecture Highlights -->
    <div class="sovereign-highlights-grid">
      <div class="highlight-tile">
        <div class="tile-icon-box">
          <svg class="tile-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <circle cx="12" cy="11" r="3"/>
          </svg>
        </div>
        <div class="tile-content">
          <span class="tile-title">
            {{ isRtl ? 'حماية مشفرة مقترنة بالعتاد' : 'Hardware-Bound Cryptography' }}
          </span>
          <p class="tile-desc">
            {{ isRtl
              ? 'يتم قفل الترخيص وتوليد مفاتيح التشفير بناءً على معرّف اللوحة الأم وويندوز لضمان سيادة البيانات.'
              : 'Cryptographically locked to this motherboard and OS instance for uncompromising sovereignty.'
            }}
          </p>
        </div>
      </div>

      <div class="highlight-tile">
        <div class="tile-icon-box">
          <svg class="tile-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
            <line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
        </div>
        <div class="tile-content">
          <span class="tile-title">{{ isRtl ? 'تشغيل محلي سيادي 100%' : '100% Offline-First Sovereign' }}</span>
          <p class="tile-desc">
            {{ isRtl
              ? 'تعمل العقدة وتطبيقات ERP المحاسبية باستقلالية تامة دون حاجة لأي اتصال دائم بالإنترنت.'
              : 'Appliance runs completely air-gapped without requiring cloud dependencies or vendor telemetry.'
            }}
          </p>
        </div>
      </div>

      <div class="highlight-tile">
        <div class="tile-icon-box">
          <svg class="tile-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m4.93 4.93 4.24 4.24"/>
            <path d="m14.83 9.17 4.24-4.24"/>
            <path d="m14.83 14.83 4.24 4.24"/>
            <path d="m9.17 14.83-4.24 4.24"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <div class="tile-content">
          <span class="tile-title">{{ isRtl ? 'جاهزية شبكة FastFree VPN' : 'FastFree VPN Mesh Interconnect' }}</span>
          <p class="tile-desc">{{ isRtl ? 'تكامل تلقائي مشفر بين الفروع والأجهزة عبر قناة FastFree VPN مشفرة بنقرة واحدة.' : 'Automated zero-trust interconnect ready for branch sync and secure remote access via FastFree VPN.' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLicenseManager } from '../../composables/useLicenseManager';

const {
  t,
  isRtl,
  licenseInput,
  machineHwid,
  isVerifying,
  isTransferring,
  errorMessage,
  hwidCopied,
  isErrorCopied,
  isHwidMismatch,
  handleVerify,
  handlePaste,
  copyHwid,
  copyError,
  openTransferModal,
} = useLicenseManager();
</script>
