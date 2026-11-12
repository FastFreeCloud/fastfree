<template>
  <div class="diagnostic-logs-drawer">
    <!-- Log Filter Toolbar -->
    <div class="logs-toolbar">
      <div class="filter-pills-row">
        <button
          class="pill-btn"
          :class="{ active: logsFilter === 'all' }"
          @click="logsFilter = 'all'"
        >
          {{ isRtl ? 'الكل' : 'All' }} ({{ diagnosticLogs.length }})
        </button>
        <button
          class="pill-btn pill-btn-err"
          :class="{ active: logsFilter === 'error' }"
          @click="logsFilter = 'error'"
        >
          {{ isRtl ? 'الأخطاء' : 'Errors' }} ({{ totalErrors }})
        </button>
        <button
          class="pill-btn pill-btn-warn"
          :class="{ active: logsFilter === 'warn' }"
          @click="logsFilter = 'warn'"
        >
          {{ isRtl ? 'التحذيرات' : 'Warnings' }} ({{ totalWarnings }})
        </button>
        <button
          class="pill-btn pill-btn-info"
          :class="{ active: logsFilter === 'info' }"
          @click="logsFilter = 'info'"
        >
          {{ isRtl ? 'المعلومات' : 'Info' }}
        </button>
      </div>

      <div class="toolbar-right">
        <div class="search-input-wrap">
          <input
            v-model="logsSearchQuery"
            type="text"
            class="search-box-input"
            :placeholder="isRtl ? 'بحث في السجلات والأكواد...' : 'Search logs, keywords, errors...'"
          />
          <button v-if="logsSearchQuery" class="btn-clear-search" @click="logsSearchQuery = ''">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-svg">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Auto-follow toggle: keeps the stream pinned to the newest entry -->
        <button
          type="button"
          class="pill-btn btn-follow"
          :class="{ active: autoFollow }"
          :title="isRtl ? 'إبقاء أحدث سجل أمام العين' : 'Keep pinned to the newest entry'"
          @click="autoFollow = !autoFollow"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-svg">
            <path :d="autoFollow ? 'M17 1l4 4-4 4' : 'M15 1l4 4-4 4'"></path>
            <path :d="autoFollow ? 'M21 5H8a5 5 0 0 0-5 5' : 'M19 5H6a5 5 0 0 0-5 5'"></path>
            <path :d="autoFollow ? 'M7 23l-4-4 4-4' : 'M9 23l-4-4 4-4'"></path>
            <path :d="autoFollow ? 'M3 19h13a5 5 0 0 0 5-5' : 'M5 19h13a5 5 0 0 0 5-5'"></path>
          </svg>
          <span>{{ isRtl ? 'متابعة حية' : 'Follow' }}</span>
        </button>

        <!-- Clear the diagnostic stream (with no-logs feedback) -->
        <button
          type="button"
          class="pill-btn btn-clear-logs"
          :class="{ 'is-clearing': isClearing }"
          :disabled="isClearing || diagnosticLogs.length === 0"
          :title="isRtl ? 'مسح السجلات المعروضة' : 'Clear the diagnostic stream'"
          @click="clearStream"
        >
          <span v-if="isClearing" class="spinner-tiny"></span>
          <svg aria-hidden="true" v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-svg">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          <span>{{ isClearing ? (isRtl ? 'جارٍ المسح...' : 'Clearing...') : (isRtl ? 'مسح' : 'Clear') }}</span>
        </button>
      </div>
    </div>

    <!-- Visible-out-of-total counter line -->
    <div class="stream-count-line font-mono" dir="ltr">
      <span>
        {{ isRtl ? `عرض ${renderedLogs.length} من ${diagnosticLogs.length} مدخل` : `Showing ${renderedLogs.length} of ${diagnosticLogs.length} entries` }}
        <template v-if="logsSearchQuery || logsFilter !== 'all'">
          · {{ filteredLogs.length }} {{ isRtl ? 'مطابق' : 'matched' }}
        </template>
      </span>
      <span v-if="autoFollow" class="follow-hint">◉ {{ isRtl ? 'متابعة تلقائية' : 'auto-follow' }}</span>
    </div>

    <!-- Logs Stream Container -->
    <div ref="streamRef" class="logs-stream-container font-mono" dir="ltr">
      <div v-if="filteredLogs.length === 0" class="no-logs-empty">
        <p>{{ isRtl ? 'لم يتم العثور على سجلات تطابق الفلتر الحالي.' : 'No diagnostic entries match the current filter.' }}</p>
      </div>

      <div
        v-for="entry in renderedLogs"
        :key="entry.id"
        class="log-stream-entry"
        :class="`entry-${entry.level}`"
      >
        <div class="entry-meta-bar">
          <span class="entry-time">{{ entry.timeFormatted }}</span>
          <span class="entry-badge" :class="`lvl-${entry.level}`">{{ entry.level.toUpperCase() }}</span>
          <span class="entry-source">[{{ entry.source }}]</span>
          <span v-if="(entry.count || 1) > 1" class="entry-repeat">x{{ entry.count }}</span>
        </div>
        <div class="entry-msg-line">{{ entry.message }}</div>
        <div v-if="entry.details" class="entry-details-block">{{ entry.details }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useDiagnosticAudit } from '../../composables/useDiagnosticAudit';
import { diagnosticLogs, totalErrors, totalWarnings, clearDiagnosticLogs, logInfo } from '../../composables/useDiagnostics';

const { isRtl, logsFilter, logsSearchQuery, filteredLogs } = useDiagnosticAudit();

const RENDER_CAP = 300;

/**
 * Render budget: at most the newest RENDER_CAP entries are mounted at once
 * (mirrors MAX_DIAGNOSTIC_LOGS trimming) so long sessions never choke the DOM.
 */
const renderedLogs = computed(() => filteredLogs.value.slice(0, RENDER_CAP));

const autoFollow = ref(true);
const streamRef = ref<HTMLDivElement | null>(null);

async function followStream() {
  if (!autoFollow.value || !streamRef.value) return;
  await nextTick();
  // diagnosticLogs is newest-first (unshift), so "follow" pins the top edge.
  streamRef.value.scrollTo({ top: 0, behavior: 'smooth' });
}watch(() => filteredLogs.value.length, () => {
  followStream();
});

// Also re-follow when the user re-engages the toggle or changes the filter.
watch(autoFollow, () => followStream());
watch([logsFilter, logsSearchQuery], () => followStream());

const isClearing = ref(false);
async function clearStream() {
  if (isClearing.value || diagnosticLogs.value.length === 0) return;
  isClearing.value = true;
  try {
    await nextTick();
    clearDiagnosticLogs();
    logInfo('Logs', isRtl.value ? 'تم مسح عرض السجلات.' : 'Diagnostic stream cleared by user.');
    logsFilter.value = 'all';
    logsSearchQuery.value = '';
  } finally {
    isClearing.value = false;
  }
}
</script>
