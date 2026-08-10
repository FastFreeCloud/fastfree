<template>
  <q-header class="lc-desktop-header" :style="headerStyle">
    <q-toolbar class="q-py-sm q-px-md">
      <q-icon :name="icon" size="24px" color="white" class="q-mr-sm" />
      <q-toolbar-title class="text-weight-bold text-h6 text-white">
        {{ title }}
      </q-toolbar-title>
      <slot name="right" />
      <slot name="left" />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  gradient?: [string, string]
}>(), {
  title: 'Desktop',
  icon: 'dashboard',
  gradient: () => ['#0D47A1', '#1565C0'],
})

const headerStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.gradient[0]}, ${props.gradient[1]})`,
}))
</script>

<style lang="scss" scoped>
.lc-desktop-header {
  z-index: 5000;

  .q-toolbar {
    min-height: 50px;
  }
}

@media (max-width: 599px) {
  .lc-desktop-header .q-toolbar {
    min-height: 44px;
  }
}
</style>
