import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { getSharedConfig } from "../shared-config";

export interface WindowInfo {
  id: string;
  screenType: string;
  title: string;
  icon: string;
  iconColor?: string;
  isMinimized: boolean;
  isMaximized: boolean;
  width: number;
  height: number;
  left: number;
  top: number;
  groupId?: string;
  props?: Record<string, unknown>;
}

export interface DesktopStoreOptions {
  storeId?: string;
  storageKey?: string;
  persistState?: boolean;
}

const DEFAULT_STORAGE_KEY = "lc-open-windows";
const STORAGE_VERSION = 2;

let windowIdCounter = 0;

export function createDesktopStore(options?: DesktopStoreOptions) {
  return defineStore(options?.storeId ?? "desktop", () => {
    const cfg = getSharedConfig();
    const persistState =
      options?.persistState ?? cfg.desktop.persistState ?? false;
    const storedWindowsKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;
    const activeWindowId = ref<string | null>(null);
    const windows = ref<Record<string, WindowInfo>>({});
    const openedOrder = ref<string[]>([]);

    const preMaximizedBounds = ref<
      Record<
        string,
        { width: number; height: number; left: number; top: number }
      >
    >({});

    const lastBoundsCache = ref<
      Record<
        string,
        { width: number; height: number; left: number; top: number }
      >
    >({});

    const sortedWindows = computed(() => {
      const orderSet = new Set(openedOrder.value);
      const ordered = openedOrder.value
        .map((id) => windows.value[id])
        .filter((w): w is WindowInfo => !!w);
      const rest = Object.values(windows.value).filter(
        (w): w is WindowInfo => !orderSet.has(w.id),
      );
      return [...ordered, ...rest];
    });

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    function handlePageHide() {
      flushSessionSave();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", handlePageHide);
    }

    const hasMaximizedWindow = computed(() =>
      sortedWindows.value.some((w) => w.isMaximized && !w.isMinimized),
    );

    function isWindowOpen(id: string) {
      return !!windows.value[id];
    }

    function getOpenCount(screenType: string): number {
      return Object.values(windows.value).filter(
        (w) => w.screenType === screenType,
      ).length;
    }

    function getWindowsByType(screenType: string): WindowInfo[] {
      return Object.values(windows.value).filter(
        (w) => w.screenType === screenType,
      );
    }

    function saveSessionState() {
      if (!persistState) return;
      const arr = Object.values(windows.value)
        .filter((w): w is WindowInfo => w.screenType !== "splash")
        .map((w) => ({
          screenType: w.screenType,
          title: w.title,
          icon: w.icon,
          iconColor: w.iconColor,
          groupId: w.groupId,
          isMinimized: w.isMinimized,
          isMaximized: w.isMaximized,
          width: w.width,
          height: w.height,
          left: w.left,
          top: w.top,
          ...(w.props !== undefined ? { props: w.props } : {}),
        }));
      try {
        localStorage.setItem(
          storedWindowsKey,
          JSON.stringify({
            version: STORAGE_VERSION,
            windows: arr,
            boundsCache: lastBoundsCache.value,
          }),
        );
      } catch (e) {
        console.warn("[useDesktopStore]", e);
      }
    }

    function openWindow(
      screenType: string,
      title: string,
      icon: string,
      persist?: boolean,
      unmaximizeOthers?: boolean,
      groupId?: string,
      iconColor?: string,
      props?: Record<string, unknown>,
    ): string | undefined {
      const screenCfg = cfg.desktop.screens?.[screenType];
      if (screenCfg?.maxInstances) {
        const count = getOpenCount(screenType);
        if (count >= screenCfg.maxInstances) return;
      }

      if (screenType.startsWith("_group-")) {
        const existing = getWindowsByType(screenType);
        if (existing.length > 0) {
          const last = existing[existing.length - 1];
          if (last) {
            if (last.isMinimized) toggleMinimize(last.id);
            else bringToFront(last.id);
          }
          return last?.id;
        }
      }

      if (unmaximizeOthers !== false) {
        for (const id of Object.keys(windows.value)) {
          if (windows.value[id]) {
            windows.value[id].isMaximized = false;
          }
        }
      }

      const id = `${screenType}-${Date.now()}-${windowIdCounter++}`;

      const w = screenCfg?.defaultWidth ?? cfg.desktop.defaultWidth ?? 900;
      const h = screenCfg?.defaultHeight ?? cfg.desktop.defaultHeight ?? 550;
      const headerH = cfg.desktop.headerHeight ?? 56;
      const dockH = cfg.desktop.dockHeight ?? 77;
      const usableW = window.innerWidth;
      const usableH = window.innerHeight - headerH - dockH;
      const cached = lastBoundsCache.value[screenType];
      let clampedW: number;
      let clampedH: number;
      let left: number;
      let top: number;
      if (cached) {
        clampedW = Math.max(1, Math.min(cached.width, usableW - 20));
        clampedH = Math.max(1, Math.min(cached.height, usableH - 20));
        left = Math.max(
          0,
          Math.min(Math.round(cached.left), Math.max(0, usableW - clampedW)),
        );
        top = Math.max(
          headerH,
          Math.min(
            Math.round(cached.top),
            Math.max(headerH, usableH - clampedH),
          ),
        );
      } else {
        clampedW = Math.max(1, Math.min(w, usableW - 20));
        clampedH = Math.max(1, Math.min(h, usableH - 20));
        left = Math.max(0, Math.round((usableW - clampedW) / 2));
        top = Math.max(headerH, Math.round(headerH + (usableH - clampedH) / 2));
      }

      windows.value[id] = {
        id,
        screenType,
        title,
        icon,
        ...(iconColor !== undefined ? { iconColor } : {}),
        isMinimized: false,
        isMaximized: screenCfg?.maximizeOnOpen ?? false,
        width: clampedW,
        height: clampedH,
        left,
        top,
        ...(groupId !== undefined ? { groupId } : {}),
        ...(props !== undefined ? { props } : {}),
      };

      openedOrder.value.push(id);
      bringToFront(id);
      if (persist !== false) {
        saveSessionState();
      }
      return id;
    }

    function closeWindow(id: string) {
      const win = windows.value[id];
      if (win) {
        lastBoundsCache.value[win.screenType] = {
          width: win.width,
          height: win.height,
          left: win.left,
          top: win.top,
        };
      }
      delete windows.value[id];
      delete preMaximizedBounds.value[id];
      openedOrder.value = openedOrder.value.filter((w) => w !== id);

      if (activeWindowId.value === id) {
        const lastOpenedId = openedOrder.value[openedOrder.value.length - 1];
        activeWindowId.value = lastOpenedId ?? null;
      }
      saveSessionState();
    }

    function bringToFront(id: string) {
      if (!windows.value[id]) return;
      openedOrder.value = openedOrder.value.filter((w) => w !== id);
      openedOrder.value.push(id);
      activeWindowId.value = id;
    }

    function toggleMaximize(id: string) {
      const win = windows.value[id];
      if (!win) return;
      if (win.isMinimized) {
        win.isMinimized = false;
        bringToFront(id);
      }
      if (win.isMaximized) {
        const saved = preMaximizedBounds.value[id];
        if (saved) {
          win.width = saved.width;
          win.height = saved.height;
          win.left = saved.left;
          win.top = saved.top;
        }
        win.isMaximized = false;
      } else {
        preMaximizedBounds.value[id] = {
          width: win.width,
          height: win.height,
          left: win.left,
          top: win.top,
        };
        win.isMaximized = true;
      }
      saveSessionState();
    }

    function toggleMinimize(id: string) {
      const win = windows.value[id];
      if (!win) return;

      win.isMinimized = !win.isMinimized;

      if (win.isMinimized) {
        openedOrder.value = openedOrder.value.filter((w) => w !== id);
        if (activeWindowId.value === id) {
          for (let i = openedOrder.value.length - 1; i >= 0; i--) {
            const candidate = openedOrder.value[i];
            if (candidate && !windows.value[candidate]?.isMinimized) {
              bringToFront(candidate);
              return;
            }
          }
          activeWindowId.value = null;
        }
      } else {
        bringToFront(id);
      }
      saveSessionState();
    }

    function bringToFrontIfOpen(screenType: string): boolean {
      const matches = Object.values(windows.value).filter(
        (w) => w.screenType === screenType,
      );
      if (matches.length === 0) return false;
      const last = matches[matches.length - 1];
      if (!last) return false;
      if (last.isMinimized) {
        toggleMinimize(last.id);
      } else {
        bringToFront(last.id);
      }
      return true;
    }

    function flushSessionSave() {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      saveSessionState();
    }

    function updateWindowBounds(
      id: string,
      bounds: { width?: number; height?: number; left?: number; top?: number },
    ) {
      const win = windows.value[id];
      if (!win) return;
      if (
        bounds.width !== undefined &&
        Number.isFinite(bounds.width) &&
        bounds.width > 0
      )
        win.width = bounds.width;
      if (
        bounds.height !== undefined &&
        Number.isFinite(bounds.height) &&
        bounds.height > 0
      )
        win.height = bounds.height;
      if (bounds.left !== undefined && Number.isFinite(bounds.left))
        win.left = bounds.left;
      if (bounds.top !== undefined && Number.isFinite(bounds.top))
        win.top = bounds.top;
      lastBoundsCache.value[win.screenType] = {
        width: win.width,
        height: win.height,
        left: win.left,
        top: win.top,
      };
      if (saveTimer !== null) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = null;
        saveSessionState();
      }, 300);
    }

    // Re-clamp all open windows to the current viewport (rotation, keyboard
    // resize, split-screen). Without this a window opened on desktop sizes
    // slides under the dock/notch when the viewport shrinks.
    let viewportTimer: ReturnType<typeof setTimeout> | null = null;
    function reconcileViewport() {
      if (typeof window === "undefined") return;
      const headerH = cfg.desktop.headerHeight ?? 56;
      const dockH = cfg.desktop.dockHeight ?? 77;
      const vw = window.innerWidth;
      const vh = window.innerHeight - headerH - dockH;
      let changed = false;
      for (const id of Object.keys(windows.value)) {
        const win = windows.value[id];
        if (!win || win.isMaximized) continue;
        const nextWidth = Math.max(1, Math.min(win.width, vw - 20));
        const nextHeight = Math.max(1, Math.min(win.height, vh - 20));
        const nextLeft = Math.max(
          0,
          Math.min(win.left, Math.max(0, vw - nextWidth)),
        );
        const nextTop = Math.max(
          headerH,
          Math.min(win.top, Math.max(headerH, vh - nextHeight)),
        );
        if (win.width !== nextWidth) {
          win.width = nextWidth;
          changed = true;
        }
        if (win.height !== nextHeight) {
          win.height = nextHeight;
          changed = true;
        }
        if (win.left !== nextLeft) {
          win.left = nextLeft;
          changed = true;
        }
        if (win.top !== nextTop) {
          win.top = nextTop;
          changed = true;
        }
      }
      if (changed) {
        for (const id of Object.keys(windows.value)) {
          const win = windows.value[id];
          if (!win || win.isMaximized) continue;
          lastBoundsCache.value[win.screenType] = {
            width: win.width,
            height: win.height,
            left: win.left,
            top: win.top,
          };
        }
        flushSessionSave();
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", () => {
        if (viewportTimer !== null) clearTimeout(viewportTimer);
        viewportTimer = setTimeout(() => {
          viewportTimer = null;
          reconcileViewport();
        }, 250);
      });
    }

    function reorderWindows(
      fromId: string,
      toId: string,
      side?: "before" | "after",
    ) {
      const order = openedOrder.value;
      const fromIdx = order.indexOf(fromId);
      const toIdx = order.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      order.splice(fromIdx, 1);
      const insertAt = order.indexOf(toId);
      if (side === "after") {
        order.splice(insertAt + 1, 0, fromId);
      } else {
        order.splice(insertAt, 0, fromId);
      }
      if (
        activeWindowId.value &&
        order[order.length - 1] !== activeWindowId.value
      ) {
        const activeIdx = order.indexOf(activeWindowId.value);
        if (activeIdx !== -1) {
          order.splice(activeIdx, 1);
          order.push(activeWindowId.value);
        }
      }
    }

    function restoreSessionState(): boolean {
      if (!persistState) return false;
      try {
        const raw = localStorage.getItem(storedWindowsKey);
        if (!raw) return false;
        const payload = JSON.parse(raw);
        if (typeof payload !== "object" || !Array.isArray(payload?.windows))
          return false;
        if (payload.version !== STORAGE_VERSION) {
          localStorage.removeItem(storedWindowsKey);
          return false;
        }
        const cachedBounds = payload.boundsCache;
        if (cachedBounds && typeof cachedBounds === "object") {
          Object.entries(cachedBounds).forEach(([screenType, bounds]) => {
            if (!bounds || typeof bounds !== "object") return;
            const candidate = bounds as Record<string, unknown>;
            const values = [
              candidate.width,
              candidate.height,
              candidate.left,
              candidate.top,
            ];
            if (
              values.every(
                (value) => typeof value === "number" && Number.isFinite(value),
              )
            ) {
              lastBoundsCache.value[screenType] = {
                width: candidate.width as number,
                height: candidate.height as number,
                left: candidate.left as number,
                top: candidate.top as number,
              };
            }
          });
        }
        const saved: {
          screenType: string;
          title: string;
          icon: string;
          iconColor?: string;
          groupId?: string;
          isMinimized?: boolean;
          isMaximized?: boolean;
          width?: number;
          height?: number;
          left?: number;
          top?: number;
          props?: Record<string, unknown>;
        }[] = payload.windows;
        if (saved.length === 0) return false;
        const restoredIds: string[] = [];
        saved.forEach((w) => {
          const screenCfg = cfg.desktop.screens?.[w.screenType];
          const maxI = screenCfg?.maxInstances;
          if (maxI && getOpenCount(w.screenType) >= maxI) return;
          const id = openWindow(
            w.screenType,
            w.title,
            w.icon,
            false,
            false,
            w.groupId,
            w.iconColor,
            w.props,
          );
          if (id) {
            restoredIds.push(id);
            if (windows.value[id]) {
              windows.value[id].isMinimized = !!w.isMinimized;
              windows.value[id].isMaximized = !!w.isMaximized;
              if (w.width !== undefined) windows.value[id].width = w.width;
              if (w.height !== undefined) windows.value[id].height = w.height;
              if (w.left !== undefined) windows.value[id].left = w.left;
              if (w.top !== undefined) windows.value[id].top = w.top;
              // Re-clamp restored bounds to the current viewport: a session
              // saved on desktop would otherwise land off-screen on a phone.
              const rHeaderH = cfg.desktop.headerHeight ?? 56;
              const rDockH = cfg.desktop.dockHeight ?? 77;
              const rVw =
                typeof window !== "undefined" ? window.innerWidth : 1024;
              const rVh =
                (typeof window !== "undefined" ? window.innerHeight : 768) -
                rHeaderH -
                rDockH;
              const rw = windows.value[id];
              if (rw) {
                rw.width = Math.max(1, Math.min(rw.width, rVw - 20));
                rw.height = Math.max(1, Math.min(rw.height, rVh - 20));
                rw.left = Math.max(0, Math.min(rw.left, rVw - rw.width));
                rw.top = Math.max(rHeaderH, Math.min(rw.top, rVh - rw.height));
                lastBoundsCache.value[w.screenType] = {
                  width: rw.width,
                  height: rw.height,
                  left: rw.left,
                  top: rw.top,
                };
              }
            }
          }
        });
        if (
          activeWindowId.value &&
          windows.value[activeWindowId.value]?.isMinimized
        ) {
          let found = false;
          for (let i = openedOrder.value.length - 1; i >= 0; i--) {
            const pid = openedOrder.value[i];
            if (pid && !windows.value[pid]?.isMinimized) {
              activeWindowId.value = pid;
              found = true;
              break;
            }
          }
          if (!found) {
            activeWindowId.value = null;
          }
        }
        saveSessionState();
        return true;
      } catch (e) {
        console.warn("[useDesktopStore]", e);
        return false;
      }
    }

    function clearSessionState() {
      try {
        localStorage.removeItem(storedWindowsKey);
      } catch (e) {
        console.warn("[useDesktopStore]", e);
      }
    }

    function resetState() {
      windows.value = {};
      openedOrder.value = [];
      activeWindowId.value = null;
      preMaximizedBounds.value = {};
      lastBoundsCache.value = {};
      clearSessionState();
    }

    return {
      activeWindowId,
      windows,
      openedOrder,
      sortedWindows,
      hasMaximizedWindow,
      isWindowOpen,
      getOpenCount,
      getWindowsByType,
      openWindow,
      closeWindow,
      bringToFront,
      toggleMinimize,
      toggleMaximize,
      bringToFrontIfOpen,
      updateWindowBounds,
      flushSessionSave,
      reorderWindows,
      restoreSessionState,
      clearSessionState,
      resetState,
    };
  });
}

export const useDesktopStore = createDesktopStore();
