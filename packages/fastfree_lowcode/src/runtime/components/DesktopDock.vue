<template>
  <div
    class="lc-dock"
    v-if="fixedGroups.length > 0"
    :class="{ 'lc-dock--mobile': isMobile, 'lc-dock--tablet': isTablet, 'lc-dock--icons-only': iconsOnly }"
    role="toolbar"
    :aria-label="t('common.dock')"
  >
    <div class="lc-dock__bar" ref="dockRef">
      <!-- Groups section -->
      <div class="lc-dock__groups" ref="groupsRef">
        <button
          v-for="(group, idx) in allGroups"
          :key="group.id"
          class="lc-dock__item"
          :class="{
            'lc-dock__item--active': isGroupActive(group.id),
            'lc-dock__item--fav': group.id === FAVORITES_GROUP_ID,
          }"
          :style="{ animationDelay: `${idx * 40}ms` }"
          :aria-label="translatedName(group.id)"
          :aria-selected="isGroupActive(group.id)"
          :title="translatedName(group.id)"
          role="tab"
          tabindex="0"
          @click="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
          @keydown.enter.prevent="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
          @keydown.space.prevent="openGroupWorkspace(group.id, translatedName(group.id), group.icon)"
          @touchstart.passive="onTouchStart($event, group)"
          @touchend="onTouchEnd"
          @contextmenu.prevent="showContextMenu($event, group)"
        >
          <q-icon :name="group.icon" :size="isMobile ? '20px' : '18px'" class="lc-dock__icon" />
          <span class="lc-dock__label">{{ translatedName(group.id) }}</span>
          <span v-if="isGroupActive(group.id)" class="lc-dock__pill" />
          <span
            v-if="openWindowCount(group.id) > 0"
            class="lc-dock__badge"
            :key="openWindowCount(group.id)"
          >
            {{ openWindowCount(group.id) > 99 ? '99+' : openWindowCount(group.id) }}
          </span>
        </button>
      </div>

      <!-- Scroll fade -->
      <div v-if="groupsOverflow" class="lc-dock__fade lc-dock__fade--left" />
      <div v-if="groupsOverflow" class="lc-dock__fade lc-dock__fade--right" />

      <!-- Windows section -->
      <template v-if="windowTabs.length > 0">
        <div class="lc-dock__sep" />
        <div class="lc-dock__windows" ref="windowsRef">
          <div
            v-for="tab in windowTabs"
            :key="tab.id"
            class="lc-dock__tab"
            :class="{ 'lc-dock__tab--active': tab.id === desktop.activeWindowId, 'lc-dock__tab--min': tab.isMinimized }"
            role="tab"
            :aria-selected="tab.id === desktop.activeWindowId"
            :aria-label="tab.title"
            tabindex="0"
            @click="activateTab(tab)"
            @keydown.enter.prevent="activateTab(tab)"
            @contextmenu.prevent="showTabContextMenu($event, tab)"
          >
            <q-icon :name="tab.icon" :size="isMobile ? '14px' : '13px'" />
            <span class="lc-dock__tab-title" :title="tab.title">{{ tab.title }}</span>
            <q-btn
              v-show="!isMobile"
              class="lc-dock__tab-close"
              round flat dense size="xs"
              icon="mdi-close"
              @click.stop="desktop.closeWindow(tab.id)"
              :aria-label="t('common.close')"
            />
          </div>
        </div>
        <div class="lc-dock__win-count">{{ windowTabs.length }}</div>
      </template>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <Transition name="ctx">
        <div
          v-if="contextMenu.show"
          class="lc-dock__ctx"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
          @touchstart.stop
          @contextmenu.prevent
        >
          <div
            v-for="item in contextMenu.items"
            :key="item.label"
            class="lc-dock__ctx-item"
            :class="{ 'lc-dock__ctx-item--danger': item.destructive }"
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

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isMobile = computed(() => windowWidth.value < 600)
const isTablet = computed(() => windowWidth.value >= 600 && windowWidth.value < 1024)

const groupsOverflow = ref(false)
const iconsOnly = ref(false)

// Approximate width per dock item when a label is shown (mobile/desktop differ).
const ITEM_WITH_LABEL_WIDTH = 96

const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  items: [] as Array<{ label: string; icon: string; action: () => void; destructive?: boolean }>,
})

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

const allGroups = computed(() => [...fixedGroups.value, ...customGroups.value])

const windowTabs = computed(() => desktop.sortedWindows.filter(w => !w.groupId))

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
  if (!brought) desktop.openWindow(screenType, name, icon)
  groupsStore.setActiveGroup(groupId)
  hapticFeedback()
}

function isGroupActive(groupId: string): boolean {
  const screenType = '_group-' + groupId
  return desktop.getWindowsByType(screenType).some(w => w.id === desktop.activeWindowId)
}

function openWindowCount(groupId: string): number {
  return Object.values(desktop.windows).filter(w => w.groupId === groupId).length
}

function activateTab(tab: WindowInfo) {
  if (tab.isMinimized) desktop.toggleMinimize(tab.id)
  else desktop.bringToFront(tab.id)
  hapticFeedback()
}

function hapticFeedback() {
  if (isMobile.value && navigator.vibrate) navigator.vibrate(10)
}

function onTouchStart(e: TouchEvent, group: { id: string; name: string; icon: string }) {
  longPressTimer = setTimeout(() => {
    const touch = e.touches[0]
    if (touch) { showContextMenuAt(touch.clientX, touch.clientY, group); hapticFeedback() }
  }, LONG_PRESS_DURATION)
}

function onTouchEnd() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}

function showContextMenu(e: MouseEvent, group: { id: string; name: string; icon: string }) {
  showContextMenuAt(e.clientX, e.clientY, group)
}

function showContextMenuAt(x: number, y: number, group: { id: string; name: string; icon: string }) {
  const wins = desktop.getWindowsByType('_group-' + group.id)
  const items: Array<{ label: string; icon: string; action: () => void; destructive?: boolean }> = [
    { label: t('common.open'), icon: 'mdi-open-in-app', action: () => openGroupWorkspace(group.id, translatedName(group.id), group.icon) },
  ]
  if (wins.length > 0) {
    items.push({ label: t('common.closeAll'), icon: 'mdi-close-box-multiple', action: () => { for (const w of wins) desktop.closeWindow(w.id) }, destructive: true })
  }
  const mw = 180, mh = items.length * 40 + 16
  contextMenu.x = Math.min(x, window.innerWidth - mw - 8)
  contextMenu.y = Math.min(y, window.innerHeight - mh - 8)
  contextMenu.items = items
  contextMenu.show = true
}

function showTabContextMenu(e: MouseEvent, tab: WindowInfo) {
  const items = [
    { label: t('common.minimize'), icon: 'mdi-window-minimize', action: () => desktop.toggleMinimize(tab.id) },
    { label: t('common.maximize'), icon: 'mdi-window-maximize', action: () => desktop.toggleMaximize(tab.id) },
    { label: t('common.close'), icon: 'mdi-close', action: () => desktop.closeWindow(tab.id), destructive: true },
  ]
  const mw = 180, mh = items.length * 40 + 16
  contextMenu.x = Math.min(e.clientX, window.innerWidth - mw - 8)
  contextMenu.y = Math.min(e.clientY, window.innerHeight - mh - 8)
  contextMenu.items = items
  contextMenu.show = true
}

function updateGroupsScrollState() {
  if (groupsRef.value) {
    const el = groupsRef.value
    groupsOverflow.value = el.scrollWidth > el.clientWidth + 2
    // Adaptive density: if all 9 groups cannot fit with labels, go icons-only
    // so nothing is clipped and every group stays reachable.
    const count = allGroups.value.length
    const needed = count * ITEM_WITH_LABEL_WIDTH + (count - 1) * 2
    iconsOnly.value = count > 0 && needed > el.clientWidth
  }
}

function closeContextMenu() { contextMenu.show = false }

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('click', closeContextMenu)
  nextTick(updateGroupsScrollState)
  resizeObserver = new ResizeObserver(updateGroupsScrollState)
  if (dockRef.value) resizeObserver.observe(dockRef.value)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', closeContextMenu)
  if (longPressTimer) clearTimeout(longPressTimer)
  resizeObserver?.disconnect()
})

function onResize() {
  windowWidth.value = window.innerWidth
  nextTick(updateGroupsScrollState)
}
</script>

<style lang="scss" scoped>
// ── Dock container ──
.lc-dock {
  position: fixed;
  bottom: 10px;
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 8000;

  &--mobile {
    bottom: 6px;
    bottom: calc(6px + env(safe-area-inset-bottom, 0px));
    left: 6px;
    right: 6px;
    transform: none;
  }
}

// ── Glass bar ──
.lc-dock__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  max-width: 95vw;
  background: var(--lc-dock-bg, color-mix(in srgb, var(--lc-surface, #ffffff) 88%, transparent));
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--lc-dock-border, var(--lc-border, rgba(0, 0, 0, 0.1)));
  border-radius: 14px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: box-shadow 0.3s ease;

  .lc-dock--mobile & {
    padding: 4px 6px;
    gap: 2px;
    border-radius: 16px;
    max-width: 100%;
  }
}

// ── Groups section ──
.lc-dock__groups {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  position: relative;
  flex: 1;
  min-width: 0;

  &::-webkit-scrollbar { display: none; }

  .lc-dock--mobile & { gap: 1px; }
}

// ── Scroll fade ──
.lc-dock__fade {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  z-index: 2;
  pointer-events: none;

  &--left {
    left: 0;
    background: linear-gradient(to right, var(--lc-dock-bg, rgba(255,255,255,0.95)) 0%, transparent 100%);
  }
  &--right {
    right: 0;
    background: linear-gradient(to left, var(--lc-dock-bg, rgba(255,255,255,0.95)) 0%, transparent 100%);
  }
}

// ── Dock item ──
.lc-dock__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  color: var(--lc-on-surface-variant, #555);
  min-width: 0;
  transition: background 0.15s ease, color 0.15s ease;
  animation: lc-dock-in 0.3s ease both;

  .lc-dock--mobile & {
    padding: 4px 6px;
    min-width: 0;
  }

  &:focus-visible {
    outline: 2px solid var(--lc-primary, #1565C0);
    outline-offset: 2px;
  }

  &:hover {
    background: color-mix(in srgb, var(--lc-primary, #1565C0) 10%, transparent);
    color: var(--lc-primary, #1565C0);
  }

  &:active {
    transform: scale(0.92);
    transition-duration: 0.06s;
  }

  &--active {
    color: var(--lc-primary, #1565C0);
    background: color-mix(in srgb, var(--lc-primary, #1565C0) 8%, transparent);

    .lc-dock__label { font-weight: 600; }
  }
}

.lc-dock__icon {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.lc-dock__item:hover .lc-dock__icon {
  transform: scale(1.15);
}

// ── Icons-only mode ──
// Hide labels and enlarge the icons so every group fits without clipping.
.lc-dock--icons-only {
  .lc-dock__label { display: none; }
  .lc-dock__item { padding-inline: 10px; }
  .lc-dock__icon { font-size: 22px !important; }
}

.lc-dock__label {
  font-size: 10px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 56px;
  text-align: center;
  direction: auto;
  line-height: 1.2;

  .lc-dock--mobile & {
    font-size: 9px;
    max-width: 48px;
  }
}

// ── Active pill ──
.lc-dock__pill {
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 2.5px;
  border-radius: 2px;
  background: var(--lc-primary, #1565C0);
  animation: lc-pill-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);

  .lc-dock--mobile & { width: 16px; height: 3px; }
}

// ── Badge ──
.lc-dock__badge {
  position: absolute;
  top: 0;
  inset-inline-end: 0;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  padding: 0 3px;
  font-size: 8px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
  background: var(--lc-negative, #C10015);
  color: #fff;
  pointer-events: none;
  animation: lc-badge-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

// ── Separator ──
.lc-dock__sep {
  width: 1px;
  height: 24px;
  background: var(--lc-border, rgba(0, 0, 0, 0.1));
  flex-shrink: 0;
  margin: 0 2px;

  .lc-dock--mobile & { height: 20px; margin: 0 1px; }
}

// ── Window tabs ──
.lc-dock__windows {
  display: flex;
  align-items: center;
  gap: 3px;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
  min-width: 0;
  &::-webkit-scrollbar { display: none; }
}

.lc-dock__tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 11px;
  color: var(--lc-on-surface-variant, #666);
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s ease;

  &:hover { background: color-mix(in srgb, var(--lc-on-surface, #333) 8%, transparent); }

  &--active {
    background: var(--lc-primary, #1565c0);
    color: var(--lc-on-primary, white);
    font-weight: 500;
    .q-icon { color: var(--lc-on-primary, white); }
  }

  &--min { opacity: 0.5; font-style: italic; }
}

.lc-dock__tab-title {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  .lc-dock--mobile & { max-width: 50px; }
}

.lc-dock__tab-close {
  opacity: 0;
  transition: opacity 0.15s ease;
}
.lc-dock__tab:hover .lc-dock__tab-close { opacity: 0.5; }

.lc-dock__win-count {
  font-size: 9px;
  font-weight: 600;
  color: var(--lc-on-surface-variant, #999);
  background: color-mix(in srgb, var(--lc-on-surface-variant, #999) 10%, transparent);
  border-radius: 6px;
  padding: 1px 5px;
  flex-shrink: 0;
}

// ── Context menu ──
.lc-dock__ctx {
  position: fixed;
  z-index: 10000;
  min-width: 150px;
  background: var(--lc-surface, #fff);
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.1));
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.lc-dock__ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--lc-on-surface, #333);
  transition: background 0.1s ease;

  &:hover { background: color-mix(in srgb, var(--lc-primary, #1565C0) 8%, transparent); }

  &--danger {
    color: var(--lc-negative, #C10015);
    &:hover { background: color-mix(in srgb, var(--lc-negative, #C10015) 8%, transparent); }
  }
}

// ── Animations ──
@keyframes lc-dock-in {
  from { opacity: 0; transform: translateY(6px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes lc-pill-in {
  from { opacity: 0; width: 0; }
  to   { opacity: 1; }
}

@keyframes lc-badge-pop {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}

// Subtle "breathing" pulse on the active / hovered icon so the grey resting
// state still reads as interactive.
@keyframes lc-icon-pulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(21, 101, 192, 0)); }
  50%      { transform: scale(1.18); filter: drop-shadow(0 0 6px var(--lc-primary, #1565C0)); }
}
.lc-dock__item--active .lc-dock__icon,
.lc-dock__item:hover .lc-dock__icon {
  animation: lc-icon-pulse 1.6s ease-in-out infinite;
}

.ctx-enter-active { transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1); }
.ctx-leave-active { transition: all 0.08s ease; }
.ctx-enter-from, .ctx-leave-to { opacity: 0; transform: scale(0.95); }

// ── Responsive ──
@media (hover: none) and (pointer: coarse) {
  .lc-dock__tab-close { opacity: 0.3; }
}

@media (prefers-reduced-motion: reduce) {
  .lc-dock__item, .lc-dock__pill, .lc-dock__badge,
  .lc-dock__item .lc-dock__icon,
  .ctx-enter-active, .ctx-leave-active {
    animation: none !important;
    transition: none !important;
  }
}

// ── RTL ──
[dir="rtl"] {
  .lc-dock__label { direction: rtl; }
  .lc-dock__fade--left {
    left: auto; right: 0;
    background: linear-gradient(to left, var(--lc-dock-bg, rgba(255,255,255,0.95)) 0%, transparent 100%);
  }
  .lc-dock__fade--right {
    right: auto; left: 0;
    background: linear-gradient(to right, var(--lc-dock-bg, rgba(255,255,255,0.95)) 0%, transparent 100%);
  }
}
</style>
