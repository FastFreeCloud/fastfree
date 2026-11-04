<template>
  <div
    class="casaos-dock-container"
    :class="[
      `dock-${dockConfig.position}`,
      { 'is-rtl': isRtl, 'is-collapsed': !dockConfig.isExpanded }
    ]"
  >
    <!-- Snap Direction Indicator Hints (Shown on hover) -->
    <div class="dock-snap-hints">
      <button
        class="snap-btn snap-top"
        :class="{ active: dockConfig.position === 'top' }"
        :title="isRtl ? 'تثبيت في الأعلى' : 'Snap to Top'"
        @click="dockConfig.setPosition('top')"
      >
        <svg class="snap-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
      <button
        class="snap-btn snap-bottom"
        :class="{ active: dockConfig.position === 'bottom' }"
        :title="isRtl ? 'تثبيت في الأسفل' : 'Snap to Bottom'"
        @click="dockConfig.setPosition('bottom')"
      >
        <svg class="snap-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <button
        class="snap-btn snap-left"
        :class="{ active: dockConfig.position === 'left' }"
        :title="isRtl ? 'تثبيت في اليسار' : 'Snap to Left'"
        @click="dockConfig.setPosition('left')"
      >
        <svg class="snap-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button
        class="snap-btn snap-right"
        :class="{ active: dockConfig.position === 'right' }"
        :title="isRtl ? 'تثبيت في اليمين' : 'Snap to Right'"
        @click="dockConfig.setPosition('right')"
      >
        <svg class="snap-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <!-- Main Glass Dock Bar -->
    <aside class="casaos-glass-bar">
      <!-- Live Analog Clock & FastFree Logo Mark -->
      <div
        class="dock-item dock-clock-pill"
        :title="isRtl ? 'ساعة FastFree الحية (انقر لتوسيع/تصغير الشريط)' : 'FastFree Live Clock (Click to toggle)'"
        @click="dockConfig.toggleExpanded()"
      >
        <div class="analog-clock-wrap">
          <svg class="analog-clock-svg" viewBox="0 0 100 100">
            <!-- Clock Dial Background -->
            <circle cx="50" cy="50" r="46" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.4)" stroke-width="3" />
            <!-- Inner Ring -->
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" />
            <!-- Minute Hour markers -->
            <line x1="50" y1="8" x2="50" y2="14" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" />
            <line x1="92" y1="50" x2="86" y2="50" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" />
            <line x1="50" y1="92" x2="50" y2="86" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" />
            <line x1="8" y1="50" x2="14" y2="50" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" />
            <!-- Hour Hand -->
            <line
              x1="50"
              y1="50"
              :x2="clockCoords.hourX"
              :y2="clockCoords.hourY"
              stroke="#F8FAFC"
              stroke-width="3.5"
              stroke-linecap="round"
            />
            <!-- Minute Hand -->
            <line
              x1="50"
              y1="50"
              :x2="clockCoords.minuteX"
              :y2="clockCoords.minuteY"
              stroke="#38BDF8"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <!-- Second Hand -->
            <line
              x1="50"
              y1="50"
              :x2="clockCoords.secondX"
              :y2="clockCoords.secondY"
              stroke="#EF4444"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <!-- Center Cap -->
            <circle cx="50" cy="50" r="3.5" fill="#EF4444" />
          </svg>
        </div>
        <div class="clock-digital-text">
          <span class="digital-time">{{ timeString }}</span>
        </div>
      </div>

      <div class="dock-separator"></div>

      <!-- Quick Action Buttons -->
      <div class="dock-actions-row">
        <!-- Refresh Telemetry Button -->
        <button
          class="dock-action-btn"
          :title="isRtl ? 'تحديث البيانات الفورية' : 'Refresh Live Telemetry'"
          :disabled="isRefreshing"
          @click="$emit('refresh')"
        >
          <svg class="dock-btn-svg" :class="{ 'spin-active': isRefreshing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span class="dock-tooltip">{{ isRtl ? 'تحديث' : 'Refresh' }}</span>
        </button>

        <!-- Web Portal Launch Button -->
        <button
          class="dock-action-btn"
          :title="isRtl ? 'فتح البوابة السيادية' : 'Open Sovereign Portal'"
          @click="$emit('open-portal')"
        >
          <svg class="dock-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span class="dock-tooltip">{{ isRtl ? 'البوابة' : 'Portal' }}</span>
        </button>

        <!-- Live Logs Console Drawer Button -->
        <button
          class="dock-action-btn"
          :title="isRtl ? 'عرض سجلات العقدة الفورية' : 'View Real-time Node Logs'"
          @click="$emit('toggle-console')"
        >
          <svg class="dock-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span class="dock-tooltip">{{ isRtl ? 'السجلات' : 'Console' }}</span>
        </button>

        <!-- Restart / Power VM Button -->
        <button
          class="dock-action-btn btn-power"
          :title="isRtl ? 'إعادة تشغيل الآلة الافتراضية' : 'Restart Guest Appliance'"
          @click="$emit('restart-vm')"
        >
          <svg class="dock-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
          <span class="dock-tooltip">{{ isRtl ? 'إعادة التشغيل' : 'Restart' }}</span>
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DockConfiguration } from '../../domain/models/DockConfiguration';

defineProps<{
  isRtl: boolean;
  isRefreshing?: boolean;
}>();

defineEmits<{
  (e: 'refresh'): void;
  (e: 'open-portal'): void;
  (e: 'toggle-console'): void;
  (e: 'restart-vm'): void;
}>();

const dockConfig = ref(new DockConfiguration('bottom'));

// Clock Tick State
const now = ref(new Date());
let timerId: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timerId = setInterval(() => {
    now.value = new Date();
  }, 1000);
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});

const timeString = computed(() => {
  return now.value.toTimeString().split(' ')[0] || '';
});

// Analog Hand Coordinates calculation
const clockCoords = computed(() => {
  const d = now.value;
  const s = d.getSeconds();
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;

  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);

  const secAngle = toRad(s * 6);
  const minAngle = toRad(m * 6);
  const hourAngle = toRad(h * 30);

  return {
    secondX: 50 + 34 * Math.cos(secAngle),
    secondY: 50 + 34 * Math.sin(secAngle),
    minuteX: 50 + 28 * Math.cos(minAngle),
    minuteY: 50 + 28 * Math.sin(minAngle),
    hourX: 50 + 19 * Math.cos(hourAngle),
    hourY: 50 + 19 * Math.sin(hourAngle)
  };
});
</script>

<style scoped>
.casaos-dock-container {
  position: fixed;
  z-index: 1000;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* 4-Way Dock Positions */
.dock-bottom {
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
}

.dock-top {
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
}

.dock-left {
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
}

.dock-right {
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
}

/* Glass Bar styling adhering to Fluent 2 */
.casaos-glass-bar {
  pointer-events: auto;
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow:
    0 16px 36px -8px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(56, 189, 248, 0.18) inset;
}

.dock-left .casaos-glass-bar,
.dock-right .casaos-glass-bar {
  flex-direction: column;
}

/* Clock Pill */
.dock-clock-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.dock-clock-pill:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.35);
}

.analog-clock-wrap {
  width: 32px;
  height: 32px;
}

.analog-clock-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.clock-digital-text {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  color: #38BDF8;
  letter-spacing: 0.5px;
}

.dock-separator {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.12);
}

.dock-left .dock-separator,
.dock-right .dock-separator {
  width: 24px;
  height: 1px;
}

/* Actions Row */
.dock-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dock-left .dock-actions-row,
.dock-right .dock-actions-row {
  flex-direction: column;
}

.dock-action-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(30, 41, 59, 0.5);
  color: #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-action-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #38BDF8;
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-2px);
}

.dock-action-btn.btn-power:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #EF4444;
  border-color: rgba(239, 68, 68, 0.4);
}

.dock-btn-svg {
  width: 20px;
  height: 20px;
}

.spin-active {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Tooltip on Hover */
.dock-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #F8FAFC;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: all 0.15s ease;
}

.dock-action-btn:hover .dock-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Snap Hints on Container Hover */
.dock-snap-hints {
  position: absolute;
  display: flex;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.casaos-dock-container:hover .dock-snap-hints {
  opacity: 1;
  pointer-events: auto;
}

.dock-bottom .dock-snap-hints {
  top: -30px;
}
.dock-top .dock-snap-hints {
  bottom: -30px;
}
.dock-left .dock-snap-hints {
  right: -30px;
  flex-direction: column;
}
.dock-right .dock-snap-hints {
  left: -30px;
  flex-direction: column;
}

.snap-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.snap-btn:hover,
.snap-btn.active {
  background: #38BDF8;
  color: #0F172A;
  border-color: #38BDF8;
}

.snap-svg {
  width: 12px;
  height: 12px;
}
</style>
