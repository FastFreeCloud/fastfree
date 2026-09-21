<template>
  <div
    v-if="allGroups.length > 0"
    class="lc-dock"
    :class="{ 'lc-dock--mobile': isMobile, 'lc-dock--tablet': isTablet }"
    role="toolbar"
    :aria-label="t('common.dock')"
  >
    <div class="lc-dock__bar">
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
        <q-icon :name="group.icon" class="lc-dock__icon" />
        <span v-if="!isMobile" class="lc-dock__label">{{ translatedName(group.id) }}</span>
        <span
          v-if="openWindowCount(group.id) > 0"
          class="lc-dock__badge"
          :key="openWindowCount(group.id)"
        >
          {{ openWindowCount(group.id) > 99 ? '99+' : openWindowCount(group.id) }}
        </span>
        <span v-if="isGroupActive(group.id)" class="lc-dock__dot" />
      </button>
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
import { computed, ref, reactive, onMounted, onUnmounted } from 'vue'
import { useGroupsStore, SYSTEM_GROUP_ID, FAVORITES_GROUP_ID } from '../composables/useGroupsStore'
import { useDesktopStore } from '../composables/useDesktopStore'
import { useLcI18n } from '../i18n'

const groupsStore = useGroupsStore()
const desktop = useDesktopStore()
const { t } = useLcI18n()

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const isMobile = computed(() => windowWidth.value < 600)
const isTablet = computed(() => windowWidth.value >= 600 && windowWidth.value < 1024)

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
  const screenType = '_group-' + groupId
  return Object.values(desktop.windows).filter(
    w => w.groupId === groupId || w.screenType === screenType,
  ).length
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

function closeContextMenu() { contextMenu.show = false }

function onResize() {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', closeContextMenu)
  if (longPressTimer) clearTimeout(longPressTimer)
})
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
  align-items: stretch;
  gap: 4px;
  padding: 6px;
  max-width: 94vw;
  background: var(--lc-dock-bg, color-mix(in srgb, var(--lc-surface, #ffffff) 90%, transparent));
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  border: 1px solid var(--lc-dock-border, var(--lc-border, rgba(0, 0, 0, 0.1)));
  border-radius: 18px;
  box-shadow:
    0 6px 28px rgba(0, 0, 0, 0.12),
    0 1px 4px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: box-shadow 0.3s ease;

  .lc-dock--mobile & {
    justify-content: space-evenly;
    gap: 2px;
  }
}

// ── Dock item ──
.lc-dock__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 10px;
  min-width: 48px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--lc-on-surface-variant, #555);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  animation: lc-dock-in 0.3s ease both;

  .lc-dock--mobile & {
    flex: 1;
    min-width: 0;
    padding: 6px 4px;
  }

  &:focus-visible {
    outline: 2px solid var(--lc-primary, #1565C0);
    outline-offset: 2px;
  }

  &:hover {
    background: color-mix(in srgb, var(--lc-primary, #1565C0) 10%, transparent);
    color: var(--lc-primary, #1565C0);
    transform: translateY(-2px);
  }

  &:active {
    transform: scale(0.9);
    transition-duration: 0.06s;
  }

  &--active {
    color: var(--lc-on-primary, #fff);
    background: var(--lc-primary, #1565C0);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--lc-primary, #1565C0) 45%, transparent);

    .lc-dock__label { font-weight: 700; }
  }
}

.lc-dock__icon {
  font-size: 20px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.lc-dock__item:hover .lc-dock__icon {
  transform: scale(1.12);
}

.lc-dock--mobile .lc-dock__icon {
  font-size: 22px;
}

.lc-dock__label {
  font-size: 10px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 64px;
  text-align: center;
  direction: auto;
  line-height: 1.2;
}

// ── Active dot ──
.lc-dock__dot {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: lc-pill-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
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
  from { opacity: 0; transform: translateY(8px) scale(0.9); }
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

.ctx-enter-active { transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1); }
.ctx-leave-active { transition: all 0.08s ease; }
.ctx-enter-from, .ctx-leave-to { opacity: 0; transform: scale(0.95); }

// ── Reduced motion ──
@media (prefers-reduced-motion: reduce) {
  .lc-dock__item, .lc-dock__dot, .lc-dock__badge,
  .lc-dock__item .lc-dock__icon,
  .ctx-enter-active, .ctx-leave-active {
    animation: none !important;
    transition: none !important;
  }
}
</style>