<template>
  <div v-if="report && report.items" class="step-items-list">
    <div
      v-for="item in report.items"
      :key="item.step_id"
      class="step-item-card"
      :class="`border-${item.status}`"
    >
      <div class="item-header-row">
        <div class="step-num-title">
          <span class="step-badge-num font-mono">{{ item.step_number }}</span>
          <span class="step-badge-name">{{ isRtl ? item.title_ar : item.title_en }}</span>
        </div>
        <div class="status-indicator-tag" :class="`tag-${item.status}`">
          <svg v-if="item.status === 'pass'" class="tag-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <svg v-else-if="item.status === 'warn'" class="tag-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          </svg>
          <svg v-else class="tag-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>
            {{
              item.status === 'pass'
                ? (isRtl ? 'ناجح' : 'PASSED')
                : item.status === 'warn'
                ? (isRtl ? 'تنبيه' : 'WARNING')
                : (isRtl ? 'مطلوب إجراء' : 'ACTION REQUIRED')
            }}
          </span>
        </div>
      </div>

      <div class="item-body-row">
        <p class="item-msg-text">{{ isRtl ? item.message_ar : item.message_en }}</p>
      </div>

      <div v-if="item.details" class="item-telemetry-box font-mono">
        <span class="telem-lbl">{{ isRtl ? 'البيانات الفنية:' : 'Telemetry:' }}</span>
        <span class="telem-val">{{ item.details }}</span>
      </div>

      <div class="item-actions-row">
        <button class="btn-jump-step" @click="$emit('jump', item.step_number)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-svg">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          <span>{{ isRtl ? `فتح الخطوة ${item.step_number}` : `Open Step ${item.step_number}` }}</span>
        </button>

        <button
          v-if="item.can_auto_fix && item.status !== 'pass'"
          class="btn-item-autofix"
          :disabled="isAutoFixing"
          @click="handleSingleFix(item)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-svg">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
          <span>{{ isRtl ? 'إصلاح المشكلة الآن' : 'Auto-Fix Now' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDiagnosticAudit } from '../../composables/useDiagnosticAudit';

defineEmits<{
  (e: 'jump', stepNumber: number): void;
}>();

const { isRtl, report, isAutoFixing, handleSingleFix } = useDiagnosticAudit();
</script>
