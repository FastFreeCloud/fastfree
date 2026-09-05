<template>
  <div
    class="desktop-dock"
    v-if="fixedGroups.length > 0"
    :class="{ 'is-mobile': isMobile, 'is-tablet': isTablet }"
    role="toolbar"
    :aria-label="t('common.dock')"
  >
    <div class="glass-dock" ref="dockRef">
      <!-- Scroll left button -->
      <button
        v-if="canScrollLeft"
        class="dock-scroll-btn dock-scroll-left"
        @click="scrollTabs(-1)"
        :aria-label="t('common.scrollLeft')"
      >
        <q-icon name="mdi-chevron-left" size="16px" />
      </button>

      <!-- Groups section -->
      <div class="dock-groups" ref="groupsRef">
        <div
          v-for="group in fixedGroups"
          :key="group.id"
          class="dock-item"
          :class="{
            active: isGroupActive(group.id),
            'has-badge': openWindowCount(group.id) > 0,
          }"
          :aria-label="translatedName(group.id)"
          :aria-selected="isGroupActive(group.id)"
          role="tab"
          tabindex="0"
          @click="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
          @keydown.enter.prevent="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
          @keydown.space.prevent="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
          @touchstart.passive="onTouchStart($event, group)"
          @touchend="onTouchEnd($event, group)"
          @contextmenu.prevent="showContextMenu($event, group)"
        >
          <div class="dock-item-inner">
            <q-icon :name="group.icon" :size="isMobile ? '22px' : '20px'" class="dock-icon" />
            <span class="dock-label">{{ translatedName(group.id) }}</span>
          </div>
          <Transition name="active-pill">
            <span v-if="isGroupActive(group.id)" class="dock-active-pill" />
          </Transition>
          <Transition name="badge-pop">
            <span
              v-if="openWindowCount(group.id) > 0"
              class="dock-badge"
              :key="openWindowCount(group.id)"
            >
              {{ openWindowCount(group.id) > 99 ? '99+' : openWindowCount(group.id) }}
            </span>
          </Transition>
        </div>

        <!-- Custom groups -->
        <template v-if="customGroups.length > 0">
          <div class="dock-divider" />
          <div
            v-for="group in customGroups"
            :key="group.id"
            class="dock-item"
            :class="{ active: isGroupActive(group.id) }"
            :aria-label="translatedName(group.id)"
            role="tab"
            tabindex="0"
            @click="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
            @keydown.enter.prevent="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
            @touchstart.passive="onTouchStart($event, group)"
            @touchend="onTouchEnd($event, group)"
            @contextmenu.prevent="showContextMenu($event, group)"
          >
            <div class="dock-item-inner">
              <q-icon :name="group.icon" :size="isMobile ? '22px' : '20px'" class="dock-icon" />
              <span class="dock-label">{{ translatedName(group.id) }}</span>
            </div>
            <Transition name="active-pill">
              <span v-if="isGroupActive(group.id)" class="dock-active-pill" />
            </Transition>
            <Transition name="badge-pop">
              <span
                v-if="openWindowCount(group.id) > 0"
                class="dock-badge"
                :key="openWindowCount(group.id)"
              >
                {{ openWindowCount(group.id) > 99 ? '99+' : openWindowCount(group.id) }}
              </span>
            </Transition>
          </div>
        </template>
      </div>

      <!-- Divider -->
      <div v-if="windowTabs.length > 0" class="dock-divider" />

      <!-- Windows section -->
      <div class="dock-windows-wrapper" v-if="windowTabs.length > 0" ref="windowsRef">
        <TransitionGroup name="dock-tab" tag="div" class="dock-windows">
          <div
            v-for="tab in windowTabs"
            :key="tab.id"
            class="dock-tab"
            :class="{ active: tab.id === desktop.activeWindowId }"
            role="tab"
            :aria-selected="tab.id === desktop.activeWindowId"
            :aria-label="tab.title"
            tabindex="0"
            @click="activateTab(tab)"
            @keydown.enter.prevent="activateTab(tab)"
            @contextmenu.prevent="showTabContextMenu($event, tab)"
          >
            <q-icon
              :name="tab.icon"
              :size="isMobile ? '16px' : '14px'"
              :color="tab.id === desktop.activeWindowId ? 'white' : tab.iconColor"
            />
            <span class="dock-tab-title" :title="tab.title">{{ tab.title }}</span>
            <q-btn
              v-show="!isMobile"
              class="dock-tab-minimize"
              round flat dense size="xs"
              icon="mdi-minus"
              @click.stop="desktop.toggleMinimize(tab.id)"
              :aria-label="t('common.minimize')"
            />
            <q-btn
              class="dock-tab-close"
              round flat dense size="xs"
              icon="mdi-close"
              @click.stop="desktop.closeWindow(tab.id)"
              :aria-label="t('common.close')"
            />
          </div>
        </TransitionGroup>
      </div>

      <!-- Scroll right button -->
      <button
        v-if="canScrollRight"
        class="dock-scroll-btn dock-scroll-right"
        @click="scrollTabs(1)"
        :aria-label="t('common.scrollRight')"
      >
        <q-icon name="mdi-chevron-right" size="16px" />
      </button>

      <!-- Window count + minimize all -->
      <div v-if="windowTabs.length > 0" class="dock-window-actions">
        <span class="dock-window-count">{{ windowTabs.length }}</span>
        <q-btn
          v-show="!isMobile"
          class="dock-minimize-all"
          round flat dense size="xs"
          icon="mdi-minus-box-outline"
          @click="minimizeAll"
          :title="t('common.minimizeAll')"
        />
      </div>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <Transition name="context-menu">
        <div
          v-if="contextMenu.show"
          class="dock-context-menu"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
          @contextmenu.prevent
        >
          <div
            v-for="item in contextMenu.items"
            :key="item.label"
            class="context-menu-item"
            :class="{ destructive: item.destructive }"
            @click="item.action(); contextMenu.show = false"
          >
            <q-icon :name="item.icon" size="16px" />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import { useGroupsStore, SYSTEM_GROUP_ID, FAVORITES_GROUP_ID } from '../composables/useGroupsStore'
import { useDesktopStore, type WindowInfo } from '../composables/useDesktopStore'
import { useLcI18n } from '../i18n'

const groupsStore = useGroupsStore()
const desktop = useDesktopStore()
const { t } = useLcI18n()

const dockRef = ref<HTMLElement | null>(null)
const groupsRef = ref<HTMLElement | null>(null)
const windowsRef = ref<HTMLElement | null>(null)

// Responsive state
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isMobile = computed(() => windowWidth.value < 600)
const isTablet = computed(() => windowWidth.value >= 600 && windowWidth.value < 1024)
const isCompact = computed(() => windowWidth.value < 768)

// Scroll state
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// Context menu state
const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  items: [] as Array<{ label: string; icon: string; action: () => void; destructive?: boolean }>,
})

// Long-press state
let longPressTimer: ReturnType<typeof setTimeout> | null = null
const LONG_PRESS_DURATION = 500

const fixedGroups = computed(() => {
  const all = groupsStore.groups ?? []
  return all.filter(g => g.id === SYSTEM_GROUP_ID || g.id === FAVORITES_GROUP_ID)
})

const customGroups = computed(() => {
  const all = groupsStore.groups ?? []
  return all.filter(g => g.id !== SYSTEM_GROUP_ID && g.id !== FAVORITES_GROUP_ID)
})

const windowTabs = computed(() => {
  return desktop.sortedWindows.filter(w => !w.groupId)
})

function translatedName(groupId: string): string {
  if (groupId === SYSTEM_GROUP_ID) return t('common.system')
  if (groupId === FAVORITES_GROUP_ID) return t('common.favorites')
  const group = groupsStore.groups.find(g => g.id === groupId)
  if (!group) return groupId
  return t(group.name)
}

function openGroupWorkspace(groupId: string, name: string, icon: string) {
  const screenType = '_group-' + groupId
  const brought = desktop.bringToFrontIfOpen(screenType)
  if (!brought) {
    desktop.openWindow(screenType, name, icon)
  }
  groupsStore.setActiveGroup(groupId)
  hapticFeedback()
}

function isGroupActive(groupId: string): boolean {
  const screenType = '_group-' + groupId
  const wins = desktop.getWindowsByType(screenType)
  return wins.some(w => w.id === desktop.activeWindowId)
}

function openWindowCount(groupId: string): number {
  return Object.values(desktop.windows).filter(w => w.groupId === groupId).length
}

function activateTab(tab: WindowInfo) {
  if (tab.isMinimized) {
    desktop.toggleMinimize(tab.id)
  } else {
    desktop.bringToFront(tab.id)
  }
  hapticFeedback()
}

function minimizeAll() {
  for (const w of windowTabs.value) {
    if (!w.isMinimized) desktop.toggleMinimize(w.id)
  }
}

// Haptic feedback (vibration API)
function hapticFeedback() {
  if (isMobile.value && navigator.vibrate) {
    navigator.vibrate(10)
  }
}

// Touch handlers for long-press
function onTouchStart(e: TouchEvent, group: { id: string; name: string; icon: string }) {
  longPressTimer = setTimeout(() => {
    const touch = e.touches[0]
    if (touch) {
      showContextMenuAt(touch.clientX, touch.clientY, group)
      hapticFeedback()
    }
  }, LONG_PRESS_DURATION)
}

function onTouchEnd(_e: TouchEvent, _group: unknown) {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

// Context menu
function showContextMenu(e: MouseEvent, group: { id: string; name: string; icon: string }) {
  showContextMenuAt(e.clientX, e.clientY, group)
}

function showContextMenuAt(x: number, y: number, group: { id: string; name: string; icon: string }) {
  const screenType = '_group-' + group.id
  const wins = desktop.getWindowsByType(screenType)
  const items: Array<{ label: string; icon: string; action: () => void; destructive?: boolean }> = []

  items.push({
    label: t('common.open'),
    icon: 'mdi-open-in-app',
    action: () => openGroupWorkspace(group.id, translatedName(group.id), group.icon),
  })

  if (wins.length > 0) {
    items.push({
      label: t('common.closeAll'),
      icon: 'mdi-close-box-multiple',
      action: () => {
        for (const w of wins) desktop.closeWindow(w.id)
      },
      destructive: true,
    })
  }

  // Position: keep within viewport
  const menuWidth = 180
  const menuHeight = items.length * 40 + 16
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8)
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8)

  contextMenu.x = adjustedX
  contextMenu.y = adjustedY
  contextMenu.items = items
  contextMenu.show = true
}

function showTabContextMenu(e: MouseEvent, tab: WindowInfo) {
  const items = [
    {
      label: t('common.minimize'),
      icon: 'mdi-window-minimize',
      action: () => desktop.toggleMinimize(tab.id),
    },
    {
      label: t('common.maximize'),
      icon: 'mdi-window-maximize',
      action: () => desktop.toggleMaximize(tab.id),
    },
    {
      label: t('common.close'),
      icon: 'mdi-close',
      action: () => desktop.closeWindow(tab.id),
      destructive: true,
    },
  ]

  const menuWidth = 180
  const menuHeight = items.length * 40 + 16
  const adjustedX = Math.min(e.clientX, window.innerWidth - menuWidth - 8)
  const adjustedY = Math.min(e.clientY, window.innerHeight - menuHeight - 8)

  contextMenu.x = adjustedX
  contextMenu.y = adjustedY
  contextMenu.items = items
  contextMenu.show = true
}

// Scroll tabs
function scrollTabs(direction: number) {
  if (windowsRef.value) {
    windowsRef.value.scrollBy({ left: direction * 150, behavior: 'smooth' })
  }
}

function updateScrollState() {
  if (windowsRef.value) {
    canScrollLeft.value = windowsRef.value.scrollLeft > 5
    canScrollRight.value = windowsRef.value.scrollLeft < windowsRef.value.scrollWidth - windowsRef.value.clientWidth - 5
  }
}

// Close context menu on outside click
function closeContextMenu() {
  contextMenu.show = false
}

// Resize observer
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('touchstart', closeContextMenu)

  nextTick(() => {
    if (windowsRef.value) {
      windowsRef.value.addEventListener('scroll', updateScrollState)
      updateScrollState()
    }
  })

  resizeObserver = new ResizeObserver(() => {
    updateScrollState()
  })
  if (dockRef.value) {
    resizeObserver.observe(dockRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('touchstart', closeContextMenu)
  if (longPressTimer) clearTimeout(longPressTimer)
  resizeObserver?.disconnect()
})

function onResize() {
  windowWidth.value = window.innerWidth
  nextTick(updateScrollState)
}
</script>

<style lang="scss" scoped>
.desktop-dock {
  position: fixed;
  bottom: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 8000;

  &.is-mobile {
    bottom: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    left: 8px;
    right: 8px;
    transform: none;
  }
}

.glass-dock {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  max-width: 95vw;
  background: var(--lc-dock-bg, color-mix(in srgb, var(--lc-surface, #ffffff) 92%, transparent));
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid var(--lc-dock-border, var(--lc-border, rgba(0, 0, 0, 0.12)));
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  transition: background-color 0.3s ease, border-color 0.3s ease;

  .is-mobile & {
    padding: 6px 8px;
    gap: 4px;
    border-radius: 20px;
    max-width: 100%;
  }

  .is-tablet & {
    max-width: 98vw;
  }
}

// Scroll buttons
.dock-scroll-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--lc-on-surface, #333) 8%, transparent);
  color: var(--lc-on-surface-variant, #666);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
  padding: 0;

  &:hover {
    background: color-mix(in srgb, var(--lc-primary, #1565C0) 12%, transparent);
    color: var(--lc-primary, #1565C0);
  }

  .is-mobile & {
    display: none;
  }
}

.dock-groups {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 1;
  min-width: 0;
}

.dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
  color: var(--lc-on-surface-muted, #666);
  min-height: 44px;
  min-width: 44px;

  .is-mobile & {
    padding: 8px 12px;
    min-height: 48px;
    min-width: 48px;
  }

  &:focus-visible {
    outline: 2px solid var(--lc-primary, #1565C0);
    outline-offset: 2px;
  }

  &:hover {
    background: color-mix(in srgb, var(--lc-primary, #1565C0) 8%, transparent);
    color: var(--lc-primary, #1565C0);
    transform: translateY(-3px);

    .dock-icon { transform: scale(1.1); }
  }

  &:active {
    transform: translateY(-1px) scale(0.96);
    transition-duration: 0.08s;
  }

  &.active {
    color: var(--lc-primary, #1565C0);
    .dock-label { color: var(--lc-primary, #1565C0); font-weight: 600; }
  }
}

.dock-item-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.dock-icon {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-active-pill {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 3px;
  border-radius: 2px;
  background: var(--lc-primary, #1565C0);

  .is-mobile & {
    width: 20px;
    height: 4px;
  }
}

.dock-label {
  font-size: 11px;
  color: var(--lc-on-surface-muted, #888);
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dock-badge {
  position: absolute;
  top: 2px;
  inset-inline-end: 2px;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  padding: 0 4px;
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
  background: var(--lc-negative, #C10015);
  color: white;
  z-index: 1;
  pointer-events: none;

  .is-mobile & {
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    font-size: 10px;
    line-height: 16px;
  }
}

.dock-divider {
  width: 1px;
  height: 28px;
  background: var(--lc-border, rgba(0, 0, 0, 0.12));
  flex-shrink: 0;
  margin: 0 4px;

  .is-mobile & {
    height: 24px;
    margin: 0 2px;
  }
}

.dock-windows-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.dock-windows {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }

  .is-mobile & {
    gap: 2px;
  }
}

.dock-tab {
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
  flex-shrink: 0;

  .is-mobile & {
    padding: 6px 10px;
    font-size: 13px;
    gap: 6px;
  }

  &:hover {
    background: color-mix(in srgb, var(--lc-on-surface, #333) 8%, transparent);
    color: var(--lc-on-surface, #333);
    transform: translateY(-1px);

    .dock-tab-minimize, .dock-tab-close { opacity: 0.6; }
  }

  &:active {
    transform: translateY(0) scale(0.97);
    transition-duration: 0.06s;
  }

  &.active {
    background: var(--lc-primary, #1565c0);
    color: var(--lc-on-primary, white);
    font-weight: 500;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--lc-primary, #1565c0) 25%, transparent);

    .dock-tab-minimize, .dock-tab-close { color: rgba(255,255,255,0.7); }
    .dock-tab-minimize:hover, .dock-tab-close:hover { opacity: 1 !important; color: white; }
  }

  .q-icon { pointer-events: none; font-size: 1em; }
}

.dock-tab-title {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;

  .is-mobile & {
    max-width: 70px;
  }
}

.dock-tab-minimize,
.dock-tab-close {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.dock-window-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-inline-start: 4px;
  flex-shrink: 0;
}

.dock-window-count {
  font-size: 10px;
  font-weight: 600;
  color: var(--lc-on-surface-variant, #999);
  background: color-mix(in srgb, var(--lc-on-surface-variant, #999) 10%, transparent);
  border-radius: 8px;
  padding: 1px 6px;
  min-width: 16px;
  text-align: center;

  .is-mobile & {
    font-size: 11px;
    padding: 2px 8px;
  }
}

.dock-minimize-all {
  opacity: 0.5;
  &:hover { opacity: 1; }
}

// Context Menu
.dock-context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 160px;
  background: var(--lc-surface, #ffffff);
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.12));
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(20px);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--lc-on-surface, #333);
  transition: background 0.12s ease;
  min-height: 36px;

  &:hover {
    background: color-mix(in srgb, var(--lc-primary, #1565C0) 8%, transparent);
  }

  &.destructive {
    color: var(--lc-negative, #C10015);
    &:hover {
      background: color-mix(in srgb, var(--lc-negative, #C10015) 8%, transparent);
    }
  }
}

// Transitions
.active-pill-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.active-pill-leave-active { transition: all 0.2s ease; }
.active-pill-enter-from { opacity: 0; width: 0; transform: translateX(-50%); }
.active-pill-leave-to { opacity: 0; width: 0; transform: translateX(-50%); }

.badge-pop-enter-active { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.badge-pop-leave-active { transition: all 0.15s ease; }
.badge-pop-enter-from { opacity: 0; transform: scale(0.5); }
.badge-pop-leave-to { opacity: 0; transform: scale(0.5); }

.dock-tab-enter-active,
.dock-tab-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dock-tab-enter-from {
  opacity: 0;
  transform: scale(0.85) translateX(-8px);
}
.dock-tab-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
.dock-tab-move {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-menu-enter-active { transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); }
.context-menu-leave-active { transition: all 0.1s ease; }
.context-menu-enter-from { opacity: 0; transform: scale(0.95); }
.context-menu-leave-to { opacity: 0; transform: scale(0.95); }

// Responsive
@media (max-width: 599px) {
  .dock-tab-title { max-width: 60px; }
  .dock-tab-minimize { display: none; }
}

@media (hover: none) and (pointer: coarse) {
  .dock-item {
    padding: 8px 12px;
    min-height: 48px;
  }
  .dock-tab {
    padding: 8px 10px;
    font-size: 13px;
    gap: 6px;
  }
  .dock-tab-minimize { display: none; }
  .dock-tab-close {
    opacity: 0.5;
    &:active { opacity: 1; }
  }
}

@media (prefers-reduced-motion: reduce) {
  .dock-item, .glass-dock, .dock-icon, .dock-active-pill, .dock-tab,
  .badge-pop-enter-active, .badge-pop-leave-active,
  .active-pill-enter-active, .active-pill-leave-active,
  .dock-tab-enter-active, .dock-tab-leave-active, .dock-tab-move,
  .context-menu-enter-active, .context-menu-leave-active {
    transition: none !important;
    animation: none !important;
  }
}

// Performance: reduce glass effect on low-end devices
@media (prefers-reduced-motion: reduce) {
  .glass-dock {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
}
</style>
