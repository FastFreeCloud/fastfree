import { defineBoot } from '#q-app';
import { defineAsyncComponent } from 'vue';
import { registerGroup, registerGroupPage, registerScreen } from '../lib/lowcode';

export default defineBoot(() => {
  // 1. Register Clean Clan OS Groups (Dock & Launchers)
  registerGroup('Machines · أسطول الأجهزة', 'mdi-server-network', 'clan.fleet');
  registerGroup('Services & Health · الخدمات والحالة', 'mdi-heart-pulse', 'clan.nixos');
  registerGroup('Config & Security · التكوين والأمان', 'mdi-shield-lock-outline', 'clan.security');

  // 2. Register Primary Screens directly bound to Dock Launchers
  const primaryScreens = [
    {
      type: 'clan-machines',
      loader: () => import('../screens/ClanMachinesScreen.vue'),
      label: 'Machines · أسطول الأجهزة',
      icon: 'mdi-server-network',
      groupId: 'clan.fleet',
    },
    {
      type: 'clan-services',
      loader: () => import('../screens/ClanServicesScreen.vue'),
      label: 'Services & Health · خدمات النظام',
      icon: 'mdi-heart-pulse',
      groupId: 'clan.nixos',
    },
    {
      type: 'clan-config',
      loader: () => import('../hubs/ClanConfigHub.vue'),
      label: 'Config & Security · التكوين والأمان',
      icon: 'mdi-shield-lock-outline',
      groupId: 'clan.security',
    },
  ];

  for (const s of primaryScreens) {
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

  // 3. Sub-Screens & Hubs (Accessible on-demand)
  const legacyScreens = [
    { type: 'clan-machines', loader: () => import('../screens/ClanMachinesScreen.vue'), label: 'Machines · الأجهزة', icon: 'mdi-server-network', groupId: 'clan.fleet' },
    { type: 'clan-health', loader: () => import('../screens/ClanHealthScreen.vue'), label: 'System Health · سلامة النظام', icon: 'mdi-heart-pulse', groupId: 'clan.nixos' },
    { type: 'clan-deploy', loader: () => import('../screens/ClanDeployScreen.vue'), label: 'Deploy & Rollback · النشر والتراجع', icon: 'mdi-rocket-launch', groupId: 'clan.nixos' },
    { type: 'clan-build', loader: () => import('../screens/ClanImageBuilderScreen.vue'), label: 'Image Builder · بناء وتحميل الصور', icon: 'mdi-disc', groupId: 'clan.nixos' },
    { type: 'clan-network', loader: () => import('../screens/ClanNetworkScreen.vue'), label: 'Network Mesh · الشبكة', icon: 'mdi-lan', groupId: 'clan.fleet' },
    { type: 'clan-backups', loader: () => import('../screens/ClanBackupsScreen.vue'), label: 'Backups · النسخ الاحتياطي', icon: 'mdi-backup-restore', groupId: 'clan.security' },
    { type: 'clan-secrets', loader: () => import('../screens/ClanSecretsScreen.vue'), label: 'Secrets · الأسرار والتشفير', icon: 'mdi-shield-key', groupId: 'clan.security' },
    { type: 'clan-vars', loader: () => import('../screens/ClanVarsScreen.vue'), label: 'Vars & State · المتغيرات والحالة', icon: 'mdi-code-braces', groupId: 'clan.fleet' },
    { type: 'clan-services', loader: () => import('../screens/ClanServicesScreen.vue'), label: 'Services · الخدمات والعمليات', icon: 'mdi-cogs', groupId: 'clan.nixos' },
    { type: 'clan-paseo', loader: () => import('../screens/ClanPaseoScreen.vue'), label: 'Paseo Agents · وكلاء Paseo', icon: 'mdi-robot-outline', groupId: 'clan.agents' },
  ];

  for (const s of legacyScreens) {
    const component = defineAsyncComponent(s.loader);
    registerScreen(s.type, {
      component,
      label: s.label,
      icon: s.icon,
      groupId: s.groupId,
    });
  }
});
