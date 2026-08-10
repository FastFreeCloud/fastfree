<template>
  <div class="lc-shortcuts-screen fit column q-pa-md" style="max-width: 680px; margin: 0 auto;">
    <div class="text-h6 text-weight-bold q-mb-md">{{ t('shortcuts.title') }}</div>

    <q-input
      v-model="search"
      dense
      outlined
      :placeholder="t('shortcuts.searchPlaceholder')"
      class="q-mb-md"
      clearable
    >
      <template #prepend>
        <q-icon name="mdi-magnify" />
      </template>
    </q-input>

    <q-card flat bordered>
      <q-card-section class="q-pa-md">
        <template v-for="category in filteredCategories" :key="category.key">
          <q-expansion-item
            :label="category.label"
            :group="category.key"
            header-class="text-weight-bold"
            default-opened
          >
            <q-list bordered separator>
              <q-item v-for="entry in category.entries" :key="entry.keys">
                <q-item-section>
                  <q-item-label>{{ entry.label }}</q-item-label>
                  <q-item-label caption>
                    <span class="key-combo">
                      <template v-for="(part, i) in entry.keyParts" :key="i">
                        <kbd class="key-chip">{{ part }}</kbd>
                        <span v-if="i < entry.keyParts.length - 1" class="key-separator">+</span>
                      </template>
                    </span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    dense
                    flat
                    :icon="editingKey === entry.keys ? 'mdi-keyboard-variant' : 'mdi-pencil'"
                    :color="editingKey === entry.keys ? 'primary' : 'grey-7'"
                    @click="startEdit(entry.keys)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>
          <q-separator v-if="category.key !== filteredCategories[filteredCategories.length - 1]?.key" />
        </template>

        <div v-if="filteredCategories.length === 0" class="text-center text-grey-5 q-pa-lg">
          {{ t('shortcuts.noResults') }}
        </div>
      </q-card-section>

      <q-card-actions class="q-pa-md q-pt-none">
        <q-btn
          flat
          :color="theme.isDark ? 'grey-4' : 'grey-8'"
          :label="t('shortcuts.reset')"
          icon="mdi-restore"
          @click="onReset"
        />
      </q-card-actions>
    </q-card>

    <q-dialog v-model="editing" persistent>
      <q-card style="min-width: 300px">
        <q-card-section class="text-center q-pa-lg">
          <div class="text-subtitle1 text-weight-bold q-mb-md">{{ t('shortcuts.pressKey') }}</div>
          <div v-if="capturedKeys" class="q-mb-md">
            <span class="key-combo key-combo--large">
              <template v-for="(part, i) in capturedKeyParts" :key="i">
                <kbd class="key-chip key-chip--large">{{ part }}</kbd>
                <span v-if="i < capturedKeyParts.length - 1" class="key-separator">+</span>
              </template>
            </span>
          </div>
          <div v-else class="text-h5 text-grey-5 q-mb-md">
            ---
          </div>
          <div class="text-caption text-grey-6 q-mb-md">{{ t('shortcuts.pressKeyHint') }}</div>
          <q-btn flat :label="t('common.cancel')" @click="cancelEdit" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { getThemeStore } from '../composables/useThemeStore'

const $q = useQuasar()
const { t } = useLcI18n()
const store = useKeyboardShortcuts()
const theme = getThemeStore()

const editing = ref(false)
const editingKey = ref<string | null>(null)
const capturedKeys = ref<string>('')
const search = ref('')
let captureHandler: ((e: KeyboardEvent) => void) | null = null

interface ShortcutEntry {
  keys: string
  action: string
  label: string
  keyParts: string[]
}

interface ShortcutCategory {
  key: string
  label: string
  entries: ShortcutEntry[]
}

const CATEGORY_MAP: Record<string, { label: string; actions: string[] }> = {
  navigation: {
    label: 'shortcuts.categoryNavigation',
    actions: ['nextWindow', 'prevWindow', 'focusFirst'],
  },
  windows: {
    label: 'shortcuts.categoryWindows',
    actions: ['closeWindow'],
  },
  general: {
    label: 'shortcuts.categoryGeneral',
    actions: [],
  },
}

const actionLabelMap: Record<string, string> = {
  nextWindow: 'shortcuts.nextWindow',
  prevWindow: 'shortcuts.prevWindow',
  closeWindow: 'shortcuts.closeWindow',
  focusFirst: 'shortcuts.focusFirst',
}

function actionLabel(action: string): string {
  const key = actionLabelMap[action]
  return key ? t(key) : action
}

function parseKeyParts(keys: string): string[] {
  return store.shortcutKeyLabel(keys).split(' + ')
}

const allEntries = computed<ShortcutEntry[]>(() => {
  return Object.entries(store.shortcuts).map(([keys, action]) => ({
    keys,
    action,
    label: actionLabel(action),
    keyParts: parseKeyParts(keys),
  }))
})

const filteredEntries = computed<ShortcutEntry[]>(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return allEntries.value
  return allEntries.value.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.keys.toLowerCase().includes(q) ||
      store.shortcutKeyLabel(e.keys).toLowerCase().includes(q),
  )
})

const filteredCategories = computed<ShortcutCategory[]>(() => {
  const categorized = new Map<string, ShortcutEntry[]>()
  const uncategorized: ShortcutEntry[] = []

  for (const catKey of Object.keys(CATEGORY_MAP)) {
    categorized.set(catKey, [])
  }

  for (const entry of filteredEntries.value) {
    let placed = false
    for (const [catKey, cat] of Object.entries(CATEGORY_MAP)) {
      if (cat.actions.includes(entry.action)) {
        categorized.get(catKey)!.push(entry)
        placed = true
        break
      }
    }
    if (!placed) {
      uncategorized.push(entry)
    }
  }

  if (uncategorized.length > 0) {
    categorized.set('general', uncategorized)
  }

  const result: ShortcutCategory[] = []
  for (const [catKey, cat] of Object.entries(CATEGORY_MAP)) {
    const entries = categorized.get(catKey) || []
    if (entries.length > 0) {
      result.push({
        key: catKey,
        label: t(cat.label),
        entries,
      })
    }
  }
  return result
})

const capturedKeyParts = computed(() => {
  if (!capturedKeys.value) return []
  return store.shortcutKeyLabel(capturedKeys.value).split(' + ')
})

function removeCaptureHandler() {
  if (captureHandler) {
    document.removeEventListener('keydown', captureHandler, true)
    captureHandler = null
  }
}

function startEdit(keys: string) {
  removeCaptureHandler()
  editingKey.value = keys
  capturedKeys.value = ''
  editing.value = true

  const handler = (e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      cancelEdit()
      return
    }

    const parts: string[] = []
    if (e.ctrlKey) parts.push('ctrl')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey) parts.push('alt')
    if (e.metaKey) parts.push('meta')

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      parts.push(key)
    }

    if (parts.length < 2) return

    const combo = parts.join('+')
    capturedKeys.value = combo

    setTimeout(() => {
      if (editingKey.value) {
        const result = store.updateShortcut(editingKey.value, combo)
        if (result.conflict) {
          $q.dialog({
            title: t('shortcuts.conflictTitle'),
            message: t('shortcuts.swappedWith', { conflict: actionLabel(result.conflict) }),
            ok: t('common.ok'),
            persistent: true,
          })
        } else {
          $q.notify({ type: 'positive', message: t('shortcuts.saved') })
        }
      }
      removeCaptureHandler()
      editing.value = false
      editingKey.value = null
    }, 200)
  }

  captureHandler = handler
  document.addEventListener('keydown', handler, true)
}

function cancelEdit() {
  removeCaptureHandler()
  editing.value = false
  editingKey.value = null
  capturedKeys.value = ''
}

function onReset() {
  $q.dialog({
    title: t('shortcuts.reset'),
    message: t('shortcuts.resetConfirm'),
    cancel: t('common.cancel'),
    persistent: true,
  }).onOk(() => {
    store.resetToDefaults()
    $q.notify({ type: 'positive', message: t('shortcuts.resetSuccess') })
  })
}

onUnmounted(() => {
  removeCaptureHandler()
})
</script>

<style lang="scss" scoped>
.lc-shortcuts-screen {
  overflow-y: auto;
}

.key-combo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.key-combo--large {
  gap: 6px;
}

.key-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
  line-height: 1;
  color: var(--q-dark-page, #333);
  background: var(--lc-surface, #f5f5f5);
  border: 1px solid var(--lc-border, #ccc);
  border-bottom-width: 2px;
  border-radius: 4px;
  white-space: nowrap;
  user-select: none;
}

.key-chip--large {
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
}

.key-separator {
  font-size: 11px;
  color: var(--q-grey-7, #999);
}
</style>
