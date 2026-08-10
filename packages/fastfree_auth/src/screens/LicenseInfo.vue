<template>
  <div class="license-info">
    <q-card>
      <q-card-section class="row items-center">
        <q-icon name="mdi-license" size="32px" color="primary" class="q-mr-md" />
        <div class="text-h6">{{ t('auth.license.title') }}</div>
        <q-space />
        <q-btn flat color="primary" :label="t('auth.common.refresh')" icon="mdi-refresh" :aria-label="t('common.refresh')" @click="fetchLicense" :loading="loading" />
      </q-card-section>

      <q-card-section>
        <div v-if="license" class="license-info__content">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 text-grey-6">{{ t('auth.license.type') }}</div>
                  <div class="text-h5">
                    <q-badge :color="getLicenseColor(license.type)">
                      {{ getLicenseLabel(license.type) }}
                    </q-badge>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 text-grey-6">{{ t('auth.license.status') }}</div>
                  <div class="text-h5">
                    <q-badge :color="license.status === 'active' ? 'positive' : 'negative'">
                      {{ license.status === 'active' ? t('auth.license.statusActive') : t('auth.license.statusExpired') }}
                    </q-badge>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 text-grey-6">{{ t('auth.license.expiryDate') }}</div>
                  <div class="text-body1">
                    {{ license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : t('auth.license.notSpecified') }}
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 text-grey-6">{{ t('auth.license.maxUsers') }}</div>
                  <div class="text-body1">{{ license.maxUsers }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div v-if="expiringSoon" class="q-mt-md">
            <q-banner class="bg-warning text-white" rounded>
              <template #avatar>
                <q-icon name="mdi-alert" />
              </template>
              {{ t('auth.license.expiringSoon') }}
            </q-banner>
          </div>
        </div>

        <div v-else class="text-center q-pa-lg">
          <q-icon name="mdi-license" size="64px" color="grey-4" />
          <div class="text-h6 text-grey-5 q-mt-md">{{ t('auth.license.noLicense') }}</div>
          <div class="text-caption text-grey-5">{{ t('auth.license.activatePrompt') }}</div>
        </div>
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">{{ t('auth.license.activateNew') }}</div>
        <div class="row q-col-gutter-sm">
          <div class="col">
            <q-input v-model="licenseKey" :label="t('auth.license.licenseKey')" outlined dense />
          </div>
          <div class="col-auto">
            <q-btn color="primary" :label="t('auth.license.activate')" @click="activate" :loading="activating" />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/runtime'
import { useLicenseStore } from '../stores/useLicenseStore'

const { t } = useLcI18n()
const $q = useQuasar()
const licenseStore = useLicenseStore()

const licenseKey = ref('')
const activating = ref(false)

const license = computed(() => licenseStore.license)
const loading = computed(() => licenseStore.loading)
const expiringSoon = computed(() => licenseStore.expiringSoon)

function getLicenseColor(type: string) {
  const colors: Record<string, string> = {
    trial: 'warning',
    standard: 'info',
    enterprise: 'positive',
  }
  return colors[type] || 'grey'
}

function getLicenseLabel(type: string) {
  const labels: Record<string, string> = {
    trial: t('auth.license.trial'),
    standard: t('auth.license.standard'),
    enterprise: t('auth.license.enterprise'),
  }
  return labels[type] || type
}

async function fetchLicense() {
  try {
    await licenseStore.fetchLicense()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

async function activate() {
  if (!licenseKey.value) {
    $q.notify({ type: 'warning', message: t('auth.license.enterLicenseKey') })
    return
  }

  activating.value = true
  const success = await licenseStore.activate(licenseKey.value)
  activating.value = false

  if (success) {
    $q.notify({ type: 'positive', message: t('auth.license.activateSuccess') })
    licenseKey.value = ''
  } else {
    $q.notify({ type: 'negative', message: licenseStore.error || t('auth.license.activateError') })
  }
}

onMounted(() => {
  fetchLicense()
})
</script>
