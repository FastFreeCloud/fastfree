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

    <!-- The 8-App Grid Cards -->
    <div class="apps-grid">
      <div
        v-for="app in apps"
        :key="app.id"
        class="app-card"
        :class="`category-${app.category}`"
        @click="handleLaunch(app)"
      >
        <div class="app-card-top">
          <div class="app-icon-wrap" :class="`icon-${app.badgeColor}`">
            <!-- App Specific Vector SVGs (Zero Raw Emojis) -->
            <svg v-if="app.id === 'erp'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <svg v-else-if="app.id === 'pos'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="6" y1="8" x2="6" y2="8"></line>
              <line x1="10" y1="8" x2="18" y2="8"></line>
              <line x1="6" y1="12" x2="18" y2="12"></line>
              <line x1="6" y1="16" x2="12" y2="16"></line>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <polyline points="16 11 18 13 22 9"></polyline>
            </svg>
            <svg v-else-if="app.id === 'panel'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <svg v-else-if="app.id === 'hyperv'" class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
            </svg>
            <svg v-else class="app-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>

          <div class="app-badge-pill" :class="`pill-${app.badgeColor}`">
            <span>{{ app.getBadge(isRtl) }}</span>
          </div>
        </div>

        <div class="app-card-body">
          <h4 class="app-title">{{ app.getName(isRtl) }}</h4>
          <p class="app-desc">{{ app.getDescription(isRtl) }}</p>
        </div>

        <div class="app-card-footer">
          <span class="app-port-tag font-mono">Port {{ app.port }}</span>
          <span class="app-open-link font-bold">
            {{ isRtl ? 'تشغيل التطبيق' : 'Launch' }} ↗
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SovereignApp } from '../../domain/models/SovereignApp';
import { AppRegistryService } from '../../domain/services/AppRegistryService';

const props = defineProps<{
  isRtl: boolean;
  nodeHost?: string;
}>();

const emit = defineEmits<{
  (e: 'launch', app: SovereignApp): void;
}>();

const appService = AppRegistryService.getInstance();
const apps = ref<SovereignApp[]>(appService.getAllApps());

function handleLaunch(app: SovereignApp) {
  emit('launch', app);
  appService.launchApp(app, props.nodeHost || 'localhost');
}
</script>

<style scoped>
.app-grid-container {
  margin-top: 24px;
}

.grid-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.grid-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grid-heading {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #F8FAFC;
}

.grid-count-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(56, 189, 248, 0.12);
  color: #38BDF8;
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.filter-hint {
  font-size: 12px;
  color: #94A3B8;
}

/* 4-column responsive grid */
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.app-card {
  background: rgba(30, 41, 59, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.app-card:hover {
  background: rgba(30, 41, 59, 0.75);
  border-color: rgba(56, 189, 248, 0.35);
  transform: translateY(-3px);
  box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.4);
}

.app-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.app-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.icon-cyan {
  color: #38BDF8;
  border-color: rgba(56, 189, 248, 0.25);
}

.icon-emerald {
  color: #10B981;
  border-color: rgba(16, 185, 129, 0.25);
}

.icon-purple {
  color: #A855F7;
  border-color: rgba(168, 85, 247, 0.25);
}

.icon-amber {
  color: #F59E0B;
  border-color: rgba(245, 158, 11, 0.25);
}

.app-svg {
  width: 22px;
  height: 22px;
}

.app-badge-pill {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Cascadia Code', Consolas, monospace;
}

.pill-cyan {
  background: rgba(56, 189, 248, 0.15);
  color: #38BDF8;
}

.pill-emerald {
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
}

.pill-purple {
  background: rgba(168, 85, 247, 0.15);
  color: #A855F7;
}

.pill-amber {
  background: rgba(245, 158, 11, 0.15);
  color: #F59E0B;
}

.app-card-body {
  margin-bottom: 14px;
}

.app-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 700;
  color: #F1F5F9;
}

.app-desc {
  margin: 0;
  font-size: 12px;
  color: #94A3B8;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.app-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
}

.app-port-tag {
  font-size: 11px;
  color: #64748B;
}

.app-open-link {
  font-size: 12px;
  color: #38BDF8;
  transition: color 0.15s ease;
}

.app-card:hover .app-open-link {
  color: #60A5FA;
}
</style>
