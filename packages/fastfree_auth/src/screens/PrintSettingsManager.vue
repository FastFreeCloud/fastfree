<template>
  <div class="print-settings-screen q-pa-md">
    <div class="print-settings-header">
      <div class="print-settings-header__icon">
        <q-icon name="mdi-printer" size="28px" />
      </div>
      <div>
        <div class="print-settings-header__title">{{ t('auth.printSettings.title') }}</div>
        <div class="print-settings-header__subtitle">{{ t('auth.printSettings.subtitle') }}</div>
      </div>
      <q-space />
      <q-btn
        unelevated
        no-caps
        color="primary"
        icon="mdi-content-save-outline"
        :label="t('auth.printSettings.save')"
        :loading="saving"
        :disable="loading"
        @click="save"
      />
    </div>

    <div class="print-settings-grid">
      <q-card flat bordered class="print-settings-card">
        <q-card-section class="print-settings-card__title">
          <q-icon name="mdi-domain" />
          <span>{{ t('auth.printSettings.title') }}</span>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="draft.companyName"
            outlined
            dense
            :label="t('auth.printSettings.companyName')"
            :hint="t('auth.printSettings.companyHint')"
          >
            <template #prepend><q-icon name="mdi-office-building-outline" /></template>
          </q-input>

          <div class="print-settings-logo-row">
            <div v-if="draft.logo" class="print-settings-logo">
              <img :src="draft.logo" alt="Company logo" />
              <q-btn
                flat
                round
                dense
                icon="mdi-close"
                color="negative"
                :aria-label="t('common.delete')"
                @click="draft.logo = ''"
              />
            </div>
            <q-file
              v-model="logoFile"
              outlined
              dense
              accept=".png,.jpg,.jpeg,.webp,.svg"
              :max-file-size="5242880"
              :label="t('auth.printSettings.logo')"
              :hint="t('auth.printSettings.logoHint')"
              @update:model-value="onLogoSelected"
            >
              <template #prepend><q-icon name="mdi-image-outline" /></template>
            </q-file>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                :model-value="draft.taxNumber"
                @update:model-value="(value) => setLatinDigits('taxNumber', value)"
                outlined
                dense
                dir="ltr"
                inputmode="numeric"
                :label="t('auth.printSettings.taxNumber')"
              >
                <template #prepend><q-icon name="mdi-card-account-details-outline" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                :model-value="draft.commercialRegister"
                @update:model-value="(value) => setLatinDigits('commercialRegister', value)"
                outlined
                dense
                dir="ltr"
                inputmode="numeric"
                :label="t('auth.printSettings.commercialRegister')"
              >
                <template #prepend><q-icon name="mdi-file-certificate-outline" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                :model-value="draft.phone"
                @update:model-value="(value) => setLatinDigits('phone', value)"
                outlined
                dense
                dir="ltr"
                inputmode="tel"
                :label="t('auth.printSettings.phone')"
              >
                <template #prepend><q-icon name="mdi-phone-outline" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="draft.address"
                outlined
                dense
                :label="t('auth.printSettings.address')"
              >
                <template #prepend><q-icon name="mdi-map-marker-outline" /></template>
              </q-input>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="print-settings-preview-card">
        <q-card-section class="print-settings-card__title">
          <q-icon name="mdi-eye-outline" />
          <span>{{ t('auth.printSettings.preview') }}</span>
        </q-card-section>
        <q-card-section>
          <div class="print-preview">
            <div class="print-preview__header">
              <img v-if="draft.logo" :src="draft.logo" alt="Company logo" />
              <div class="print-preview__company">
                {{ draft.companyName || t('auth.printSettings.companyName') }}
              </div>
              <div class="print-preview__meta">
                <span v-if="draft.taxNumber"
                  >{{ t('print.taxNumber') }}: {{ draft.taxNumber }}</span
                >
                <span v-if="draft.phone">{{ t('print.phone') }}: {{ draft.phone }}</span>
                <span v-if="draft.commercialRegister"
                  >{{ t('print.commercialRegister') }}: {{ draft.commercialRegister }}</span
                >
              </div>
              <div v-if="draft.address" class="print-preview__address">{{ draft.address }}</div>
            </div>
            <div class="print-preview__table">
              <div class="print-preview__row print-preview__row--head">
                <span>#</span>
                <span>{{ t('sales.quotation') }}</span>
                <span>{{ t('sales.customer') }}</span>
                <span>{{ t('sales.grandTotal') }}</span>
              </div>
              <div class="print-preview__row">
                <span>1</span>
                <span>SAL-QTN-0001</span>
                <span>FastFree</span>
                <span>1,000.00</span>
              </div>
              <div class="print-preview__row print-preview__row--total">
                <span>{{ t('sales.grandTotal') }}</span>
                <span>1,000.00</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import {
  getPrintSettings,
  savePrintSettings,
  type PrintCompanySettings,
} from '../services/settings.service'

const { t } = useLcI18n()
const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const logoFile = ref<File | null>(null)
const draft = reactive<PrintCompanySettings>({
  companyName: '',
  taxNumber: '',
  phone: '',
  commercialRegister: '',
  address: '',
  header: '',
  footer: '',
  logo: '',
})

type NumericPrintField = 'taxNumber' | 'phone' | 'commercialRegister'

function setLatinDigits(field: NumericPrintField, value: string | number | null | undefined) {
  const normalized = String(value ?? '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
  draft[field] = normalized
}

async function load() {
  loading.value = true
  try {
    const result = await getPrintSettings()
    if (result.success && result.data) Object.assign(draft, result.data)
  } finally {
    loading.value = false
  }
}

function onLogoSelected(file: File | null) {
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    $q.notify({ type: 'negative', message: t('auth.printSettings.logoError') })
    logoFile.value = null
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    draft.logo = typeof reader.result === 'string' ? reader.result : ''
  }
  reader.readAsDataURL(file)
}

async function save() {
  saving.value = true
  try {
    const result = await savePrintSettings({ ...draft })
    if (!result.success) {
      $q.notify({ type: 'negative', message: t('auth.printSettings.saveError') })
      return
    }
    $q.notify({ type: 'positive', message: t('auth.printSettings.saved') })
  } catch {
    $q.notify({ type: 'negative', message: t('auth.printSettings.saveError') })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style lang="scss" scoped>
.print-settings-screen {
  min-height: 100%;
  background: color-mix(in srgb, var(--lc-surface-container, #f5f7fa) 65%, transparent);
}

.print-settings-header,
.print-settings-card__title,
.print-settings-logo-row,
.print-settings-logo {
  display: flex;
  align-items: center;
}

.print-settings-header {
  gap: 12px;
  max-width: 1180px;
  margin: 0 auto 16px;
  padding: 18px 20px;
  border: 1px solid var(--lc-outline-variant, #e5e7eb);
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--lc-primary, #1565c0), var(--lc-primary-dark, #0d47a1));
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
}

.print-settings-header__icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
}

.print-settings-header__title {
  font-size: 1.15rem;
  font-weight: 700;
}

.print-settings-header__subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
}

.print-settings-header :deep(.q-btn) {
  color: var(--lc-primary, #1565c0);
  background: #fff;
}

.print-settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  align-items: start;
  gap: 16px;
  max-width: 1180px;
  margin: 0 auto;
}

.print-settings-card,
.print-settings-preview-card {
  overflow: hidden;
  border: 1px solid var(--lc-outline-variant, #e5e7eb);
  border-radius: 14px;
  background: var(--lc-surface, #fff);
}

.print-settings-card__title {
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--lc-outline-variant, #e5e7eb);
  color: var(--lc-primary, #1565c0);
  font-weight: 700;
}

.print-settings-logo-row {
  align-items: flex-start;
  gap: 12px;
}

.print-settings-logo-row > .q-file {
  flex: 1;
}

.print-settings-logo {
  position: relative;
  width: 112px;
  height: 80px;
  justify-content: center;
  border: 1px dashed var(--lc-outline, #b0bec5);
  border-radius: 10px;
  background: var(--lc-surface-container-lowest, #fff);
}

.print-settings-logo img {
  max-width: 92px;
  max-height: 62px;
  object-fit: contain;
}

.print-settings-logo .q-btn {
  position: absolute;
  inset-block-start: 2px;
  inset-inline-end: 2px;
}

.print-preview {
  overflow: hidden;
  border: 1px solid #d9e1e8;
  border-radius: 10px;
  background: #fff;
}

.print-preview__header {
  padding: 18px;
  border-bottom: 3px solid #0d47a1;
  text-align: center;
}

.print-preview__header img {
  max-width: 100px;
  max-height: 64px;
  margin-bottom: 8px;
  object-fit: contain;
}

.print-preview__company {
  color: #0d47a1;
  font-size: 1.2rem;
  font-weight: 700;
}

.print-preview__meta,
.print-preview__address {
  margin-top: 5px;
  color: #64748b;
  font-size: 0.75rem;
}

.print-preview__meta span + span::before {
  margin-inline: 6px;
  content: '|';
}

.print-preview__table {
  margin: 14px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}

.print-preview__row {
  display: grid;
  grid-template-columns: 36px 1.3fr 1fr 0.8fr;
  align-items: center;
  min-height: 36px;
  border-bottom: 1px solid #e2e8f0;
}

.print-preview__row span {
  padding: 6px 8px;
  text-align: center;
}

.print-preview__row--head {
  color: #fff;
  background: #0d47a1;
  font-size: 0.72rem;
  font-weight: 700;
}

.print-preview__row--total {
  display: grid;
  grid-template-columns: 1fr 0.8fr;
  color: #0d47a1;
  background: #e3f2fd;
  font-weight: 700;
}

@media (max-width: 899px) {
  .print-settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 599px) {
  .print-settings-header {
    flex-wrap: wrap;
  }

  .print-settings-header :deep(.q-btn) {
    width: 100%;
  }

  .print-settings-logo-row {
    flex-direction: column;
  }
}
</style>
