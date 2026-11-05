<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('wireguard.stepTag') }}</div>
      <h2>{{ t('wireguard.title') }}</h2>
      <p class="subtitle">{{ t('wireguard.subtitle') }}</p>
    </div>

    <!-- 1. Node Selector Bar -->
    <WireGuardNodeSelector />

    <!-- 2. Loading State -->
    <div v-if="isLoadingConfig" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-msg">{{ t('wireguard.generatingConfig', { client: selectedClientId }) }}</p>
    </div>

    <!-- 3. Content Body -->
    <div v-else-if="wireGuardConfig" class="content-body">
      <WireGuardHeroCard />
      <WireGuardBentoGrid />
      <WireGuardAdvancedBanner />
    </div>

    <!-- 4. Modals -->
    <WireGuardPasswordModal />
    <WireGuardEndpointModal />

    <!-- 5. Action Bar -->
    <div class="action-bar">
      <div class="action-bar-start">
        <button class="btn btn-secondary" @click="currentStep = 3">
          <span class="btn-flex">
            <svg class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
            </svg>
            <span>{{ t('wireguard.backToSizing') }}</span>
          </span>
        </button>
      </div>

      <div class="action-bar-center">
        <FastFreeTimepiece />
      </div>

      <div class="action-bar-end">
        <button class="btn btn-primary btn-deploy btn-next" :disabled="isApplyingConfig" @click="handleDeploy">
          <span class="btn-flex">
            <span v-if="isApplyingConfig" class="spinner-tiny"></span>
            <svg v-else class="deploy-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            </svg>
            <span>{{ t('wireguard.deployVhdx') }}</span>
            <svg v-if="!isApplyingConfig" class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
  handleDeploy,
  initWireGuardScreen,
} = useWireGuardScreen();

onMounted(async () => {
  await initWireGuardScreen();
});
</script>

<style scoped>
@import '../assets/styles/wireguard-screen.css';
</style>
