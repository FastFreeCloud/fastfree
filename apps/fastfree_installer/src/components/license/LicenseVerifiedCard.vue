<template>
  <div v-if="licenseState && licenseState.is_valid" class="license-credential-card">
    <div class="license-top">
      <div class="license-top-start">
        <div class="status-pill status-active">
          <span class="dot-green"></span>
          <span>{{ t('license.activeVerified') }}</span>
        </div>
        <div
          class="hwid-pill-box"
          dir="ltr"
          :class="{ 'is-copied': hwidCopied }"
          :title="isRtl ? 'معرف العتاد المشفر - انقر للنسخ' : 'Encrypted Hardware ID - Click to copy'"
          @click="copyHwid"
        >
          <span class="hwid-tag">HWID</span>
          <code class="hwid-code-text font-mono">{{ machineHwid || (isRtl ? 'جارٍ قراءة معرف العتاد...' : 'Loading HWID...') }}</code>
          <button
            type="button"
            class="btn-copy-interactive"
            :class="{ 'is-copied': hwidCopied }"
            :title="isRtl ? 'نسخ معرف العتاد كاملاً' : 'Copy Full HWID'" :aria-label="isRtl ? 'نسخ معرف العتاد كاملاً' : 'Copy Full HWID'"
            @click.stop="copyHwid"
          >
            <svg aria-hidden="true" v-if="!hwidCopied" class="copy-mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <svg aria-hidden="true" v-else class="copy-mini-svg text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="copy-label">{{ hwidCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ' : 'Copy') }}</span>
          </button>
        </div>
      </div>

      <div class="license-top-end">
        <!-- Concise Client & Tier Chip -->
        <div class="company-tier-chip" :title="licenseState.company_name">
          <span class="company-name-text">{{ conciseCompanyName }}</span>
          <span class="chip-divider">•</span>
          <span class="chip-tier-name">{{ localizedTierName }}</span>
        </div>

        <!-- Live Google Sheets Cloud Sync Button -->
        <button
          type="button"
          class="btn-sync-cloud"
          :class="{ 'is-syncing': isSyncingCloud }"
          :disabled="isSyncingCloud"
          :title="isRtl ? 'مزامنة وتحديث بيانات الترخيص والمستخدمين مباشرة من السجل السحابي (Google Sheets)' : 'Sync & refresh license data live from Google Sheets'" :aria-label="isRtl ? 'مزامنة وتحديث بيانات الترخيص والمستخدمين مباشرة من السجل السحابي (Google Sheets)' : 'Sync & refresh license data live from Google Sheets'"
          @click="handleSyncCloud(false)"
        >
          <svg aria-hidden="true" class="sync-mini-svg" :class="{ 'spin-sync': isSyncingCloud }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          <span>{{ isSyncingCloud ? t('license.syncingBtn') : t('license.syncBtn') }}</span>
        </button>

        <!-- Change Key Button -->
        <button
          type="button"
          class="btn-change-key"
          :title="isRtl ? 'تحديث أو إدخال مفتاح ترخيص آخر' : 'Change License Key'" :aria-label="isRtl ? 'تحديث أو إدخال مفتاح ترخيص آخر' : 'Change License Key'"
          @click="openChangeKeyModal"
        >
          <svg aria-hidden="true" class="key-mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="7.5" cy="15.5" r="5.5"></circle>
            <path d="m21 2-9.6 9.6"></path>
            <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
          </svg>
          <span>{{ isRtl ? 'تغيير المفتاح' : 'Change Key' }}</span>
        </button>
      </div>
    </div>

    <!-- Cloud Sync Feedback Banner -->
    <div v-if="syncFeedback" class="sync-feedback-banner" :class="`feedback-${syncFeedback.type}`">
      <svg aria-hidden="true" v-if="syncFeedback.type === 'success'" class="feedback-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <svg aria-hidden="true" v-else class="feedback-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ syncFeedback.message }}</span>
    </div>

    <div class="license-details-grid">
      <!-- 1. Entity Detail -->
      <div class="detail-item">
        <span class="detail-label">
          <svg aria-hidden="true" class="detail-label-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          {{ t('license.entityLabel') }}
        </span>
        <span class="detail-val font-semibold" :title="licenseState.company_name">{{ licenseState.company_name }}</span>
      </div>

      <!-- 2. Assigned Node Detail -->
      <div class="detail-item">
        <span class="detail-label">
          <svg aria-hidden="true" class="detail-label-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          {{ t('license.assignedNode') }}
        </span>
        <div class="node-inline-picker">
          <span v-if="!hasMultipleEligibleNodes" class="node-locked-pill font-mono">
            <span class="node-dot-green"></span>
            FastFree-{{ selectedClientId }}
          </span>
          <select v-else v-model="selectedClientId" class="inline-node-select" :title="isRtl ? 'تحديد العقدة المستهدفة' : 'Select Target Node'">
            <option v-for="c in availableNodes" :key="c" :value="c">
              FastFree-{{ c }}
            </option>
          </select>
        </div>
      </div>

      <!-- 3. License Key Detail with Interactive Copy -->
      <div class="detail-item key-detail-item">
        <span class="detail-label">
          <svg aria-hidden="true" class="detail-label-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="7.5" cy="15.5" r="5.5"/>
            <path d="m21 2-9.6 9.6"/>
            <path d="m15.5 7.5 3 3L22 7l-3-3"/>
          </svg>
          {{ t('license.keyLabel') }}
        </span>
        <div
          class="code-interactive-pill"
          :class="{ 'is-copied': isKeyCopied }"
          :title="isRtl ? 'انقر لنسخ المفتاح كاملاً' : 'Click to copy license key'"
          @click="copyKey(licenseState.key)"
        >
          <code class="code-text font-mono" dir="ltr">{{ licenseState.key }}</code>
          <button
            type="button"
            class="btn-copy-interactive"
            :class="{ 'is-copied': isKeyCopied }"
            :title="isRtl ? 'نسخ مفتاح الترخيص' : 'Copy License Key'" :aria-label="isRtl ? 'نسخ مفتاح الترخيص' : 'Copy License Key'"
            @click.stop="copyKey(licenseState.key)"
          >
            <svg aria-hidden="true" v-if="!isKeyCopied" class="copy-mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <svg aria-hidden="true" v-else class="copy-mini-svg text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span class="copy-label">{{ isKeyCopied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ' : 'Copy') }}</span>
          </button>
        </div>
      </div>

      <!-- 4. Seat Count Detail -->
      <div class="detail-item">
        <span class="detail-label">
          <svg aria-hidden="true" class="detail-label-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {{ t('license.seatLabel') }}
        </span>
        <span class="detail-val font-mono">
          {{ licenseState.max_users >= 10000 ? t('license.unlimitedUsers') : t('license.usersCount', { count: licenseState.max_users }) }}
        </span>
      </div>

      <!-- 5. Expiration Date Detail -->
      <div class="detail-item expiry-detail-item">
        <span class="detail-label">
          <svg aria-hidden="true" class="detail-label-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {{ t('license.validUntilLabel') }}
        </span>
        <div class="expiry-value-wrap">
          <span class="detail-val font-mono" dir="ltr">{{ formattedExpiryDate }}</span>
          <span class="expiry-pill" :class="expiryStatusMeta.statusClass">
            {{ expiryStatusMeta.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- Unlocked Packages & Capabilities -->
    <div class="unlocked-features-box">
      <div class="features-header-row">
        <div class="features-header-title-box">
          <svg aria-hidden="true" class="features-header-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span class="features-title">{{ t('license.unlockedModules') }}</span>
        </div>
        <span class="features-count-tag font-mono">
          {{ displayedFeatures.length }} {{ isRtl ? 'أنظمة معتمدة ومفعلة' : 'Active Suites' }}
        </span>
      </div>

      <div class="feature-badges-wrap">
        <div
          v-for="(feature, idx) in displayedFeatures"
          :key="feature"
          class="feature-card"
          :style="{ animationDelay: `${idx * 35}ms` }"
        >
          <div class="feature-icon-wrapper">
            <svg aria-hidden="true" v-if="feature.includes('accounting')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <line x1="9" y1="7" x2="15" y2="7"/>
              <line x1="9" y1="11" x2="13" y2="11"/>
            </svg>
            <svg aria-hidden="true" v-else-if="feature.includes('inventory')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <svg aria-hidden="true" v-else-if="feature.includes('sales')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <svg aria-hidden="true" v-else-if="feature.includes('purchase')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <svg aria-hidden="true" v-else-if="feature.includes('hr')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <svg aria-hidden="true" v-else-if="feature.includes('wireguard')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <svg aria-hidden="true" v-else-if="feature.includes('hyperv')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            <svg aria-hidden="true" v-else-if="feature.includes('panel') || feature.includes('governance')" class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="9" rx="1"/>
              <rect x="14" y="3" width="7" height="5" rx="1"/>
              <rect x="14" y="12" width="7" height="9" rx="1"/>
              <rect x="3" y="16" width="7" height="5" rx="1"/>
            </svg>
            <svg aria-hidden="true" v-else class="feature-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>

          <div class="feature-info-meta">
            <span class="feature-title-text">{{ formatFeatureName(feature) }}</span>
            <span class="feature-status-line">
              <span class="dot-green-micro"></span>
              <span class="feature-status-label">{{ isRtl ? 'مرخص ونشط' : 'Active & Licensed' }}</span>
            </span>
          </div>
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
  licenseState,
  selectedClientId,
  machineHwid,
  hwidCopied,
  isKeyCopied,
  isSyncingCloud,
  syncFeedback,
  conciseCompanyName,
  localizedTierName,
  formattedExpiryDate,
  expiryStatusMeta,
  displayedFeatures,
  hasMultipleEligibleNodes,
  availableNodes,
  copyHwid,
  copyKey,
  handleSyncCloud,
  openChangeKeyModal,
  formatFeatureName,
} = useLicenseManager();
</script>

<style scoped>
@import '../../assets/styles/license-card.css';
</style>
