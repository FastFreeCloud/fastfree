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
}

export interface DesktopStoreOptions {
  storeId?: string;
  storageKey?: string;
  persistState?: boolean;
}

const DEFAULT_STORAGE_KEY = "lc-open-windows";
const STORAGE_VERSION = 1;

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

    const hasMaximizedWindow = computed(() =>
      sortedWindows.value.some((w) => w.isMaximized && !w.isMinimized),
    );

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === storedWindowsKey) {
          location.reload();
        }
      });
    }

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
        }));
      try {
        localStorage.setItem(
          storedWindowsKey,
          JSON.stringify({ version: STORAGE_VERSION, windows: arr }),
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
        clampedW = Math.min(cached.width, usableW - 20);
        clampedH = Math.min(cached.height, usableH - 20);
        left = Math.max(0, Math.min(Math.round(cached.left), usableW - clampedW));
        top = Math.max(
          headerH,
          Math.min(Math.round(cached.top), usableH - clampedH),
        );
      } else {
        clampedW = Math.min(w, usableW - 20);
        clampedH = Math.min(h, usableH - 20);
        left = Math.max(0, Math.round((usableW - clampedW) / 2));
        top = Math.max(
          headerH,
          Math.round(headerH + (usableH - clampedH) / 2),
        );
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
        activeWindowId.value =
          openedOrder.value.length > 0
            ? openedOrder.value[openedOrder.value.length - 1]!
            : null;
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
      if (bounds.width !== undefined) win.width = bounds.width;
      if (bounds.height !== undefined) win.height = bounds.height;
      if (bounds.left !== undefined) win.left = bounds.left;
      if (bounds.top !== undefined) win.top = bounds.top;
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
        }[] = payload.windows;
        if (saved.length === 0) return false;
        const restoredIds: string[] = [];
        saved.forEach((w) => {
          const screenCfg = cfg.desktop.screens?.[w.screenType];
          const maxI = screenCfg?.maxInstances;
          if (maxI && getOpenCount(w.screenType) >= maxI) return;
          const id = openWindow(w.screenType, w.title, w.icon, false, false, w.groupId, w.iconColor);
          if (id) {
            restoredIds.push(id);
            if (windows.value[id]) {
              windows.value[id].isMinimized = !!w.isMinimized;
              windows.value[id].isMaximized = !!w.isMaximized;
              if (w.width !== undefined) windows.value[id].width = w.width;
              if (w.height !== undefined) windows.value[id].height = w.height;
              if (w.left !== undefined) windows.value[id].left = w.left;
              if (w.top !== undefined) windows.value[id].top = w.top;
              if (w.width !== undefined && w.height !== undefined && w.left !== undefined && w.top !== undefined) {
                lastBoundsCache.value[w.screenType] = {
                  width: w.width,
                  height: w.height,
                  left: w.left,
                  top: w.top,
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
