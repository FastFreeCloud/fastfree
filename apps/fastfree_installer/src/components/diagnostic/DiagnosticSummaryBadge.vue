<template>
  <div v-if="report" class="overall-summary-card" :class="`summary-${report.overall_status}`">
    <div class="summary-icon-box">
      <svg v-if="report.overall_status === 'healthy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <svg v-else-if="report.overall_status === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    </div>
    <div class="summary-text-box">
      <h4>
        {{
          report.overall_status === 'healthy'
            ? (isRtl ? 'جميع الخطوات مكتملة بنجاح والنظام جاهز 100%' : 'All 6 Steps Verified & System 100% Healthy')
            : report.overall_status === 'warning'
            ? (isRtl ? 'المنظومة تعمل مع وجود ملاحظات غير معطلة' : 'System Operational with Non-Blocking Warnings')
            : (isRtl ? 'تنبيه: تم اكتشاف مشاكل تتطلب الإصلاح' : 'Action Required: Issues Detected in Node Environment')
        }}
      </h4>
      <p>
        {{
          report.overall_status === 'healthy'
            ? (isRtl ? 'تم التحقق من بيئة Hyper-V والترخيص والقرص والشبكة بنجاح.' : 'Hyper-V environment, licensing, storage, and network topology are fully verified.')
            : (isRtl ? 'اضغط على "إصلاح كافة المشاكل تلقائياً" لحل المشاكل وتنزيل صورة NixOS الصحيحة.' : 'Click "Auto-Fix All Issues" to repair the storage, network, and bootable image automatically.')
        }}
      </p>
    </div>
    <div class="summary-counts font-mono">
      <span class="count-pill pass-pill">{{ report.total_passed }} {{ isRtl ? 'ناجح' : 'Passed' }}</span>
      <span v-if="report.total_warnings > 0" class="count-pill warn-pill">{{ report.total_warnings }} {{ isRtl ? 'تنبيه' : 'Warn' }}</span>
      <span v-if="report.total_errors > 0" class="count-pill err-pill">{{ report.total_errors }} {{ isRtl ? 'مطلوب إجراء' : 'Action' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDiagnosticAudit } from '../../composables/useDiagnosticAudit';

const { isRtl, report } = useDiagnosticAudit();
</script>
