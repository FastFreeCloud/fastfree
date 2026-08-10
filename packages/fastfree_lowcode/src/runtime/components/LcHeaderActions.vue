<template>
  <div class="lc-header-actions">
    <div class="lc-datetime-column">
      <div class="lc-date-row">
        <q-icon :name="icons.calendar" size="14px" color="white" />
        <span class="text-white text-caption text-weight-medium gt-xs">{{ dateTime.gregorianDate }}</span>
        <q-icon :name="icons.hijri" size="14px" color="white" class="gt-xs" />
        <span class="text-white text-caption text-weight-medium gt-xs">{{ dateTime.hijriDate }}</span>
      </div>
      <div class="lc-time-row">
        <q-icon :name="icons.clock" size="14px" color="white" />
        <span class="text-white text-caption text-weight-medium">{{ dateTime.time }}</span>
      </div>
    </div>

    <q-separator vertical color="white" class="q-mx-xs" />

    <q-btn flat round dense :icon="store.isDark ? icons.lightMode : icons.darkMode" color="white" size="16px"
      :aria-label="store.isDark ? t('common.lightMode') : t('common.darkMode')"
      @click="store.toggleMode">
      <q-tooltip>{{ store.isDark ? t('common.lightMode') : t('common.darkMode') }}</q-tooltip>
    </q-btn>

    <slot name="after" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getThemeStore } from '../composables/useThemeStore'
import { useDateTime } from '../composables/useDateTime'
import { useLcI18n } from '../i18n'

const props = withDefaults(defineProps<{
  mdi?: boolean
}>(), {
  mdi: true,
})

const store = getThemeStore()
const { dateTime } = useDateTime()
const { t } = useLcI18n()

const icons = computed(() => {
  const useMdi = props.mdi
  return {
    clock: useMdi ? 'mdi-clock-outline' : 'schedule',
    calendar: useMdi ? 'mdi-calendar' : 'event',
    hijri: useMdi ? 'mdi-star-half-full' : 'star_half',
    lightMode: useMdi ? 'mdi-weather-sunny' : 'light_mode',
    darkMode: useMdi ? 'mdi-weather-night' : 'dark_mode',
  }
})
</script>

<style lang="scss" scoped>
.lc-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.lc-datetime-column {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.lc-date-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.lc-time-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
</style>
