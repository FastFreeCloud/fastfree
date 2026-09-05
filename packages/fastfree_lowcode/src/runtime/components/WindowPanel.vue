<template>
  <transition name="window-pop" appear>
    <div class="window-panel" :class="{ active: isActive, minimized: info.isMinimized, maximized: info.isMaximized }"
      :style="windowStyle" v-show="!info.isMinimized">
      <template v-if="!info.isMaximized">
        <div class="resize-handle top" @mousedown.stop="startResize($event, 'top')" @touchstart.prevent.stop="startResize($event, 'top')" />
        <div class="resize-handle bottom" @mousedown.stop="startResize($event, 'bottom')" @touchstart.prevent.stop="startResize($event, 'bottom')" />
        <div class="resize-handle left" @mousedown.stop="startResize($event, 'left')" @touchstart.prevent.stop="startResize($event, 'left')" />
        <div class="resize-handle right" @mousedown.stop="startResize($event, 'right')" @touchstart.prevent.stop="startResize($event, 'right')" />
        <div class="resize-handle top-left" @mousedown.stop="startResize($event, 'top-left')" @touchstart.prevent.stop="startResize($event, 'top-left')" />
        <div class="resize-handle top-right" @mousedown.stop="startResize($event, 'top-right')" @touchstart.prevent.stop="startResize($event, 'top-right')" />
        <div class="resize-handle bottom-left" @mousedown.stop="startResize($event, 'bottom-left')" @touchstart.prevent.stop="startResize($event, 'bottom-left')" />
        <div class="resize-handle bottom-right" @mousedown.stop="startResize($event, 'bottom-right')" @touchstart.prevent.stop="startResize($event, 'bottom-right')" />
      </template>
      <div class="window-titlebar" @mousedown="startDrag" @touchstart="startDrag">
        <div class="titlebar-left">
          <q-icon :name="info.icon" size="16px" color="white" />
          <span class="titlebar-title">{{ info.title }}</span>
        </div>
        <div class="titlebar-actions">
          <slot name="titlebar-actions" />
        </div>
        <div class="titlebar-right">
          <q-btn v-if="!props.info.screenType.startsWith('_group-')" round flat dense size="xs"
            :icon="isFav ? 'mdi-star' : 'mdi-star-outline'"
            class="fav-btn" :class="{ 'fav-active': isFav }"
            @click.stop="toggleFav">
            <q-tooltip>{{ isFav ? t('common.removeFromFavorites') : t('common.addToFavorites') }}</q-tooltip>
          </q-btn>
          <q-btn v-if="printable" round flat dense size="xs" icon="print"
            @click.stop="$emit('print')">
            <q-tooltip>{{ t('common.print') }}</q-tooltip>
          </q-btn>
          <q-btn round flat dense size="xs" icon="mdi-minus"
            :aria-label="t('common.minimize')"
            @click.stop="desktop.toggleMinimize(info.id)" />
          <q-btn round flat dense size="xs"
            :icon="info.isMaximized ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
            :aria-label="t('common.maximize')"
            @click.stop="desktop.toggleMaximize(info.id)" />
          <q-btn round flat dense size="xs" icon="mdi-close" color="negative"
            :aria-label="t('common.close')"
            @click.stop="desktop.closeWindow(info.id)" />
        </div>
      </div>
      <div class="window-content" ref="contentRef" tabindex="-1" @click="desktop.bringToFront(info.id)" @dblclick="restoreIfMaximized">
        <slot />
      </div>
      <div v-if="info.isMaximized" class="window-restore-bar" :class="{ 'auto-show': autoShowRestore }">
        <div class="restore-bar-inner" @click="desktop.toggleMaximize(info.id)">
          <q-icon :name="info.icon" size="14px" color="white" />
          <span class="restore-title">{{ info.title }}</span>
          <q-btn round flat dense size="xs" icon="mdi-minus" color="white"
            @click.stop="desktop.toggleMinimize(info.id)" />
          <q-btn round flat dense size="xs" icon="mdi-fullscreen-exit" color="white"
            :aria-label="t('common.maximize')"
            @click.stop="desktop.toggleMaximize(info.id)" />
          <q-btn round flat dense size="xs" icon="mdi-close" color="white"
            :aria-label="t('common.close')"
            @click.stop="desktop.closeWindow(info.id)" />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useDesktopStore, type WindowInfo } from '../composables/useDesktopStore'
import { useGroupsStore } from '../composables/useGroupsStore'
import { useLcI18n } from '../i18n'
import { getSharedConfig } from '../shared-config'

const props = defineProps<{
  info: WindowInfo
  printable?: boolean
}>()

const emit = defineEmits<{
  print: []
}>()

const desktop = useDesktopStore()
const groupsStore = useGroupsStore()
const { t } = useLcI18n()
const cfg = getSharedConfig()
const headerHeight = cfg.desktop.headerHeight ?? 56

const isFav = computed(() => groupsStore.isFavoritePage(props.info.screenType))

function toggleFav() {
  groupsStore.toggleFavoritePage(props.info.screenType, props.info.title, props.info.icon)
}

const isActive = computed(() => desktop.activeWindowId === props.info.id)

const zIndex = computed(() => 2000 + desktop.openedOrder.indexOf(props.info.id))

const windowStyle = computed(() => {
  if (props.info.isMaximized) {
    return { zIndex: 99999 }
  }
  return {
    left: `${props.info.left}px`,
    top: `${props.info.top}px`,
    width: `${props.info.width}px`,
    height: `${props.info.height}px`,
    zIndex: zIndex.value,
  }
})

const contentRef = ref<HTMLElement | null>(null)

watch(isActive, (active) => {
  if (active) {
    nextTick(() => contentRef.value?.focus())
  }
})

const autoShowRestore = ref(true)
onMounted(() => {
  setTimeout(() => { autoShowRestore.value = false }, 3000)
})

// Drag to move
let dragState: { startX: number; startY: number; left: number; top: number } | null = null
let dragMoved = false

function getClientXY(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ('touches' in e && e.touches.length > 0) {
    return { clientX: e.touches[0]?.clientX ?? 0, clientY: e.touches[0]?.clientY ?? 0 }
  }
  return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY }
}

function startDrag(e: MouseEvent | TouchEvent) {
  if (props.info.isMaximized) return
  if ((e.target as HTMLElement).closest('.q-btn')) return
  // Prevent touch scrolling only when actually starting a drag on the
  // titlebar background — never on buttons, or taps won't produce clicks.
  if ('touches' in e) e.preventDefault()
  const { clientX, clientY } = getClientXY(e)
  dragState = { startX: clientX, startY: clientY, left: props.info.left, top: props.info.top }
  dragMoved = false
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onTouchDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!dragState) return
  onDragMove(e.clientX, e.clientY)
  if (e.clientY <= 0) {
    desktop.toggleMaximize(props.info.id)
    stopDrag()
  }
}

function onTouchDrag(e: TouchEvent) {
  if (!dragState) return
  const touch = e.touches[0]
  if (!touch) return
  onDragMove(touch.clientX, touch.clientY)
  if (touch.clientY <= 0) {
    desktop.toggleMaximize(props.info.id)
    stopDrag()
  }
}

function onDragMove(clientX: number, clientY: number) {
  if (!dragState) return
  if (Math.abs(clientX - dragState.startX) > 3 || Math.abs(clientY - dragState.startY) > 3) {
    dragMoved = true
  }
  const dx = clientX - dragState.startX
  const dy = clientY - dragState.startY
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxLeft = Math.max(0, vw - props.info.width)
  const newLeft = Math.max(0, Math.min(maxLeft, dragState.left + dx))
  const maxTop = Math.max(headerHeight, vh - props.info.height)
  const newTop = Math.max(headerHeight, Math.min(maxTop, dragState.top + dy))
  desktop.updateWindowBounds(props.info.id, { left: newLeft, top: newTop })
}

function stopDrag() {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onTouchDrag)
  document.removeEventListener('touchend', stopDrag)
  if (!dragMoved) {
    desktop.bringToFront(props.info.id)
  }
  dragState = null
  desktop.flushSessionSave()
}

// Resize
const MIN_WIDTH = 300
const MIN_HEIGHT = 200

let resizeState: {
  handle: string
  startX: number
  startY: number
  bounds: { left: number; top: number; width: number; height: number }
} | null = null

function startResize(e: MouseEvent | TouchEvent, handle: string) {
  if (props.info.isMaximized) return
  e.stopPropagation()
  const { clientX, clientY } = getClientXY(e)
  resizeState = {
    handle,
    startX: clientX,
    startY: clientY,
    bounds: { left: props.info.left, top: props.info.top, width: props.info.width, height: props.info.height },
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', onTouchResize, { passive: false })
  document.addEventListener('touchend', stopResize)
}

function onResize(e: MouseEvent) { onResizeMove(e.clientX, e.clientY) }

function onTouchResize(e: TouchEvent) {
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return
  onResizeMove(touch.clientX, touch.clientY)
}

function onResizeMove(clientX: number, clientY: number) {
  if (!resizeState) return
  const { handle, startX, startY, bounds } = resizeState
  const dx = clientX - startX
  const dy = clientY - startY
  let { left, top, width, height } = bounds
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (handle.includes('right')) {
    width = Math.max(MIN_WIDTH, Math.min(vw - left, bounds.width + dx))
  }
  if (handle.includes('left')) {
    const maxRight = left + width
    width = Math.max(MIN_WIDTH, bounds.width - dx)
    left = maxRight - width
    left = Math.max(0, left)
  }
  if (handle.includes('bottom')) {
    height = Math.max(MIN_HEIGHT, Math.min(vh - top, bounds.height + dy))
  }
  if (handle.includes('top')) {
    const maxBottom = top + height
    height = Math.max(MIN_HEIGHT, bounds.height - dy)
    top = maxBottom - height
    top = Math.max(headerHeight, top)
  }

  width = Math.min(width, vw - left)
  height = Math.min(height, vh - top)

  desktop.updateWindowBounds(props.info.id, { left, top, width, height })
}

function stopResize() {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', onTouchResize)
  document.removeEventListener('touchend', stopResize)
  resizeState = null
  desktop.flushSessionSave()
}

function restoreIfMaximized() {
  if (props.info.isMaximized) {
    desktop.toggleMaximize(props.info.id)
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onTouchDrag)
  document.removeEventListener('touchend', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', onTouchResize)
  document.removeEventListener('touchend', stopResize)
})
</script>

<style lang="scss" scoped>
.window-panel {
  position: fixed;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--lc-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--lc-surface-alt, var(--lc-surface));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: background-color 0.3s ease, border-color 0.2s ease;

  &.active {
    box-shadow: 0 8px 32px color-mix(in srgb, var(--lc-primary) 20%, transparent);
    border-color: var(--lc-primary);
  }

  &.maximized {
    position: fixed;
    inset: 0;
    border-radius: 0;
    border: none;
    box-shadow: none;
    z-index: 99999;

    .window-titlebar { display: none; }
  }
}

.resize-handle {
  position: absolute;
  z-index: 1;
  user-select: none;

  &.top, &.bottom {
    left: 4px;
    right: 4px;
    height: 6px;
  }
  &.top { top: -3px; cursor: n-resize; }
  &.bottom { bottom: -3px; cursor: s-resize; }

  &.left, &.right {
    top: 4px;
    bottom: 4px;
    width: 6px;
  }
  &.left { left: -3px; cursor: w-resize; }
  &.right { right: -3px; cursor: e-resize; }

  &.top-left { top: -3px; left: -3px; width: 10px; height: 10px; cursor: nw-resize; }
  &.top-right { top: -3px; right: -3px; width: 10px; height: 10px; cursor: ne-resize; }
  &.bottom-left { bottom: -3px; left: -3px; width: 10px; height: 10px; cursor: sw-resize; }
  &.bottom-right {
    bottom: -3px;
    right: -3px;
    width: 12px;
    height: 12px;
    cursor: se-resize;

    &::after {
      content: '';
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 6px;
      height: 6px;
      border-right: 2px solid var(--lc-on-surface-muted, #999);
      border-bottom: 2px solid var(--lc-on-surface-muted, #999);
      opacity: 0.4;
    }
  }
}

.window-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, var(--lc-primary-dark), var(--lc-primary));
  min-height: 36px;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;

  .q-icon {
    color: var(--lc-on-primary, #ffffff);
  }
}

.titlebar-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--lc-on-primary, #ffffff);
}

.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 2px;

  .q-btn {
    color: color-mix(in srgb, var(--lc-on-primary, #ffffff) 80%, transparent);

    &:hover {
      color: var(--lc-on-primary, #ffffff);
      background: color-mix(in srgb, var(--lc-on-primary, #ffffff) 10%, transparent);
    }
  }

  .fav-btn {
    &.fav-active {
      color: #ffc107;
    }
  }
}

.window-content {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--lc-surface);
  transition: background-color 0.3s ease;
}

.maximized .window-content {
  padding: 0;
}

.window-restore-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 100000;
}

.restore-bar-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: color-mix(in srgb, var(--lc-surface-alt, #000000) 80%, transparent);
  backdrop-filter: blur(4px);
  color: var(--lc-on-primary, #ffffff);
  border-radius: 0 0 8px 8px;
  font-size: 12px;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0.4;
  transition: opacity 0.2s, background-color 0.3s ease, color 0.3s ease;
}

.restore-bar-inner:hover {
  opacity: 1;
}

.window-restore-bar.auto-show .restore-bar-inner {
  opacity: 1;
}

.restore-title {
  font-size: 12px;
  font-weight: 500;
}

.window-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.window-pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.window-pop-enter-from {
  opacity: 0;
  transform: scale(0.92);
}
.window-pop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>