<template>
  <div class="lc-theme-screen fit column q-pa-md" style="max-width: 680px; margin: 0 auto;">
    <div class="text-h6 text-weight-bold q-mb-md">{{ t('settings.theme') }}</div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-5">
        <q-card flat bordered class="full-height">
          <q-card-section class="q-pa-md">
            <div class="text-subtitle2 text-weight-bold q-mb-sm">{{ t('settings.theme') }}</div>
            <q-btn-toggle
              :model-value="store.mode"
              :options="themeOptions"
              dense
              toggle-color="primary"
              spread
              class="q-mb-md"
              @update:model-value="($ev) => store.setMode($ev as 'light' | 'dark' | 'system')"
            />
            <q-separator class="q-mb-md" />
            <div class="text-subtitle2 text-weight-bold q-mb-sm">{{ t('settings.presets') }}</div>
            <div class="row q-col-gutter-sm">
              <div
                v-for="p in store.PRESETS"
                :key="p.name"
                class="col-6"
              >
                <q-card
                  :class="['preset-card cursor-pointer', { 'preset-active': store.presetName === p.name }]"
                  flat
                  bordered
                  tabindex="0"
                  role="button"
                  @click="applyPreset(p.name)"
                  @keydown.enter="applyPreset(p.name)"
                  @keydown.space.prevent="applyPreset(p.name)"
                >
                  <q-card-section class="q-pa-sm">
                    <div class="text-caption text-weight-medium text-center q-mb-xs">{{ p.label }}</div>
                    <div class="row flex-center q-gutter-x-xs">
                      <div
                        v-for="c in getPresetColors(p)"
                        :key="c"
                        class="preset-dot"
                        :style="`background-color: ${c}`"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-7">
        <q-card flat bordered class="full-height">
          <q-card-section class="q-pa-md">
            <div class="text-subtitle2 text-weight-bold q-mb-sm">{{ t('settings.customize') }}</div>
            <div class="row q-col-gutter-sm">
              <div v-for="name in store.BRAND_NAMES" :key="name" class="col-6 col-sm-4">
                <div class="row items-center q-gutter-xs">
                  <q-btn
                    dense
                    round
                    size="md"
                    :style="`background-color: ${store.getBrandColor(name)}; width: 32px; min-width: 32px; height: 32px; border: 2px solid ${isCustomized(name) ? store.getBrandColor('primary') : (store.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)')}`"
                  >
                    <q-menu auto-close touch-position>
                      <q-color
                        :model-value="store.getBrandColor(name)"
                        no-header
                        square
                        format-model="hex"
                        style="width: 220px"
                        @update:model-value="($ev) => onColorChange(name, $ev as string)"
                      />
                    </q-menu>
                  </q-btn>
                  <span class="text-caption">{{ colorLabel(name) }}</span>
                  <q-icon
                    v-if="isCustomized(name)"
                    name="mdi-check"
                    size="14px"
                    :color="store.isDark ? 'grey-4' : 'primary'"
                  />
                </div>
                <q-input
                  :model-value="hexInputs[name] ?? store.getBrandColor(name)"
                  dense
                  outlined
                  hide-bottom-space
                  class="q-mt-xs"
                  style="font-size: 11px;"
                  @update:model-value="($ev) => onHexInput(name, String($ev ?? ''))"
                  @blur="onHexBlur(name)"
                >
                  <template #prepend>
                    <span class="text-caption text-grey">#</span>
                  </template>
                </q-input>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <div class="row q-col-gutter-sm">
              <div class="col">
                <q-btn flat :color="store.isDark ? 'grey-4' : 'grey-8'" :label="t('settings.resetTheme')" icon="mdi-restore" class="full-width" @click="confirmReset" />
              </div>
              <div class="col">
                <q-btn flat :color="store.isDark ? 'grey-4' : 'grey-8'" :label="t('settings.exportTheme')" icon="mdi-export" class="full-width" @click="onExport" />
              </div>
              <div class="col">
                <q-btn flat :color="store.isDark ? 'grey-4' : 'grey-8'" :label="t('settings.importTheme')" icon="mdi-import" class="full-width" @click="onImport" />
              </div>
              <div class="col">
                <q-btn flat :color="store.isDark ? 'grey-4' : 'grey-8'" :label="t('settings.copyTheme')" icon="mdi-content-copy" class="full-width" @click="onCopy" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="theme-transition">
      <q-card-section class="q-pa-md">
        <div class="text-subtitle2 text-weight-bold q-mb-sm">{{ t('common.preview') }}</div>
        <div class="preview-card" :class="{ 'preview-dark': store.isDark }">
          <div class="preview-header text-white" :style="{ background: `linear-gradient(135deg, ${store.getBrandColor('primary')}, ${store.getBrandColor('secondary')})` }">
            <div class="text-weight-bold">{{ t('settings.previewTitle') }}</div>
            <div class="text-caption" style="opacity: 0.8">{{ t('common.preview') }}</div>
          </div>
          <div class="preview-body">
            <div class="row items-center q-gutter-sm q-mb-sm">
              <q-badge :style="{ background: store.getBrandColor('positive') }">{{ t('settings.colorPositive') }}</q-badge>
              <q-badge :style="{ background: store.getBrandColor('info') }">{{ t('settings.colorInfo') }}</q-badge>
              <q-badge :style="{ background: store.getBrandColor('warning') }">{{ t('settings.colorWarning') }}</q-badge>
            </div>
            <q-btn dense unelevated :style="{ background: store.getBrandColor('primary'), color: '#fff' }" :label="t('settings.previewButton')" class="q-mr-xs" />
            <q-btn dense outline :style="{ borderColor: store.getBrandColor('negative'), color: store.getBrandColor('negative') }" :label="t('common.cancel')" />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { copyToClipboard, useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import type { LcMessages } from '../config'
import { getThemeStore, type BrandColors, type ThemePreset } from '../composables/useThemeStore'

const $q = useQuasar()
const { t } = useLcI18n()
const store = getThemeStore()

const themeOptions = computed(() => [
  { label: t('settings.light'), value: 'light', icon: 'mdi-weather-sunny' },
  { label: t('common.system'), value: 'system', icon: 'mdi-theme-light-dark' },
  { label: t('settings.dark'), value: 'dark', icon: 'mdi-weather-night' },
])

const COLOR_LABEL_MAP: Record<keyof BrandColors, keyof LcMessages> = {
  primary: 'settings.colorPrimary',
  secondary: 'settings.colorSecondary',
  accent: 'settings.colorAccent',
  positive: 'settings.colorPositive',
  negative: 'settings.colorNegative',
  info: 'settings.colorInfo',
  warning: 'settings.colorWarning',
}

const hexInputs = ref<Record<string, string>>({})

function colorLabel(name: keyof BrandColors): string {
  return t(COLOR_LABEL_MAP[name])
}

function getPresetColors(p: ThemePreset): string[] {
  const palette = store.isDark ? p.dark : p.light
  return [palette.primary, palette.secondary, palette.accent, palette.positive, palette.negative, palette.info, palette.warning]
}

function isCustomized(name: keyof BrandColors): boolean {
  const overrides = store.isDark ? store.customDark : store.customLight
  return name in overrides
}

function isValidHex(hex: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(hex)
}

function normalizeHex(hex: string): string {
  const cleaned = hex.startsWith('#') ? hex : `#${hex}`
  return cleaned.length === 4
    ? `#${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}${cleaned[3]}${cleaned[3]}`
    : cleaned
}

function onColorChange(name: keyof BrandColors, value: string) {
  store.setBrandColor(name, value)
  hexInputs.value[name] = value
}

function onHexInput(name: keyof BrandColors, value: string) {
  hexInputs.value[name] = value
}

function onHexBlur(name: keyof BrandColors) {
  const raw = hexInputs.value[name] ?? ''
  if (isValidHex(raw)) {
    store.setBrandColor(name, normalizeHex(raw))
  } else {
    hexInputs.value[name] = store.getBrandColor(name)
  }
}

function applyPreset(name: string) {
  store.selectPreset(name)
  $q.notify({ type: 'positive', message: t('settings.presetApplied', { name }) })
}

function confirmReset() {
  $q.dialog({
    title: t('settings.resetTheme'),
    message: t('settings.resetConfirm'),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    store.resetToDefaults()
    $q.notify({ type: 'positive', message: t('settings.resetSuccess') })
  })
}

function onExport() {
  const json = store.exportConfig()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'theme-export.json'
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: t('settings.exportSuccess') })
}

function onCopy() {
  copyToClipboard(store.exportConfig())
    .then(() => {
      $q.notify({ type: 'positive', message: t('settings.copySuccess') })
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: t('settings.copyError') })
    })
}

async function onImport() {
  let json: string | null = null
  try {
    json = await navigator.clipboard.readText()
  } catch {
    json = prompt(t('settings.importTheme'))
  }
  if (json && store.importConfig(json)) {
    $q.notify({ type: 'positive', message: t('settings.importSuccess') })
  } else if (json) {
    $q.notify({ type: 'negative', message: t('settings.importError') })
  }
}
</script>

<style lang="scss" scoped>
.lc-theme-screen {
  overflow-y: auto;
}

.preset-card {
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--lc-primary, #1565C0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.preset-active {
    border-color: var(--lc-primary, #1565C0);
    background: var(--lc-primary, #1565C0);
    color: #fff;

    .text-caption {
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }
}

.preset-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.preset-active .preset-dot {
  border-color: rgba(255, 255, 255, 0.3);
}

.preview-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.1));
  background: var(--lc-surface, #ffffff);

  &.preview-dark {
    background: var(--lc-surface, #1e1e2e);
    border-color: var(--lc-border, rgba(255, 255, 255, 0.1));
  }
}

.preview-header {
  padding: 12px 16px;
}

.preview-body {
  padding: 12px 16px;
}

.full-height {
  height: 100%;
}

.theme-transition {
  transition: all var(--lc-transition-duration, 0.3s) var(--lc-transition-easing, ease);
}
</style>
