<template>
  <div class="lc-header-actions">
    <!-- Theme toggle — visible top-bar button -->
    <q-btn
      round
      flat
      dense
      color="white"
      class="lc-hdr-action"
      :icon="themeStore.isDark ? icons.lightMode : icons.darkMode"
      :aria-label="themeStore.isDark ? t('common.lightMode') : t('common.darkMode')"
      @click="toggleTheme"
    >
      <q-tooltip>
        {{ themeStore.isDark ? t('common.lightMode') : t('common.darkMode') }}
      </q-tooltip>
    </q-btn>

    <!-- Language toggle — visible top-bar button -->
    <q-btn
      round
      flat
      dense
      color="white"
      class="lc-hdr-action"
      :aria-label="t('common.language')"
      @click="toggleLanguage"
    >
      <q-icon :name="icons.translate" />
      <span class="lc-lang-badge">{{ currentLocale === 'ar' ? 'ع' : 'EN' }}</span>
      <q-tooltip transition-show="scale" transition-hide="scale">
        {{ t('common.language') }}: {{ currentLocale === 'ar' ? t('common.english') : t('common.arabic') }}
      </q-tooltip>
    </q-btn>

    <!-- Profile button -->
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

      <!-- Profile menu -->
      <q-menu
        :anchor="isRtl ? 'bottom left' : 'bottom right'"
        :self="isRtl ? 'top left' : 'top right'"
        :offset="[0, 8]"
        transition-show="jump-down"
        transition-hide="jump-up"
        :transition-duration="200"
      >
        <!-- User card -->
        <div class="lc-profile-card">
          <q-avatar size="52px" color="primary" text-color="white" class="lc-profile-card__avatar">
            <img v-if="avatarUrl" :src="avatarUrl" :alt="userName" />
            <span v-else class="text-h6 text-weight-bold">{{ userInitial }}</span>
          </q-avatar>
          <div class="lc-profile-card__meta">
            <div class="lc-profile-card__name">{{ userName }}</div>
            <div v-if="userEmail" class="lc-profile-card__email">{{ userEmail }}</div>
            <div class="lc-profile-card__row">
              <q-icon :name="icons.clock" size="13px" />
              <span>{{ dateTime.time }}</span>
            </div>
            <div class="lc-profile-card__row">
              <q-icon :name="icons.calendar" size="12px" />
              <span>{{ dateTime.gregorianDate }}</span>
              <q-icon :name="icons.hijri" size="12px" />
              <span>{{ dateTime.hijriDate }}</span>
            </div>
          </div>
        </div>

        <q-separator />

        <q-list role="menu" class="lc-profile-menu" style="min-width: 230px">
          <!-- Settings -->
          <q-item clickable v-close-popup @click="openSettings">
            <q-item-section avatar>
              <q-icon name="mdi-cog-outline" />
            </q-item-section>
            <q-item-section>{{ t('screens.settings') }}</q-item-section>
          </q-item>

          <q-separator inset />

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
    translate: useMdi ? 'mdi-translate' : 'translate',
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

function toggleLanguage() {
  i18nStore.setLocale(currentLocale.value === 'en' ? 'ar' : 'en')
}

function openSettings() {
  const brought = desktop.bringToFrontIfOpen('settings')
  if (!brought) desktop.openWindow('settings', t('screens.settings'), 'mdi-cog-outline')
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

// ── Visible action buttons (theme / language) ──
.lc-hdr-action {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background 0.2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(255, 255, 255, 0.24);
    transform: scale(1.06);
  }

  &:active {
    transform: scale(0.94);
  }

  & + & {
    margin-inline-start: 2px;
  }
}

// ── Language badge (current UI language) ──
.lc-lang-badge {
  position: absolute;
  bottom: -1px;
  inset-inline-end: -1px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 8px;
  background: var(--lc-primary, #1565c0);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

// ── Profile button ──
.lc-profile-btn {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background 0.2s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  animation: lc-fade-slide 0.4s ease 0.2s forwards;

  &:hover {
    background: rgba(255, 255, 255, 0.24);
    transform: scale(1.06);
  }

  &:active {
    transform: scale(0.95);
  }
}

// ── Profile menu ──
.lc-profile-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--q-primary, #1565C0) 6%, transparent);
}

.lc-profile-card__avatar {
  flex-shrink: 0;
}

.lc-profile-card__meta {
  min-width: 0;
  flex: 1;
}

.lc-profile-card__name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lc-profile-card__email {
  font-size: 12px;
  color: var(--lc-on-surface-variant, #666);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;
}

.lc-profile-card__row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--lc-primary, #1565c0);
  line-height: 1.4;
}

.lc-profile-menu {
  border-radius: 0 0 12px 12px;
}

// ── Mobile ──
@media (max-width: 599px) {
  .lc-header-actions { gap: 4px; }
  .lc-profile-btn { animation-delay: 0.15s; }
  .lc-hdr-action, .lc-profile-btn {
    background: rgba(255, 255, 255, 0.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lc-profile-btn {
    animation: none !important;
    opacity: 1 !important;
  }
  .lc-hdr-action { transition: none !important; }
}
</style>