<template>
  <div class="wg-advanced-banner">
    <div class="wg-advanced-info">
      <div class="wg-advanced-icon" :class="{ 'wg-unlocked': isAdvancedUnlocked }">
        <svg aria-hidden="true" v-if="!isAdvancedUnlocked" class="wg-adv-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <svg aria-hidden="true" v-else class="wg-adv-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      </div>
      <div class="wg-advanced-text">
        <div class="wg-advanced-title-row">
          <span class="wg-advanced-title">{{ t('wireguard.customConfigTitle') }}</span>
          <span v-if="isAdvancedUnlocked" class="wg-unlocked-badge">
            <span class="wg-dot-green"></span>
            {{ t('wireguard.customAuthorized') }}
          </span>
          <span v-else class="wg-protected-badge">
            {{ t('wireguard.passwordProtectedBadge') }}
          </span>
        </div>
        <p class="wg-advanced-subtitle">{{ t('wireguard.customConfigDesc') }}</p>
      </div>
    </div>

    <button
      type="button"
      class="wg-btn-advanced"
      :class="{ 'wg-btn-unlocked': isAdvancedUnlocked }"
      @click="openAdvancedFlow"
    >
      <svg aria-hidden="true" v-if="!isAdvancedUnlocked" class="wg-btn-adv-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <svg aria-hidden="true" v-else class="wg-btn-adv-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <span>{{ isAdvancedUnlocked ? t('wireguard.openEditorBtn') : t('wireguard.unlockEditorBtn') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useWireGuardScreen } from '../../composables/useWireGuardScreen';

const { t, isAdvancedUnlocked, openAdvancedFlow } = useWireGuardScreen();
</script>
