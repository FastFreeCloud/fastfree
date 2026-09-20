<template>
  <q-header class="lc-desktop-header" :style="headerStyle" @mouseenter="hovered = true" @mouseleave="hovered = false">
    <q-toolbar class="lc-toolbar">
      <!-- Logo / Icon with pulse animation -->
      <div class="lc-header-logo" :class="{ 'lc-header-logo--hover': hovered }">
        <q-icon :name="icon" size="24px" color="white" />
      </div>

      <!-- Title — adaptive: full text if space, else truncate -->
      <div class="lc-header-title">
        <transition name="lc-title-fade" mode="out-in">
          <span :key="title" class="lc-header-title__text" :title="title">
            {{ title }}
          </span>
        </transition>
      </div>

      <!-- Right actions slot -->
      <slot name="right" />
      <slot name="left" />
    </q-toolbar>

    <!-- Animated bottom accent line -->
    <div class="lc-header-accent" :class="{ 'lc-header-accent--active': hovered }" />
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
  '--lc-gradient-from': props.gradient[0],
  '--lc-gradient-to': props.gradient[1],
}))
</script>

<style lang="scss" scoped>
.lc-desktop-header {
  z-index: 5000;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .q-toolbar {
    min-height: 50px;
  }
}

// --- Toolbar layout ---
.lc-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
}

// --- Logo icon with subtle animation ---
.lc-header-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(4px);
  flex-shrink: 0;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  &--hover {
    background: rgba(255, 255, 255, 0.22);
    transform: scale(1.08);
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.15);
  }
}

// --- Title adaptive ---
.lc-header-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.lc-header-title__text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.3px;
  line-height: 1.3;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

// --- Title transition ---
.lc-title-fade-enter-active,
.lc-title-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.lc-title-fade-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.lc-title-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

// --- Bottom accent line ---
.lc-header-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 20%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.4) 80%,
    transparent 100%
  );
  transform: scaleX(0.3);
  opacity: 0;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;

  &--active {
    transform: scaleX(1);
    opacity: 1;
  }
}

// --- Shimmer animation on load ---
@keyframes lc-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.lc-desktop-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: lc-shimmer 8s ease-in-out infinite;
  pointer-events: none;
}

// --- Mobile ---
@media (max-width: 599px) {
  .lc-toolbar {
    min-height: 44px;
  }

  .lc-header-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .lc-header-title__text {
    font-size: 0.95rem;
  }
}
</style>
