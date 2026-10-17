import { defineBoot } from '#q-app';
import { defineAsyncComponent } from 'vue';
import { registerGroup, registerGroupPage, registerScreen } from '../lib/lowcode';

export default defineBoot(() => {
  // Register Clan OS Groups
  registerGroup('Clan Fleet · أسطول الأجهزة', 'mdi-server-network', 'clan.fleet');
  registerGroup('NixOS & Systems · أنظمة NixOS', 'mdi-nix', 'clan.nixos');
  registerGroup('Agents & Herdr · الوكلاء والطرفيات', 'mdi-robot-outline', 'clan.agents');

  // Register the 5 Clan screens
  const screens = [
    {
      type: 'clan-machines',
      loader: () => import('../screens/ClanMachinesScreen.vue'),
      label: 'Machines · الأجهزة',
      icon: 'mdi-server-network',
      groupId: 'clan.fleet',
    },
    {
      type: 'clan-health',
      loader: () => import('../screens/ClanHealthScreen.vue'),
      label: 'System Health · سلامة النظام',
      icon: 'mdi-heart-pulse',
      groupId: 'clan.nixos',
    },
    {
      type: 'clan-deploy',
      loader: () => import('../screens/ClanDeployScreen.vue'),
      label: 'Deploy & Rollback · النشر والتراجع',
      icon: 'mdi-rocket-launch',
      groupId: 'clan.nixos',
    },
    {
      type: 'clan-herdr',
      loader: () => import('../screens/ClanHerdrScreen.vue'),
      label: 'Herdr Agents · وكلاء Herdr',
      icon: 'mdi-robot-outline',
      groupId: 'clan.agents',
    },
    {
      type: 'clan-network',
      loader: () => import('../screens/ClanNetworkScreen.vue'),
      label: 'Network Mesh · الشبكة',
      icon: 'mdi-lan',
      groupId: 'clan.fleet',
    },
  ];

  for (const s of screens) {
    const component = defineAsyncComponent(s.loader);

    registerScreen(s.type, {
      component,
      label: s.label,
      icon: s.icon,
      groupId: s.groupId,
    });

    registerGroupPage(s.groupId, {
      screenType: s.type,
      label: s.label,
      icon: s.icon,
    });
  }
});
