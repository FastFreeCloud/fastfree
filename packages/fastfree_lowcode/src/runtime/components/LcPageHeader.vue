<template>
  <div class="lc-page-header q-pa-md" :class="[sizeClass, { 'lc-page-header--dense': dense }]">
    <div class="row items-center q-gutter-sm">
      <q-btn
        v-if="showBack"
        flat
        round
        dense
        icon="mdi-arrow-right"
        size="sm"
        @click="$emit('back')"
      />

      <q-icon
        v-if="icon"
        :name="icon"
        size="28px"
        :color="iconColor"
        class="lc-page-header__icon"
      />

      <div class="col">
        <div class="text-h6 lc-page-header__title" :class="titleClass">
          <slot name="title">{{ title }}</slot>
        </div>
        <div v-if="subtitle || $slots.subtitle" class="text-caption text-grey-6 lc-page-header__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </div>
      </div>

      <slot name="actions" />

      <q-btn
        v-if="refreshable"
        flat
        round
        dense
        icon="mdi-refresh"
        size="sm"
        :loading="refreshing"
        @click="$emit('refresh')"
      />
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  icon?: string
  iconColor?: string
  size?: 'sm' | 'md' | 'lg'
  dense?: boolean
  showBack?: boolean
  refreshable?: boolean
  refreshing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  icon: '',
  iconColor: 'primary',
  size: 'md',
  dense: false,
  showBack: false,
  refreshable: false,
  refreshing: false,
})

defineEmits<{
  back: []
  refresh: []
}>()

const sizeClass = computed(() => `lc-page-header--${props.size}`)
const titleClass = computed(() => {
  const map = { sm: 'text-subtitle1', md: 'text-h6', lg: 'text-h5' }
  return map[props.size]
})
</script>

<style lang="scss" scoped>
.lc-page-header {
  border-bottom: 1px solid var(--lc-outline-variant, #e5e7eb);
  background: var(--lc-surface, #fafafa);
}

.lc-page-header--dense {
  padding: 4px 16px;
}

.lc-page-header__icon {
  margin-inline-start: 8px;
}

.lc-page-header__title {
  font-weight: 700;
  color: var(--lc-on-surface, #1a1a1a);
}

.lc-page-header__subtitle {
  margin-top: 2px;
}
</style>
