<template>
  <div class="lc-privacy-screen fit column items-center justify-center q-pa-lg text-center">
    <q-icon name="mdi-shield-lock-outline" size="64px" color="primary" class="q-mb-md" />
    <div class="text-h6 text-weight-medium q-mb-xs">{{ t('privacy.title') }}</div>
    <div class="text-body2 text-grey-7 q-mb-lg" style="max-width: 360px">
      {{ t('privacy.offline') }}
    </div>
    <q-btn
      color="primary"
      icon="mdi-open-in-new"
      :label="t('privacy.openInBrowser')"
      :aria-label="t('privacy.openInBrowser')"
      @click="openInBrowser"
    />
  </div>
</template>

<script setup lang="ts">
import { useLcI18n } from '../i18n'
import { useLcI18nStore } from '../composables/useLcI18nStore'
import { getPrivacyPolicyUrl, openExternalUrl } from '../composables/useExternalUrl'

const { t } = useLcI18n()
const i18nStore = useLcI18nStore()

function openInBrowser() {
  void openExternalUrl(getPrivacyPolicyUrl(i18nStore.locale.value))
}
</script>

<style lang="scss" scoped>
.lc-privacy-screen {
  background: var(--lc-surface, #ffffff);
}
</style>
