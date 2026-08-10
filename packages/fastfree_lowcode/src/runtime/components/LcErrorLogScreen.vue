<template>
  <div class="lc-error-log-screen fit column no-wrap q-pa-sm">
    <!-- Header Controls -->
    <div class="row items-center q-gutter-sm q-mb-sm">
      <q-input
        v-model="search"
        dense
        outlined
        :placeholder="t('common.search')"
        class="col-grow"
        style="max-width: 250px;"
      >
        <template #append>
          <q-icon name="mdi-magnify" size="18px" />
        </template>
      </q-input>

      <q-chip
        v-for="opt in levelOptions"
        :key="opt.value"
        :color="levelFilter === opt.value ? opt.color : 'grey-4'"
        :text-color="levelFilter === opt.value ? 'white' : 'grey-7'"
        size="sm"
        clickable
        dense
        @click="levelFilter = opt.value"
      >
        {{ opt.label }}
      </q-chip>

      <q-space />

      <q-chip outline color="negative" size="sm">
        {{ t('errorLog.errors') }}: {{ stats.error }}
      </q-chip>
      <q-chip outline color="warning" size="sm">
        {{ t('errorLog.warnings') }}: {{ stats.warning }}
      </q-chip>
      <q-chip outline color="info" size="sm">
        {{ t('errorLog.info') }}: {{ stats.info }}
      </q-chip>

      <q-btn
        flat
        round
        dense
        icon="mdi-download"
        color="primary"
        @click="exportToJSON()"
      >
        <q-tooltip>{{ t('errorLog.exportJSON') }}</q-tooltip>
      </q-btn>

      <q-btn
        flat
        round
        dense
        icon="mdi-delete-sweep"
        color="negative"
        @click="confirmClear"
      >
        <q-tooltip>{{ t('errorLog.clearLog') }}</q-tooltip>
      </q-btn>
    </div>

    <!-- Results Count -->
    <div class="text-caption text-grey-7 q-mb-xs">
      {{ t('errorLog.showingXofY', { shown: filteredEntries.length, total: entries.length }) }}
    </div>

    <!-- Log Table -->
    <q-table
      :rows="filteredEntries"
      :columns="columns"
      row-key="id"
      flat
      bordered
      dense
      class="col-grow lc-error-table"
      :pagination="{ rowsPerPage: 15 }"
      :rows-per-page-options="[10, 15, 25, 50]"
    >
      <template #body="props">
        <q-tr :props="props" :class="{ 'lc-row-expanded': !!expandedIds[props.row.id] }">
          <q-td auto-width>
            <q-btn
              flat
              round
              dense
              size="xs"
              :icon="!!expandedIds[props.row.id] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="toggleExpand(props.row.id)"
            />
          </q-td>
          <q-td key="level" :props="props">
            <q-badge
              :color="props.row.level === 'error' ? 'negative' : props.row.level === 'warning' ? 'warning' : 'info'"
            >
              {{ props.row.level }}
            </q-badge>
          </q-td>
          <q-td key="source" :props="props">{{ props.row.source }}</q-td>
          <q-td key="message" :props="props" class="lc-message-cell">{{ props.row.message }}</q-td>
          <q-td key="component" :props="props">{{ props.row.component }}</q-td>
          <q-td key="createdAt" :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
          <q-td key="actions" :props="props">
            <q-btn
              flat
              round
              dense
              size="xs"
              icon="mdi-delete-outline"
              color="negative"
              @click="removeEntry(props.row.id)"
            >
              <q-tooltip>{{ t('errorLog.deleteEntry') }}</q-tooltip>
            </q-btn>
          </q-td>
        </q-tr>
        <q-tr v-if="!!expandedIds[props.row.id]" :props="props" class="lc-expanded-row">
          <q-td colspan="100%">
            <div class="lc-expanded-content">
              <div v-if="props.row.details" class="lc-detail-section">
                <div class="text-caption text-weight-bold q-mb-xs">{{ t('errorLog.details') }}</div>
                <pre class="lc-detail-pre">{{ props.row.details }}</pre>
              </div>
              <div v-if="props.row.stack" class="lc-detail-section">
                <div class="text-caption text-weight-bold q-mb-xs">{{ t('errorLog.stack') }}</div>
                <pre class="lc-detail-pre">{{ props.row.stack }}</pre>
              </div>
            </div>
          </q-td>
        </q-tr>
      </template>

      <template #no-data>
        <div class="full-width row flex-center text-grey q-pa-lg">
          <q-icon name="mdi-check-circle-outline" size="48px" color="positive" class="q-mr-sm" />
          <span>{{ t('errorLog.noErrors') }}</span>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useErrorLogStore, type LogEntry } from '../composables/useErrorLogStore'
import { useLcI18n } from '../i18n'

const $q = useQuasar()
const { entries, stats, clearAll, exportToJSON, removeEntry } = useErrorLogStore()
const { t } = useLcI18n()

const search = ref('')
const levelFilter = ref<string>('all')
const expandedIds = ref<Record<string, boolean>>({})

const levelOptions = computed(() => [
  { label: t('errorLog.all'), value: 'all', color: 'grey-6' },
  { label: t('errorLog.errors'), value: 'error', color: 'negative' },
  { label: t('errorLog.warnings'), value: 'warning', color: 'warning' },
  { label: t('errorLog.info'), value: 'info', color: 'info' },
])

const columns = [
  { name: 'expand', label: '', field: 'expand', align: 'center' as const },
  { name: 'level', label: t('errorLog.columnLevel'), field: 'level', align: 'center' as const, sortable: true },
  { name: 'source', label: t('errorLog.columnSource'), field: 'source', align: 'left' as const, sortable: true },
  { name: 'message', label: t('errorLog.columnMessage'), field: 'message', align: 'left' as const, sortable: true },
  { name: 'component', label: t('errorLog.columnComponent'), field: 'component', align: 'left' as const, sortable: true },
  { name: 'createdAt', label: t('errorLog.columnTime'), field: 'createdAt', align: 'center' as const, sortable: true },
  { name: 'actions', label: '', field: 'actions', align: 'center' as const },
]

const filteredEntries = computed(() => {
  return entries.value.filter((entry: LogEntry) => {
    if (levelFilter.value !== 'all' && entry.level !== levelFilter.value) {
      return false
    }
    if (search.value) {
      const query = search.value.toLowerCase()
      const msgMatch = entry.message?.toLowerCase().includes(query)
      const srcMatch = entry.source?.toLowerCase().includes(query)
      const compMatch = entry.component?.toLowerCase().includes(query)
      return msgMatch || srcMatch || compMatch
    }
    return true
  })
})

function toggleExpand(id: string | number) {
  const key = String(id)
  if (expandedIds.value[key]) {
    delete expandedIds.value[key]
  } else {
    expandedIds.value[key] = true
  }
}

function formatDate(isoStr: string) {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return isoStr
  }
}

function confirmClear() {
  $q.dialog({
    title: t('common.confirmDelete'),
    message: t('common.deleteMessage'),
    cancel: true,
    persistent: true,
  }).onOk(() => {
    clearAll()
  })
}
</script>

<style lang="scss" scoped>
.lc-error-log-screen {
  min-height: 350px;
}

.lc-error-table {
  background: var(--lc-surface, #ffffff);
}

.lc-message-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lc-row-expanded {
  background: rgba(0, 0, 0, 0.02);
}

.lc-expanded-row {
  background: rgba(0, 0, 0, 0.03);
}

.lc-expanded-content {
  padding: 8px 12px;
}

.lc-detail-section {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.lc-detail-pre {
  margin: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
