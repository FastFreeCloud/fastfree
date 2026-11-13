<template>
  <div class="sdui-remote-screen">
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-dots color="primary" size="2rem" />
      <div class="text-caption q-mt-sm">{{ locale === 'ar' ? 'جاري تحميل الشاشة من الخادم...' : 'Loading screen from server...' }}</div>
    </div>
    <div v-else-if="error" class="text-negative q-pa-md">
      {{ error }}
    </div>
    <SduiNode
      v-else-if="screen"
      :node="screen.root"
      :state="mergedState"
      @action="handleAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { SduiNode, SduiActionDispatcher, type SduiScreen, type SduiAction } from './index'
import { ScreenLoader } from './ScreenLoader'

const props = defineProps<{
  id: string
  baseUrl?: string
  channel?: string
  locale?: string
  state?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'loaded', screen: SduiScreen): void
  (e: 'error', error: any): void
  (e: 'action', payload: any): void
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const screen = ref<SduiScreen | null>(null)

const loader = computed(() => new ScreenLoader({ baseUrl: props.baseUrl, locale: props.locale, channel: props.channel } as any))

const mergedState = computed(() => ({
  locale: props.locale || 'ar',
  ...(props.state || {}),
}))

async function load(force = false) {
  loading.value = true
  error.value = null
  try {
    const s = await loader.value.load(props.id, { forceRefresh: force, channel: props.channel, locale: props.locale } as any)
    screen.value = s as SduiScreen
    emit('loaded', screen.value)
  } catch (e: any) {
    error.value = e?.message || String(e)
    emit('error', e)
  } finally {
    loading.value = false
  }
}

function handleAction(payload: any) {
  emit('action', payload)
  const dispatcher = SduiActionDispatcher.getInstance()
  const actions = Array.isArray(payload?.action) ? payload.action : [payload?.action]
  for (const a of actions) {
    if (a) dispatcher.dispatch(a, { state: mergedState.value, event: payload?.event, node: payload?.node })
  }
}

watch(() => props.id, () => void load(true))
watch(() => props.baseUrl, () => void load(true))

onMounted(() => void load())

defineExpose({ load, screen })
</script>