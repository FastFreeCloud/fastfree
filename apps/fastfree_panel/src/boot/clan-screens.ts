import { defineBoot } from '#q-app';
import { defineAsyncComponent, h, type Component } from 'vue';
import { registerGroup, registerGroupPage, registerScreen } from '../lib/lowcode';

type ScreenLoader = () => Promise<{ default: Component }>;

/** Wrap a screen's loader so its root element exposes data-source-path (inspector integration). */
function withSourceTag(loader: ScreenLoader, sourcePath: string): ScreenLoader {
  return () =>
    loader().then((mod) => {
      const Inner = mod.default;
      const tagged: Component = {
        name: `SourceTagged_${sourcePath.replace(/[^\w]+/g, '_')}`,
        render() {
          // `display: contents` keeps layout identical to the bare screen.
          return h('div', { 'data-source-path': sourcePath, 'data-studio-screen': 'true', style: 'display:contents' }, [h(Inner)]);
        },
      };
      return { default: tagged };
    });
}

const SCREEN_SOURCE_PATHS: Record<string, string> = {
  'clan-machines': 'apps/fastfree_panel/src/screens/ClanMachinesScreen.vue',
  'clan-services': 'apps/fastfree_panel/src/screens/ClanServicesScreen.vue',
  'clan-config': 'apps/fastfree_panel/src/hubs/ClanConfigHub.vue',
  'clan-health': 'apps/fastfree_panel/src/screens/ClanHealthScreen.vue',
  'clan-deploy': 'apps/fastfree_panel/src/screens/ClanDeployScreen.vue',
  'clan-build': 'apps/fastfree_panel/src/screens/ClanImageBuilderScreen.vue',
  'clan-network': 'apps/fastfree_panel/src/screens/ClanNetworkScreen.vue',
  'clan-backups': 'apps/fastfree_panel/src/screens/ClanBackupsScreen.vue',
  'clan-secrets': 'apps/fastfree_panel/src/screens/ClanSecretsScreen.vue',
  'clan-vars': 'apps/fastfree_panel/src/screens/ClanVarsScreen.vue',
  'clan-omnigent': 'apps/fastfree_panel/src/screens/ClanOmnigentScreen.vue',
  'clan-paseo': 'apps/fastfree_panel/src/screens/ClanPaseoScreen.vue',
  'clan-studio': 'apps/fastfree_panel/src/screens/ClanStudioScreen.vue',
  'clan-agents': 'apps/fastfree_panel/src/hubs/ClanAgentsHub.vue',
};

export default defineBoot(() => {
  // 1. Register Clean Clan OS Groups (Dock & Launchers)
  registerGroup('Machines · أسطول الأجهزة', 'mdi-server-network', 'clan.fleet');
  registerGroup('Services & Health · الخدمات والحالة', 'mdi-heart-pulse', 'clan.nixos');
  registerGroup('Config & Security · التكوين والأمان', 'mdi-shield-lock-outline', 'clan.security');
  registerGroup('Agents · وكلاء الذكاء', 'mdi-robot-outline', 'clan.agents');

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
    {
      type: 'clan-agents',
      loader: () => import('../hubs/ClanAgentsHub.vue'),
      label: 'Agents & AI Studio · وكلاء الذكاء',
      icon: 'mdi-robot-outline',
      groupId: 'clan.agents',
    },
  ];

  for (const s of primaryScreens) {
    const sourcePath = SCREEN_SOURCE_PATHS[s.type] ?? `apps/fastfree_panel/src/screens/${s.type}.vue`;
    const component = defineAsyncComponent(withSourceTag(s.loader, sourcePath));
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
    { type: 'clan-omnigent', loader: () => import('../screens/ClanOmnigentScreen.vue'), label: 'Omnigent Studio · وكلاء Omnigent', icon: 'mdi-sitemap', groupId: 'clan.agents' },
    { type: 'clan-paseo', loader: () => import('../screens/ClanPaseoScreen.vue'), label: 'Paseo Agents · وكلاء Paseo', icon: 'mdi-robot-outline', groupId: 'clan.agents' },
  ];

  for (const s of legacyScreens) {
    const sourcePath = SCREEN_SOURCE_PATHS[s.type] ?? `apps/fastfree_panel/src/screens/${s.type}.vue`;
    const component = defineAsyncComponent(withSourceTag(s.loader, sourcePath));
    registerScreen(s.type, {
      component,
      label: s.label,
      icon: s.icon,
      groupId: s.groupId,
    });
  }
});
