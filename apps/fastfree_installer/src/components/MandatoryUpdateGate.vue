<template>
  <div class="mandatory-update-container" :class="{ 'is-rtl': isRtl }">
    <div class="mandatory-card">
      <div class="mandatory-icon-badge">
        <img src="/logo.svg" class="gate-logo" alt="FastFree" />
      </div>
      
      <div class="mandatory-header">
        <div class="mandatory-badge-tag">
          <span class="live-dot-pulse"></span>
          <span>{{ isRtl ? 'تحديث إلزامي مطلوب للنظام' : 'Mandatory System Update Required' }}</span>
        </div>
        <h2>{{ isRtl ? `تحديث جديد متوفر: v${updateVersion}` : `New Release Available: v${updateVersion}` }}</h2>
        <p class="mandatory-sub">
          {{ isRtl
            ? 'يتطلب الاستمرار في تهيئة واستخدام عقد فاست فري الترقية إلى الإصدار الأحدث لضمان استقرار محرك Hyper-V ومزامنة النفق المشفر.'
            : 'Upgrading to the latest release is required to ensure Hyper-V compatibility, WireGuard mesh synchronicity, and system stability.'
          }}
        </p>
      </div>

      <div class="version-bridge-card">
        <div class="version-node current">
          <span class="node-label">{{ isRtl ? 'النسخة الحالية' : 'Current Version' }}</span>
          <span class="node-ver font-mono">v{{ currentAppVersion }}</span>
        </div>
        <div class="bridge-arrow">
          <svg class="arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline :points="isRtl ? '12 5 5 12 12 19' : '12 5 19 12 12 19'"></polyline>
          </svg>
        </div>
        <div class="version-node target">
          <span class="node-label">{{ isRtl ? 'النسخة الإلزامية' : 'Required Version' }}</span>
          <span class="node-ver font-mono text-emerald">v{{ updateVersion }}</span>
        </div>
      </div>

      <div v-if="updateNotes" class="notes-box">
        <div class="notes-title">{{ isRtl ? 'ملاحظات الإصدار الجديد:' : 'Release Highlights:' }}</div>
        <div class="notes-content">{{ updateNotes }}</div>
      </div>

      <div v-if="isDownloadingUpdate" class="download-progress-card">
        <div class="dp-header">
          <span class="dp-text">{{ isRtl ? 'جارٍ تنزيل وتثبيت التحديث...' : 'Downloading & installing update...' }}</span>
          <span class="dp-stats font-mono">{{ downloadedBytesFormatted }} / {{ totalBytesFormatted }} ({{ downloadProgress }}%)</span>
        </div>
        <div class="progress-track-lg">
          <div class="progress-bar-lg" :style="{ width: `${downloadProgress}%` }"></div>
        </div>
      </div>

      <div v-if="updateError" class="update-error-alert">
        <span class="error-icon">
          <svg class="err-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </span>
        <span class="error-text">{{ updateError }}</span>
      </div>

      <div class="mandatory-actions">
        <button
          class="btn btn-primary btn-update-hero"
          :disabled="isDownloadingUpdate"
          @click="installPendingUpdate"
        >
          <span v-if="isDownloadingUpdate" class="spinner-tiny"></span>
          <span v-else class="btn-inner">
            <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{{ isRtl ? 'تثبيت التحديث الآن وإعادة التشغيل' : 'Install Update & Restart Now' }}</span>
          </span>
        </button>
        <button
          v-if="manualDownloadUrl"
          class="btn btn-secondary"
          :disabled="isDownloadingUpdate"
          @click="openManualDownload"
        >
          <span class="btn-inner">
            <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span>{{ isRtl ? 'تحميل مباشر كملف مستقل' : 'Download Direct Installer' }}</span>
          </span>
        </button>
      </div>

      <div class="mandatory-footer-notice">
        <svg class="lock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>{{ isRtl ? 'تم قفل الانتقال في المعالج لحين تطبيق التحديث لضمان تكامل النظام.' : 'Setup wizard navigation is locked until the update is applied.' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../composables/useI18n';
import {
  updateVersion,
  updateNotes,
  updateError,
  isDownloadingUpdate,
  downloadProgress,
  downloadedBytesFormatted,
  totalBytesFormatted,
  installPendingUpdate,
  currentAppVersion,
  manualDownloadUrl,
  openManualDownload,
} from '../composables/useAutoUpdater';

const { isRtl } = useI18n();
</script>

<style scoped>
.mandatory-update-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 70%);
  overflow-y: auto;
}

.mandatory-card {
  width: 100%;
  max-width: 620px;
  background: var(--bg-card, #1E293B);
  border: 1px solid rgba(56, 189, 248, 0.3);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.15);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  backdrop-filter: blur(16px);
}

.mandatory-icon-badge {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(37, 99, 235, 0.2);
}

.gate-logo {
  width: 38px;
  height: 38px;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 240, 255, 0.5));
}

.btn-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-svg {
  width: 16px;
  height: 16px;
}

.mandatory-header h2 {
  margin: 6px 0 0 0;
  font-size: 20px;
  font-weight: 700;
  color: #F8FAFC;
}

.mandatory-badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.15);
  color: #EF4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.mandatory-sub {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.5;
}

.version-bridge-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
}

.version-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.node-label {
  font-size: 11px;
  color: #64748B;
  font-weight: 600;
}

.node-ver {
  font-size: 15px;
  font-weight: 700;
  color: #F8FAFC;
}

.bridge-arrow {
  font-size: 18px;
  color: #38BDF8;
}

.notes-box {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
}

.notes-title {
  font-weight: 600;
  color: #38BDF8;
  margin-bottom: 4px;
}

.notes-content {
  color: #CBD5E1;
  line-height: 1.4;
  white-space: pre-wrap;
  max-height: 80px;
  overflow-y: auto;
}

.download-progress-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dp-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.dp-text {
  color: #F8FAFC;
  font-weight: 600;
}

.dp-stats {
  color: #38BDF8;
  font-weight: 700;
}

.progress-track-lg {
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar-lg {
  height: 100%;
  background: linear-gradient(90deg, #10B981, #38BDF8);
  transition: width 0.2s ease;
}

.update-error-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  padding: 10px 12px;
  color: #FCA5A5;
  font-size: 12px;
}

.mandatory-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.btn-update-hero {
  flex: 1;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
}

.mandatory-footer-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: #64748B;
  font-weight: 500;
}

.arrow-svg {
  width: 16px;
  height: 16px;
  stroke: var(--accent-sky, #38BDF8);
}

.err-svg {
  width: 16px;
  height: 16px;
  stroke: #EF4444;
}

.lock-svg {
  width: 13px;
  height: 13px;
  stroke: #64748B;
}

.spinner-tiny {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>