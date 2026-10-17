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
  const existingMachines = desktopStore.getWindowsByType('clan-machines');
  let id = existingMachines[0]?.id;
  if (!id) {
    id = desktopStore.openWindow('clan-machines', 'Machines · أسطول الأجهزة', 'mdi-server-network');
  }

  // Focus and arrange cleanly on the desktop
  if (typeof window !== 'undefined' && id && desktopStore.windows[id]) {
    const headerH = 56;
    const dockH = 80;
    const totalW = window.innerWidth;
    const totalH = window.innerHeight - headerH - dockH;
    const win = desktopStore.windows[id];
    if (win) {
      if (totalW >= 1200) {
        const preferredW = Math.min(1180, totalW - 48);
        win.left = Math.floor((totalW - preferredW) / 2);
        win.top = headerH + 16;
        win.width = preferredW;
        win.height = Math.max(520, totalH - 32);
      } else {
        win.isMaximized = true;
      }
    }
  }
});
</script>