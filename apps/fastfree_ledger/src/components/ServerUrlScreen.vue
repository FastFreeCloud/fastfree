<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-server" size="2rem" color="primary" />
        <span class="text-h6">{{ t('app.serverUrl') }}</span>
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="serverUrl"
          :label="t('app.enterServerUrl')"
          outlined
          autofocus
          :rules="[val => !!val || t('common.required'), val => isValidUrl(val) || t('app.invalidUrl')]"
          @keyup.enter="save"
        >
          <template #prepend>
            <q-icon name="mdi-web" />
          </template>
        </q-input>
        <div class="text-caption text-grey q-mt-sm">
          {{ t('app.serverUrlHint') }}
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="t('common.cancel')" @click="cancel" />
        <q-btn color="primary" :label="t('common.connect')" @click="save" :disable="!isValidUrl(serverUrl)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'

const { t } = useLcI18n()

const show = ref(true)
const serverUrl = ref('')

const emit = defineEmits<{
  (e: 'connected', url: string): void
  (e: 'cancel'): void
}>()

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function save() {
  if (isValidUrl(serverUrl.value)) {
    localStorage.setItem('fastfree_base_url', serverUrl.value)
    emit('connected', serverUrl.value)
    show.value = false
  }
}

function cancel() {
  emit('cancel')
}
</script>
