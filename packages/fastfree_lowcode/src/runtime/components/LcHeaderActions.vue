<template>
  <div class="lc-header-actions">
    <!-- Profile button (date/time live inside the profile menu) -->
    <q-btn
      flat
      round
      dense
      color="white"
      class="lc-profile-btn"
      :aria-label="t('common.profile')"
      aria-haspopup="menu"
    >
      <q-avatar size="30px" color="white" text-color="primary">
        <img v-if="avatarUrl" :src="avatarUrl" :alt="userName" />
        <span v-else class="text-weight-bold">{{ userInitial }}</span>
      </q-avatar>
      <q-tooltip>{{ t('common.profile') }}</q-tooltip>

      <!-- Profile menu -->
      <q-menu
        :anchor="isRtl ? 'bottom left' : 'bottom right'"
        :self="isRtl ? 'top left' : 'top right'"
        :offset="[0, 8]"
        transition-show="jump-down"
        transition-hide="jump-up"
        :transition-duration="200"
      >
        <q-list role="menu" style="min-width: 230px" class="lc-profile-menu">
          <!-- User info + live date/time -->
          <q-item class="lc-profile-user">
            <q-item-section avatar>
              <q-avatar size="42px" color="primary" text-color="white">
                <img v-if="avatarUrl" :src="avatarUrl" :alt="userName" />
                <span v-else class="text-weight-bold">{{ userInitial }}</span>
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ userName }}</q-item-label>
              <q-item-label v-if="userEmail" caption>{{ userEmail }}</q-item-label>
              <div class="lc-profile-row lc-profile-row--time">
                <q-icon :name="icons.clock" size="13px" />
                <span>{{ dateTime.time }}</span>
              </div>
              <div class="lc-profile-row lc-profile-row--date">
                <q-icon :name="icons.calendar" size="12px" />
                <span>{{ dateTime.gregorianDate }}</span>
                <q-icon :name="icons.hijri" size="12px" />
                <span>{{ dateTime.hijriDate }}</span>
              </div>
            </q-item-section>
          </q-item>

          <q-separator />

          <!-- Dark mode toggle (persisted via theme store → IndexedDB + localStorage mirror) -->
          <q-item clickable v-close-popup @click="toggleTheme">
            <q-item-section avatar>
              <q-icon :name="themeStore.isDark ? icons.lightMode : icons.darkMode" />
            </q-item-section>
            <q-item-section>
              {{ themeStore.isDark ? t('common.lightMode') : t('common.darkMode') }}
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="themeStore.isDark"
                @update:model-value="toggleTheme"
                @click.stop
                color="primary"
                dense
              />
            </q-item-section>
          </q-item>

          <!-- Language submenu (persisted via i18n store → lc-locale) open inward to avoid edge clamps -->
          <q-item clickable>
            <q-item-section avatar>
              <q-icon name="mdi-translate" />
            </q-item-section>
            <q-item-section>{{ t('common.language') }}</q-item-section>
            <q-item-section side>
              <q-icon :name="isRtl ? 'mdi-chevron-left' : 'mdi-chevron-right'" size="16px" />
            </q-item-section>
            <q-menu
              :anchor="isRtl ? 'center right' : 'center left'"
              :self="isRtl ? 'center left' : 'center right'"
              transition-show="jump-down"
              transition-hide="jump-up"
              :transition-duration="150"
            >
              <q-list role="menu" dense style="min-width: 140px">
                <q-item clickable v-close-popup @click="setLanguage('en')">
                  <q-item-section>{{ t('common.english') }}</q-item-section>
                  <q-item-section v-if="currentLocale === 'en'" side>
                    <q-icon name="check" color="primary" size="16px" />
                  </q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setLanguage('ar')">
                  <q-item-section>{{ t('common.arabic') }}</q-item-section>
                  <q-item-section v-if="currentLocale === 'ar'" side>
                    <q-icon name="check" color="primary" size="16px" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>

          <!-- Settings -->
          <q-item clickable v-close-popup @click="openSettings">
            <q-item-section avatar>
              <q-icon name="mdi-cog-outline" />
            </q-item-section>
            <q-item-section>{{ t('screens.settings') }}</q-item-section>
          </q-item>

          <!-- Theme -->
          <q-item clickable v-close-popup @click="openTheme">
            <q-item-section avatar>
              <q-icon name="mdi-palette-outline" />
            </q-item-section>
            <q-item-section>{{ t('screens.theme') }}</q-item-section>
          </q-item>

          <q-separator />

          <!-- Logout -->
          <q-item clickable v-close-popup @click="handleLogout">
            <q-item-section avatar>
              <q-icon name="mdi-logout" color="negative" />
            </q-item-section>
            <q-item-section class="text-negative">{{ t('common.logout') }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>

    <slot name="after" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getThemeStore } from '../composables/useThemeStore'
import { useDesktopStore } from '../composables/useDesktopStore'
import { useLcI18nStore } from '../composables/useLcI18nStore'
import { useDateTime } from '../composables/useDateTime'
import { useLcI18n } from '../i18n'

const props = withDefaults(defineProps<{
  mdi?: boolean
  userName?: string
  userEmail?: string
  avatarUrl?: string
}>(), {
  mdi: true,
  userName: 'User',
  userEmail: '',
  avatarUrl: '',
})

const themeStore = getThemeStore()
const desktop = useDesktopStore()
const i18nStore = useLcI18nStore()
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

const userInitial = computed(() => (props.userName || 'U').trim().charAt(0).toUpperCase())
const currentLocale = computed(() => i18nStore.locale.value)
const isRtl = computed(() => currentLocale.value === 'ar')

function toggleTheme() {
  themeStore.setMode(themeStore.isDark ? 'light' : 'dark')
}

function setLanguage(lang: 'en' | 'ar') {
  if (i18nStore.locale.value !== lang) i18nStore.setLocale(lang)
}

function openSettings() {
  const brought = desktop.bringToFrontIfOpen('settings')
  if (!brought) desktop.openWindow('settings', t('screens.settings'), 'mdi-cog-outline')
}

function openTheme() {
  const brought = desktop.bringToFrontIfOpen('theme')
  if (!brought) desktop.openWindow('theme', t('screens.theme'), 'mdi-palette-outline')
}

function handleLogout() {
  window.dispatchEvent(new CustomEvent('fastfree:logout'))
}
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

// --- Profile button ---
.lc-profile-btn {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;
  opacity: 0;
  animation: lc-fade-slide 0.4s ease 0.2s forwards;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.08);
  }

  &:active {
    transform: scale(0.95);
  }
}

// --- Profile menu ---
.lc-profile-menu {
  border-radius: 12px;
  overflow: hidden;
}

.lc-profile-user {
  background: color-mix(in srgb, var(--q-primary, #1565C0) 6%, transparent);
}

.lc-profile-row {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--lc-on-surface-variant, #555);
  line-height: 1.2;

  &--time {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--lc-primary, #1565C0);
  }

  &--date {
    margin-top: 2px;
    font-size: 10px;
  }
}

// --- Mobile ---
@media (max-width: 599px) {
  .lc-header-actions { gap: 4px; }
  .lc-profile-btn { animation-delay: 0.15s; }
}

@media (prefers-reduced-motion: reduce) {
  .lc-profile-btn {
    animation: none !important;
    opacity: 1 !important;
  }
}
</style>
