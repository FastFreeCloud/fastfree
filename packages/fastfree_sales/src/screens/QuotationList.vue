<template>
  <div
    ref="pageContainerRef"
    class="quotations-page q-pa-md"
    :class="{
      'quotations-page--narrow': tableWidth > 0 && tableWidth < 960,
      'quotations-page--compact': tableWidth > 0 && tableWidth < 768,
    }"
  >
    <q-card flat bordered class="quotation-list-card">
      <q-card-section class="quotation-header">
        <div class="quotation-header__identity">
          <div class="quotation-header__icon">
            <q-icon name="mdi-file-document-outline" size="22px" />
          </div>
          <span class="quotation-header__title">{{ t('sales.quotations') }}</span>
          <q-badge
            outline
            color="primary"
            :label="String(filteredQuotations.length)"
            :aria-label="t('sales.showingResults', { count: filteredQuotations.length })"
            aria-live="polite"
          />
        </div>
        <q-space />
        <q-btn
          unelevated
          no-caps
          dense
          color="primary"
          icon="mdi-plus"
          :label="t('sales.addQuotation')"
          class="quotation-add-btn"
          :aria-label="t('sales.addQuotation')"
          @click="openForm"
        />
      </q-card-section>

      <q-card-section class="quotation-toolbar">
        <q-input
          v-model="search"
          :placeholder="t('common.search')"
          :aria-label="t('common.search')"
          dense
          outlined
          clearable
          class="quotation-search"
        >
          <template #prepend><q-icon name="mdi-magnify" /></template>
        </q-input>
        <q-input
          v-model="dateFrom"
          :label="t('sales.fromDate')"
          dense
          outlined
          type="date"
          clearable
          class="quotation-date-input"
        />
        <span class="quotation-date-separator">—</span>
        <q-input
          v-model="dateTo"
          :label="t('sales.toDate')"
          :min="dateFrom || undefined"
          dense
          outlined
          type="date"
          clearable
          class="quotation-date-input"
        />
        <q-btn
          flat
          round
          dense
          icon="mdi-close"
          color="grey-7"
          :disable="!hasActivePeriod"
          :aria-label="t('sales.clearPeriod')"
          @click="clearPeriod"
        >
          <q-tooltip>{{ t('sales.clearPeriod') }}</q-tooltip>
        </q-btn>
        <q-space class="quotation-toolbar__spacer" />
        <q-btn
          flat
          round
          dense
          icon="mdi-printer"
          color="primary"
          :aria-label="t('screens.printSettings')"
          @click="openPrintSettings"
        >
          <q-tooltip>{{ t('screens.printSettings') }}</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="mdi-table-column"
          color="primary"
          :aria-label="t('sales.manageColumns')"
        >
          <q-tooltip>{{ t('sales.manageColumns') }}</q-tooltip>
          <q-menu
            anchor="bottom start"
            self="top start"
            transition-show="jump-down"
            transition-hide="fade"
            :transition-duration="motionDuration"
            class="quotation-column-menu"
            style="min-width: 240px; max-width: calc(100vw - 24px)"
          >
            <q-list dense class="q-pa-sm">
              <q-item-label header>{{ t('sales.visibleColumns') }}</q-item-label>
              <q-item v-for="column in columnPickerItems" :key="column.name" dense>
                <q-item-section avatar>
                  <q-checkbox
                    :model-value="isColumnVisible(column.name)"
                    :disable="column.required || !isColumnAvailable(column.name)"
                    :aria-label="column.label"
                    @click.stop
                    @update:model-value="setColumnVisibility(column.name, $event)"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ column.label }}</q-item-label>
                  <q-item-label v-if="column.required" caption>
                    {{ t('sales.fixedColumn') }}
                  </q-item-label>
                  <q-item-label v-else-if="!isColumnAvailable(column.name)" caption>
                    {{ t('sales.columnUnavailable') }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="resetColumnSettings">
                <q-item-section avatar><q-icon name="mdi-restore" /></q-item-section>
                <q-item-section>{{ t('sales.resetColumns') }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="mdi-refresh"
          color="primary"
          :aria-label="t('common.refresh')"
          :loading="store.quotationLoading"
          :disable="store.quotationLoading"
          @click="handleRefresh"
        >
          <q-tooltip>{{ t('common.refresh') }}</q-tooltip>
        </q-btn>
      </q-card-section>

      <q-banner
        v-if="store.quotationError"
        rounded
        dense
        class="quotation-error-banner"
        role="alert"
      >
        <template #avatar><q-icon name="mdi-alert-circle-outline" /></template>
        {{ store.quotationError }}
        <template #action>
          <q-btn
            flat
            dense
            no-caps
            color="negative"
            icon="mdi-refresh"
            :label="t('sales.retry')"
            :loading="store.quotationLoading"
            :disable="store.quotationLoading"
            @click="handleRefresh"
          />
        </template>
      </q-banner>

      <q-card-section class="quotation-table-section">
        <div class="quotation-table-shell" :aria-busy="store.quotationLoading ? 'true' : 'false'">
          <q-table
            class="lc-data-table quotation-data-table"
            :rows="filteredQuotations"
            :columns="columns"
            :visible-columns="visibleColumns"
            row-key="name"
            :loading="showRefreshLoading"
            separator="cell"
            flat
            hide-pagination
            :rows-per-page-options="[10, 25, 50]"
            v-model:pagination="pagination"
          >
            <template #body-cell-party_name="props">
              <q-td :props="props">
                <span class="quotation-customer">{{
                  props.row.party_name || props.row.customer_name || '—'
                }}</span>
              </q-td>
            </template>
            <template #body-cell-grand_total="props">
              <q-td :props="props" class="quotation-money">
                {{ formatNumber(props.row.grand_total ?? 0, 2) }}
              </q-td>
            </template>
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="statusColor(props.row.status)"
                  :label="translateStatus(props.row.status)"
                  class="quotation-status"
                />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props" class="quotation-actions">
                <q-btn
                  flat
                  round
                  dense
                  icon="mdi-dots-horizontal"
                  color="grey-7"
                  :aria-label="`${t('common.actions')} - ${props.row.name}`"
                >
                  <q-menu
                    auto-close
                    anchor="bottom start"
                    self="top start"
                    transition-show="fade"
                    transition-hide="fade"
                    :transition-duration="motionDuration"
                  >
                    <q-list style="min-width: 150px">
                      <q-item
                        v-if="props.row.docstatus === 0"
                        clickable
                        @click="openForm(props.row.name)"
                      >
                        <q-item-section avatar
                          ><q-icon name="mdi-pencil-outline" color="primary"
                        /></q-item-section>
                        <q-item-section>{{ t('common.edit') }}</q-item-section>
                      </q-item>
                      <q-item
                        v-if="props.row.docstatus === 0"
                        clickable
                        @click="submitQuotation(props.row)"
                      >
                        <q-item-section avatar
                          ><q-icon name="mdi-send-outline" color="positive"
                        /></q-item-section>
                        <q-item-section>{{ t('common.submit') }}</q-item-section>
                      </q-item>
                      <q-item
                        v-if="props.row.docstatus === 1"
                        clickable
                        @click="cancelQuotation(props.row)"
                      >
                        <q-item-section avatar
                          ><q-icon name="mdi-close" color="negative"
                        /></q-item-section>
                        <q-item-section>{{ t('common.cancel') }}</q-item-section>
                      </q-item>
                      <q-item
                        v-if="props.row.docstatus === 0 || props.row.docstatus === 2"
                        clickable
                        @click="deleteQuotation(props.row)"
                      >
                        <q-item-section avatar
                          ><q-icon name="mdi-delete-outline" color="negative"
                        /></q-item-section>
                        <q-item-section class="text-negative">{{
                          t('common.delete')
                        }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </q-td>
            </template>
            <template #no-data>
              <div class="quotation-empty full-width">
                <q-icon name="mdi-file-search-outline" size="38px" />
                <div v-if="store.quotationError">{{ t('common.error') }}</div>
                <div v-else-if="hasAppliedPeriod || search.trim()">
                  {{ t('sales.noMatchingData') }}
                </div>
                <div v-else>{{ t('common.noData') }}</div>
              </div>
            </template>
          </q-table>
          <div v-if="showInitialLoading" class="quotation-loading-overlay">
            <div class="quotation-loading-status" role="status" aria-live="polite">
              {{ t('sales.loadingQuotations') }}
            </div>
            <div
              v-for="row in skeletonRows"
              :key="row"
              class="quotation-skeleton-row"
              aria-hidden="true"
              :style="{
                gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
                animationDelay: `${Math.min(row, 5) * 16}ms`,
              }"
            >
              <q-skeleton
                v-for="(column, index) in visibleColumns"
                :key="column"
                type="rect"
                :animation="reducedMotion ? 'none' : 'fade'"
                :width="index === 0 ? '100%' : index % 2 === 0 ? '88%' : '72%'"
                height="14px"
              />
            </div>
          </div>
        </div>
      </q-card-section>

      <div class="quotation-summary-bar">
        <div class="quotation-summary-bar__item">
          <q-icon name="mdi-file-document-multiple-outline" size="17px" />
          <span>{{ bottomSummary }}</span>
        </div>
        <div class="quotation-summary-bar__item quotation-summary-bar__item--total">
          <q-icon name="mdi-cash-multiple" size="17px" />
          <span>{{ t('sales.grandTotal') }}</span>
          <strong>{{ bottomTotal }}</strong>
        </div>
        <div class="quotation-summary-bar__item quotation-summary-bar__item--period">
          <q-icon name="mdi-calendar-range" size="17px" />
          <span>{{ periodLabel }}</span>
        </div>
      </div>

      <div class="quotation-footer">
        <DataTableBottom
          :page="currentPage"
          :rows-per-page="pagination.rowsPerPage"
          :rows-number="filteredQuotations.length"
          :width="tableWidth"
          :show-summary="false"
          :show-total="false"
          :loading="store.quotationLoading"
          @update:rowsPerPage="onRowsPerPageChange"
          @prev-page="previousPage"
          @next-page="nextPage"
        >
          <template #left>
            <q-btn
              outline
              no-caps
              dense
              color="primary"
              icon="mdi-printer-outline"
              :label="tableWidth > 560 ? t('sales.printPeriod') : ''"
              :round="tableWidth <= 560"
              :aria-label="t('sales.printPeriod')"
              :loading="printPending"
              :disable="printPending || store.quotationLoading"
              @click="handlePrintPeriod"
            >
              <q-tooltip>{{ t('sales.printPeriod') }}</q-tooltip>
            </q-btn>
          </template>
          <template #right>
            <q-btn
              unelevated
              no-caps
              dense
              color="positive"
              icon="mdi-microsoft-excel"
              :label="tableWidth > 560 ? t('sales.exportPeriod') : ''"
              :round="tableWidth <= 560"
              :aria-label="t('sales.exportPeriod')"
              :loading="exportPending"
              :disable="exportPending || store.quotationLoading"
              @click="handleExportPeriod"
            >
              <q-tooltip>{{ t('sales.exportPeriod') }}</q-tooltip>
            </q-btn>
          </template>
        </DataTableBottom>
      </div>
    </q-card>

    <q-dialog
      v-model="confirmSubmit"
      :persistent="submitPending"
      transition-show="fade"
      transition-hide="fade"
      :transition-duration="motionDuration"
    >
      <q-card
        class="quotation-dialog-card"
        role="dialog"
        aria-labelledby="submit-quotation-dialog-title"
        aria-describedby="submit-quotation-dialog-description"
      >
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-check-circle" color="positive" text-color="white" />
          <span id="submit-quotation-dialog-title" class="q-ml-sm text-h6">
            {{ t('common.submit') }}
          </span>
        </q-card-section>
        <q-card-section id="submit-quotation-dialog-description">
          {{ t('sales.submitQuotationConfirm') }}
        </q-card-section>
        <q-card-actions class="quotation-dialog-actions">
          <q-btn
            flat
            :label="t('common.cancel')"
            :disable="submitPending"
            @click="confirmSubmit = false"
          />
          <q-btn
            flat
            color="positive"
            :label="t('common.submit')"
            :loading="submitPending"
            :disable="submitPending"
            @click="confirmSubmitQuotation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="confirmCancel"
      :persistent="cancelPending"
      transition-show="fade"
      transition-hide="fade"
      :transition-duration="motionDuration"
    >
      <q-card
        class="quotation-dialog-card"
        role="dialog"
        aria-labelledby="cancel-quotation-dialog-title"
        aria-describedby="cancel-quotation-dialog-description"
      >
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-close-circle" color="negative" text-color="white" />
          <span id="cancel-quotation-dialog-title" class="q-ml-sm text-h6">
            {{ t('common.cancel') }}
          </span>
        </q-card-section>
        <q-card-section id="cancel-quotation-dialog-description">
          {{ t('sales.cancelQuotationConfirm') }}
        </q-card-section>
        <q-card-actions class="quotation-dialog-actions">
          <q-btn
            flat
            :label="t('common.cancel')"
            :disable="cancelPending"
            @click="confirmCancel = false"
          />
          <q-btn
            flat
            color="negative"
            :label="t('common.confirm')"
            :loading="cancelPending"
            :disable="cancelPending"
            @click="confirmCancelQuotation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="confirmDelete"
      :persistent="deletePending"
      transition-show="fade"
      transition-hide="fade"
      :transition-duration="motionDuration"
    >
      <q-card
        class="quotation-dialog-card"
        role="dialog"
        aria-labelledby="delete-quotation-dialog-title"
        aria-describedby="delete-quotation-dialog-description"
      >
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span id="delete-quotation-dialog-title" class="q-ml-sm text-h6">
            {{ t('common.confirmDelete') }}
          </span>
        </q-card-section>
        <q-card-section id="delete-quotation-dialog-description">
          {{ t('sales.deleteQuotationConfirm') }}
        </q-card-section>
        <q-card-actions class="quotation-dialog-actions">
          <q-btn
            flat
            :label="t('common.cancel')"
            :disable="deletePending"
            @click="confirmDelete = false"
          />
          <q-btn
            flat
            color="negative"
            :label="t('common.delete')"
            :loading="deletePending"
            :disable="deletePending"
            @click="confirmDeleteQuotation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { getPrintSettings, type PrintCompanySettings } from 'fastfree-auth'
import { DataTableBottom } from 'quasar-app-extension-fastfree-lowcode'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import {
  useColumnSettings,
  useContainerWidth,
  useFormatNumber,
  useStatusHelpers,
} from 'quasar-app-extension-fastfree-lowcode/src/runtime'
import { useDesktopStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useDesktopStore'
import {
  usePrint,
  type PrintColumn,
  type PrintCompany,
} from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/usePrint'
import {
  useExcelExport,
  type ExcelColumn,
} from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useExcelExport'
import { useSalesStore } from '../stores/useSalesStore'
import {
  cancelQuotation as apiCancelQuotation,
  deleteQuotation as apiDeleteQuotation,
  submitQuotation as apiSubmitQuotation,
} from '../services/quotation.service'
import type { Quotation } from '../types'

const { t } = useLcI18n()
const store = useSalesStore()
const desktop = useDesktopStore()
const $q = useQuasar()
const { formatNumber } = useFormatNumber()
const { translateStatus, statusColor } = useStatusHelpers('sales')
const { printTable } = usePrint()
const { exportTable } = useExcelExport()

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const now = new Date()
const currentMonthFrom = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
const currentMonthTo = formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0))
const search = ref('')
const dateFrom = ref<string | null>(currentMonthFrom)
const dateTo = ref<string | null>(currentMonthTo)
const appliedDateFrom = ref(currentMonthFrom)
const appliedDateTo = ref(currentMonthTo)
const { containerRef: pageContainerRef, containerWidth: tableWidth } = useContainerWidth()
const pagination = ref({
  page: 1,
  rowsPerPage: 25,
  sortBy: 'transaction_date',
  descending: true,
})
const printSettings = ref<PrintCompanySettings | null>(null)
const printPending = ref(false)
const exportPending = ref(false)
const reducedMotion = ref(false)
const skeletonRows = [0, 1, 2, 3, 4, 5]
const motionDuration = ref(180)
let motionMedia: MediaQueryList | null = null
let dateLoadTimer: ReturnType<typeof setTimeout> | undefined

const columns = computed(() => [
  {
    name: 'name',
    label: t('sales.quotation'),
    field: 'name',
    sortable: true,
    required: true,
    align: 'left' as const,
    classes: 'quotation-column-start',
    headerClasses: 'quotation-column-start',
  },
  {
    name: 'party_name',
    label: t('sales.customer'),
    field: 'party_name',
    sortable: true,
    align: 'left' as const,
    classes: 'quotation-column-start',
    headerClasses: 'quotation-column-start',
  },
  {
    name: 'transaction_date',
    label: t('sales.date'),
    field: 'transaction_date',
    sortable: true,
    align: 'center' as const,
  },
  {
    name: 'valid_till',
    label: t('sales.validTill'),
    field: 'valid_till',
    sortable: true,
    align: 'center' as const,
  },
  {
    name: 'grand_total',
    label: t('sales.grandTotal'),
    field: 'grand_total',
    sortable: true,
    align: 'right' as const,
    classes: 'quotation-column-end',
    headerClasses: 'quotation-column-end',
  },
  {
    name: 'status',
    label: t('sales.status'),
    field: 'status',
    align: 'center' as const,
  },
  {
    name: 'actions',
    label: t('sales.actions'),
    field: 'actions',
    required: true,
    align: 'center' as const,
    classes: 'quotation-sticky-column',
    headerClasses: 'quotation-sticky-column',
  },
])

const defaultVisibility = columns.value.reduce<Record<string, boolean>>((visibility, column) => {
  visibility[column.name] = true
  return visibility
}, {})

const columnSettings = useColumnSettings({
  storageKey: 'fastfree-sales-quotations-columns',
  columns: columns.value,
  defaults: {
    order: columns.value.map((column) => column.name),
    visibility: defaultVisibility,
    widths: {},
  },
})

const columnPickerItems = computed(() => columns.value)

const layoutMode = computed(() => {
  if (tableWidth.value < 600) return 'compact'
  if (tableWidth.value < 800) return 'medium'
  return 'wide'
})

const responsiveColumnNames = computed(() => {
  const allowedColumns =
    layoutMode.value === 'compact'
      ? ['name', 'party_name', 'transaction_date', 'grand_total', 'status', 'actions']
      : layoutMode.value === 'medium'
        ? [
            'name',
            'party_name',
            'transaction_date',
            'valid_till',
            'grand_total',
            'status',
            'actions',
          ]
        : columns.value.map((column) => column.name)
  const defaultOrder = columns.value.map((column) => column.name)
  const savedOrder = columnSettings.orderedColumns.value.map((column) => column.name)
  const ordered = [...savedOrder, ...defaultOrder].filter(
    (name, index, names) => names.indexOf(name) === index,
  )
  return ordered
    .filter((name) => allowedColumns.includes(name))
    .sort((left, right) => {
      if (left === 'actions') return 1
      if (right === 'actions') return -1
      return 0
    })
})

function isColumnAvailable(name: string): boolean {
  return responsiveColumnNames.value.includes(name)
}

const visibleColumns = computed(() => {
  const selectedColumns = new Set(
    columnSettings.visibleColumnNames.value.length > 0
      ? columnSettings.visibleColumnNames.value
      : columns.value.map((column) => column.name),
  )
  return responsiveColumnNames.value.filter((name) => {
    const definition = columns.value.find((column) => column.name === name)
    return definition?.required === true || selectedColumns.has(name)
  })
})

function isColumnVisible(name: string): boolean {
  const definition = columns.value.find((column) => column.name === name)
  if (definition?.required) return true
  return columnSettings.columnVisibility.value[name] !== false
}

function setColumnVisibility(name: string, value: boolean | null): void {
  const definition = columns.value.find((column) => column.name === name)
  if (definition?.required || !isColumnAvailable(name)) return
  columnSettings.setColumnVisibility({
    ...columnSettings.columnVisibility.value,
    [name]: value === true,
  })
}

function resetColumnSettings(): void {
  columnSettings.resetToDefaults()
}

const hasActivePeriod = computed(() => Boolean(dateFrom.value || dateTo.value))
const hasAppliedPeriod = computed(() => Boolean(appliedDateFrom.value || appliedDateTo.value))
const periodLabel = computed(() => {
  if (appliedDateFrom.value && appliedDateTo.value)
    return `${appliedDateFrom.value} — ${appliedDateTo.value}`
  if (appliedDateFrom.value) return `${t('sales.fromDate')}: ${appliedDateFrom.value}`
  if (appliedDateTo.value) return `${t('sales.toDate')}: ${appliedDateTo.value}`
  return t('sales.allPeriods')
})

const filteredQuotations = computed(() => {
  const term = (search.value ?? '').trim().toLowerCase()
  return store.quotations.filter((quotation: Quotation) => {
    const haystacks: Array<string | undefined> = [
      quotation.name,
      quotation.party_name,
      quotation.customer_name,
      quotation.status,
      translateStatus(quotation.status),
      quotation.transaction_date,
      quotation.valid_till,
    ]
    const matchesSearch =
      term === '' || haystacks.some((value) => (value ?? '').toLowerCase().includes(term))
    const quotationDate = (quotation.transaction_date ?? '').slice(0, 10)
    const matchesFrom = appliedDateFrom.value === '' || quotationDate >= appliedDateFrom.value
    const matchesTo = appliedDateTo.value === '' || quotationDate <= appliedDateTo.value
    return matchesSearch && matchesFrom && matchesTo
  })
})

const reportCompany = computed<PrintCompany>(() => {
  const company: PrintCompany = {
    name: printSettings.value?.companyName || filteredQuotations.value[0]?.company || 'FastFree',
  }
  const settings = printSettings.value
  if (settings?.logo) company.logo = settings.logo
  if (settings?.taxNumber) company.taxNumber = settings.taxNumber
  if (settings?.phone) company.phone = settings.phone
  if (settings?.commercialRegister) company.commercialRegister = settings.commercialRegister
  if (settings?.address) company.address = settings.address
  return company
})

const pagesNumber = computed(() => {
  if (pagination.value.rowsPerPage <= 0) return 1
  return Math.max(1, Math.ceil(filteredQuotations.value.length / pagination.value.rowsPerPage))
})
const currentPage = computed(() => Math.min(Math.max(pagination.value.page, 1), pagesNumber.value))
const showInitialLoading = computed(
  () => store.quotationLoading && !store.quotationHasLoaded && !store.quotationError,
)
const showRefreshLoading = computed(() => store.quotationLoading && store.quotationHasLoaded)

const bottomSummary = computed(() =>
  showInitialLoading.value
    ? t('sales.loadingQuotations')
    : t('sales.showingResults', { count: filteredQuotations.value.length }),
)
const filteredTotal = computed(() =>
  filteredQuotations.value.reduce((sum, quotation) => sum + (quotation.grand_total ?? 0), 0),
)
const bottomTotal = computed(() =>
  showInitialLoading.value ? '—' : formatNumber(filteredTotal.value, 2),
)

const exportColumns = computed(() =>
  columns.value
    .filter((column) => column.name !== 'actions')
    .map((column) => {
      if (column.name === 'status') {
        return {
          ...column,
          format: (value: unknown) =>
            translateStatus(
              typeof value === 'string' || typeof value === 'number' ? String(value) : '',
            ),
        }
      }
      if (column.name === 'grand_total') return { ...column, type: 'number' as const }
      return column
    }),
)

function onRowsPerPageChange(value: number) {
  pagination.value.rowsPerPage = value
  pagination.value.page = 1
}

watch(pagesNumber, (totalPages) => {
  pagination.value.page = Math.min(Math.max(pagination.value.page, 1), totalPages)
})

function previousPage() {
  if (pagination.value.page > 1) pagination.value.page -= 1
}

function nextPage() {
  if (pagination.value.page < pagesNumber.value) pagination.value.page += 1
}

function clearPeriod() {
  dateFrom.value = ''
  dateTo.value = ''
  pagination.value.page = 1
}

function buildReportTitle() {
  return `${t('sales.quotations')} - ${periodLabel.value}`
}

async function refreshPrintSettings() {
  try {
    const result = await getPrintSettings()
    if (result.success && result.data) printSettings.value = result.data
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function openPrintSettings() {
  const winId = desktop.openWindow(
    'print-settings',
    t('screens.printSettings'),
    'mdi-printer',

    undefined,
    undefined,
    'groups.authentication',
  )
  if (winId) {
    void nextTick(() => desktop.bringToFront(winId))
    setTimeout(() => desktop.bringToFront(winId), 150)
  }
}

async function handlePrintPeriod() {
  if (printPending.value) return
  printPending.value = true
  try {
    await refreshPrintSettings()
    printTable({
      title: buildReportTitle(),
      company: reportCompany.value,
      columns: exportColumns.value as unknown as PrintColumn[],
      rows: filteredQuotations.value as unknown as Record<string, unknown>[],
      total: { label: t('sales.grandTotal'), value: bottomTotal.value },
      totalColumn: 'grand_total',
    })
  } finally {
    printPending.value = false
  }
}

async function handleExportPeriod() {
  if (exportPending.value) return
  exportPending.value = true
  try {
    await refreshPrintSettings()
    const from = dateFrom.value || 'all'
    const to = dateTo.value || 'all'
    await exportTable({
      filename: `quotations_${from}_${to}`,
      title: buildReportTitle(),
      company: reportCompany.value,
      columns: exportColumns.value as unknown as ExcelColumn[],
      rows: filteredQuotations.value as unknown as Record<string, unknown>[],
      total: { label: t('sales.grandTotal'), value: filteredTotal.value },
      totalColumn: 'grand_total',
    })
  } finally {
    exportPending.value = false
  }
}

async function handleRefresh() {
  if (dateLoadTimer) {
    clearTimeout(dateLoadTimer)
    dateLoadTimer = undefined
  }
  await loadQuotations()
}

function openForm(docId?: string | Event) {
  const id = typeof docId === 'string' ? docId : undefined
  const winId = desktop.openWindow(
    'sales-quotation-form',
    id ? t('sales.editQuotation') : t('sales.newQuotation'),
    'mdi-file-document-edit',
    undefined,
    undefined,
    'sales.sales',
    undefined,
    id ? { docId: id } : undefined,
  )
  if (winId) {
    void nextTick(() => desktop.bringToFront(winId))
    setTimeout(() => desktop.bringToFront(winId), 150)
  }
}

function submitQuotation(quotation: Quotation) {
  submitTarget.value = quotation.name
  confirmSubmit.value = true
}

async function confirmSubmitQuotation() {
  if (submitPending.value) return
  const name = submitTarget.value
  if (!name) return
  submitPending.value = true
  try {
    const result = await apiSubmitQuotation(name)
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error?.message ?? t('common.error'),
      })
      return
    }
    confirmSubmit.value = false
    $q.notify({ type: 'positive', message: t('sales.quotationSubmitted') })
    await loadQuotations()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    submitPending.value = false
  }
}

function cancelQuotation(quotation: Quotation) {
  cancelTarget.value = quotation.name
  confirmCancel.value = true
}

async function confirmCancelQuotation() {
  if (cancelPending.value) return
  const name = cancelTarget.value
  if (!name) return
  cancelPending.value = true
  try {
    const result = await apiCancelQuotation(name)
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error?.message ?? t('common.error'),
      })
      return
    }
    confirmCancel.value = false
    $q.notify({ type: 'positive', message: t('sales.quotationCancelled') })
    await loadQuotations()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    cancelPending.value = false
  }
}

function deleteQuotation(quotation: Quotation) {
  deleteTarget.value = quotation.name
  confirmDelete.value = true
}

async function confirmDeleteQuotation() {
  if (deletePending.value) return
  const name = deleteTarget.value
  if (!name) return
  deletePending.value = true
  try {
    const result = await apiDeleteQuotation(name)
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error?.message ?? t('common.error'),
      })
      return
    }
    confirmDelete.value = false
    $q.notify({ type: 'positive', message: t('sales.quotationDeleted') })
    await loadQuotations()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    deletePending.value = false
  }
}

const confirmSubmit = ref(false)
const submitTarget = ref('')
const submitPending = ref(false)
const confirmCancel = ref(false)
const cancelTarget = ref('')
const cancelPending = ref(false)
const confirmDelete = ref(false)
const deleteTarget = ref('')
const deletePending = ref(false)

watch([search], () => {
  pagination.value.page = 1
})

function scheduleQuotationLoad() {
  if (dateLoadTimer) clearTimeout(dateLoadTimer)
  dateLoadTimer = setTimeout(() => {
    dateLoadTimer = undefined
    void loadQuotations()
  }, 250)
}

watch([dateFrom, dateTo], () => {
  pagination.value.page = 1
  scheduleQuotationLoad()
})

async function loadQuotations() {
  const fromDate = dateFrom.value || undefined
  const toDate = dateTo.value || undefined
  const filters =
    fromDate && toDate
      ? { fromDate, toDate }
      : fromDate
        ? { fromDate }
        : toDate
          ? { toDate }
          : undefined
  try {
    const result = await store.fetchQuotations(filters)
    if (result.success) {
      appliedDateFrom.value = fromDate || ''
      appliedDateTo.value = toDate || ''
    } else if (result.error?.code !== 'STALE_REQUEST') {
      $q.notify({
        type: 'negative',
        message: result.error?.message ?? t('common.error'),
      })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

async function loadPrintSettings() {
  await refreshPrintSettings()
}

function updateMotionPreference() {
  reducedMotion.value = motionMedia?.matches ?? false
  motionDuration.value = reducedMotion.value ? 0 : 180
}

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
    updateMotionPreference()
    motionMedia.addEventListener?.('change', updateMotionPreference)
  }
  void Promise.all([loadQuotations(), loadPrintSettings()])
})

onUnmounted(() => {
  if (dateLoadTimer) clearTimeout(dateLoadTimer)
  motionMedia?.removeEventListener?.('change', updateMotionPreference)
})
</script>

<style lang="scss" scoped>
.quotations-page {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  overflow-x: hidden;
}

.quotation-list-card {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--lc-outline-variant, #e5e7eb);
  border-radius: 12px;
  box-shadow: 0 3px 14px rgba(15, 23, 42, 0.06);
}

.quotation-header,
.quotation-header__identity {
  display: flex;
  align-items: center;
}

.quotation-header {
  gap: 8px;
  min-height: 58px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--lc-outline-variant, #e5e7eb);
  background: var(--lc-surface, #fff);
}

.quotation-header__identity {
  gap: 8px;
}

.quotation-header__icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  color: var(--lc-primary, #1565c0);
  background: color-mix(in srgb, var(--lc-primary, #1565c0) 10%, transparent);
}

.quotation-header__title {
  font-size: 1.05rem;
  font-weight: 700;
}

.quotation-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 60px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--lc-outline-variant, #e5e7eb);
  background: color-mix(in srgb, var(--lc-surface-container, #f7f8fa) 55%, var(--lc-surface, #fff));
}

.quotation-search {
  width: clamp(220px, 28%, 330px);
}

.quotation-date-input {
  width: 145px;
}

.quotation-date-separator {
  color: var(--lc-on-surface-variant, #6b7280);
}

.quotation-toolbar__spacer {
  min-width: 2px;
}

.quotation-table-shell {
  position: relative;
  min-height: 220px;
  overflow: hidden;
}

.quotation-error-banner {
  margin: 10px 14px 0;
  border: 1px solid color-mix(in srgb, var(--lc-negative, #c10015) 22%, transparent);
  background: color-mix(in srgb, var(--lc-negative, #c10015) 8%, var(--lc-surface, #fff));
}

.quotation-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 58px 16px 18px;
  overflow: hidden;
  background: var(--lc-surface, #fff);
  animation: quotation-fade-in 120ms ease both;
}

.quotation-loading-status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.quotation-skeleton-row {
  display: grid;
  align-items: center;
  gap: 12px;
  min-height: 32px;
  animation: quotation-fade-in 120ms ease both;
}

.quotation-table-section {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
}

.quotation-data-table {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.quotation-data-table :deep(.q-table__middle) {
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.quotation-data-table :deep(.quotation-sticky-column) {
  position: sticky;
  inset-inline-end: 0;
  z-index: 4;
  min-width: 72px;
  box-shadow: 0 0 0 1px var(--lc-outline-variant, #e5e7eb);
}

.quotation-data-table :deep(thead tr th.quotation-sticky-column) {
  z-index: 5;
}

.quotation-data-table :deep(tbody tr td.quotation-sticky-column) {
  background: var(--lc-surface, #fff);
}

.quotation-data-table :deep(tbody tr:nth-child(even) td.quotation-sticky-column) {
  background: var(--lc-surface-container-lowest, #fff);
}

.quotation-data-table :deep(tbody tr:hover td.quotation-sticky-column) {
  background: color-mix(in srgb, var(--lc-primary, #1565c0) 7%, transparent) !important;
}

.quotation-data-table :deep(.quotation-column-start) {
  text-align: start !important;
}

.quotation-data-table :deep(.quotation-column-end) {
  text-align: end !important;
}

.quotation-data-table :deep(tbody td) {
  min-height: 46px;
}

.quotation-customer {
  font-weight: 600;
}

.quotation-money {
  color: var(--lc-primary, #1565c0);
  font-weight: 700;
  white-space: nowrap;
}

.quotation-status {
  min-width: 62px;
  justify-content: center;
  padding: 4px 9px;
  border-radius: 999px;
}

.quotation-actions {
  white-space: nowrap;
}

.quotation-empty {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--lc-on-surface-variant, #6b7280);
}

.quotation-dialog-card {
  width: min(400px, calc(100vw - 24px));
  min-width: 0;
  max-width: 100%;
}

.quotation-dialog-actions {
  justify-content: flex-end;
  gap: 8px;
}

.quotation-summary-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 8px 16px;
  min-height: 42px;
  padding: 8px 14px;
  border-top: 1px solid var(--lc-outline-variant, #e5e7eb);
  background: color-mix(in srgb, var(--lc-surface-container, #f7f8fa) 72%, var(--lc-surface, #fff));
}

.quotation-summary-bar__item {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: var(--lc-on-surface-variant, #6b7280);
  font-size: 0.8rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quotation-summary-bar__item .q-icon {
  flex: 0 0 auto;
  color: var(--lc-primary, #1565c0);
}

.quotation-summary-bar__item--total strong {
  color: var(--lc-primary, #1565c0);
  font-size: 0.84rem;
}

.quotation-summary-bar__item--period {
  justify-content: flex-end;
}

.quotations-page--compact .quotation-summary-bar {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.quotations-page--compact .quotation-summary-bar__item--period {
  grid-column: 1 / -1;
  justify-content: flex-start;
}

.quotation-footer {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 0;
  border-top: 1px solid var(--lc-outline-variant, #e5e7eb);
  background: var(--lc-surface-container, #f7f8fa);
}

.quotations-page--narrow .quotation-header,
.quotations-page--narrow .quotation-toolbar {
  flex-wrap: wrap;
}

.quotations-page--narrow .quotation-toolbar__spacer {
  display: none;
}

.quotations-page--narrow .quotation-search {
  flex: 1 1 220px;
  width: auto;
  min-width: 220px;
  max-width: 330px;
}

.quotations-page--compact .quotation-search {
  flex: 0 0 100%;
  width: 100%;
  max-width: none;
}

.quotations-page--compact {
  padding: 8px !important;
}

.quotations-page--compact .quotation-header {
  padding: 8px 10px;
}

.quotations-page--compact .quotation-header__icon {
  width: 32px;
  height: 32px;
}

.quotations-page--compact .quotation-header__title {
  font-size: 0.95rem;
}

.quotations-page--compact .quotation-add-btn :deep(.q-btn__content span) {
  display: none;
}

.quotations-page--compact .quotation-toolbar {
  padding: 8px 10px;
}

.quotations-page--compact .quotation-date-input {
  flex: 1 1 calc(50% - 4px);
  width: auto;
  min-width: 0;
}

.quotations-page--compact .quotation-date-separator {
  display: none;
}

@keyframes quotation-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quotation-loading-overlay,
  .quotation-skeleton-row {
    animation: none;
  }

  .quotation-loading-overlay :deep(.q-skeleton) {
    animation: none;
  }
}
</style>
