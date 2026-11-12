<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card unified-hub-card" :class="{ 'is-rtl': isRtl, 'is-sdui-mode': activeTab === 'sdui' }">
      <!-- Hub Header -->
      <header class="hub-header">
        <div class="header-main-row">
          <div class="hub-icon-badge" :class="headerBadgeClass">
            <svg aria-hidden="true" class="hub-shield-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>

          <div class="hub-title-text">
            <div class="title-with-pill">
              <h3>{{ t('auto.unified_diagnostic_self_healing_hub') }}</h3>
              <span v-if="report" class="badge-status-top font-mono" :class="`top-${report.overall_status}`">
                {{
                  report.overall_status === 'healthy'
                    ? `${report.total_passed}/${report.total_passed + report.total_warnings + report.total_errors} ${isRtl ? 'خطوات ناجحة' : 'steps passed'}`
                    : report.overall_status === 'warning'
                    ? (t('auto.warnings'))
                    : (t('auto.action_required'))
                }}
              </span>
            </div>
            <p>{{ t('auto.comprehensive_step_verification_real_time_telemetry_logs_and_automated_self_healing') }}</p>
          </div>

          <button class="btn-close-hub" :title="t('auto.close')" :aria-label="t('auto.close')" @click="$emit('close')">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="close-svg">
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
            <svg aria-hidden="true" class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>{{ t('auto.step_audit_healing') }}</span>
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
            <svg aria-hidden="true" class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>{{ t('auto.live_forensic_logs') }}</span>
            <span class="tab-badge font-mono">{{ diagnosticLogs.length }}</span>
          </button>

          <button
            class="hub-tab-btn"
            :class="{ active: activeTab === 'telemetry' }"
            @click="activeTab = 'telemetry'"
          >
            <svg aria-hidden="true" class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            <span>{{ t('auto.host_hyper_v') }}</span>
          </button>

          <button
            class="hub-tab-btn hub-tab-sdui"
            :class="{ active: activeTab === 'sdui' }"
            @click="activeTab = 'sdui'"
          >
            <svg aria-hidden="true" class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>{{ isRtl ? 'محرر الشاشات الذكي' : 'SDUI Playground' }}</span>
            <span class="tab-badge tab-badge-sdui font-mono">LIVE</span>
          </button>
        </nav>
      </header>

      <!-- Active Auto-Fix Progress Banner (Visible whenever self-healing is running) -->
      <div v-if="isAutoFixing" class="hub-active-fix-banner">
        <div class="fix-header-line">
          <div class="fix-label-side">
            <span class="spinner-small-fix"></span>
            <span class="fix-title-text">{{ t('auto.executing_automated_self_healing_pipeline') }}</span>
          </div>
          <span class="fix-pct font-mono">{{ fixProgressPct }}%</span>
        </div>
        <div class="fix-progress-track">
          <div class="fix-progress-bar" :style="{ width: `${fixProgressPct}%` }"></div>
        </div>
        <div class="fix-phase-msg font-mono">
          {{ currentFixPhase || (t('auto.configuring_storage_and_hyper_v_services')) }}
        </div>
      </div>

      <!-- TAB 1: STEP AUDIT & HEALING -->
      <main v-if="activeTab === 'audit'" class="hub-tab-body">
        <!-- Loading State -->
        <div v-if="isLoadingAudit" class="hub-loading-state">
          <div class="spinner-large"></div>
          <h5>{{ t('auto.conducting_deep_diagnostic_audit') }}</h5>
          <p>{{ t('auto.auditing_hyper_v_vmms_vhdx_partition_validity_licenses_and_wireguard') }}</p>
        </div>

        <!-- Browser Preview Note (deep audit pipeline is desktop-only) -->
        <div v-else-if="auditUnavailable" class="hub-preview-note">
          <svg aria-hidden="true" class="status-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div class="err-text">
            <strong>{{ t('auto.browser_preview_mode') }}</strong>
            <span>{{ t('auto.deep_audit_and_self_healing_run_inside_the_desktop_window_only_local_runtime_logs_below_remain_copy_and_export_ready') }}</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="auditError" class="hub-error-banner">
          <svg aria-hidden="true" class="status-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="err-text">
            <strong>{{ t('auto.audit_failure') }}</strong>
            <span>{{ auditError }}</span>
          </div>
          <button class="btn-retry-audit" @click="runAudit">
            {{ t('auto.retry') }}
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

      <!-- TAB 4: SDUI PLAYGROUND -->
      <main v-else-if="activeTab === 'sdui'" class="hub-tab-body sdui-tab-body">
        <SduiPlayground />
      </main>


      <!-- Persistent Footer (Actions & Copy) -->
      <footer class="hub-footer">
        <div class="footer-left-group">
          <button
            type="button"
            class="btn-footer-action btn-refresh"
            :disabled="isLoadingAudit || isAutoFixing || browserPreviewMode"
            :title="browserPreviewMode ? (t('auto.available_inside_the_desktop_window_only')) : ''" :aria-label="browserPreviewMode ? (t('auto.available_inside_the_desktop_window_only')) : ''"
            @click="runAudit"
          >
            <svg aria-hidden="true" class="footer-btn-svg" :class="{ 'spin-anim': isLoadingAudit }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{{ t('auto.re_run_audit') }}</span>
          </button>

          <button
            type="button"
            class="btn-footer-action"
            @click="handleExportLogFile"
          >
            <svg aria-hidden="true" class="footer-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <span>{{ t('auto.export_log') }}</span>
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
            <svg aria-hidden="true" v-if="!copyNotice" class="footer-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg aria-hidden="true" v-else class="footer-btn-svg text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>
              {{
                copyNotice
                  ? (t('auto.report_copied_to_clipboard'))
                  : (t('auto.copy_full_diagnostic_bundle'))
              }}
            </span>
          </button>

          <!-- Master Auto-Fix All Issues Button -->
          <button
            v-if="report && report.total_errors > 0"
            type="button"
            class="btn-footer-action btn-master-fix"
            :disabled="isAutoFixing || isLoadingAudit || browserPreviewMode"
            :title="browserPreviewMode ? (t('auto.available_inside_the_desktop_window_only')) : ''"
            @click="handleAutoFixAll"
          >
            <span v-if="isAutoFixing" class="spinner-sm"></span>
            <svg aria-hidden="true" v-else class="footer-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>{{ isAutoFixing ? (t('auto.healing')) : (t('auto.auto_fix_all_issues')) }}</span>
          </button>

          <button type="button" class="btn-footer-action btn-close-action" @click="$emit('close')">
            {{ t('auto.close') }}
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
import { useI18n } from '../composables/useI18n';

import DiagnosticSummaryBadge from './diagnostic/DiagnosticSummaryBadge.vue';
import AuditStepCard from './diagnostic/AuditStepCard.vue';
import DiagnosticLogDrawer from './diagnostic/DiagnosticLogDrawer.vue';
import DiagnosticTelemetryGrid from './diagnostic/DiagnosticTelemetryGrid.vue';
import { SduiPlayground } from '@fastfree/lowcode/sdui';

interface Props {
  initialTab?: 'audit' | 'logs' | 'telemetry' | 'sdui';
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'audit',
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();
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

function handleJump(stepNum: number) {
  emit('close');
  navigateToStep(stepNum);
}

onMounted(() => {
  if (props.initialTab) {
    activeTab.value = props.initialTab;
  }
  setupEventListeners();
  runAudit();
});

onUnmounted(() => {
  cleanupEventListeners();
});
</script>

<style>
/* Global (unscoped): diagnostic-hub.css is shared by the hub shell AND its
   child components (AuditStepCard / LogDrawer / TelemetryGrid). Importing it
   inside <style scoped> would pin every selector to the hub's data-v scope,
   leaving the children served with UA-default styling (white buttons). */
@import '../assets/styles/diagnostic-hub.css';

/* SDUI Playground Expansion Styles in Diagnostic Hub */
.unified-hub-card.is-sdui-mode {
  max-width: 1280px !important;
  width: 96vw !important;
  height: 90vh !important;
  max-height: 90vh !important;
}

.sdui-tab-body {
  padding: 0 !important;
  height: 100%;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f172a;
}

.sdui-tab-body .sdui-playground {
  height: 100%;
  flex: 1;
}

.hub-tab-sdui {
  border-color: rgba(56, 189, 248, 0.35);
}

.tab-badge-sdui {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.5);
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
}
</style>
