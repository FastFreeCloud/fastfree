<template>
  <div class="lc-header-actions">
    <!-- DateTime column with staggered fade-in -->
    <div class="lc-datetime-column">
      <div class="lc-date-row">
        <q-icon :name="icons.calendar" size="14px" color="white" class="lc-icon-animate lc-icon-animate--1" />
        <span class="text-white text-caption text-weight-medium gt-xs lc-text-animate lc-text-animate--2">
          {{ dateTime.gregorianDate }}
        </span>
        <q-icon :name="icons.hijri" size="14px" color="white" class="gt-xs lc-icon-animate lc-icon-animate--3" />
        <span class="text-white text-caption text-weight-medium gt-xs lc-text-animate lc-text-animate--4">
          {{ dateTime.hijriDate }}
        </span>
      </div>
      <div class="lc-time-row">
        <q-icon :name="icons.clock" size="14px" color="white" class="lc-icon-animate lc-icon-animate--5" />
        <span class="text-white text-caption text-weight-medium lc-text-animate lc-text-animate--6">
          {{ dateTime.time }}
        </span>
      </div>
    </div>

    <q-separator vertical color="white" class="q-mx-xs lc-separator-animate" />

    <q-btn
      flat
      round
      dense
      :icon="store.isDark ? icons.lightMode : icons.darkMode"
      color="white"
      size="16px"
      class="lc-theme-btn"
      :aria-label="store.isDark ? t('common.lightMode') : t('common.darkMode')"
      @click="store.setMode(store.isDark ? 'light' : 'dark')"
    >
      <transition name="lc-icon-swap" mode="out-in">
        <q-icon :key="store.isDark ? 'sun' : 'moon'" :name="store.isDark ? icons.lightMode : icons.darkMode" />
      </transition>
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

// --- Staggered fade-in animations ---
@keyframes lc-fade-slide {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

.lc-icon-animate,
.lc-text-animate {
  opacity: 0;
  animation: lc-fade-slide 0.4s ease forwards;
}
.lc-icon-animate--1 { animation-delay: 0.1s; }
.lc-text-animate--2 { animation-delay: 0.15s; }
.lc-icon-animate--3 { animation-delay: 0.2s; }
.lc-text-animate--4 { animation-delay: 0.25s; }
.lc-icon-animate--5 { animation-delay: 0.3s; }
.lc-text-animate--6 { animation-delay: 0.35s; }

.lc-separator-animate {
  opacity: 0;
  animation: lc-fade-slide 0.3s ease 0.4s forwards;
}

// --- Theme toggle button ---
.lc-theme-btn {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
  opacity: 0;
  animation: lc-fade-slide 0.4s ease 0.45s forwards;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: rotate(20deg) scale(1.1);
  }

  &:active {
    transform: rotate(0deg) scale(0.95);
  }
}

// --- Icon swap transition (dark/light toggle) ---
.lc-icon-swap-enter-active,
.lc-icon-swap-leave-active {
  transition: all 0.25s ease;
}
.lc-icon-swap-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}
.lc-icon-swap-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}

// --- Mobile ---
@media (max-width: 599px) {
  .lc-header-actions { gap: 4px; }
  .lc-theme-btn { animation-delay: 0.3s; }
}
</style>
