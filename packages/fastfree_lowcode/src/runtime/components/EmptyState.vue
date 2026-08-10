<template>
  <div class="lc-empty-state column items-center justify-center q-pa-lg">
    <q-icon :name="icon || 'inbox'" :size="size || '64px'" color="grey-5" />
    <div class="text-h6 text-grey-7 q-mt-md">{{ title || t('common.noData') }}</div>
    <div v-if="description" class="text-caption text-grey-5 q-mt-sm text-center" style="max-width: 400px">
      {{ description }}
    </div>
    <q-btn
      v-if="actionLabel"
      flat
      color="primary"
      :label="actionLabel"
      :icon="actionIcon"
      class="q-mt-md"
      @click="$emit('action')"
    />
  </div>
</template>

<script setup lang="ts">
import { useLcI18n } from '../i18n'

const { t } = useLcI18n()

defineProps<{
  icon?: string
  title?: string
  description?: string
  actionLabel?: string
  actionIcon?: string
  size?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<style lang="scss" scoped>
.lc-empty-state {
  min-height: 300px;
}
</style>
