<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card unified-hub-card" :class="{ 'is-rtl': isRtl }">
      <!-- Hub Header -->
      <header class="hub-header">
        <div class="header-main-row">
          <div class="hub-icon-badge" :class="headerBadgeClass">
            <svg class="hub-shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>

          <div class="hub-title-text">
            <div class="title-with-pill">
              <h3>{{ isRtl ? 'مركز التشخيص والتدقيق والإصلاح الموحد' : 'Unified Diagnostic & Self-Healing Hub' }}</h3>
              <span v-if="report" class="badge-status-top font-mono" :class="`top-${report.overall_status}`">
                {{
                  report.overall_status === 'healthy'
                    ? (isRtl ? 'نظام سليم 100%' : 'HEALTHY 100%')
                    : report.overall_status === 'warning'
                    ? (isRtl ? 'تنبيهات غير معطلة' : 'WARNINGS')
                    : (isRtl ? 'يلزم إجراء وإصلاح' : 'ACTION REQUIRED')
                }}
              </span>
            </div>
            <p>{{ isRtl ? 'فحص حي لكافة خطوات التثبيت، سجلات الأحداث الجنائية، وأدوات الإصلاح الذاتي الحتمي' : 'Comprehensive step verification, real-time telemetry logs, and automated self-healing' }}</p>
          </div>

          <button class="btn-close-hub" :title="isRtl ? 'إغلاق' : 'Close'" @click="$emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="close-svg">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Navigation Tabs (Audit vs Logs vs Telemetry) -->
        <nav class="hub-nav-tabs">
          <button
            class="hub-tab-btn"
            :class="{ active: activeTab === 'audit' }"
            @click="activeTab = 'audit'"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>{{ isRtl ? 'تدقيق الخطوات والإصلاح' : 'Step Audit & Healing' }}</span>
            <span v-if="report && report.total_errors > 0" class="tab-badge tab-badge-err">
              {{ report.total_errors }}
            </span>
            <span v-else-if="report && report.total_warnings > 0" class="tab-badge tab-badge-warn">
              {{ report.total_warnings }}
            </span>
          </button>

          <button
            class="hub-tab-btn"
            :class="{ active: activeTab === 'logs' }"
            @click="activeTab = 'logs'"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>{{ isRtl ? 'السجلات الجنائية الحية' : 'Live Forensic Logs' }}</span>
            <span class="tab-badge font-mono">{{ diagnosticLogs.length }}</span>
          </button>

          <button
            class="hub-tab-btn"
            :class="{ active: activeTab === 'telemetry' }"
            @click="activeTab = 'telemetry'"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            <span>{{ isRtl ? 'العتاد وبيئة Hyper-V' : 'Host & Hyper-V' }}</span>
          </button>
        </nav>
      </header>

      <!-- Active Auto-Fix Progress Banner (Visible whenever self-healing is running) -->
      <div v-if="isAutoFixing" class="hub-active-fix-banner">
        <div class="fix-header-line">
          <div class="fix-label-side">
            <span class="spinner-small-fix"></span>
            <span class="fix-title-text">{{ isRtl ? 'جارٍ تنفيذ الإصلاح الذاتي التلقائي للنظام...' : 'Executing automated self-healing pipeline...' }}</span>
          </div>
          <span class="fix-pct font-mono">{{ fixProgressPct }}%</span>
        </div>
        <div class="fix-progress-track">
          <div class="fix-progress-bar" :style="{ width: `${fixProgressPct}%` }"></div>
        </div>
        <div class="fix-phase-msg font-mono">
          {{ currentFixPhase || (isRtl ? 'تجهيز المكونات وإعادة ربط الأقراص والخدمات...' : 'Configuring storage and Hyper-V services...') }}
        </div>
      </div>

      <!-- TAB 1: STEP AUDIT & HEALING -->
      <main v-if="activeTab === 'audit'" class="hub-tab-body">
        <!-- Loading State -->
        <div v-if="isLoadingAudit" class="hub-loading-state">
          <div class="spinner-large"></div>
          <h5>{{ isRtl ? 'جارٍ استكشاف وفحص كافة الخطوات والمكونات...' : 'Conducting deep diagnostic audit...' }}</h5>
          <p>{{ isRtl ? 'فحص خدمات Hyper-V، الأقراص، التراخيص، وإعدادات الشبكة السيادية' : 'Auditing Hyper-V VMMS, VHDX partition validity, licenses, and WireGuard' }}</p>
        </div>

        <!-- Browser Preview Note (deep audit pipeline is desktop-only) -->
        <div v-else-if="auditUnavailable" class="hub-preview-note">
          <svg class="status-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div class="err-text">
            <strong>{{ isRtl ? 'وضع معاينة داخل المتصفح' : 'Browser preview mode' }}</strong>
            <span>{{ isRtl ? 'الفحص العميق وأدوات الإصلاح تعمل من نافذة سطح المكتب فقط. تبقى سجلات التشغيل المحلية هنا قابلة للنسخ والتصدير.' : 'Deep audit and self-healing run inside the desktop window only. Local runtime logs below remain copy- and export-ready.' }}</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="auditError" class="hub-error-banner">
          <svg class="status-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="err-text">
            <strong>{{ isRtl ? 'فشل فحص النظام:' : 'Audit failure:' }}</strong>
            <span>{{ auditError }}</span>
          </div>
          <button class="btn-retry-audit" @click="runAudit">
            {{ isRtl ? 'إعادة المحاولة' : 'Retry' }}
          </button>
        </div>

        <!-- Audit Report Cards -->
        <div v-else-if="report" class="audit-matrix-container">
          <DiagnosticSummaryBadge />
          <AuditStepCard @jump="handleJump" />
        </div>
      </main>

      <!-- TAB 2: LIVE FORENSIC LOGS -->
      <main v-else-if="activeTab === 'logs'" class="hub-tab-body">
        <DiagnosticLogDrawer />
      </main>

      <!-- TAB 3: HOST & HARDWARE TELEMETRY -->
      <main v-else-if="activeTab === 'telemetry'" class="hub-tab-body">
        <DiagnosticTelemetryGrid />
      </main>

      <!-- Persistent Footer (Actions & Copy) -->
      <footer class="hub-footer">
        <div class="footer-left-group">
          <button
            type="button"
            class="btn-footer-action btn-refresh"
            :disabled="isLoadingAudit || isAutoFixing || browserPreviewMode"
            :title="browserPreviewMode ? (isRtl ? 'متاحة داخل نافذة سطح المكتب فقط' : 'Available inside the desktop window only') : ''"
            @click="runAudit"
          >
            <svg class="footer-btn-svg" :class="{ 'spin-anim': isLoadingAudit }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{{ isRtl ? 'إعادة الفحص والتدقيق' : 'Re-Run Audit' }}</span>
          </button>

          <button
            type="button"
            class="btn-footer-action"
            @click="handleExportLogFile"
          >
            <svg class="footer-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <span>{{ isRtl ? 'تصدير .log' : 'Export .log' }}</span>
          </button>
        </div>

        <div class="footer-right-group">
          <!-- Copy Full Diagnostic Bundle Button -->
          <button
            type="button"
            class="btn-footer-action btn-copy-bundle"
            :class="{ 'btn-copied': copyNotice }"
            @click="handleCopyFullReport"
          >
            <svg v-if="!copyNotice" class="footer-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg v-else class="footer-btn-svg text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>
              {{
                copyNotice
                  ? (isRtl ? 'تم نسخ التقرير والأخطاء بالكامل!' : 'Report Copied to Clipboard!')
                  : (isRtl ? 'نسخ تقرير الفحص والأخطاء بالكامل' : 'Copy Full Diagnostic Bundle')
              }}
            </span>
          </button>

          <!-- Master Auto-Fix All Issues Button -->
          <button
            v-if="report && report.total_errors > 0"
            type="button"
            class="btn-footer-action btn-master-fix"
            :disabled="isAutoFixing || isLoadingAudit || browserPreviewMode"
            :title="browserPreviewMode ? (isRtl ? 'متاحة داخل نافذة سطح المكتب فقط' : 'Available inside the desktop window only') : ''"
            @click="handleAutoFixAll"
          >
            <span v-if="isAutoFixing" class="spinner-sm"></span>
            <svg v-else class="footer-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>{{ isAutoFixing ? (isRtl ? 'جارٍ الإصلاح...' : 'Healing...') : (isRtl ? 'إصلاح كافة المشاكل تلقائياً' : 'Auto-Fix All Issues') }}</span>
          </button>

          <button type="button" class="btn-footer-action btn-close-action" @click="$emit('close')">
            {{ isRtl ? 'إغلاق' : 'Close' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useDiagnosticAudit } from '../composables/useDiagnosticAudit';
import { diagnosticLogs } from '../composables/useDiagnostics';
import { navigateToStep } from '../composables/useDiscovery';

import DiagnosticSummaryBadge from './diagnostic/DiagnosticSummaryBadge.vue';
import AuditStepCard from './diagnostic/AuditStepCard.vue';
import DiagnosticLogDrawer from './diagnostic/DiagnosticLogDrawer.vue';
import DiagnosticTelemetryGrid from './diagnostic/DiagnosticTelemetryGrid.vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const props = withDefaults(
  defineProps<{
    initialTab?: 'audit' | 'logs' | 'telemetry';
  }>(),
  {
    initialTab: 'audit',
  }
);

const {
  isRtl,
  activeTab,
  isLoadingAudit,
  isAutoFixing,
  fixProgressPct,
  currentFixPhase,
  auditError,
  report,
  copyNotice,
  headerBadgeClass,
  auditUnavailable,
  browserPreviewMode,
  setupEventListeners,
  cleanupEventListeners,
  runAudit,
  handleAutoFixAll,
  handleCopyFullReport,
  handleExportLogFile,
} = useDiagnosticAudit();

if (props.initialTab) {
  activeTab.value = props.initialTab;
}

function handleJump(stepNum: number) {
  emit('close');
  navigateToStep(stepNum);
}

onMounted(() => {
  setupEventListeners();
  runAudit();
});

onUnmounted(() => {
  cleanupEventListeners();
});
</script>

<style scoped>
@import '../assets/styles/diagnostic-hub.css';
</style>
