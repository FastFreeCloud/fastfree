<template>
  <div class="lc-translation-editor fit column q-pa-sm">
    <div class="row items-center q-gutter-sm q-mb-sm">
      <div class="text-h6 text-weight-bold">{{ t('translationEditor.title') }}</div>
      <q-space />
      <q-btn flat dense color="positive" icon="mdi-download" size="sm" :label="t('translationEditor.exportAll')" @click="exportTranslations" />
      <q-btn flat dense color="info" icon="mdi-upload" size="sm" :label="t('translationEditor.importAll')" @click="triggerImport" />
      <input ref="fileInputRef" type="file" accept=".json" class="hidden" @change="importTranslations" />
      <q-select v-model="sortMode" :options="sortOptions" emit-value map-options dense outlined style="min-width: 180px" class="q-mx-sm">
        <template #before>
          <q-icon name="mdi-sort" size="18px" class="q-mr-xs text-grey-6" />
        </template>
      </q-select>
      <q-btn flat dense color="primary" icon="mdi-plus" size="sm" :label="t('translationEditor.addLanguage')" @click="showAddLangDialog = true" />
      <q-btn flat dense color="negative" icon="mdi-restore" size="sm" :label="t('translationEditor.resetAll')" @click="confirmResetAll" />
    </div>

    <div class="row items-center q-gutter-md q-mb-sm text-caption text-grey-6">
      <div>{{ t('translationEditor.totalKeys', { count: allEntries.length }) }}</div>
      <div v-for="lang in allLangs" :key="lang.value" class="row items-center q-gutter-xs">
        <img v-if="lang.countryCode" :src="flagUrl(lang.countryCode)" class="flag-icon" width="14" height="10" />
        <span>{{ lang.value.toUpperCase() }}</span>
        <span class="text-weight-medium">{{ langStats[lang.value]?.translated ?? 0 }}</span>/<span>{{ allEntries.length }}</span>
        <q-badge :color="(langStats[lang.value]?.percent ?? 0) === 100 ? 'positive' : (langStats[lang.value]?.percent ?? 0) > 50 ? 'warning' : 'negative'" outline>
          {{ langStats[lang.value]?.percent ?? 0 }}%
        </q-badge>
      </div>
    </div>

    <q-input v-model="search" dense outlined :placeholder="t('translationEditor.search')" class="q-mb-sm">
      <template #append>
        <q-icon name="mdi-magnify" size="18px" />
      </template>
    </q-input>

    <q-card v-if="filteredEntries.length === 0" flat bordered class="q-pa-lg text-center">
      <q-icon name="mdi-translate-off" size="48px" color="grey-4" />
      <div class="text-grey-6 q-mt-sm">{{ t('translationEditor.noResults') }}</div>
    </q-card>

    <q-scroll-area v-else class="col-grow" style="border-radius: 8px;">
      <table class="translation-table">
        <thead>
          <tr>
            <th class="key-col">{{ t('translationEditor.key') }}</th>
            <th v-for="lang in allLangs" :key="lang.value" class="lang-col">
              <div class="row items-center no-wrap">
                <img v-if="lang.countryCode" :src="flagUrl(lang.countryCode)" class="flag-icon q-mr-xs" width="18" height="13" />
                <span class="text-no-wrap">{{ lang.value.toUpperCase() }}</span>
                <q-btn flat dense round size="xs" icon="mdi-close" color="negative" class="q-ml-xs" @click="deleteLanguage(lang)">
                  <q-tooltip>{{ t('translationEditor.deleteLanguage') }}</q-tooltip>
                </q-btn>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in filteredEntries" :key="entry.fullKey">
            <td class="key-col">
              <code>{{ entry.keyName }}</code>
            </td>
            <td v-for="lang in allLangs" :key="lang.value" class="lang-col">
              <div class="cell-input-wrapper">
                <q-input
                  :model-value="entry.values[lang.value] ?? ''"
                  dense
                  outlined
                  hide-bottom-space
                  :class="{ 'overridden-input': entry.overrides[lang.value] }"
                  @update:model-value="onCellEdit(entry.fullKey, lang.value, String($event ?? ''))"
                >
                  <template #append>
                    <q-btn
                      v-if="entry.overrides[lang.value]"
                      flat
                      round
                      dense
                      size="xs"
                      icon="mdi-restore"
                      color="negative"
                      @click="onReset(entry.fullKey, lang.value)"
                    >
                      <q-tooltip>{{ t('translationEditor.reset') }}</q-tooltip>
                    </q-btn>
                  </template>
                </q-input>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </q-scroll-area>

    <q-dialog v-model="showAddLangDialog" persistent>
      <q-card style="min-width: 420px; max-width: 90vw;">
        <q-card-section class="q-pt-md">
          <div class="text-h6">{{ t('translationEditor.addLanguage') }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-select
            v-model="selectedLang"
            :options="languageOptions"
            option-label="label"
            option-value="value"
            :label="t('translationEditor.language')"
            dense
            outlined
            use-input
            input-debounce="0"
            clearable
            :display-value="selectedLangDisplay"
            @filter="onLanguageFilter"
            @update:model-value="onLanguageSelect"
          >
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar class="min-width-auto">
                  <img v-if="scope.opt.countryCode" :src="flagUrl(scope.opt.countryCode)" class="flag-icon" width="22" height="16" />
                  <q-icon v-else name="mdi-web" size="22px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.value }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">{{ t('translationEditor.noLanguageFound') }}</q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" color="negative" v-close-popup />
          <q-btn flat :label="t('common.add')" color="primary" :disable="!selectedLang" @click="addLanguage" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n, useLcI18nStore, getAllMessageKeys, getNamespace } from '../i18n'
import { type LcMessages } from '../config'
import { getSupportedLanguages, setSupportedLanguages } from '../shared-config'
import { getAllLanguages } from '../languages'
import type { LanguageInfo } from '../shared-config'

const $q = useQuasar()
const { t } = useLcI18n()
const i18nStore = useLcI18nStore()

const search = ref('')
const showAddLangDialog = ref(false)
const selectedLang = ref<LanguageInfo | null>(null)
const languageFilter = ref('')
const editRevision = ref(0)
const fileInputRef = ref<HTMLInputElement | null>(null)

const sortMode = ref('default')
const sortOptions = computed(() => [
  { label: t('translationEditor.sortDefault'), value: 'default' },
  { label: t('translationEditor.sortAlphabetical'), value: 'alphabetical' },
  { label: t('translationEditor.sortCompleteness'), value: 'completeness' },
])

function flagUrl(countryCode: string): string {
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.webp`
}

const allLangs = computed(() => getSupportedLanguages())

interface MultiLangEntry {
  fullKey: string
  keyName: string
  namespace: string
  values: Record<string, string>
  overrides: Record<string, boolean>
}

const allEntries = computed<MultiLangEntry[]>(() => {
  void editRevision.value
  const keys = getAllMessageKeys()
  const langs = allLangs.value
  return keys.map((key) => {
    const ns = getNamespace(key as keyof LcMessages)
    const keyName = key.includes('.') ? key.split('.').slice(1).join('.') : key
    const values: Record<string, string> = {}
    const overrides: Record<string, boolean> = {}
    for (const lang of langs) {
      const ovs = i18nStore.getOverridesForLocale(lang.value) as Record<string, string | undefined>
      values[lang.value] = i18nStore.getValue(key, lang.value)
      overrides[lang.value] = ovs[key] !== undefined
    }
    return { fullKey: key, keyName, namespace: ns, values, overrides }
  })
})

const filteredEntries = computed(() => {
  let entries = allEntries.value

  if (search.value) {
    const q = search.value.toLowerCase()
    entries = entries.filter((e) => {
      if (e.fullKey.toLowerCase().includes(q) || e.keyName.toLowerCase().includes(q)) return true
      for (const val of Object.values(e.values)) {
        if (val && val.toLowerCase().includes(q)) return true
      }
      return false
    })
  }

  if (sortMode.value === 'alphabetical') {
    entries = [...entries].sort((a, b) => a.keyName.localeCompare(b.keyName))
  } else if (sortMode.value === 'completeness') {
    entries = [...entries].sort((a, b) => {
      const aCount = allLangs.value.filter((l) => !!a.values[l.value]).length
      const bCount = allLangs.value.filter((l) => !!b.values[l.value]).length
      return aCount - bCount || a.keyName.localeCompare(b.keyName)
    })
  }

  return entries
})

const langStats = computed(() => {
  void editRevision.value
  const stats: Record<string, { translated: number; percent: number }> = {}
  const total = allEntries.value.length
  for (const lang of allLangs.value) {
    const translated = allEntries.value.filter((e) => !!e.values[lang.value]).length
    stats[lang.value] = { translated, percent: total > 0 ? Math.round((translated / total) * 100) : 0 }
  }
  return stats
})

function onCellEdit(fullKey: string, locale: string, newValue: string) {
  const currentOverrides = i18nStore.getOverridesForLocale(locale) as Record<string, string>
  i18nStore.setOverridesForLocale(locale, { ...currentOverrides, [fullKey]: newValue })
  editRevision.value++
}

function onReset(fullKey: string, locale: string) {
  const currentOverrides = i18nStore.getOverridesForLocale(locale) as Record<string, string>
  const updated = { ...currentOverrides }
  delete updated[fullKey]
  i18nStore.setOverridesForLocale(locale, updated)
  editRevision.value++
}

function confirmResetAll() {
  $q.dialog({
    title: t('translationEditor.resetAll'),
    message: t('common.deleteMessage'),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    for (const lang of allLangs.value) {
      i18nStore.setOverridesForLocale(lang.value, {})
    }
    editRevision.value++
    $q.notify({ type: 'positive', message: t('translationEditor.resetSuccess') })
  })
}

function deleteLanguage(lang: LanguageInfo) {
  $q.dialog({
    title: t('translationEditor.deleteLanguage'),
    message: t('translationEditor.deleteLanguageConfirm', { label: lang.label, value: lang.value }),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    const langs = getSupportedLanguages().filter((l) => l.value !== lang.value)
    setSupportedLanguages(langs)
    i18nStore.setOverridesForLocale(lang.value, {})
    editRevision.value++
    $q.notify({ type: 'positive', message: t('translationEditor.languageDeleted', { label: lang.label }) })
  })
}

function exportTranslations() {
  const langs = allLangs.value
  const keys = getAllMessageKeys()
  const data: Record<string, Record<string, string>> = {}
  for (const key of keys) {
    data[key] = {}
    for (const lang of langs) {
      data[key][lang.value] = i18nStore.getValue(key, lang.value)
    }
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `translations-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({ type: 'positive', message: t('translationEditor.exportSuccess') })
}

function triggerImport() {
  fileInputRef.value?.click()
}

function importTranslations(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string) as Record<string, Record<string, string>>
      const keys = Object.keys(data)
      let importedCount = 0

      for (const lang of allLangs.value) {
        const currentOverrides = i18nStore.getOverridesForLocale(lang.value) as Record<string, string>
        const merged = { ...currentOverrides }

        for (const key of keys) {
          if (data[key]?.[lang.value] !== undefined) {
            merged[key] = data[key][lang.value] as string
            importedCount++
          }
        }

        i18nStore.setOverridesForLocale(lang.value, merged)
      }

      editRevision.value++
      $q.notify({ type: 'positive', message: t('translationEditor.importSuccess', { count: importedCount }) })
    } catch {
      $q.notify({ type: 'negative', message: t('translationEditor.importError') })
    }
  }
  reader.readAsText(file)
  target.value = ''
}

const allLanguageOptions = computed<LanguageInfo[]>(() => {
  return getAllLanguages()
})

const languageOptions = ref<LanguageInfo[]>([])

const selectedLangDisplay = computed(() => {
  if (!selectedLang.value) return ''
  const cc = selectedLang.value.countryCode || ''
  return `${cc ? '#' + cc : ''} ${selectedLang.value.label} (${selectedLang.value.value})`
})

function onLanguageFilter(val: string, update: (cb: () => void) => void) {
  languageFilter.value = val
  update(() => {
    const needle = val.toLowerCase()
    languageOptions.value = allLanguageOptions.value.filter(
      l => l.label.toLowerCase().includes(needle) || l.value.toLowerCase().includes(needle),
    )
  })
}

function onLanguageSelect(val: LanguageInfo | null) {
  selectedLang.value = val
}

function addLanguage() {
  if (!selectedLang.value) return
  const info = selectedLang.value
  const existing = getSupportedLanguages()
  if (existing.find(l => l.value === info.value)) {
    $q.notify({ type: 'warning', message: t('translationEditor.languageExists', { label: info.label, value: info.value }) })
    return
  }
  setSupportedLanguages([...existing, info])
  selectedLang.value = null
  $q.notify({ type: 'positive', message: t('translationEditor.languageAdded', { label: info.label, value: info.value }) })
}
</script>

<style lang="scss" scoped>
.lc-translation-editor {
  min-height: 350px;
}

.translation-table {
  border-collapse: collapse;
  width: 100%;

  th, td {
    border: 1px solid #ddd;
    padding: 4px 8px;
    white-space: nowrap;
    text-align: start;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #f5f5f5;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .key-col {
    position: sticky;
    left: 0;
    z-index: 3;
    background: white;
    min-width: 180px;
    max-width: 240px;

    thead & {
      z-index: 4;
      background: #f5f5f5;
    }
  }

  .lang-col {
    min-width: 180px;
  }

  tbody tr:hover {
    background: #fafafa;
  }
}

.cell-input-wrapper {
  min-width: 140px;
}

.overridden-input :deep(.q-field__control) {
  border-color: #f57c00 !important;
}

code {
  font-size: 12px;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.min-width-auto {
  min-width: auto;
}

.flag-icon {
  border-radius: 2px;
  vertical-align: middle;
  display: inline-block;
  box-shadow: 0 0 1px rgba(0,0,0,0.3);
}

.hidden {
  display: none;
}
</style>
