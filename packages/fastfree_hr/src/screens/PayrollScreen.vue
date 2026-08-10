<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-cash-multiple" size="2rem" color="primary" />
        <span class="text-h6">{{ t('hr.payroll') }}</span>
        <q-space />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="loadData" />
        <q-btn color="primary" icon="mdi-cash-plus" :label="t('hr.processPayroll')" no-caps @click="openProcessPayroll" />
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-blue-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-blue">{{ formatNumber(summary.totalEmployees) }}</div>
                <div class="text-caption">{{ t('hr.totalEmployees') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-green-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-green">{{ formatNumber(summary.activeEmployees) }}</div>
                <div class="text-caption">{{ t('hr.activeEmployees') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-orange-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-orange">{{ formatNumber(summary.presentToday) }}</div>
                <div class="text-caption">{{ t('hr.presentToday') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-red-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-red">{{ formatNumber(summary.absentToday) }}</div>
                <div class="text-caption">{{ t('hr.absentToday') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-purple-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-purple">{{ formatNumber(summary.onLeaveToday) }}</div>
                <div class="text-caption">{{ t('hr.onLeaveToday') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-teal-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-teal">{{ formatNumber(summary.halfDayToday) }}</div>
                <div class="text-caption">{{ t('hr.halfDayToday') }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-amber-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-amber">{{ formatNumber(summary.pendingLeaves) }}</div>
                <div class="text-caption">{{ t('hr.pendingLeaves') }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="processDialog">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-avatar icon="mdi-cash-multiple" color="primary" text-color="white" />
          <span class="q-ml-sm text-h6">{{ t('hr.processPayroll') }}</span>
        </q-card-section>
        <q-card-section>{{ t('hr.processPayrollConfirm') }}</q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn color="primary" :label="t('hr.processPayroll')" :loading="processing" @click="confirmProcess" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useFormatNumber } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useFormatNumber'
import { useHrStore } from '../stores/useHrStore'
import { processPayroll as apiProcessPayroll } from '../services/payroll.service'
import { getAttendanceReport, getLeaveReport } from '../services/report.service'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useHrStore()
const { formatNumber } = useFormatNumber()

const companyName = ref('Default Company')
const payrollCostCenter = ref('Main')

const processDialog = ref(false)
const processing = ref(false)

const summary = ref({
  totalEmployees: 0,
  activeEmployees: 0,
  presentToday: 0,
  absentToday: 0,
  onLeaveToday: 0,
  halfDayToday: 0,
  pendingLeaves: 0,
})

async function loadData() {
  try {
    await Promise.all([
      store.fetchEmployees(),
      store.fetchAttendance(),
      store.fetchLeaveApplications(),
    ])
    computeSummary()
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  }
}

function computeSummary() {
  summary.value = {
    totalEmployees: store.employees.length,
    activeEmployees: store.employees.filter(e => e.status === 'Active').length,
    presentToday: store.attendance.filter(a => a.status === 'Present').length,
    absentToday: store.attendance.filter(a => a.status === 'Absent').length,
    onLeaveToday: store.attendance.filter(a => a.status === 'On Leave').length,
    halfDayToday: store.attendance.filter(a => a.status === 'Half Day').length,
    pendingLeaves: store.leaveApplications.filter(l => l.status === 'Open' || l.status === 'Submitted').length,
  }
}

function openProcessPayroll() {
  processDialog.value = true
}

async function confirmProcess() {
  processing.value = true
  try {
    const result = await apiProcessPayroll(companyName.value, new Date().toISOString().slice(0, 10), payrollCostCenter.value)
    if (result?.success) {
      $q.notify({ type: 'positive', message: t('hr.payrollProcessed') })
    } else {
      $q.notify({ type: 'negative', message: t('common.error') })
    }
    processDialog.value = false
  } catch {
    $q.notify({ type: 'negative', message: t('common.error') })
  } finally {
    processing.value = false
  }
}

onMounted(loadData)
</script>
