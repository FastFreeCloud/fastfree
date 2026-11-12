<template>
  <div v-if="isOpen" class="live-console-overlay" @click.self="$emit('close')">
    <div class="console-drawer" :class="{ 'is-rtl': isRtl }">
      <!-- Drawer Header -->
      <div class="drawer-header">
        <div class="drawer-title-wrap">
          <div class="live-pulse-dot"></div>
          <span class="drawer-title">
            {{ isRtl ? 'سجلات تشغيل العقدة الفورية (Hyper-V / NixOS Telemetry)' : 'Real-time Node Telemetry Console' }}
          </span>
          <span class="log-count-pill">{{ logs.length }} logs</span>
        </div>

        <div class="drawer-actions">
          <button class="btn-console-act" :title="isRtl ? 'مسح السجلات' : 'Clear'" :aria-label="isRtl ? 'مسح السجلات' : 'Clear'" @click="$emit('clear')">
            <svg aria-hidden="true" class="act-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>{{ isRtl ? 'مسح' : 'Clear' }}</span>
          </button>

          <button class="btn-console-act" :title="isRtl ? 'نسخ السجلات' : 'Copy All'" :aria-label="isRtl ? 'نسخ السجلات' : 'Copy All'" @click="handleCopy">
            <svg aria-hidden="true" class="act-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{{ copied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ' : 'Copy') }}</span>
          </button>

          <button class="btn-console-close" :title="isRtl ? 'إغلاق' : 'Close'" :aria-label="isRtl ? 'إغلاق' : 'Close'" @click="$emit('close')">
            ✕
          </button>
        </div>
      </div>

      <!-- Drawer Body Terminal Log Lines -->
      <div class="drawer-body font-mono">
        <div
          v-for="entry in logs"
          :key="entry.id"
          class="log-row"
          :class="`level-${entry.level}`"
        >
          <span class="log-time bidi-isolate" dir="ltr"><bdi>{{ entry.formattedTime }}</bdi></span>
          <span class="log-source bidi-isolate" :class="`source-${entry.source.toLowerCase()}`" dir="ltr">[<bdi>{{ entry.source }}</bdi>]</span>
          <span class="log-msg bidi-isolate"><bdi>{{ entry.message }}</bdi></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SystemLogEntry } from '../../domain/models/SystemLogEntry';

const props = defineProps<{
  isOpen: boolean;
  isRtl: boolean;
  logs: SystemLogEntry[];
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'clear'): void;
}>();

const copied = ref(false);

function handleCopy() {
  const text = props.logs.map(l => l.formatLine()).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}
</script>

<style scoped>
.live-console-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.console-drawer {
  width: 100%;
  max-width: 980px;
  max-height: 380px;
  background: var(--surface-overlay);
  backdrop-filter: blur(28px) saturate(180%);
  border: var(--card-glass-border);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-modal);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.drawer-header {
  padding: 12px 18px;
  border-bottom: var(--card-glass-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-emerald);
  box-shadow: 0 0 10px var(--accent-emerald-strong);
}

.drawer-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.log-count-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--accent-sky-soft);
  color: var(--accent-sky);
}

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-console-act {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  border: var(--card-glass-border);
  background: var(--white-06);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-console-act:hover {
  background: var(--accent-sky-soft);
  color: var(--accent-sky);
  border-color: var(--accent-sky-border);
}

.act-svg {
  width: 14px;
  height: 14px;
}

.btn-console-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: var(--card-glass-border);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-console-close:hover {
  background: var(--accent-red-soft);
  color: var(--accent-red);
}

.drawer-body {
  padding: 14px 18px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.6;
  max-height: 300px;
  unicode-bidi: isolate;
}

.log-row bdi,
.log-row .bidi-isolate {
  unicode-bidi: isolate;
}

.log-row [dir='ltr'] {
  direction: ltr;
  unicode-bidi: isolate;
}

.is-rtl .console-drawer {
  font-family: 'Cairo', 'Segoe UI', Tahoma, 'Noto Sans Arabic', system-ui, sans-serif;
}

.log-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 2px 0;
}

.log-time {
  color: #64748B;
  flex-shrink: 0;
}

.log-source {
  font-weight: 700;
  flex-shrink: 0;
}

.source-system { color: #38BDF8; }
.source-hyper-v { color: #A855F7; }
.source-wireguard { color: #10B981; }
.source-storage { color: #F59E0B; }
.source-update { color: #EC4899; }

.log-msg {
  color: #E2E8F0;
  word-break: break-word;
}

.level-error .log-msg { color: #EF4444; }
.level-warn .log-msg { color: #F59E0B; }
.level-success .log-msg { color: #34D399; }
</style>
