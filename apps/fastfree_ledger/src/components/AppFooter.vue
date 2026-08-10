<template>
  <q-bar class="bg-secondary text-white" dense>
    <q-space />
    <div class="text-caption">
      FastFree Ledger v{{ appStore.appVersion }}
    </div>
    <q-separator vertical dark class="q-mx-sm" />
    <div class="text-caption">
      <q-icon :name="appStore.isConnected ? 'mdi-wifi' : 'mdi-wifi-off'" :color="appStore.isConnected ? 'positive' : 'negative'" size="xs" />
      {{ appStore.isConnected ? t('app.connected') : t('app.disconnected') }}
    </div>
  </q-bar>
</template>

<script setup lang="ts">
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'
import { useAppStore } from '../stores/useAppStore'

const { t } = useLcI18n()
const appStore = useAppStore()
</script>
