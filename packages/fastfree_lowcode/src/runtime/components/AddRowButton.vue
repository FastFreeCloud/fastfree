<template>
  <q-tr class="lc-add-row">
    <q-td :colspan="colspan" class="text-center">
      <q-btn
        flat
        dense
        color="primary"
        :label="label || t('common.addRow')"
        icon="add"
        size="sm"
        @click="$emit('add')"
      />
    </q-td>
  </q-tr>
</template>

<script setup lang="ts">
import { useLcI18n } from '../i18n'

const { t } = useLcI18n()

defineProps<{
  colspan?: number
  label?: string
}>()

defineEmits<{
  add: []
}>()
</script>

<style lang="scss" scoped>
.lc-add-row {
  &:hover {
    background: color-mix(in srgb, var(--lc-primary) 5%, transparent);
  }
}
</style>
