<template>
  <div class="telemetry-card-root" :class="{ 'is-rtl': isRtl }">
    <div class="card-header">
      <div class="header-left">
        <div class="status-indicator-dot"></div>
        <span class="card-title">{{ isRtl ? 'حالة العتاد والموارد الحية' : 'Live Appliance Telemetry' }}</span>
      </div>
      <span class="host-pill font-mono bidi-isolate" dir="ltr"><bdi>{{ nodeName || 'client2.fastfree' }}</bdi></span>
    </div>

    <!-- Dials Row: vCPU & RAM -->
    <div class="dials-row">
      <!-- vCPU Dial -->
      <div class="dial-block" :class="{ 'is-warning': telemetry.isCpuUnderPressure }">
        <div class="dial-radial-wrap">
          <svg class="radial-svg" viewBox="0 0 36 36">
            <path
              class="radial-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              class="radial-fill cpu-fill"
              :stroke-dasharray="`${telemetry.cpuUsagePercent}, 100`"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div class="dial-center-val">
            <span class="val-num">{{ telemetry.cpuUsagePercent }}%</span>
          </div>
        </div>
        <div class="dial-info">
          <span class="info-k">{{ isRtl ? 'المعالج (vCPU)' : 'vCPU Pressure' }}</span>
          <span class="info-v font-mono bidi-isolate" dir="ltr"><bdi>{{ telemetry.cpuCores }} {{ t('common.cores') }}</bdi></span>
        </div>
      </div>

      <!-- RAM Dial -->
      <div class="dial-block" :class="{ 'is-warning': telemetry.isMemoryUnderPressure }">
        <div class="dial-radial-wrap">
          <svg class="radial-svg" viewBox="0 0 36 36">
            <path
              class="radial-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              class="radial-fill ram-fill"
              :stroke-dasharray="`${telemetry.memoryUsagePercent}, 100`"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div class="dial-center-val">
            <span class="val-num">{{ telemetry.memoryUsagePercent }}%</span>
          </div>
        </div>
        <div class="dial-info">
          <span class="info-k">{{ isRtl ? 'الذاكرة (RAM)' : 'Memory (RAM)' }}</span>
          <span class="info-v font-mono bidi-isolate" dir="ltr"><bdi>{{ (telemetry.memoryTotalMb / 1024).toFixed(0) }} {{ t('common.gb') }} {{ t('common.total') }}</bdi></span>
        </div>
      </div>
    </div>

    <!-- Disk Storage Horizontal Bar -->
    <div class="storage-section">
      <div class="storage-labels">
        <span class="storage-k bidi-isolate">{{ isRtl ? 'التخزين' : 'Storage' }} (<bdi>{{ telemetry.diskPath }}</bdi>)</span>
        <span class="storage-v font-mono bidi-isolate" dir="ltr"><bdi>{{ telemetry.diskFreeGbFormatted }} {{ t('common.free') }}</bdi></span>
      </div>
      <div class="storage-progress-track">
        <div class="storage-progress-fill" :style="{ width: `${telemetry.diskUsagePercent}%` }"></div>
      </div>
    </div>

    <!-- Network Live Speeds Row -->
    <div class="network-speeds-row">
      <div class="speed-box up">
        <span class="speed-arrow" aria-hidden="true">↑</span>
        <span class="speed-k">{{ isRtl ? 'رفع:' : 'Upload:' }}</span>
        <span class="speed-v font-mono bidi-isolate" dir="ltr"><bdi>{{ telemetry.networkUpFormatted }}</bdi></span>
      </div>
      <div class="speed-box down">
        <span class="speed-arrow" aria-hidden="true">↓</span>
        <span class="speed-k">{{ isRtl ? 'تحميل:' : 'Download:' }}</span>
        <span class="speed-v font-mono bidi-isolate" dir="ltr"><bdi>{{ telemetry.networkDownFormatted }}</bdi></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { IApplianceTelemetry } from '../../domain/models/ApplianceTelemetry';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

defineProps<{
  telemetry: IApplianceTelemetry;
  nodeName?: string;
  isRtl: boolean;
}>();
</script>

<style scoped>
.telemetry-card-root {
  background: rgba(30, 41, 59, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  unicode-bidi: isolate;
}

.telemetry-card-root bdi,
.telemetry-card-root .bidi-isolate {
  unicode-bidi: isolate;
}

.telemetry-card-root [dir='ltr'] {
  direction: ltr;
  unicode-bidi: isolate;
}

.is-rtl .telemetry-card-root {
  font-family: 'Cairo', 'Segoe UI', Tahoma, 'Noto Sans Arabic', system-ui, sans-serif;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 8px #10B981;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #F8FAFC;
}

.host-pill {
  font-size: 11px;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.dials-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

.dial-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.dial-radial-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.radial-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.radial-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 3.5;
}

.radial-fill {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease;
}

.cpu-fill {
  stroke: #38BDF8;
}

.ram-fill {
  stroke: #10B981;
}

.dial-center-val {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.val-num {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  color: #F1F5F9;
}

.dial-info {
  display: flex;
  flex-direction: column;
}

.info-k {
  font-size: 11px;
  color: #94A3B8;
}

.info-v {
  font-size: 12px;
  font-weight: 700;
  color: #F1F5F9;
}

/* Storage Section */
.storage-section {
  margin-bottom: 12px;
}

.storage-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
}

.storage-k {
  color: #94A3B8;
}

.storage-v {
  color: #E2E8F0;
  font-weight: 600;
}

.storage-progress-track {
  width: 100%;
  height: 6px;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.storage-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38BDF8, #818CF8);
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* Network Speeds */
.network-speeds-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.4);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px;
}

.speed-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.speed-arrow {
  font-weight: 700;
}

.speed-box.up .speed-arrow {
  color: #38BDF8;
}

.speed-box.down .speed-arrow {
  color: #10B981;
}

.speed-k {
  color: #94A3B8;
}

.speed-v {
  color: #F1F5F9;
  font-weight: 700;
}
</style>
