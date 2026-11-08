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
    </div>

    <!-- Logs Stream Container -->
    <div class="logs-stream-container font-mono" dir="ltr">
      <div v-if="filteredLogs.length === 0" class="no-logs-empty">
        <p>{{ isRtl ? 'لم يتم العثور على سجلات تطابق الفلتر الحالي.' : 'No diagnostic entries match the current filter.' }}</p>
      </div>

      <div
        v-for="entry in filteredLogs"
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
import { useDiagnosticAudit } from '../../composables/useDiagnosticAudit';
import { diagnosticLogs, totalErrors, totalWarnings } from '../../composables/useDiagnostics';

const { isRtl, logsFilter, logsSearchQuery, filteredLogs } = useDiagnosticAudit();
</script>
