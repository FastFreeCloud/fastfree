<template>
  <q-layout view="lHh Lpr lFf">
    <desktop-header
      v-show="!desktop.hasMaximizedWindow"
      :title="title"
      :icon="icon"
      :gradient="gradient"
    >
      <template v-for="(_, name) in $slots" #[name]="slotData" :key="name">
        <slot :name="name" v-bind="slotData ?? {}" />
      </template>
      <template #right v-if="!$slots.right">
        <LcHeaderActions>
          <template #after>
            <slot name="header-right" />
          </template>
        </LcHeaderActions>
      </template>
      <template v-else #right>
        <slot name="right" />
      </template>
    </desktop-header>

    <q-page-container>
      <q-page
        class="lc-desktop-page"
        :class="{ 'has-maximized-window': desktop.hasMaximizedWindow }"
      >
        <div class="lc-desktop-empty" v-if="desktop.sortedWindows.length === 0">
          <q-icon :name="icon" size="64px" color="grey-4" />
          <div class="text-h6 text-grey-5 q-mt-md">{{ title }}</div>
          <div class="text-caption text-grey-5">
            {{ t("common.clickDockHint") }}
          </div>
        </div>

        <template v-for="win in desktop.sortedWindows" :key="win.id">
          <window-panel :info="win">
            <slot :name="`window-${win.screenType}`">
              <GroupWorkspace
                v-if="win.screenType.startsWith('_group-')"
                :group-id="win.screenType.replace('_group-', '')"
              />
              <component
                v-else-if="getScreenComponent(win.screenType)"
                :is="getScreenComponent(win.screenType)"
                v-bind="getScreenProps(win.screenType)"
              />
            </slot>
          </window-panel>
        </template>
      </q-page>
    </q-page-container>

    <desktop-dock />
  </q-layout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useDesktopStore } from "../composables/useDesktopStore";
import { useKeyboardShortcuts } from "../composables/useKeyboardShortcuts";
import { getScreenComponent } from "../composables/screen-registry";
import { useLcI18n } from "../i18n";
import DesktopHeader from "./DesktopHeader.vue";
import DesktopDock from "./DesktopDock.vue";
import WindowPanel from "./WindowPanel.vue";
import LcHeaderActions from "./LcHeaderActions.vue";
import GroupWorkspace from "./GroupWorkspace.vue";

import { getSplashCoordinator } from "../composables/useSplashCoordinator";
import { getThemeStore } from "../composables/useThemeStore";
import { registerBuiltinScreens } from "../composables/screen-registry";

const props = withDefaults(
  defineProps<{
    title?: string;
    icon?: string;
    gradient?: [string, string];
    autoOpenFirst?: boolean;
    screenFilter?: (screenId: string) => boolean;
  }>(),
  {
    title: "Desktop",
    icon: "dashboard",
    gradient: () => ["#0D47A1", "#1565C0"],
    autoOpenFirst: true,
  },
);

const desktop = useDesktopStore();
const keyboard = useKeyboardShortcuts();
const { t } = useLcI18n();

function getScreenProps(screenType: string): Record<string, unknown> {
  if (screenType === "about") {
    return { title: props.title, icon: props.icon };
  }
  return {};
}

onMounted(() => {
  registerBuiltinScreens();
  keyboard.register();
  getSplashCoordinator().setReady();
  desktop.restoreSessionState();
});

onUnmounted(() => {
  keyboard.destroy();
  getThemeStore().destroy();
});
</script>

<style lang="scss" scoped>
.lc-desktop-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.lc-desktop-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0.5;
  user-select: none;
  flex: 1;

  .q-icon {
    opacity: 0.4;
    margin-bottom: 16px;
  }

  .text-h6 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--lc-primary, #1565c0);
    letter-spacing: 0.5px;
  }

  .text-caption {
    font-size: 0.9rem;
    color: #999;
    margin-top: 8px;
  }
}
</style>
