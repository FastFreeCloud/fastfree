<template>
  <div class="lc-settings-screen fit column q-pa-md" style="max-width: 640px; margin: 0 auto;">
    <div class="text-h6 text-weight-bold q-mb-md">{{ t('settings.title') }}</div>

    <!-- Theme Mode - always visible -->
    <q-list class="q-mb-sm" bordered rounded>
      <q-item>
        <q-item-section avatar>
          <q-icon name="mdi-brightness-6" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ t('settings.theme') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn-toggle
            :model-value="themeStore.mode"
            :options="themeOptions"
            dense
            no-caps
            toggle-color="primary"
            @update:model-value="($ev) => themeStore.setMode($ev as 'light' | 'dark' | 'system')"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Language - always visible -->
    <q-list class="q-mb-md" bordered rounded>
      <q-item>
        <q-item-section avatar>
          <q-icon name="mdi-translate" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ t('settings.language') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-option-group
            v-model="currentLang"
            :options="languageOptions"
            type="radio"
            dense
            inline
            @update:model-value="onLanguageChange"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Theme Presets section -->
    <q-expansion-item
      group="settings"
      header-class="lc-section-header lc-section-presets"
      expand-icon-class="lc-section-icon"
      class="q-mb-sm"
    >
      <template #header>
        <q-item-section avatar>
          <div class="lc-section-indicator lc-section-indicator--presets" />
        </q-item-section>
        <q-item-section>
          <div class="row items-center no-wrap">
            <q-icon name="mdi-palette-outline" class="q-mr-sm" />
            <span class="text-subtitle1 text-weight-bold">{{ t('settings.presets') }}</span>
          </div>
        </q-item-section>
      </template>

      <div class="q-px-md q-pb-md">
        <div class="preset-grid">
          <div
            v-for="p in themeStore.PRESETS"
            :key="p.name"
            class="preset-card"
            :class="{ 'preset-card--active': themeStore.presetName === p.name }"
            @click="onSelectPreset(p.name)"
          >
            <div class="preset-swatch-row">
              <span
                class="preset-swatch"
                :style="{ background: p[resolvedMode].primary }"
              />
              <span
                class="preset-swatch"
                :style="{ background: p[resolvedMode].secondary }"
              />
              <span
                class="preset-swatch"
                :style="{ background: p[resolvedMode].accent }"
              />
            </div>
            <div class="preset-label">{{ p.label }}</div>
            <div
              v-if="themeStore.presetName === p.name"
              class="preset-check"
            >
              <q-icon name="mdi-check" size="10px" />
            </div>
          </div>
        </div>
      </div>
    </q-expansion-item>

    <!-- Custom Colors section -->
    <q-expansion-item
      group="settings"
      header-class="lc-section-header lc-section-custom"
      expand-icon-class="lc-section-icon"
      class="q-mb-sm"
    >
      <template #header>
        <q-item-section avatar>
          <div class="lc-section-indicator lc-section-indicator--custom" />
        </q-item-section>
        <q-item-section>
          <div class="row items-center no-wrap">
            <q-icon name="mdi-eyedropper" class="q-mr-sm" />
            <span class="text-subtitle1 text-weight-bold">{{ t('settings.customize') }}</span>
          </div>
        </q-item-section>
      </template>

      <div class="q-px-md q-pb-md">
        <div class="row justify-start q-col-gutter-sm">
          <div
            v-for="name in themeStore.BRAND_NAMES"
            :key="name"
            class="col-auto"
          >
            <div class="color-picker-item" @click="openColorPicker(name)">
              <div
                class="color-circle"
                :style="{ background: themeStore.getBrandColor(name) }"
              />
              <div class="text-caption text-center color-hex">
                {{ themeStore.getBrandColor(name) }}
              </div>
              <div class="text-caption text-center color-label">
                {{ colorLabel(name) }}
              </div>
            </div>
            <input
              :ref="(el) => setPickerRef(name, el as HTMLInputElement)"
              type="color"
              class="hidden"
              :value="themeStore.getBrandColor(name)"
              @input="onColorChange(name, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>
    </q-expansion-item>

    <!-- Data Management section -->
    <q-expansion-item
      group="settings"
      header-class="lc-section-header lc-section-data"
      expand-icon-class="lc-section-icon"
      class="q-mb-sm"
    >
      <template #header>
        <q-item-section avatar>
          <div class="lc-section-indicator lc-section-indicator--data" />
        </q-item-section>
        <q-item-section>
          <div class="row items-center no-wrap">
            <q-icon name="mdi-database-outline" class="q-mr-sm" />
            <span class="text-subtitle1 text-weight-bold">{{ t('settings.dataManagement') }}</span>
          </div>
        </q-item-section>
      </template>

      <div class="q-px-md q-pb-md">
        <div class="row q-gutter-sm q-mb-md">
          <q-btn
            outline
            color="primary"
            icon="mdi-download"
            :label="t('settings.exportTheme')"
            no-caps
            @click="onExport"
          />
          <q-btn
            outline
            color="secondary"
            icon="mdi-upload"
            :label="t('settings.importTheme')"
            no-caps
            @click="fileInputRef?.click()"
          />
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            class="hidden"
            @change="onImportFile"
          />
        </div>

        <q-separator class="q-my-sm" />

        <div class="row items-center q-gutter-sm">
          <q-btn
            outline
            color="negative"
            icon="mdi-restart"
            :label="t('settings.resetTheme')"
            no-caps
            @click="confirmReset"
          />
          <span class="text-caption text-grey-6">
            {{ t('settings.resetToDefaults') }}
          </span>
        </div>
      </div>
    </q-expansion-item>

    <!-- Footer -->
    <div class="lc-settings-footer q-mt-auto q-pt-md">
      <q-btn
        flat
        dense
        color="grey-7"
        icon="mdi-keyboard-outline"
        :label="t('shortcuts.keyboardShortcuts')"
        no-caps
        size="sm"
        @click="openShortcuts"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import { useLcI18nStore } from '../composables/useLcI18nStore'
import { getSupportedLanguages } from '../shared-config'
import { getLanguageInfo } from '../languages'
import { getThemeStore } from '../composables/useThemeStore'
import { useDesktopStore } from '../composables/useDesktopStore'
import type { BrandColors } from '../composables/useThemeStore'

const $q = useQuasar()
const { t } = useLcI18n()
const i18nStore = useLcI18nStore()
const themeStore = getThemeStore()
const desktop = useDesktopStore()

const currentLang = ref<string>('en')
const fileInputRef = ref<HTMLInputElement | null>(null)
const colorPickerRefs = ref<Record<string, HTMLInputElement | null>>({})

const resolvedMode = computed(() => themeStore.getResolvedMode)

const languageOptions = computed(() => getSupportedLanguages())

const themeOptions = computed(() => [
  { label: t('settings.light'), value: 'light', icon: 'mdi-weather-sunny' },
  { label: t('common.system'), value: 'system', icon: 'mdi-theme-light-dark' },
  { label: t('settings.dark'), value: 'dark', icon: 'mdi-weather-night' },
])

const colorLabelMap: Record<keyof BrandColors, string> = {
  primary: 'settings.colorPrimary',
  secondary: 'settings.colorSecondary',
  accent: 'settings.colorAccent',
  positive: 'settings.colorPositive',
  negative: 'settings.colorNegative',
  info: 'settings.colorInfo',
  warning: 'settings.colorWarning',
}

function colorLabel(name: keyof BrandColors): string {
  return t(colorLabelMap[name] ?? name)
}

function setPickerRef(name: string, el: HTMLInputElement | null) {
  colorPickerRefs.value[name] = el
}

function openColorPicker(name: string) {
  colorPickerRefs.value[name]?.click()
}

function onSelectPreset(name: string) {
  if (themeStore.presetName === name) return
  const hasCustom =
    Object.keys(themeStore.customLight).length > 0 ||
    Object.keys(themeStore.customDark).length > 0
  if (hasCustom) {
    $q.dialog({
      title: t('settings.presets'),
      message: t('settings.customColorsLost'),
      cancel: t('common.cancel'),
      persistent: true,
    }).onOk(() => {
      themeStore.selectPreset(name)
      notifySuccess()
    })
  } else {
    themeStore.selectPreset(name)
    notifySuccess()
  }
}

function onColorChange(name: string, value: string) {
  themeStore.setBrandColor(name as keyof BrandColors, value)
}

function onLanguageChange(lang: string) {
  i18nStore.setLocale(lang)
  const langInfo = getLanguageInfo(lang)
  const dir = langInfo?.direction === 'rtl' ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', lang)
}

function onExport() {
  try {
    const json = themeStore.exportConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lc-theme-config.json'
    a.click()
    URL.revokeObjectURL(url)
    $q.notify({ type: 'positive', message: t('settings.themeExported') })
  } catch {
    $q.notify({ type: 'negative', message: t('common.errorOccurred') })
  }
}

function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    const ok = themeStore.importConfig(text)
    if (ok) {
      $q.notify({ type: 'positive', message: t('settings.themeImported') })
    } else {
      $q.notify({ type: 'negative', message: t('settings.invalidTheme') })
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function confirmReset() {
  $q.dialog({
    title: t('settings.resetTheme'),
    message: t('settings.confirmResetTheme'),
    cancel: t('common.cancel'),
    persistent: true,
  }).onOk(() => {
    themeStore.resetToDefaults()
    notifySuccess()
  })
}

function notifySuccess() {
  $q.notify({ type: 'positive', message: t('settings.saved') })
}

function openShortcuts() {
  desktop.openWindow('shortcuts', t('shortcuts.keyboardShortcuts'), 'mdi-keyboard-outline')
}

onMounted(() => {
  currentLang.value = i18nStore.locale.value
})
</script>

<style lang="scss" scoped>
.lc-settings-screen {
  overflow-y: auto;
  overflow-x: hidden;
}

.lc-settings-footer {
  border-top: 1px solid var(--lc-border, rgba(0, 0, 0, 0.08));
}

/* Section Expansion Items */
.lc-section-header {
  padding: 8px 0;
  min-height: 48px;
}

.lc-section-icon {
  color: var(--q-grey-7);
}

.lc-section-indicator {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  margin-left: -4px;
}

.lc-section-indicator--presets {
  background: var(--q-primary, #1976d2);
}

.lc-section-indicator--custom {
  background: #ab47bc;
}

.lc-section-indicator--data {
  background: var(--q-negative, #ef5350);
}

/* Preset Grid */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.preset-card {
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 8px 4px 4px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: var(--lc-surface, #fff);
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &--active {
    border-color: var(--q-primary);
    box-shadow: 0 0 0 1px var(--q-primary);
  }
}

.preset-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--q-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preset-swatch-row {
  display: flex;
  justify-content: center;
  gap: 3px;
  margin-bottom: 4px;
}

.preset-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.preset-label {
  font-size: 11px;
  text-align: center;
  line-height: 1.2;
  color: var(--q-grey-8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Color Pickers */
.color-picker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
}

.color-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.08);
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;

  .color-picker-item:hover & {
    transform: scale(1.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border-color: rgba(0, 0, 0, 0.15);
  }
}

.color-hex {
  font-size: 10px;
  font-family: monospace;
  color: var(--q-grey-6);
  margin-top: 4px;
}

.color-label {
  font-size: 10px;
  color: var(--q-grey-7);
}

.hidden {
  display: none;
}

/* Dark mode overrides */
:root &.q-dark {
  .lc-settings-footer {
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  .preset-card {
    background: var(--lc-surface, #2d2d2d);
  }

  .color-picker-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .color-circle {
    border-color: rgba(255, 255, 255, 0.1);

    .color-picker-item:hover & {
      border-color: rgba(255, 255, 255, 0.2);
    }
  }

  .preset-swatch {
    border-color: rgba(255, 255, 255, 0.15);
  }
}
</style>
