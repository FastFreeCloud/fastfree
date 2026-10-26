<template>
  <div v-if="isDiagnosticOpen" class="diag-overlay" @click.self="isDiagnosticOpen = false">
    <div class="diag-hud-panel" :class="{ 'is-rtl': isRtl }">
      <!-- HUD Header -->
      <header class="hud-header">
        <div class="hud-title-wrap">
          <span class="hud-radar-dot"></span>
          <div class="hud-title-text">
            <h3>{{ t('diagnostics.title') }}</h3>
            <p>{{ t('diagnostics.subtitle') }}</p>
          </div>
        </div>

        <div class="hud-header-actions">
          <div class="count-badge count-errors" v-if="totalErrors > 0">
            <span>{{ totalErrors }}</span>
            <small>{{ t('diagnostics.errors') }}</small>
          </div>
          <div class="count-badge count-warns" v-if="totalWarnings > 0">
            <span>{{ totalWarnings }}</span>
            <small>{{ t('diagnostics.warnings') }}</small>
          </div>
          <button class="btn-close-hud" :title="t('diagnostics.close')" @click="isDiagnosticOpen = false">
            ✕
          </button>
        </div>
      </header>

      <!-- Filter & Search Toolbar -->
      <div class="hud-toolbar">
        <div class="filter-pills">
          <button
            class="pill-btn"
            :class="{ active: activeFilter === 'all' }"
            @click="activeFilter = 'all'"
          >
            {{ t('diagnostics.all') }} ({{ logs.length }})
          </button>
          <button
            class="pill-btn pill-error"
            :class="{ active: activeFilter === 'error' }"
            @click="activeFilter = 'error'"
          >
            {{ t('diagnostics.errors') }} ({{ totalErrors }})
          </button>
          <button
            class="pill-btn pill-warn"
            :class="{ active: activeFilter === 'warn' }"
            @click="activeFilter = 'warn'"
          >
            {{ t('diagnostics.warnings') }} ({{ totalWarnings }})
          </button>
          <button
            class="pill-btn pill-info"
            :class="{ active: activeFilter === 'info' }"
            @click="activeFilter = 'info'"
          >
            {{ t('diagnostics.info') }}
          </button>
        </div>

        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="t('diagnostics.searchPlaceholder')"
          />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">✕</button>
        </div>
      </div>

      <!-- Logs Stream View -->
      <div class="hud-log-stream">
        <div v-if="filteredLogs.length === 0" class="no-logs">
          <span>📡</span>
          <p>{{ t('diagnostics.noLogs') }}</p>
        </div>

        <div
          v-for="entry in filteredLogs"
          :key="entry.id"
          class="hud-log-row"
          :class="`level-${entry.level}`"
        >
          <div class="log-meta">
            <span class="log-time">{{ entry.timeFormatted }}</span>
            <span class="log-level-badge" :class="`badge-${entry.level}`">
              {{ entry.level.toUpperCase() }}
            </span>
            <span class="log-source">[{{ entry.source }}]</span>
          </div>

          <div class="log-content">
            <div class="log-main-msg">{{ entry.message }}</div>
            <div v-if="entry.details" class="log-details font-mono">
              {{ entry.details }}
            </div>
          </div>
        </div>
      </div>

      <!-- HUD Footer -->
      <footer class="hud-footer">
        <div class="footer-left">
          <span class="hud-status-indicator">
            <span class="status-pulse"></span>
            <span>Telemetry Stream Active</span>
          </span>
          <span v-if="copySuccessNotice" class="notice-pill-sm text-emerald">
            ✓ {{ t('diagnostics.logsCopied') }}
          </span>
        </div>

        <div class="footer-actions">
          <button class="hud-btn hud-btn-ghost" @click="handleClear">
            🗑 {{ t('diagnostics.clearLogs') }}
          </button>
          <button class="hud-btn" @click="handleOpenLog">
            📄 {{ t('diagnostics.openLogFile') }}
          </button>
          <button class="hud-btn hud-btn-primary" @click="handleCopy">
            📋 {{ t('diagnostics.copyLogs') }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  diagnosticLogs,
  isDiagnosticOpen,
  activeFilter,
  searchQuery,
  totalErrors,
  totalWarnings,
  clearDiagnosticLogs,
  copyDiagnosticLogs,
  openLogFile,
} from '../composables/useDiagnostics';
import { useI18n } from '../composables/useI18n';

const { t, isRtl } = useI18n();

const copySuccessNotice = ref(false);

const logs = diagnosticLogs;

const filteredLogs = computed(() => {
  return logs.value.filter(entry => {
    // Filter by level
    if (activeFilter.value !== 'all' && entry.level !== activeFilter.value) {
      return false;
    }
    // Filter by search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const text = `${entry.source} ${entry.message} ${entry.details || ''}`.toLowerCase();
      return text.includes(q);
    }
    return true;
  });
});

async function handleCopy() {
  const ok = await copyDiagnosticLogs();
  if (ok) {
    copySuccessNotice.value = true;
    setTimeout(() => {
      copySuccessNotice.value = false;
    }, 2500);
  }
}

function handleOpenLog() {
  openLogFile();
}

function handleClear() {
  clearDiagnosticLogs();
}
</script>

<style scoped>
.diag-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.diag-hud-panel {
  width: 100%;
  max-width: 860px;
  height: 85vh;
  max-height: 560px;
  background: var(--card-glass-bg, var(--bg-card, #18181B));
  border: 1px solid var(--border-color, #27272A);
  border-radius: var(--radius-hero, 16px);
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-main, #F4F4F5);
  animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(16px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.hud-header {
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-header, #121214);
  border-bottom: 1px solid var(--border-color, #27272A);
}

.hud-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-radar-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 10px #10B981;
}

.hud-title-text h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #F4F4F5);
}

.hud-title-text p {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: var(--text-muted, #A1A1AA);
}

.hud-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}

.count-errors {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #F87171;
}

.count-warns {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #FBBF24;
}

.btn-close-hud {
  background: transparent;
  border: none;
  color: var(--text-muted, #A1A1AA);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.btn-close-hud:hover {
  background: var(--border-color, #27272A);
  color: var(--text-main, #FFFFFF);
}

.hud-toolbar {
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--bg-sub, #141416);
  border-bottom: 1px solid var(--border-color, #27272A);
}

.filter-pills {
  display: flex;
  gap: 6px;
}

.pill-btn {
  background: var(--bg-card, #27272A);
  border: 1px solid var(--border-color, #3F3F46);
  color: var(--text-muted, #A1A1AA);
  padding: 4px 12px;
  border-radius: var(--radius-pill, 9999px);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.pill-btn:hover {
  color: var(--text-main, #FFFFFF);
  border-color: #52525B;
  transform: translateY(-1px);
}

.pill-btn.active {
  background: #1976D2;
  color: #FFFFFF;
  border-color: #38BDF8;
}

.pill-btn.pill-error.active {
  background: #DC2626;
  border-color: #EF4444;
}

.pill-btn.pill-warn.active {
  background: #D97706;
  border-color: #F59E0B;
}

.search-box {
  position: relative;
  width: 260px;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  padding-inline-end: 26px;
  background: var(--bg-card, #18181B);
  border: 1px solid var(--border-color, #27272A);
  border-radius: 6px;
  color: var(--text-main, #F4F4F5);
  font-size: 11px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #1976D2;
}

.clear-search {
  position: absolute;
  inset-inline-end: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted, #71717A);
  font-size: 11px;
  cursor: pointer;
}

.hud-log-stream {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-stream, #0F0F11);
}

.no-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted, #71717A);
  gap: 8px;
  font-size: 13px;
}

.hud-log-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border-radius: var(--radius-inner, 10px);
  background: var(--bg-card, #18181B);
  border-inline-start: 3px solid #3F3F46;
  border: 1px solid var(--border-color, #27272A);
  border-inline-start-width: 3px;
  font-size: 12px;
  transition: all 0.15s ease;
}

.hud-log-row:hover {
  background: var(--bg-hover, #202024);
}

.hud-log-row.level-info {
  border-inline-start-color: #38BDF8;
}

.hud-log-row.level-success {
  border-inline-start-color: #10B981;
}

.hud-log-row.level-warn {
  border-inline-start-color: #F59E0B;
  background: rgba(245, 158, 11, 0.05);
}

.hud-log-row.level-error {
  border-inline-start-color: #EF4444;
  background: rgba(239, 68, 68, 0.07);
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
}

.log-time {
  color: var(--text-muted, #71717A);
  font-family: monospace;
}

.log-level-badge {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.badge-info {
  background: rgba(56, 189, 248, 0.15);
  color: #38BDF8;
}

.badge-success {
  background: rgba(16, 185, 129, 0.15);
  color: #34D399;
}

.badge-warn {
  background: rgba(245, 158, 11, 0.15);
  color: #FBBF24;
}

.badge-error {
  background: rgba(239, 68, 68, 0.2);
  color: #F87171;
}

.log-source {
  color: var(--text-secondary, #A1A1AA);
  font-weight: 600;
}

.log-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.log-main-msg {
  color: var(--text-main, #F4F4F5);
  font-size: 12px;
  line-height: 1.4;
}

.log-details {
  font-size: 11px;
  color: var(--text-muted, #94A3B8);
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.hud-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-header, #121214);
  border-top: 1px solid var(--border-color, #27272A);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted, #A1A1AA);
}

.status-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.notice-pill-sm {
  font-size: 11px;
  font-weight: 600;
}

.text-emerald {
  color: #34D399;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.hud-btn {
  padding: 6px 14px;
  border-radius: var(--radius-inner, 10px);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border-color, #3F3F46);
  background: var(--bg-card, #27272A);
  color: var(--text-main, #F4F4F5);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.hud-btn:hover {
  background: #3F3F46;
  transform: translateY(-1px);
}

.hud-btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-muted, #A1A1AA);
}

.hud-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main, #FFFFFF);
}

.hud-btn-primary {
  background: #1976D2;
  border-color: #1976D2;
  color: #FFFFFF;
}

.hud-btn-primary:hover {
  background: #1565C0;
  border-color: #1565C0;
}
</style>
