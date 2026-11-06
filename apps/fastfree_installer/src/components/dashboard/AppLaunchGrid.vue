<template>
  <div class="app-grid-container" :class="{ 'is-rtl': isRtl }">
    <div class="grid-header-row">
      <div class="grid-title-wrap">
        <h3 class="grid-heading">{{ isRtl ? 'التطبيقات المثبتة في العقدة' : 'Installed Sovereign Applications' }}</h3>
        <span class="grid-count-badge">{{ apps.length }} {{ isRtl ? 'تطبيقات سيادية' : 'Sovereign Apps' }}</span>
      </div>
      <div class="grid-filter-wrap">
        <span class="filter-hint">{{ isRtl ? 'بيئة تشغيل محلية معزولة' : 'Local Offline-First Environment' }}</span>
      </div>
    </div>

    <!-- The 8-App CasaOS 136px Squircles Grid -->
    <div class="apps-grid" @click="closeAllMenus">
      <div
        v-for="app in apps"
        :key="app.id"
        class="app-card"
        :class="`category-${app.category}`"
        @click="handleLaunch(app)"
      >
        <!-- 3-Dots Context Menu Button -->
        <button
          class="card-menu-btn"
          :title="isRtl ? 'خيارات سريعة' : 'Quick Options'"
          @click.stop="toggleMenu(app.id)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        <!-- 3-Dots Popover Dropdown -->
        <div
          v-if="openMenuId === app.id"
          class="app-popover-menu"
          @click.stop
        >
          <button class="popover-item-btn" @click="handleMenuAction('open', app)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>{{ isRtl ? 'فتح التطبيق' : 'Open App' }}</span>
          </button>
          <button class="popover-item-btn" @click="handleMenuAction('copy', app)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{{ isRtl ? 'نسخ الرابط' : 'Copy URL' }}</span>
          </button>
          <button class="popover-item-btn" @click="handleMenuAction('restart', app)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>{{ isRtl ? 'إعادة تشغيل الخدمة' : 'Restart Unit' }}</span>
          </button>
          <button class="popover-item-btn" @click="handleMenuAction('logs', app)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span>{{ isRtl ? 'سجلات الخدمة' : 'View Logs' }}</span>
          </button>
        </div>

        <!-- Squircle App Icon (58x58) with Vibrant Linear Gradient -->
        <div class="app-icon-squircle" :style="{ background: app.gradient }">
          <svg v-if="app.id === 'erp'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <svg v-else-if="app.id === 'pos'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <line x1="7" y1="8" x2="17" y2="8"></line>
            <line x1="7" y1="12" x2="17" y2="12"></line>
            <line x1="7" y1="16" x2="11" y2="16"></line>
          </svg>
          <svg v-else-if="app.id === 'ledger'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <svg v-else-if="app.id === 'hr'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <svg v-else-if="app.id === 'crm'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <svg v-else-if="app.id === 'panel'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <svg v-else-if="app.id === 'hyperv'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
          <svg v-else-if="app.id === 'wireguard'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <svg v-else class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>

        <!-- Label Column -->
        <div class="app-label-column">
          <span class="app-title-text bidi-isolate"><bdi>{{ app.getName(isRtl) }}</bdi></span>
          <span class="app-port-badge bidi-isolate" dir="ltr">
            <span class="app-dot-active"></span>
            <bdi>{{ formatPort(app) }}</bdi>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SovereignApp } from '../../domain/models/SovereignApp';

const props = defineProps<{
  apps: SovereignApp[];
  isRtl: boolean;
  nodeHost?: string;
}>();

const emit = defineEmits<{
  (e: 'launch', app: SovereignApp): void;
  (e: 'restart', app: SovereignApp): void;
  (e: 'logs', app: SovereignApp): void;
  (e: 'copy-url', url: string): void;
}>();

const openMenuId = ref<string | null>(null);

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id;
}

function closeAllMenus() {
  openMenuId.value = null;
}

function handleLaunch(app: SovereignApp) {
  closeAllMenus();
  emit('launch', app);
}

function handleMenuAction(action: 'open' | 'copy' | 'restart' | 'logs', app: SovereignApp) {
  closeAllMenus();
  if (action === 'open') {
    emit('launch', app);
  } else if (action === 'copy') {
    const url = app.getLaunchUrl(props.nodeHost || 'localhost');
    navigator.clipboard?.writeText(url);
    emit('copy-url', url);
  } else if (action === 'restart') {
    emit('restart', app);
  } else if (action === 'logs') {
    emit('logs', app);
  }
}

function formatPort(app: SovereignApp): string {
  if (app.id === 'ledger') return 'General Ledger';
  if (app.id === 'hr') return 'Payroll & Staff';
  if (app.id === 'crm') return 'Sales & Leads';
  if (app.id === 'hyperv') return 'NixOS 26.05';
  if (app.id === 'wireguard') return 'UDP 51822';
  return `Port ${app.port}`;
}
</script>

<style scoped>
.app-grid-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  unicode-bidi: isolate;
}

.app-grid-container bdi,
.app-grid-container .bidi-isolate {
  unicode-bidi: isolate;
}

.app-grid-container [dir='ltr'] {
  direction: ltr;
  unicode-bidi: isolate;
}

.is-rtl .app-grid-container {
  font-family: 'Cairo', 'Segoe UI', Tahoma, 'Noto Sans Arabic', system-ui, sans-serif;
}

.grid-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grid-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.grid-heading {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.2px;
}

.grid-count-badge {
  font-size: 11.5px;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 9999px;
  color: var(--text-secondary, #CBD5E1);
  font-weight: 600;
}

.filter-hint {
  font-size: 12px;
  color: var(--text-muted, #94A3B8);
  font-weight: 500;
}

/* 136px Squircles Grid */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
  gap: 18px;
}

.app-card {
  position: relative;
  background: rgba(21, 31, 50, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px 12px 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  cursor: pointer;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.45);
  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.app-card:hover {
  transform: translateY(-5px);
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.15);
}

.app-card:active {
  transform: translateY(-2px) scale(0.98);
}

/* 3-Dots Menu Button */
.card-menu-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--text-muted, #94A3B8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
}

.is-rtl .card-menu-btn {
  left: auto;
  right: 8px;
}

.app-card:hover .card-menu-btn {
  opacity: 1;
}

.card-menu-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.card-menu-btn svg {
  width: 14px;
  height: 14px;
}

/* Squircle App Icon (58x58) */
.app-icon-squircle {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s ease;
  color: #fff;
}

.app-card:hover .app-icon-squircle {
  transform: scale(1.08);
}

.app-svg {
  width: 30px;
  height: 30px;
}

.app-label-column {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
}

.app-title-text {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-port-badge {
  font-size: 10.5px;
  color: var(--text-muted, #94A3B8);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.app-dot-active {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10B981;
}

/* 3-Dots Context Menu Popover */
.app-popover-menu {
  position: absolute;
  top: 36px;
  left: 8px;
  z-index: 100;
  width: 175px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65), 0 0 20px rgba(56, 189, 248, 0.15);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.is-rtl .app-popover-menu {
  left: auto;
  right: 8px;
}

.popover-item-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary, #CBD5E1);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.is-rtl .popover-item-btn {
  text-align: right;
}

.popover-item-btn:hover {
  background: rgba(56, 189, 248, 0.14);
  color: #fff;
}

.popover-item-btn svg {
  width: 14px;
  height: 14px;
  color: var(--text-muted, #94A3B8);
}

.popover-item-btn:hover svg {
  color: #38BDF8;
}
</style>
