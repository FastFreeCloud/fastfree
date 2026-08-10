<template>
  <div class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">404</div>

      <div class="text-h2" style="opacity: 0.4">{{ t('common.notFound') }}</div>

      <q-btn
        class="q-mt-xl"
        color="white"
        text-color="blue"
        unelevated
        to="/"
        :label="t('common.goHome')"
        no-caps
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'
const { t } = useLcI18n()
</script>
