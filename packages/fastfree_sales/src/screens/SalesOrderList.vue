<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-cart-check" size="2rem" color="primary" />
        <span class="text-h6">{{ t('sales.salesOrders') }}</span>
        <q-space />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="filteredOrders"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          :filter="search"
          v-model:pagination="pagination"
          :grid="$q.screen.lt.sm"
          :hide-header="$q.screen.lt.sm"
          flat
          @resize="onTableWidthChange"
        >
          <template #top-right>
            <div class="row items-center q-gutter-sm">
              <q-btn
                flat
                dense
                icon="mdi-printer"
                size="sm"
                :aria-label="t('common.print')"
                @click="handlePrint"
              >
                <q-tooltip>{{ t('common.print') }}</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                icon="mdi-file-excel"
                size="sm"
                :aria-label="t('common.export')"
                @click="handleExport"
              >
                <q-tooltip>{{ t('common.export') }}</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="refresh"
                size="sm"
                :aria-label="t('common.refresh')"
                @click="handleRefresh"
              />
              <q-input
                v-model="search"
                :placeholder="t('common.search')"
                dense
                outlined
                clearable
                style="width: 200px"
              >
                <template #prepend><q-icon name="mdi-magnify" /></template>
              </q-input>
            </div>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="statusColor(props.row.status)"
                :label="translateStatus(props.row.status)"
              />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                v-if="props.row.docstatus === 0"
                flat
                round
                icon="mdi-check"
                size="sm"
                color="positive"
                :aria-label="t('common.submit')"
                @click="submitOrder(props.row)"
              />
              <q-btn
                v-if="props.row.docstatus === 1"
                flat
                round
                icon="mdi-close"
                size="sm"
                color="negative"
                :aria-label="t('common.cancel')"
                @click="cancelOrder(props.row)"
              />
              <q-btn
                v-if="props.row.docstatus === 0"
                flat
                round
                icon="mdi-delete"
                size="sm"
                color="negative"
                :aria-label="t('common.delete')"
                @click="deleteOrder(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>

      <DataTableBottom
        :page="pagination.page"
        :rows-per-page="pagination.rowsPerPage"
        :rows-number="filteredOrders.length"
        :width="tableWidth"
        :summary-label="bottomSummary"
        :total-label="bottomTotal"
        :show-summary="true"
        :show-total="true"
        @update:rowsPerPage="pagination.rowsPerPage = $event"
        @prev-page="pagination.page > 1 && (pagination.page -= 1)"
        @next-page="pagination.page < pagesNumber && (pagination.page += 1)"
      >
        <template #left>
          <q-btn
            color="primary"
            icon="mdi-printer"
            :label="$q.screen.width > 500 ? t('common.print') : ''"
            :round="$q.screen.width <= 500"
            dense
            no-caps
            @click="handlePrint"
            :aria-label="t('common.print')"
          />
        </template>
        <template #right>
          <q-btn
            color="positive"
            icon="mdi-file-excel"
            :label="$q.screen.width > 500 ? t('common.export') : ''"
            :round="$q.screen.width <= 500"
            dense
            no-caps
            @click="handleExport"
            :aria-label="t('common.export')"
          />
        </template>
      </DataTableBottom>
    </q-card>

    <q-dialog v-model="confirmSubmit">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-check-circle" color="positive" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.submit') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.submitSalesOrderConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="positive" :label="t('common.submit')" @click="confirmSubmitOrder" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmCancel">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-close-circle" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.cancel') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.cancelSalesOrderConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.confirm')" @click="confirmCancelOrder" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('sales.deleteSalesOrderConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteOrder" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import {
  useFormatNumber,
  useStatusHelpers,
} from 'quasar-app-extension-fastfree-lowcode/src/runtime'
import {
  usePrint,
  type PrintColumn,
} from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/usePrint'
import {
  useExcelExport,
  type ExcelColumn,
} from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useExcelExport'
import { useSalesStore } from '../stores/useSalesStore'
import {
  submitSalesOrder as apiSubmitSalesOrder,
  cancelSalesOrder as apiCancelSalesOrder,
  deleteSalesOrder as apiDeleteSalesOrder,
} from '../services/salesOrder.service'
import type { SalesOrder } from '../types'
import { DataTableBottom } from 'quasar-app-extension-fastfree-lowcode'

const { t } = useLcI18n()
const store = useSalesStore()
const $q = useQuasar()
const { formatNumber } = useFormatNumber()
const { translateStatus, statusColor } = useStatusHelpers('sales')
const { printTable } = usePrint()
const { exportTable } = useExcelExport()

const search = ref('')
const tableWidth = ref(800)
const pagination = ref({
  page: 1,
  rowsPerPage: 20,
  sortBy: 'transaction_date',
  descending: true,
})

const confirmSubmit = ref(false)
const submitTarget = ref('')
const confirmCancel = ref(false)
const cancelTarget = ref('')
const confirmDelete = ref(false)
const deleteTarget = ref('')

const columns = computed(() => [
  { name: 'name', label: t('sales.salesOrder'), field: 'name', sortable: true },
  {
    name: 'customer_name',
    label: t('sales.customerName'),
    field: (row: SalesOrder) => row.customer_name ?? row.customer ?? '',
    sortable: true,
  },
  { name: 'transaction_date', label: t('common.date'), field: 'transaction_date', sortable: true },
  {
    name: 'grand_total',
    label: t('sales.grandTotal'),
    field: 'grand_total',
    sortable: true,
    format: (v: number) => formatNumber(v),
  },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

const filteredOrders = computed(() => {
  const term = (search.value ?? '').trim().toLowerCase()
  if (term === '') return store.salesOrders
  return store.salesOrders.filter((row: SalesOrder) => {
    const haystack = [
      row.name,
      row.customer,
      row.customer_name,
      row.transaction_date,
      row.delivery_date,
      row.status,
    ]
      .map((value: string | undefined) => (value ?? '').toLowerCase())
      .join(' ')
    return haystack.includes(term)
  })
})

const exportColumns = computed(() =>
  columns.value
    .filter((c) => c.name !== 'actions')
    .map((c) =>
      c.name === 'status'
        ? {
            ...c,
            format: (v: unknown) =>
              translateStatus(typeof v === 'string' || typeof v === 'number' ? String(v) : ''),
          }
        : c,
    ),
)

const pagesNumber = computed(
  () => Math.ceil(filteredOrders.value.length / pagination.value.rowsPerPage) || 1,
)
const bottomSummary = computed(() => `${filteredOrders.value.length} ${t('sales.salesOrders')}`)
const bottomTotal = computed(() =>
  formatNumber(filteredOrders.value.reduce((s, o) => s + (o.grand_total ?? 0), 0)),
)

function handlePrint() {
  printTable({
    title: t('sales.salesOrders'),
    columns: exportColumns.value as unknown as PrintColumn[],
    rows: filteredOrders.value as unknown as Record<string, unknown>[],
    total: { label: t('sales.total'), value: filteredOrders.value.length },
  })
}

async function handleExport() {
  await exportTable({
    filename: 'sales-orders',
    title: t('sales.salesOrders'),
    columns: exportColumns.value as unknown as ExcelColumn[],
    rows: filteredOrders.value as unknown as Record<string, unknown>[],
    total: { label: t('sales.total'), value: filteredOrders.value.length },
  })
}

async function handleRefresh() {
  await loadOrders()
}

function onTableWidthChange(width: number) {
  tableWidth.value = width
}

async function loadOrders(): Promise<void> {
  try {
    await store.fetchSalesOrders()
    if (store.error !== null) {
      $q.notify({ type: 'negative', message: store.error })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function submitOrder(order: SalesOrder) {
  submitTarget.value = order.name
  confirmSubmit.value = true
}

async function confirmSubmitOrder(): Promise<void> {
  const name = submitTarget.value
  confirmSubmit.value = false
  try {
    const result = await apiSubmitSalesOrder(name)
    if (!result.success) {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
      return
    }
    $q.notify({ type: 'positive', message: t('sales.salesOrderSubmitted') })
    await loadOrders()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function cancelOrder(order: SalesOrder) {
  cancelTarget.value = order.name
  confirmCancel.value = true
}

async function confirmCancelOrder(): Promise<void> {
  const name = cancelTarget.value
  confirmCancel.value = false
  try {
    const result = await apiCancelSalesOrder(name)
    if (!result.success) {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
      return
    }
    $q.notify({ type: 'positive', message: t('sales.salesOrderCancelled') })
    await loadOrders()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function deleteOrder(order: SalesOrder) {
  deleteTarget.value = order.name
  confirmDelete.value = true
}

async function confirmDeleteOrder(): Promise<void> {
  const name = deleteTarget.value
  confirmDelete.value = false
  try {
    const result = await apiDeleteSalesOrder(name)
    if (!result.success) {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
      return
    }
    $q.notify({ type: 'positive', message: t('sales.salesOrderDeleted') })
    await loadOrders()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => {
  void loadOrders()
})
</script>
