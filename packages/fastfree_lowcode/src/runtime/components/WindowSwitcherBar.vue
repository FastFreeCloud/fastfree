<template>
  <Transition name="switcher-slide" appear>
    <div
      class="window-switcher-bar"
      :class="{ 'is-static': position === 'static' }"
      :style="{ height: cfg.desktop.switcherHeight + 'px' }"
      v-if="tabs.length > 0"
    >
      <div class="switcher-scroll-wrap">
        <div
          class="scroll-fade scroll-fade-left"
          :class="{ visible: scrollLeft > 0 }"
        />
        <div class="switcher-scroll" ref="scrollRef" @scroll="onScroll">
          <TransitionGroup name="tab">
            <div
              v-for="tab in tabs"
              :key="tab.id"
              class="switcher-tab"
              tabindex="0"
              :class="{ active: tab.id === desktop.activeWindowId }"
              @click.stop="activateTab(tab)"
              @keydown.enter.prevent="activateTab(tab)"
            >
              <span
                v-if="tab.iconColor && tab.id !== desktop.activeWindowId"
                class="tab-color-dot"
                :style="{ background: tab.iconColor }"
              />
              <q-icon :name="tab.icon" size="14px" :color="tab.id === desktop.activeWindowId ? 'white' : tab.iconColor" />
              <span class="tab-title">
                {{ tab.title }}
                <q-tooltip
                  :delay="500"
                  anchor="top middle"
                  self="bottom middle"
                  max-width="300px"
                  >{{ tab.title }}</q-tooltip
                >
              </span>
              <q-btn
                class="tab-close"
                round
                flat
                dense
                size="xs"
                icon="mdi-close"
                @click.stop="desktop.closeWindow(tab.id)"
              />
            </div>
          </TransitionGroup>
        </div>
        <div
          class="scroll-fade scroll-fade-right"
          :class="{ visible: scrollRight > 0 }"
        />
      </div>
      <div class="switcher-meta">
        <span class="window-count-badge">{{ tabs.length }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { useDesktopStore, type WindowInfo } from "../composables/useDesktopStore";
import { getSharedConfig } from "../shared-config";

const props = defineProps<{
  windowFilter?: (w: WindowInfo) => boolean;
  position?: "fixed" | "static";
}>();

const cfg = getSharedConfig();
const desktop = useDesktopStore();

const tabs = computed(() => {
  if (props.windowFilter) {
    return desktop.sortedWindows.filter(props.windowFilter);
  }
  return desktop.sortedWindows.filter((w) => !w.groupId);
});

const scrollRef = ref<HTMLElement | null>(null);
const scrollLeft = ref(0);
const scrollRight = ref(0);

function onScroll() {
  const el = scrollRef.value;
  if (!el) return;
  scrollLeft.value = el.scrollLeft;
  scrollRight.value = el.scrollWidth - el.clientWidth - el.scrollLeft;
}

onMounted(() => onScroll());
watch(tabs, () => {
  nextTick(() => onScroll());
}, { flush: 'post' });

function activateTab(tab: WindowInfo) {
  if (tab.isMinimized) {
    desktop.toggleMinimize(tab.id);
  } else {
    desktop.bringToFront(tab.id);
  }
}
</script>

<style scoped lang="scss">
.window-switcher-bar {
  --_switcher-surface: color-mix(
    in srgb,
    var(--lc-surface-alt, var(--lc-surface, #ffffff)) 90%,
    transparent
  );
  display: flex;
  align-items: center;
  padding: 0 6px;
  position: fixed;
  left: 50%;
  bottom: calc(var(--lc-dock-height, 70px) + 13px);
  transform: translateX(-50%);
  min-width: 200px;
  max-width: 90vw;
  background: var(--_switcher-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.12));
  border-radius: 12px;
  z-index: 9000;
  gap: 4px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;

  &.is-static {
    position: sticky;
    bottom: 0;
    transform: none;
    left: auto;
    width: 100%;
    flex-shrink: 0;
    margin-top: auto;
    background: color-mix(
      in srgb,
      var(--lc-surface-alt, var(--lc-surface, #ffffff)) 92%,
      transparent
    );
    backdrop-filter: blur(24px) saturate(1.2);
    -webkit-backdrop-filter: blur(24px) saturate(1.2);
    border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.08));
    border-radius: 14px;
    box-shadow:
      0 -2px 8px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    z-index: 10;
    margin-bottom: 4px;
  }
}

.switcher-scroll-wrap {
  position: relative;
  display: flex;
  flex: 1;
  overflow: hidden;
}

.scroll-fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 32px;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  &.visible {
    opacity: 1;
  }
}

.scroll-fade-left {
  left: 0;
  background: linear-gradient(to right, var(--_switcher-surface), transparent);
}

.scroll-fade-right {
  right: 0;
  background: linear-gradient(to left, var(--_switcher-surface), transparent);
}

.switcher-scroll {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 3px 0;
  &::-webkit-scrollbar {
    display: none;
  }
}

.switcher-meta {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-inline-start: 4px;
}

.window-count-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--lc-on-surface-variant, #999);
  background: color-mix(
    in srgb,
    var(--lc-on-surface-variant, #999) 10%,
    transparent
  );
  border-radius: 8px;
  padding: 1px 6px;
  min-width: 16px;
  text-align: center;
  line-height: 1.4;
}

.switcher-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--lc-on-surface-variant, #666);
  white-space: nowrap;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;

  &:hover {
    background: color-mix(in srgb, var(--lc-on-surface, #333) 8%, transparent);
    color: var(--lc-on-surface, #333);
    transform: translateY(-1px);

    .tab-close {
      opacity: 0.6;
    }
  }

  &:active {
    transform: translateY(0) scale(0.97);
    transition-duration: 0.06s;
  }

  &.active {
    background: var(--lc-primary, #1565c0);
    color: var(--lc-on-primary, white);
    font-weight: 500;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--lc-primary, #1565c0) 30%, transparent);

    .tab-color-dot {
      display: none;
    }

    &:active {
      transform: scale(0.97);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--lc-primary, #1565c0);
    outline-offset: 2px;
  }

  .q-icon {
    pointer-events: none;
    font-size: 1em;
  }
}

.tab-color-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.8;
}

.tab-title {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  opacity: 0;
  margin-inline-start: 2px;
  transition: opacity 0.15s ease;
  .switcher-tab:hover & {
    opacity: 0.6;
  }
  &:hover {
    color: var(--lc-negative, #c10015);
    opacity: 1 !important;
  }
}

.tab-enter-active,
.tab-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.tab-enter-from {
  opacity: 0;
  transform: scale(0.85) translateX(-8px);
}
.tab-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
.tab-move {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.switcher-slide-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.switcher-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.switcher-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.switcher-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(15px);
}

.is-static.switcher-slide-enter-from {
  transform: translateY(8px);
}
.is-static.switcher-slide-leave-to {
  transform: translateY(15px);
}

@media (max-width: 599px) {
  .window-switcher-bar {
    padding: 0 4px;
    max-width: 95vw;
    bottom: calc(var(--lc-dock-height, 70px) + 20px);
    gap: 2px;
  }
  .switcher-tab {
    padding: 4px 6px;
    font-size: 11px;
    gap: 3px;
  }
  .tab-title {
    max-width: 80px;
  }
  .tab-close {
    display: none;
  }
  .window-count-badge {
    display: none;
  }
}

@media (hover: none) and (pointer: coarse) {
  .switcher-tab {
    padding: 10px 12px;
    font-size: 14px;
    gap: 8px;
    border-radius: 8px;
  }
  .tab-title {
    max-width: 140px;
  }
  .tab-close {
    opacity: 0;
    &:active {
      opacity: 1;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .window-switcher-bar,
  .switcher-tab,
  .scroll-fade,
  .switcher-slide-enter-active,
  .switcher-slide-leave-active,
  .tab-enter-active,
  .tab-leave-active,
  .tab-move {
    transition: none;
  }
}
</style>
