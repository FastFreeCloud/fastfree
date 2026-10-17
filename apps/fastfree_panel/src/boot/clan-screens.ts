import { defineBoot } from '#q-app';
import { defineAsyncComponent } from 'vue';
import { registerGroup, registerGroupPage, registerScreen } from '../lib/lowcode';

export default defineBoot(() => {
  // Register Clan OS Groups
  registerGroup('Clan Fleet · أسطول الأجهزة', 'mdi-server-network', 'clan.fleet');
  registerGroup('NixOS & Systems · أنظمة NixOS', 'mdi-nix', 'clan.nixos');
  registerGroup('Agents & Herdr · الوكلاء والطرفيات', 'mdi-robot-outline', 'clan.agents');
  registerGroup('Security & Data · الأمان والبيانات', 'mdi-shield-lock-outline', 'clan.security');

  // Register the 9 Clan screens (Complete 1-to-1 parity with Clan 26.05 specification)
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
      type: 'clan-build',
      loader: () => import('../screens/ClanImageBuilderScreen.vue'),
      label: 'Image Builder · بناء وتحميل الصور',
      icon: 'mdi-disc',
      groupId: 'clan.nixos',
    },
    {
      type: 'clan-network',
      loader: () => import('../screens/ClanNetworkScreen.vue'),
      label: 'Network Mesh · الشبكة',
      icon: 'mdi-lan',
      groupId: 'clan.fleet',
    },
    {
      type: 'clan-backups',
      loader: () => import('../screens/ClanBackupsScreen.vue'),
      label: 'Backups · النسخ الاحتياطي',
      icon: 'mdi-backup-restore',
      groupId: 'clan.security',
    },
    {
      type: 'clan-secrets',
      loader: () => import('../screens/ClanSecretsScreen.vue'),
      label: 'Secrets · الأسرار والتشفير',
      icon: 'mdi-shield-key',
      groupId: 'clan.security',
    },
    {
      type: 'clan-vars',
      loader: () => import('../screens/ClanVarsScreen.vue'),
      label: 'Vars & State · المتغيرات والحالة',
      icon: 'mdi-code-braces',
      groupId: 'clan.fleet',
    },
    {
      type: 'clan-services',
      loader: () => import('../screens/ClanServicesScreen.vue'),
      label: 'Services · الخدمات والعمليات',
      icon: 'mdi-cogs',
      groupId: 'clan.nixos',
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
