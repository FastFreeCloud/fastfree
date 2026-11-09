<template>
  <div class="wg-screen screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="wg-header">
      <div class="wg-step-tag">{{ t('wireguard.stepTag') }}</div>
      <h2>{{ t('wireguard.title') }}</h2>
      <p class="wg-subtitle">{{ t('wireguard.subtitle') }}</p>
    </div>

    <!-- 1. Node Selector Bar -->
    <WireGuardNodeSelector />

    <!-- 2. Loading State -->
    <div v-if="isLoadingConfig" class="wg-loading-state">
      <div class="wg-spinner" role="status" aria-label="Loading"></div>
      <p class="wg-loading-msg">{{ t('wireguard.generatingConfig', { client: selectedClientId }) }}</p>
    </div>

    <!-- 3. Content Body -->
    <div v-else-if="wireGuardConfig" class="wg-content-body">
      <WireGuardHeroCard />
      <WireGuardBentoGrid />
      <WireGuardAdvancedBanner />
    </div>

    <!-- 3b. Failure State (desktop window or preview) -->
    <div v-else class="wg-content-fallback">
      <div class="wg-fallback-card">
        <svg aria-hidden="true" class="wg-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <div class="wg-fallback-body">
          <strong>
            {{
              isRtl
                ? 'تعذر تحميل إعدادات شبكة النفق المشفر'
                : 'WireGuard configuration unavailable'
            }}
          </strong>
          <span>
            {{
              isRtl
                ? (browserPreviewMode ? 'قراءة إعدادات الشبكة الحية تعمل من نافذة سطح المكتب فقط. افتح نافذة التطبيق ثم استخدم زر إعادة المحاولة.' : 'واجه الاتصال من نافذة سطح المكتب. تفاصيل الخطأ مسجلة في سجل التشخيص.')
                : (browserPreviewMode ? 'Live network configuration reads run inside the desktop window only. Open the desktop app and press Retry.' : 'The connection service could not be read. Details are recorded in the diagnostics log.')
            }}
          </span>
          <button type="button" class="wg-btn wg-btn-secondary wg-fallback-retry" @click="retryLoadConfig">
            {{ isRtl ? 'إعادة المحاولة' : 'Retry' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 4. Modals -->
    <WireGuardPasswordModal />
    <WireGuardEndpointModal />

    <!-- 5. Action Bar -->
    <div class="wg-action-bar">
      <div class="wg-action-bar-start">
        <button class="wg-btn wg-btn-secondary" @click="currentStep = 3">
          <span class="wg-btn-flex">
            <svg aria-hidden="true" class="wg-nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
            </svg>
            <span>{{ t('wireguard.backToSizing') }}</span>
          </span>
        </button>
      </div>

      <div class="wg-action-bar-center">
        <FastFreeTimepiece />
      </div>

      <div class="wg-action-bar-end">
        <button class="wg-btn wg-btn-primary wg-deploy wg-btn-next" :disabled="isApplyingConfig" @click="handleDeploy">
          <span class="wg-btn-flex">
            <span v-if="isApplyingConfig" class="wg-spinner-tiny"></span>
            <svg aria-hidden="true" v-else class="wg-deploy-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            </svg>
            <span>{{ t('wireguard.deployVhdx') }}</span>
            <svg aria-hidden="true" v-if="!isApplyingConfig" class="wg-nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
            </svg>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import FastFreeTimepiece from './FastFreeTimepiece.vue';
import WireGuardNodeSelector from './wireguard/WireGuardNodeSelector.vue';
import WireGuardHeroCard from './wireguard/WireGuardHeroCard.vue';
import WireGuardBentoGrid from './wireguard/WireGuardBentoGrid.vue';
import WireGuardAdvancedBanner from './wireguard/WireGuardAdvancedBanner.vue';
import WireGuardPasswordModal from './wireguard/WireGuardPasswordModal.vue';
import WireGuardEndpointModal from './wireguard/WireGuardEndpointModal.vue';
import { useWireGuardScreen } from '../composables/useWireGuardScreen';

const {
  t,
  isRtl,
  currentStep,
  selectedClientId,
  isLoadingConfig,
  isApplyingConfig,
  wireGuardConfig,
  browserPreviewMode,
  retryLoadConfig,
  handleDeploy,
  initWireGuardScreen,
} = useWireGuardScreen();

onMounted(async () => {
  await initWireGuardScreen();
});
</script>

<style>
/* Global by design: every selector is namespaced under .wg-screen so the
   styles can reach the inner markup of the decomposed child components. */
@import '../assets/styles/wireguard-screen.css';
</style>
