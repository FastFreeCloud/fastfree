<template>
  <div class="lc-privacy-screen fit column">
    <div class="row items-center justify-between q-px-md q-py-sm">
      <div class="text-subtitle1 text-weight-medium">
        <q-icon name="mdi-shield-lock-outline" class="q-mr-xs" color="primary" />
        {{ t('privacy.title') }}
      </div>
      <q-btn
        flat
        dense
        color="primary"
        icon="mdi-open-in-new"
        :label="t('privacy.openInBrowser')"
        :aria-label="t('privacy.openInBrowser')"
        @click="openInBrowser"
      />
    </div>

    <q-separator />

    <div v-if="isOffline" class="column items-center justify-center q-pa-lg text-center">
      <q-icon name="mdi-wifi-off" size="48px" color="grey-5" />
      <div class="text-body2 text-grey-7 q-mt-md">{{ t('privacy.offline') }}</div>
      <q-btn
        color="primary"
        :label="t('privacy.retry')"
        class="q-mt-md"
        :aria-label="t('privacy.retry')"
        @click="retry"
      />
    </div>

    <div v-else class="col relative-position">
      <div v-if="!loaded" class="absolute-full column items-center justify-center">
        <q-spinner color="primary" size="48px" />
        <div class="text-caption text-grey-6 q-mt-md">{{ t('privacy.loading') }}</div>
      </div>
      <iframe
        :key="frameKey"
        :src="policyUrl"
        :title="t('privacy.title')"
        class="lc-privacy-frame"
        referrerpolicy="strict-origin-when-cross-origin"
        @load="loaded = true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLcI18n } from '../i18n'
import { useLcI18nStore } from '../composables/useLcI18nStore'
import { getPrivacyPolicyUrl, openExternalUrl } from '../composables/useExternalUrl'

const { t } = useLcI18n()
const i18nStore = useLcI18nStore()

const loaded = ref(false)
const frameKey = ref(0)
const isOffline = ref(typeof navigator !== 'undefined' ? !navigator.onLine : false)

const policyUrl = computed(() => getPrivacyPolicyUrl(i18nStore.locale.value))

function updateOnline() {
  isOffline.value = typeof navigator !== 'undefined' ? !navigator.onLine : false
  if (!isOffline.value && !loaded.value) frameKey.value += 1
}

function retry() {
  updateOnline()
  loaded.value = false
  frameKey.value += 1
}

function openInBrowser() {
  void openExternalUrl(policyUrl.value)
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', updateOnline)
    window.removeEventListener('offline', updateOnline)
  }
})
</script>

<style lang="scss" scoped>
.lc-privacy-screen {
  background: var(--lc-surface, #ffffff);
}

.lc-privacy-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: var(--lc-surface, #ffffff);
}
</style>
