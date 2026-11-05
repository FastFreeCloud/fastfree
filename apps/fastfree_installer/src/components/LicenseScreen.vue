<template>
  <div class="screen-container" :class="{ 'is-rtl': isRtl }">
    <div class="header-box">
      <div class="step-tag">{{ t('license.stepTag') }}</div>
      <h2>{{ t('license.title') }}</h2>
      <p class="subtitle">
        {{ licenseState && licenseState.is_valid
          ? (isRtl ? 'تم التحقق من ترخيص العقدة السيادية بنجاح، ومطابقة هوية العتاد المشفرة.' : 'Sovereign node license verified successfully and matched with hardware identity.')
          : t('license.subtitle')
        }}
      </p>
    </div>

    <div class="content-body">
      <LicenseInputSection v-if="!licenseState || !licenseState.is_valid" />
      <LicenseVerifiedCard v-else />
    </div>

    <!-- Persistent Action Bar with Precision 3D Timepiece -->
    <div class="action-bar">
      <div class="action-bar-start">
        <button class="btn btn-secondary" @click="currentStep = 1">
          <span class="btn-flex">
            <svg class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
            </svg>
            <span>{{ t('license.backToDiscovery') }}</span>
          </span>
        </button>
      </div>

      <div class="action-bar-center">
        <FastFreeTimepiece />
      </div>

      <div class="action-bar-end">
        <button
          class="btn btn-primary btn-next"
          :disabled="!licenseState || !licenseState.is_valid"
          @click="currentStep = 3"
        >
          <span class="btn-flex">
            <span>{{ t('license.configureSizing') }}</span>
            <svg class="nav-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="isRtl ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"></polyline>
            </svg>
          </span>
        </button>
      </div>
    </div>

    <!-- Authorization & Security Modals -->
    <LicenseTransferModal />
    <LicenseChangeKeyModal />
  </div>
</template>

<script setup lang="ts">
import FastFreeTimepiece from './FastFreeTimepiece.vue';
import LicenseInputSection from './license/LicenseInputSection.vue';
import LicenseVerifiedCard from './license/LicenseVerifiedCard.vue';
import LicenseTransferModal from './license/LicenseTransferModal.vue';
import LicenseChangeKeyModal from './license/LicenseChangeKeyModal.vue';
import { useLicenseManager } from '../composables/useLicenseManager';

const { t, isRtl, currentStep, licenseState } = useLicenseManager();
</script>

<style scoped>
@import '../assets/styles/license-screen.css';
</style>
