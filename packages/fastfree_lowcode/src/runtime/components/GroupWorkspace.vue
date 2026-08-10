<template>
  <div
    class="group-workspace fit column q-pa-lg"
    @keydown="handleKeydown"
    tabindex="0"
    ref="workspaceRef"
  >
    <div class="group-workspace-scroll">
      <!-- Top bar: Search -->
      <div class="cosmic-topbar">
        <div class="cosmic-search">
          <q-input
            v-model="searchQuery"
            :placeholder="t('groups.search')"
            dense
            outlined
            clearable
            class="search-input"
            debounce="200"
            ref="searchInput"
          >
            <template v-slot:prepend>
              <q-icon name="mdi-magnify" size="20px" color="grey-5" />
            </template>
            <template v-slot:append>
              <span class="search-count-inline">
                {{ filteredPages.length }} / {{ group?.pages.length ?? 0 }}
              </span>
            </template>
          </q-input>
        </div>
      </div>

      <!-- Pinned Apps Section -->
      <Transition name="fade" appear>
        <div v-if="pinnedPages.length > 0 && !searchQuery" class="pinned-section">
          <div class="section-label">
            <q-icon name="mdi-pin" size="16px" />
            <span>{{ t("groups.pinned") }}</span>
          </div>
          <div class="pinned-scroll">
            <div
              v-for="page in pinnedPages"
              :key="page.screenType"
              class="pinned-chip"
              @click="openPage(page)"
            >
              <q-icon :name="page.icon" size="18px" />
              <span>{{ t(page.label) }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- App Grid -->
      <TransitionGroup
        v-if="filteredPages.length > 0"
        name="app-item"
        tag="div"
        class="cosmic-grid"
        appear
      >
        <div
          v-for="(page, idx) in filteredPages"
          :key="page.id"
          class="cosmic-app-item"
          :class="{ active: selectedIdx === idx }"
          @click.stop="openPage(page)"
          @mouseenter="selectedIdx = idx"
        >
          <div class="cosmic-app-icon-wrap" :style="getIconStyle(page)">
            <q-icon
              :name="page.icon"
              size="42px"
              class="cosmic-app-icon"
            />
            <q-btn
              class="cosmic-action-btn cosmic-pin-btn"
              :class="{ 'is-pinned': isPinnedPage(page.screenType) }"
              :icon="isPinnedPage(page.screenType) ? 'mdi-pin' : 'mdi-pin-outline'"
              :color="isPinnedPage(page.screenType) ? 'primary' : 'grey-5'"
              size="xs"
              flat
              dense
              round
              :aria-label="t('common.pin')"
              @click.stop="togglePinnedPage(page.screenType)"
              :title="
                isPinnedPage(page.screenType) ? t('groups.unpin') : t('groups.pin')
              "
            />
            <q-btn
              class="cosmic-action-btn cosmic-fav-btn"
              :class="{ 'is-fav': groupsStore.isFavoritePage(page.screenType) }"
              :icon="
                groupsStore.isFavoritePage(page.screenType)
                  ? 'mdi-star'
                  : 'mdi-star-outline'
              "
              :color="
                groupsStore.isFavoritePage(page.screenType) ? 'yellow' : 'grey-5'
              "
              size="xs"
              flat
              dense
              round
              :aria-label="groupsStore.isFavoritePage(page.screenType) ? t('common.removeFromFavorites') : t('common.addToFavorites')"
              @click.stop="toggleFavorite(page)"
            />
          </div>
          <div class="cosmic-app-info">
            <div class="cosmic-app-label">{{ t(page.label) }}</div>
            <div class="cosmic-app-type">{{ page.screenType }}</div>
          </div>
        </div>
      </TransitionGroup>
      <div v-else-if="group && searchQuery" class="empty-state">
        <q-icon name="mdi-file-search-outline" size="64px" />
        <div class="text-subtitle1 q-mt-sm">{{ t("groups.noResults") }}</div>
        <div class="text-caption text-grey-5">{{ t("groups.tryDifferent") }}</div>
      </div>

      <div v-else-if="group" class="empty-state">
        <q-icon name="mdi-inbox-outline" size="64px" />
        <div class="text-subtitle1 q-mt-sm">{{ t("groups.empty") }}</div>
      </div>

      <WindowSwitcherBar :window-filter="isGroupWindow" position="static" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { QInput } from "quasar";
import { useGroupsStore } from "../composables/useGroupsStore";
import { useDesktopStore, type WindowInfo } from "../composables/useDesktopStore";
import { useLcI18n } from "../i18n";
import type { GroupPage } from "../composables/useGroupsStore";
import WindowSwitcherBar from "./WindowSwitcherBar.vue";

const props = defineProps<{
  groupId: string;
}>();

const groupsStore = useGroupsStore();
const desktop = useDesktopStore();
const { t } = useLcI18n();

const searchQuery = ref("");
const selectedIdx = ref(-1);
const workspaceRef = ref<HTMLElement | null>(null);
const searchInput = ref<InstanceType<typeof QInput> | null>(null);

watch(searchQuery, () => {
  selectedIdx.value = -1;
});

const group = computed(
  () => groupsStore.groups.find((g) => g.id === props.groupId) || null,
);

const isGroupWindow = (w: WindowInfo) => {
  return w.groupId === props.groupId;
};

const pinnedPages = computed(() => {
  if (!group.value) return [];
  return group.value.pages.filter((p) => p.pinned);
});

function togglePinnedPage(screenType: string) {
  groupsStore.togglePinnedPage(screenType);
}

function isPinnedPage(screenType: string): boolean {
  return groupsStore.isPinnedPage(screenType);
}

function normalizeText(s: string): string {
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "")
    .replace(/[\u0622\u0623\u0625\u0627]/g, "ا")
    .replace(/[\u0649]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

function pageMatches(page: GroupPage, query: string): boolean {
  const q = normalizeText(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const translated = normalizeText(t(page.label));
  const haystacks = [
    translated,
    normalizeText(page.screenType),
    normalizeText(page.label),
    normalizeText(page.icon.replace(/^mdi-/, "")),
  ];
  return tokens.every((token) =>
    haystacks.some((h) => h.includes(token)),
  );
}

const filteredPages = computed(() => {
  if (!group.value) return [];
  const q = searchQuery.value.trim();
  if (!q) return group.value.pages;
  return group.value.pages.filter((page) => pageMatches(page, q));
});

const colors = [
  "#1565C0",
  "#7B1FA2",
  "#C62828",
  "#2E7D32",
  "#E65100",
  "#00838F",
  "#4527A0",
  "#AD1457",
  "#F9A825",
  "#00897B",
  "#5D4037",
  "#37474F",
];

function getIconStyle(page: GroupPage) {
  let hash = 0;
  for (let i = 0; i < page.screenType.length; i++) {
    hash = ((hash << 5) - hash + page.screenType.charCodeAt(i)) | 0;
  }
  const color = colors[Math.abs(hash) % colors.length];
  return {
    "--icon-color": color,
    background: `${color}14`,
  };
}

function openPage(page: GroupPage) {
  const brought = desktop.bringToFrontIfOpen(page.screenType);
  if (!brought) {
    desktop.openWindow(page.screenType, t(page.label), page.icon, undefined, undefined, props.groupId);
  }
}

function toggleFavorite(page: GroupPage) {
  groupsStore.toggleFavoritePage(page.screenType, page.label, page.icon);
}

function handleKeydown(e: KeyboardEvent) {
  const total = filteredPages.value.length;
  if (total === 0) return;

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    selectedIdx.value = (selectedIdx.value + 1) % total;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    selectedIdx.value = (selectedIdx.value - 1 + total) % total;
  } else if (e.key === "Enter" && selectedIdx.value >= 0) {
    e.preventDefault();
    const page = filteredPages.value[selectedIdx.value];
    if (page) openPage(page);
  } else if (e.key === "/" || e.key === "F2") {
    e.preventDefault();
    searchInput.value?.focus?.();
  } else if (e.key === "Escape") {
    searchQuery.value = "";
    searchInput.value?.blur?.();
  }
}

onMounted(() => {
  workspaceRef.value?.focus();
});
</script>

<style lang="scss" scoped>
.group-workspace {
  background: var(--lc-surface, #f5f5f5);
  outline: none;

  &:focus-visible {
    outline: none;
  }
}

.group-workspace-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
}

.cosmic-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 800px;
  margin-bottom: 24px;
}

.cosmic-search {
  flex: 1;

  .search-input {
    :deep(.q-field__control) {
      border-radius: 24px;
      background: color-mix(
        in srgb,
        var(--lc-surface, #ffffff) 80%,
        transparent
      );
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      padding: 0 16px;
    }
  }
}

.search-count-inline {
  font-size: 12px;
  font-weight: 600;
  color: var(--lc-on-surface-variant, #666);
  background: var(--lc-surface-container, #f0f0f0);
  border-radius: 12px;
  padding: 2px 10px;
  white-space: nowrap;
  user-select: none;
}

.cosmic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 20px 16px;
  width: 100%;
  max-width: 800px;
  justify-items: center;
}

.cosmic-app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 120px;
  position: relative;

  &:hover,
  &.active {
    background: color-mix(in srgb, var(--lc-primary, #1565c0) 8%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

    .cosmic-app-icon-wrap {
      transform: scale(1.05);
    }

    .cosmic-fav-btn {
      opacity: 0.7;
    }

    .cosmic-pin-btn {
      opacity: 0.7;
    }
  }

  &:active {
    transform: translateY(0);
  }
}

.cosmic-app-icon-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--lc-border, rgba(0, 0, 0, 0.06));
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.cosmic-app-icon {
  color: var(--icon-color, var(--lc-on-surface, #333));
  transition: all 0.2s ease;
}

.cosmic-action-btn {
  position: absolute;
  top: 2px;
  z-index: 3;
  opacity: 0;
  transition: all 0.2s ease;
  background: var(--lc-surface, #fff) !important;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  pointer-events: auto;

  .cosmic-app-item:hover &,
  .cosmic-app-item.active & {
    opacity: 0.7;
  }

  .cosmic-app-icon-wrap:hover & {
    opacity: 1;
    transform: scale(1.1);
  }

  &:hover {
    opacity: 1 !important;
    transform: scale(1.15);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
  }

  &.is-fav,
  &.is-fav:hover {
    opacity: 1 !important;
    transform: scale(1) !important;
    color: #ffd700 !important;
  }

  &.is-pinned,
  &.is-pinned:hover {
    opacity: 1 !important;
    transform: scale(1) !important;
    color: var(--q-color-primary, #1976d2) !important;
  }

  .cosmic-app-item:hover &.is-fav,
  .cosmic-app-item.active &.is-fav,
  .cosmic-app-item:hover &.is-pinned,
  .cosmic-app-item.active &.is-pinned {
    opacity: 1 !important;
    transform: scale(1) !important;
  }
}

.cosmic-fav-btn { inset-inline-end: -6px; }
.cosmic-pin-btn { inset-inline-start: -6px; }

.cosmic-app-info {
  text-align: center;
  min-width: 0;
}

.cosmic-app-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--lc-on-surface, #333);
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cosmic-app-type {
  font-size: 10px;
  color: var(--lc-on-surface-variant, #999);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 64px;
  color: var(--lc-on-surface-variant, #999);
}

@media (max-width: 600px) {
  .cosmic-topbar {
    flex-wrap: wrap;
  }

  .cosmic-grid {
    grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    gap: 16px 8px;

    .cosmic-app-icon-wrap {
      width: 60px;
      height: 60px;
      border-radius: 14px;
    }

    .cosmic-app-icon {
      font-size: 36px !important;
    }

    .cosmic-action-btn {
      width: 14px !important;
      height: 14px !important;
      min-width: 14px !important;
      opacity: 1;
    }

    .cosmic-fav-btn { inset-inline-end: -4px; color: #ffd700 !important; }
    .cosmic-pin-btn { inset-inline-start: -4px; }
  }

  .cosmic-app-label {
    font-size: 11px;
  }
  .cosmic-app-type {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-app-item,
  .cosmic-app-icon-wrap,
  .cosmic-app-icon,
  .cosmic-fav-btn,
  .cosmic-pin-btn {
    transition: none;
  }
}

.app-item-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.app-item-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
}
.app-item-enter-from {
  opacity: 0;
  transform: scale(0.85) translateY(8px);
}
.app-item-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
.app-item-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.pinned-section {
  width: 100%;
  max-width: 800px;
  margin-bottom: 24px;
}

.pinned-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
}

.pinned-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--lc-primary, #1565c0) 10%, transparent);
  color: var(--lc-primary, #1565c0);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--lc-primary, #1565c0) 18%, transparent);
    transform: translateY(-1px);
  }
}
</style>
