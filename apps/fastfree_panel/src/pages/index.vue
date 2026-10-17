<template>
  <DesktopShell
    title="FastFree Clan OS"
    icon="mdi-shield-crown"
    show-built-in-screens
  />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { DesktopShell, useDesktopStore } from '../lib/lowcode';

const desktopStore = useDesktopStore();

onMounted(() => {
  const existingMachines = desktopStore.getWindowsByType('clan-machines');
  const existingHealth = desktopStore.getWindowsByType('clan-health');

  let id1 = existingMachines[0]?.id;
  if (!id1) {
    id1 = desktopStore.openWindow('clan-machines', 'Machines · الأجهزة', 'mdi-server-network');
  }

  let id2 = existingHealth[0]?.id;
  if (!id2) {
    id2 = desktopStore.openWindow('clan-health', 'System Health · سلامة النظام', 'mdi-heart-pulse');
  }

  // Arrange side-by-side on wide screens for immediate dual-pane workflow
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    const headerH = 56;
    const dockH = 80;
    const totalW = window.innerWidth;
    const totalH = window.innerHeight - headerH - dockH;
    const halfW = Math.max(480, Math.floor((totalW - 24) / 2));
    const winH = Math.max(500, totalH - 16);

    const win1 = id1 ? desktopStore.windows[id1] : undefined;
    if (win1) {
      win1.left = 8;
      win1.top = headerH + 8;
      win1.width = halfW;
      win1.height = winH;
    }

    const win2 = id2 ? desktopStore.windows[id2] : undefined;
    if (win2) {
      win2.left = halfW + 16;
      win2.top = headerH + 8;
      win2.width = halfW;
      win2.height = winH;
    }
  }
});
</script>