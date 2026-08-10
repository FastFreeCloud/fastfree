<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-icon name="mdi-calendar-check" size="2rem" color="primary" />
        <span class="text-h6">{{ t('hr.attendance') }}</span>
        <q-space />
        <q-btn flat round icon="mdi-refresh" :aria-label="t('common.refresh')" @click="() => store.fetchAttendance()" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="store.attendance"
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
          <template #no-data>
            <q-td :props="{ colSpan: columns.length }" class="text-center">
              {{ t('common.noData') }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useStatusHelpers } from 'quasar-app-extension-fastfree-lowcode/src/runtime/composables/useStatusHelpers'
import { useHrStore } from '../stores/useHrStore'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useHrStore()
const { translateStatus, statusColor } = useStatusHelpers('hr')

const search = ref('')

const columns = computed(() => [
  { name: 'employee_name', label: t('hr.employeeName'), field: 'employee_name', sortable: true },
  { name: 'attendance_date', label: t('hr.attendanceDate'), field: 'attendance_date', sortable: true },
  { name: 'status', label: t('common.status'), field: 'status' },
  { name: 'in_time', label: t('hr.punchIn'), field: 'in_time' },
  { name: 'out_time', label: t('hr.punchOut'), field: 'out_time' },
  { name: 'hours', label: t('hr.hours'), field: 'hours' },
])

onMounted(() => store.fetchAttendance())
</script>
