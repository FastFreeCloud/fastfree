<template>
  <DesktopShell
    title="FastFree Clan OS"
    icon="mdi-shield-crown"
    show-built-in-screens
  >
    <!-- The 4 Consolidated Super-Hubs -->
    <template #window-clan-fleet>
      <ClanFleetHub />
    </template>
    <template #window-clan-ops>
      <ClanOpsHub />
    </template>
    <template #window-clan-config>
      <ClanConfigHub />
    </template>
    <template #window-clan-agents>
      <ClanAgentsHub />
    </template>

    <!-- Legacy Sub-Screen Slots (Backward Compatibility) -->
    <template #window-clan-machines>
      <ClanMachinesScreen />
    </template>
    <template #window-clan-health>
      <ClanHealthScreen />
    </template>
    <template #window-clan-deploy>
      <ClanDeployScreen />
    </template>
    <template #window-clan-build>
      <ClanImageBuilderScreen />
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
    <template #window-clan-herdr>
      <ClanHerdrScreen />
    </template>
  </DesktopShell>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { DesktopShell, useDesktopStore } from '../lib/lowcode';

// The 4 Super-Hubs
import ClanFleetHub from '../hubs/ClanFleetHub.vue';
import ClanOpsHub from '../hubs/ClanOpsHub.vue';
import ClanConfigHub from '../hubs/ClanConfigHub.vue';
import ClanAgentsHub from '../hubs/ClanAgentsHub.vue';

// Legacy Individual Screens
import ClanMachinesScreen from '../screens/ClanMachinesScreen.vue';
import ClanHealthScreen from '../screens/ClanHealthScreen.vue';
import ClanDeployScreen from '../screens/ClanDeployScreen.vue';
import ClanImageBuilderScreen from '../screens/ClanImageBuilderScreen.vue';
import ClanNetworkScreen from '../screens/ClanNetworkScreen.vue';
import ClanBackupsScreen from '../screens/ClanBackupsScreen.vue';
import ClanSecretsScreen from '../screens/ClanSecretsScreen.vue';
import ClanVarsScreen from '../screens/ClanVarsScreen.vue';
import ClanServicesScreen from '../screens/ClanServicesScreen.vue';
import ClanHerdrScreen from '../screens/ClanHerdrScreen.vue';

const desktopStore = useDesktopStore();

onMounted(() => {
  const existingFleet = desktopStore.getWindowsByType('clan-fleet');
  const existingOps = desktopStore.getWindowsByType('clan-ops');

  let id1 = existingFleet[0]?.id;
  if (!id1) {
    id1 = desktopStore.openWindow('clan-fleet', 'Fleet & Machines Hub · أسطول الأجهزة', 'mdi-server-network');
  }

  let id2 = existingOps[0]?.id;
  if (!id2) {
    id2 = desktopStore.openWindow('clan-ops', 'Operations & Health Hub · عمليات النظام', 'mdi-heart-pulse');
  }

  // Arrange side-by-side on wide desktop displays (>= 1024px)
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