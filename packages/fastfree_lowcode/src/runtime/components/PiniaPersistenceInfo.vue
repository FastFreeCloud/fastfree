<script setup lang="ts">
import { computed } from 'vue'
import type { Store } from 'pinia'
import { useLcI18n } from '../i18n'

const { t } = useLcI18n()

interface PersistOptions {
  storage?: { getItem: (key: string) => string | null; removeItem: (key: string) => void; name?: string }
  key?: string
  pick?: string[]
  omit?: string[]
}

interface Props {
  store: Store & { $options?: { persist?: PersistOptions } }
}

const props = defineProps<Props>()

const persistInfo = computed(() => {
  const persist = props.store.$options?.persist
  if (!persist) return { enabled: false }
  
  const storage = persist.storage || localStorage
  const key = persist.key || `pinia_${props.store.$id}`
  const data = storage.getItem(key)
  
  return {
    enabled: true,
    storage: storage.name || 'localStorage',
    key,
    size: data ? new Blob([data]).size : 0,
    paths: persist.pick ? `pick: ${persist.pick.join(', ')}` : 
           persist.omit ? `omit: ${persist.omit.join(', ')}` : 'full state',
    lastSynced: getLastSync(key)
  }
})

function getLastSync(key: string) {
  try {
    const meta = localStorage.getItem(`__pinia_sync_${key}`)
    return meta ? new Date(parseInt(meta, 10)).toLocaleString() : t('debugger.never')
  } catch { return t('debugger.unknown') }
}

function clearPersistence() {
  const persist = props.store.$options?.persist
  if (persist) {
    const storage = persist.storage || localStorage
    const key = persist.key || `pinia_${props.store.$id}`
    storage.removeItem(key)
    localStorage.removeItem(`__pinia_sync_${key}`)
    props.store.$reset()
  }
}
</script>

<template>
  <div style="padding: 16px;">
    <div v-if="!persistInfo.enabled" style="color: #999; padding: 20px; text-align: center;">
      {{ t('debugger.notPersisted') }}
    </div>
    <div v-else>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr><td style="font-weight: bold; padding: 8px;">{{ t('debugger.storage') }}</td><td style="padding: 8px; font-family: monospace;">{{ persistInfo.storage }}</td></tr>
            <tr><td style="font-weight: bold; padding: 8px;">{{ t('debugger.key') }}</td><td style="padding: 8px; font-family: monospace;">{{ persistInfo.key }}</td></tr>
            <tr><td style="font-weight: bold; padding: 8px;">{{ t('debugger.strategy') }}</td><td style="padding: 8px;">{{ persistInfo.paths }}</td></tr>
            <tr><td style="font-weight: bold; padding: 8px;">{{ t('debugger.size') }}</td><td style="padding: 8px;">{{ persistInfo.size }} {{ t('debugger.bytes') }}</td></tr>
            <tr><td style="font-weight: bold; padding: 8px;">{{ t('debugger.lastSynced') }}</td><td style="padding: 8px;">{{ persistInfo.lastSynced }}</td></tr>
          </tbody>
        </table>
      <div style="margin-top: 16px;">
        <button @click="clearPersistence" style="padding: 8px 16px; border: 1px solid #ef5350; color: #ef5350; background: #fff; border-radius: 4px; cursor: pointer; margin-right: 8px;">{{ t('debugger.clearData') }}</button>
        <button @click="$emit('reset')" style="padding: 8px 16px; border: 1px solid #1976d2; color: #1976d2; background: #fff; border-radius: 4px; cursor: pointer; margin-left: 8px;">{{ t('debugger.resetState') }}</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  emits: ['reset']
}
</script>

<style scoped>
.pinia-debugger button { padding: 6px 12px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; }
.pinia-debugger button:hover { background: #f5f5f5; }
.pinia-debugger button.danger { border-color: #ef5350; color: #ef5350; }
.pinia-debugger button.danger:hover { background: #ffebee; }
.pinia-debugger button.secondary { background: #e3f2fd; border-color: #90caf9; }
</style>
