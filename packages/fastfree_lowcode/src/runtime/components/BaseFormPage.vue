<template>
  <q-page class="q-pa-md">
    <!-- Breadcrumb -->
    <div v-if="showBreadcrumb && breadcrumbItems.length > 0" class="q-mb-md">
      <q-btn
        flat
        round
        dense
        size="sm"
        :icon="$q.lang.rtl ? 'mdi-chevron-right' : 'mdi-chevron-left'"
        :aria-label="t('common.back')"
        @click="$emit('back')"
        class="q-mb-sm"
      />
      <q-breadcrumb
        :divider="$q.lang.rtl ? 'chevron_left' : 'chevron_right'"
        class="q-mt-xs"
      >
        <q-breadcrumb-el
          v-for="(item, index) in breadcrumbItems"
          :key="item.label"
          :label="item.label"
          :to="item.to"
          :disable="index === breadcrumbItems.length - 1"
        />
      </q-breadcrumb>
    </div>

    <!-- Loading Skeleton -->
    <q-card class="lc-base-form-page__card" v-if="loading">
      <q-card-section class="q-pa-lg">
        <q-skeleton type="rect" width="100%" height="200px" animation="fade" />
      </q-card-section>
    </q-card>

    <!-- Form Content -->
    <q-card v-else class="lc-base-form-page__card">
      <q-card-section class="q-pa-lg">
        <!-- Header -->
        <div class="row items-start q-mb-lg lc-base-form-page__header">
          <q-icon
            v-if="icon"
            :name="icon"
            size="32px"
            :color="iconColor"
            class="lc-base-form-page__icon"
          />
          <div class="col">
            <div class="text-h6 text-weight-bold lc-base-form-page__title">
              {{ title }}
            </div>
            <div v-if="subtitle" class="text-caption text-grey-6 lc-base-form-page__subtitle">
              {{ subtitle }}
            </div>
          </div>
          <slot name="header-actions" />
        </div>

        <!-- Default slot (form content) -->
        <slot />

        <!-- Footer Actions -->
        <div class="row q-gutter-sm q-mt-lg lc-base-form-page__footer">
          <div class="col-12 col-sm-auto q-mt-sm q-sm-mt-0">
            <q-btn
              v-if="canEdit && docstatus === 0"
              :label="t('common.save')"
              color="primary"
              :loading="saving"
              :disable="saving || !canEdit"
              type="submit"
              form="main-form"
              :aria-label="t('common.save')"
              class="col-12 col-sm-auto"
            />
            <q-btn
              v-else-if="canEdit && docstatus === 1"
              flat
              :label="t('common.edit')"
              color="primary"
              :loading="saving"
              :disable="saving || !canEdit"
              @click="$emit('save')"
              :aria-label="t('common.edit')"
              class="col-12 col-sm-auto"
            />
          </div>

          <div class="col-12 col-sm-auto q-mt-sm q-sm-mt-0">
            <q-btn
              v-if="canSubmit && docstatus === 0"
              :label="t('common.submit')"
              color="positive"
              :loading="saving"
              :disable="saving || !canSubmit"
              @click="$emit('submit')"
              :aria-label="t('common.submit')"
              class="col-12 col-sm-auto"
            />
            <q-btn
              v-else-if="canCancel && docstatus === 1"
              :label="t('common.cancel')"
              color="warning"
              :loading="saving"
              :disable="saving || !canCancel"
              @click="handleCancel"
              :aria-label="t('common.cancelDocument')"
              class="col-12 col-sm-auto"
            />
          </div>

          <div class="col-12 col-sm-auto q-mt-sm q-sm-mt-0">
            <q-btn
              v-if="canDelete && docstatus === 0"
              flat
              :label="t('common.delete')"
              color="negative"
              :loading="saving"
              :disable="saving || !canDelete"
              @click="handleDelete"
              :aria-label="t('common.delete')"
              class="col-12 col-sm-auto"
            />
            <q-btn
              v-else-if="canDelete && docstatus === 2"
              flat
              :label="t('common.delete')"
              color="negative"
              :loading="saving"
              :disable="saving || !canDelete"
              @click="handleDelete"
              :aria-label="t('common.delete')"
              class="col-12 col-sm-auto"
            />
          </div>

          <div class="col-12 col-sm-auto q-mt-sm q-sm-mt-0">
            <q-btn
              flat
              :label="t('common.back')"
              color="grey-7"
              :loading="saving"
              :disable="saving"
              @click="$emit('back')"
              :aria-label="t('common.back')"
              class="col-12 col-sm-auto"
            />
          </div>

          <slot name="footer" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface Props {
  title: string
  subtitle?: string
  icon?: string
  iconColor?: string
  saving: boolean
  loading: boolean
  docstatus: 0 | 1 | 2
  canEdit: boolean
  canSubmit: boolean
  canCancel: boolean
  canDelete: boolean
  showBreadcrumb?: boolean
  breadcrumbItems?: BreadcrumbItem[]
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  icon: '',
  iconColor: 'primary',
  saving: false,
  loading: false,
  docstatus: 0,
  canEdit: true,
  canSubmit: true,
  canCancel: true,
  canDelete: true,
  showBreadcrumb: true,
  breadcrumbItems: () => [],
})

const emit = defineEmits(['save', 'submit', 'cancel', 'delete', 'back'])

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const { t } = useLcI18n()

function handleCancel() {
  $q.dialog({
    title: t('common.confirm'),
    message: t('common.confirmCancelDocument'),
    ok: t('common.yes'),
    cancel: t('common.no'),
    persistent: true,
  }).onOk(() => {
    emit('cancel')
  })
}

function handleDelete() {
  $q.dialog({
    title: t('common.confirm'),
    message: t('common.confirmDelete'),
    ok: t('common.yes'),
    cancel: t('common.no'),
    color: 'negative',
    persistent: true,
  }).onOk(() => {
    emit('delete')
  })
}
</script>

<style lang="scss" scoped>
.lc-base-form-page__card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.06));
  background: var(--lc-surface, #fff);

  body.body--dark & {
    background: var(--lc-surface, #2d2d2d);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}

.lc-base-form-page__header {
  align-items: flex-start;
}

.lc-base-form-page__icon {
  margin-inline-end: 12px;
  flex-shrink: 0;
}

.lc-base-form-page__title {
  color: var(--lc-on-surface, #1a1a1a);
  line-height: 1.3;

  body.body--dark & {
    color: var(--lc-on-surface, #fff);
  }
}

.lc-base-form-page__subtitle {
  margin-top: 4px;
}

.lc-base-form-page__footer {
  flex-wrap: wrap;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--lc-border, rgba(0, 0, 0, 0.08));

  body.body--dark & {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
}

/* Mobile stacked buttons */
@media (max-width: 599px) {
  .lc-base-form-page__footer > .col-12 {
    width: 100%;
  }

  .lc-base-form-page__footer .q-btn {
    width: 100%;
  }
}
</style>