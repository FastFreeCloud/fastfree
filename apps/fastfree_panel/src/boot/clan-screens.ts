import { defineBoot } from '#q-app';
import { defineAsyncComponent } from 'vue';
import { registerGroup, registerGroupPage, registerScreen } from '../lib/lowcode';

export default defineBoot(() => {
  // 1. Register the 4 Clean Clan OS Groups (Dock & Launchers)
  registerGroup('Clan Fleet · أسطول الأجهزة', 'mdi-server-network', 'clan.fleet');
  registerGroup('Operations · العمليات والتشغيل', 'mdi-heart-pulse', 'clan.nixos');
  registerGroup('Config & Security · التكوين والأمان', 'mdi-shield-lock-outline', 'clan.security');
  registerGroup('Agents & Herdr · منظومة الوكلاء', 'mdi-robot-outline', 'clan.agents');

  // 2. Register the 4 Consolidated Super-Hubs
  const superHubs = [
    {
      type: 'clan-fleet',
      loader: () => import('../hubs/ClanFleetHub.vue'),
      label: 'Fleet & Machines Hub · أسطول الأجهزة والشبكة',
      icon: 'mdi-server-network',
      groupId: 'clan.fleet',
    },
    {
      type: 'clan-ops',
      loader: () => import('../hubs/ClanOpsHub.vue'),
      label: 'Operations & Health Hub · عمليات وسلامة النظام',
      icon: 'mdi-heart-pulse',
      groupId: 'clan.nixos',
    },
    {
      type: 'clan-config',
      loader: () => import('../hubs/ClanConfigHub.vue'),
      label: 'Config & Security Hub · الأسرار والتكوين',
      icon: 'mdi-shield-lock-outline',
      groupId: 'clan.security',
    },
    {
      type: 'clan-agents',
      loader: () => import('../hubs/ClanAgentsHub.vue'),
      label: 'Herdr AI Agents Hub · منظومة الوكلاء والطرفيات',
      icon: 'mdi-robot-outline',
      groupId: 'clan.agents',
    },
  ];

  for (const hub of superHubs) {
    const component = defineAsyncComponent(hub.loader);
    registerScreen(hub.type, {
      component,
      label: hub.label,
      icon: hub.icon,
      groupId: hub.groupId,
    });

    registerGroupPage(hub.groupId, {
      screenType: hub.type,
      label: hub.label,
      icon: hub.icon,
    });
  }

  // 3. Backward Compatibility: Register the 10 Individual Sub-Screens
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
    { type: 'clan-herdr', loader: () => import('../screens/ClanHerdrScreen.vue'), label: 'Herdr Agents · وكلاء Herdr', icon: 'mdi-robot-outline', groupId: 'clan.agents' },
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
