<template>
  <div class="action-center-timepiece" :title="isRtl ? 'ساعة FastFree الملاحية الحية' : 'FastFree Precision Timepiece'">
    <div class="fastfree-timepiece-dial">
      <!-- Precision Vector Dial with Clear Hour Ticks and Markers -->
      <svg aria-hidden="true" class="clock-dial-svg" viewBox="0 0 100 100">
        <!-- Outer Bezel Ring -->
        <circle cx="50" cy="50" r="48" class="dial-outer-ring" />
        <!-- Major Hour Ticks (12, 3, 6, 9) -->
        <line x1="50" y1="5" x2="50" y2="13" class="dial-tick-major" />
        <line x1="95" y1="50" x2="87" y2="50" class="dial-tick-major" />
        <line x1="50" y1="95" x2="50" y2="87" class="dial-tick-major" />
        <line x1="5" y1="50" x2="13" y2="50" class="dial-tick-major" />
        <!-- Intermediate Hour Dots (1, 2, 4, 5, 7, 8, 10, 11) -->
        <circle cx="71" cy="13.6" r="1.6" class="dial-dot" />
        <circle cx="86.4" cy="29" r="1.6" class="dial-dot" />
        <circle cx="86.4" cy="71" r="1.6" class="dial-dot" />
        <circle cx="71" cy="86.4" r="1.6" class="dial-dot" />
        <circle cx="29" cy="86.4" r="1.6" class="dial-dot" />
        <circle cx="13.6" cy="71" r="1.6" class="dial-dot" />
        <circle cx="13.6" cy="29" r="1.6" class="dial-dot" />
        <circle cx="29" cy="13.6" r="1.6" class="dial-dot" />
      </svg>

      <!-- Official FastFree Infinity Mark (Crisp, High-Definition, Zero Pulsing Blur) -->
      <div class="timepiece-logo-wrapper">
        <img src="/logo.svg" alt="FastFree" class="fastfree-timepiece-logo" />
      </div>

      <!-- Sharp, High-Contrast Real Working Clock Hands -->
      <div class="clock-hand clock-hand-hour" :style="{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }"></div>
      <div class="clock-hand clock-hand-minute" :style="{ transform: `translateX(-50%) rotate(${minuteDeg}deg)` }"></div>
      <div class="clock-hand clock-hand-second" :style="{ transform: `translateX(-50%) rotate(${secondDeg}deg)` }"></div>
      <div class="clock-nexus-pivot"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../composables/useI18n';

const { isRtl } = useI18n();

// Real working analog clock hands
const hourDeg = ref(0);
const minuteDeg = ref(0);
const secondDeg = ref(0);
let liveClockInterval: ReturnType<typeof setInterval> | null = null;

function tickClock() {
  const now = new Date();
  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();

  secondDeg.value = s * 6;
  minuteDeg.value = m * 6 + s * 0.1;
  hourDeg.value = (h % 12) * 30 + m * 0.5;
}

onMounted(() => {
  tickClock();
  liveClockInterval = setInterval(tickClock, 1000);
});

onUnmounted(() => {
  if (liveClockInterval) clearInterval(liveClockInterval);
});
</script>

<style scoped>
/* Pure FastFree Precision Timepiece in Action Bar (Steady, High-Definition, Zero Pulsing Blur) */
.action-center-timepiece {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  pointer-events: auto;
}

.fastfree-timepiece-dial {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, var(--bg-sub) 50%, var(--bg-app) 100%);
  border: 1.5px solid var(--accent-sky-border-strong);
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.65), 0 0 10px rgba(56, 189, 248, 0.25);
  user-select: none;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
}

.fastfree-timepiece-dial:hover {
  transform: scale(1.08);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.8), 0 0 14px rgba(56, 189, 248, 0.45);
}

.clock-dial-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.dial-outer-ring {
  fill: none;
  stroke: var(--border-highlight);
  stroke-width: 1;
}

.dial-tick-major {
  stroke: var(--accent-sky);
  stroke-width: 2.5;
  stroke-linecap: round;
}

.dial-dot {
  fill: var(--text-muted);
  opacity: 0.9;
}

.timepiece-logo-wrapper {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  pointer-events: none;
}

.fastfree-timepiece-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
  opacity: 1 !important;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85));
}

/* Sharp, High-Contrast Real Working Clock Hands */
.clock-hand {
  position: absolute;
  left: 50%;
  bottom: 50%;
  transform-origin: 50% 100%;
  border-radius: 9999px;
  pointer-events: none;
}

.clock-hand-hour {
  width: 2.2px;
  height: 11px;
  background: var(--text-main);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  z-index: 4;
}

.clock-hand-minute {
  width: 1.6px;
  height: 15px;
  background: var(--accent-sky);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  z-index: 5;
}

.clock-hand-second {
  width: 1px;
  height: 18px;
  background: var(--accent-amber);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  z-index: 6;
  transition: transform 0.12s cubic-bezier(0.4, 2.08, 0.55, 0.44);
}

.clock-nexus-pivot {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-sky);
  border: 1px solid var(--bg-app);
  box-shadow: 0 0 4px var(--accent-sky-mid);
  z-index: 7;
  pointer-events: none;
}
</style>
