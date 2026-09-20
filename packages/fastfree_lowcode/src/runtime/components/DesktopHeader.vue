<template>
  <q-header class="lc-hdr" :style="headerStyle" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <q-toolbar class="lc-hdr__bar">
      <!-- Logo -->
      <div class="lc-hdr__logo" :class="{ 'lc-hdr__logo--hover': hovered }">
        <q-icon :name="icon" size="20px" color="white" />
      </div>

      <!-- Title -->
      <div class="lc-hdr__title">
        <span class="lc-hdr__title-text" :title="title">{{ title }}</span>
      </div>

      <!-- Actions -->
      <slot name="right" />
      <slot name="left" />
    </q-toolbar>

    <!-- Bottom accent -->
    <div class="lc-hdr__accent" :class="{ 'lc-hdr__accent--on': hovered }" />

    <!-- Shimmer -->
    <div class="lc-hdr__shimmer" />
  </q-header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  gradient?: [string, string]
}>(), {
  title: 'Desktop',
  icon: 'dashboard',
  gradient: () => ['#0D47A1', '#1565C0'],
})

const hovered = ref(false)

const headerStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.gradient[0]}, ${props.gradient[1]})`,
}))
</script>

<style lang="scss" scoped>
.lc-hdr {
  z-index: 5000;
  position: relative;
  overflow: hidden;
}

.lc-hdr__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 10px;
}

// ── Logo ──
.lc-hdr__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &--hover {
    background: rgba(255, 255, 255, 0.22);
    transform: scale(1.08);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.15);
  }
}

// ── Title ──
.lc-hdr__title {
  flex: 1;
  min-width: 0;
}

.lc-hdr__title-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.2px;
  line-height: 1.2;
  animation: lc-hdr-title-in 0.4s ease both;
}

// ── Accent line ──
.lc-hdr__accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 30%,
    rgba(255, 255, 255, 0.9) 50%,
    rgba(255, 255, 255, 0.5) 70%,
    transparent 100%
  );
  transform: scaleX(0);
  opacity: 0;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;

  &--on {
    transform: scaleX(1);
    opacity: 1;
  }
}

// ── Shimmer ──
.lc-hdr__shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0.03) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: lc-hdr-shimmer 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes lc-hdr-title-in {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes lc-hdr-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

// ── Mobile ──
@media (max-width: 599px) {
  .lc-hdr__bar { min-height: 40px; padding: 0 8px; gap: 6px; }
  .lc-hdr__logo { width: 26px; height: 26px; border-radius: 6px; }
  .lc-hdr__title-text { font-size: 0.85rem; }
}

@media (prefers-reduced-motion: reduce) {
  .lc-hdr__title-text, .lc-hdr__accent, .lc-hdr__shimmer {
    animation: none !important;
    transition: none !important;
  }
}
</style>
