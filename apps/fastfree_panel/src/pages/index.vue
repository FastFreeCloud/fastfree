<template>
  <DesktopShell
    title="FastFree Clan OS"
    icon="mdi-shield-crown"
    show-built-in-screens
  >
    <template #window-clan-machines>
      <ClanMachinesScreen />
    </template>
    <template #window-clan-health>
      <ClanHealthScreen />
    </template>
    <template #window-clan-deploy>
      <ClanDeployScreen />
    </template>
    <template #window-clan-herdr>
      <ClanHerdrScreen />
    </template>
    <template #window-clan-network>
      <ClanNetworkScreen />
    </template>
    <template #window-clan-backups>
      <ClanBackupsScreen />
    </template>
    <template #window-clan-secrets>
      <ClanSecretsScreen />
    </template>
    <template #window-clan-vars>
      <ClanVarsScreen />
    </template>
    <template #window-clan-services>
      <ClanServicesScreen />
    </template>
  </DesktopShell>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { DesktopShell, useDesktopStore } from '../lib/lowcode';
import ClanMachinesScreen from '../screens/ClanMachinesScreen.vue';
import ClanHealthScreen from '../screens/ClanHealthScreen.vue';
import ClanDeployScreen from '../screens/ClanDeployScreen.vue';
import ClanHerdrScreen from '../screens/ClanHerdrScreen.vue';
import ClanNetworkScreen from '../screens/ClanNetworkScreen.vue';
import ClanBackupsScreen from '../screens/ClanBackupsScreen.vue';
import ClanSecretsScreen from '../screens/ClanSecretsScreen.vue';
import ClanVarsScreen from '../screens/ClanVarsScreen.vue';
import ClanServicesScreen from '../screens/ClanServicesScreen.vue';

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