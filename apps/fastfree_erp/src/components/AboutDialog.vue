<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card style="min-width: 320px; max-width: 420px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ t('about.title') }}</div>
        <q-space />
        <q-btn
          flat
          dense
          round
          icon="mdi-close"
          :aria-label="t('about.close')"
          :title="t('about.close')"
          @click="$emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section>
        <div class="text-body2 text-grey-7">{{ t('about.description') }}</div>
      </q-card-section>

      <q-separator inset />

      <q-card-section>
        <q-list dense>
          <q-item>
            <q-item-section>{{ t('about.quasarVersion') }}</q-item-section>
            <q-item-section side>{{ quasarVersion }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>{{ t('about.vueVersion') }}</q-item-section>
            <q-item-section side>{{ vueVersion }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>{{ t('about.mode') }}</q-item-section>
            <q-item-section side>{{ appMode }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>{{ t('about.backendUrl') }}</q-item-section>
            <q-item-section side>
              <q-badge :color="connected ? 'positive' : 'negative'">
                {{ serverUrl || t('about.notSet') }}
              </q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator inset />

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">{{ t('about.debugTitle') }}</div>
        <q-btn
          color="primary"
          icon="mdi-console"
          :label="t('about.openConsole')"
          :aria-label="t('about.openConsole')"
          class="full-width"
          @click="openDebugConsole"
        />
        <div class="text-caption text-grey-6 q-mt-sm">{{ t('about.consoleHint') }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-close-popup
          flat
          :label="t('about.close')"
          :aria-label="t('about.close')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { version as vueVersion } from 'vue'
import { version as quasarVersion } from 'quasar/package.json'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'

interface ErudaApi {
  show: () => void
}

withDefaults(
  defineProps<{
    modelValue: boolean
    serverUrl?: string
    connected?: boolean
  }>(),
  {
    serverUrl: '',
    connected: false,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t } = useLcI18n()
const $q = useQuasar()

const appMode = computed(() => import.meta.env.MODE)

function openDebugConsole(): void {
  const eruda = (window as unknown as { __eruda?: ErudaApi }).__eruda
  if (eruda) {
    eruda.show()
  } else {
    $q.notify({ type: 'warning', message: t('about.erudaUnavailable') })
  }
}
</script>
