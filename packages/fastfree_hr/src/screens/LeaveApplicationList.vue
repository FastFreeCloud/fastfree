<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-calendar-minus" size="2rem" color="primary" />
        <span class="text-h6">{{ t('hr.leave') }}</span>
        <q-space />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="store.fetchLeaveApplications" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.leaveApplications"
          :columns="columns"
          row-key="name"
          :loading="store.loading"
          :filter="search"
          flat
        >
          <template #top-right>
            <q-input v-model="search" :placeholder="t('common.search')" dense outlined clearable style="width: 200px">
              <template #prepend><q-icon name="mdi-magnify" /></template>
            </q-input>
          </template>
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.row.status)" :label="translateStatus(props.row.status)" />
            </q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                v-if="props.row.status === 'Open' || props.row.status === 'Draft'"
                flat round icon="mdi-check"
                size="sm" color="positive"
                :aria-label="t('common.submit')"
                @click="submitLeave(props.row)"
              />
              <q-btn
                v-if="props.row.status === 'Submitted'"
                flat round icon="mdi-close"
                size="sm" color="negative"
                :aria-label="t('common.cancel')"
                @click="cancelLeave(props.row)"
              />
              <q-btn
                v-if="props.row.status === 'Open' || props.row.status === 'Draft'"
                flat round icon="mdi-delete"
                size="sm" color="negative"
                :aria-label="t('common.delete')"
                @click="deleteLeave(props.row)"
              />
            </q-td>
          </template>
          <template #no-data>
            <q-td :props="{ colSpan: columns.length }" class="text-center">
              {{ t('common.noData') }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <q-dialog v-model="confirmSubmit">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-check-circle" color="positive" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.submit') }}</span>
        </q-card-section>
        <q-card-section>{{ t('hr.submitLeaveConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="positive" :label="t('common.submit')" @click="confirmSubmitLeave" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmCancel">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-close-circle" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.cancel') }}</span>
        </q-card-section>
        <q-card-section>{{ t('hr.cancelLeaveConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.cancel')" @click="confirmCancelLeave" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="confirmDelete">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-delete" color="negative" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('common.confirmDelete') }}</span>
        </q-card-section>
        <q-card-section>{{ t('hr.deleteLeaveConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat color="negative" :label="t('common.delete')" @click="confirmDeleteLeave" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useStatusHelpers } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers'
import { useHrStore } from '../stores/useHrStore'
import {
  submitLeaveApplication as apiSubmitLeaveApplication,
  cancelLeaveApplication as apiCancelLeaveApplication,
  deleteLeaveApplication as apiDeleteLeaveApplication,
} from '../services/leaveApplication.service'
import type { LeaveApplication } from '../types'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useHrStore()
const { translateStatus, statusColor } = useStatusHelpers('hr')

const search = ref('')
const confirmSubmit = ref(false)
const submitTarget = ref<string | null>(null)
const confirmCancel = ref(false)
const cancelTarget = ref<string | null>(null)
const confirmDelete = ref(false)
const deleteTarget = ref<string | null>(null)

const columns = computed(() => [
  { name: 'employee_name', label: t('hr.employeeName'), field: 'employee_name', sortable: true },
  { name: 'from_date', label: t('hr.fromDate'), field: 'from_date', sortable: true },
  { name: 'to_date', label: t('hr.toDate'), field: 'to_date', sortable: true },
  { name: 'total_days', label: t('hr.totalDays'), field: 'total_days', sortable: true },
  { name: 'leave_type', label: t('hr.leaveType'), field: 'leave_type' },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'actions', label: t('common.actions'), field: 'actions' },
])

function submitLeave(leave: LeaveApplication) {
  submitTarget.value = leave.name
  confirmSubmit.value = true
}

async function confirmSubmitLeave() {
  const name = submitTarget.value
  if (!name) return
  confirmSubmit.value = false
  try {
    const result = await apiSubmitLeaveApplication(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('hr.leaveSubmitted') })
      await store.fetchLeaveApplications()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function cancelLeave(leave: LeaveApplication) {
  cancelTarget.value = leave.name
  confirmCancel.value = true
}

async function confirmCancelLeave() {
  const name = cancelTarget.value
  if (!name) return
  confirmCancel.value = false
  try {
    const result = await apiCancelLeaveApplication(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('hr.leaveCancelled') })
      await store.fetchLeaveApplications()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function deleteLeave(leave: LeaveApplication) {
  deleteTarget.value = leave.name
  confirmDelete.value = true
}

async function confirmDeleteLeave() {
  const name = deleteTarget.value
  if (!name) return
  confirmDelete.value = false
  try {
    const result = await apiDeleteLeaveApplication(name)
    if (result.success) {
      $q.notify({ type: 'positive', message: t('hr.leaveDeleted') })
      await store.fetchLeaveApplications()
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

onMounted(() => store.fetchLeaveApplications())
</script>
