<template>
  <router-view />
</template>

<script setup lang="ts">
import { setCssVar, Dark } from 'quasar';
import { getThemeStore } from './lib/lowcode';

Dark.set(false);
setCssVar('primary', '#4F46E5');

const themeStore = getThemeStore();
themeStore.setMode('light');
themeStore.setAppSignature('#4F46E5');
</script>
