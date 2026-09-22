<template>
  <div class="lc-privacy-screen fit column">
    <div class="row items-center q-px-md q-py-sm">
      <q-icon name="mdi-shield-lock-outline" class="q-mr-xs" color="primary" size="20px" />
      <div class="text-subtitle1 text-weight-medium">{{ t('privacy.title') }}</div>
    </div>

    <q-separator />

    <q-scroll-area class="col">
      <div class="q-px-md q-py-sm">
        <LcPrivacyContent />
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { useLcI18n } from '../i18n'
import LcPrivacyContent from './LcPrivacyContent.vue'

const { t } = useLcI18n()
</script>

<style lang="scss" scoped>
.lc-privacy-screen {
  background: var(--lc-surface, #ffffff);
}
</style>
