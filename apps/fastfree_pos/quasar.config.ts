// ============================================================
// FastFree POS — Quasar Configuration (Point of Sale)
// ============================================================

import { defineConfig } from '#q-app';

export default defineConfig((ctx) => {
  return {
    boot: ['fastfree-auth-init', 'fastfree-accounting-init', 'fastfree-inventory-init', 'fastfree-sales-init', 'i18n', 'register-service-worker'],

    css: ['app.scss'],

    extras: [
      'mdi-v7',
      'roboto-font',
      'material-icons',
    ],

    build: {
      target: {},

      typescript: {
        strict: true,
        vueShim: true,
        extendTsConfig(tsConfig) {
          tsConfig.compilerOptions = tsConfig.compilerOptions || {};
          tsConfig.compilerOptions.paths = tsConfig.compilerOptions.paths || {};
          tsConfig.compilerOptions.paths['quasar-app-extension-fastfree-lowcode/src/runtime'] = [
            '../../../packages/fastfree_lowcode/src/runtime/index.ts',
          ];
          tsConfig.compilerOptions.paths['quasar-app-extension-fastfree-lowcode/src/runtime/*'] = [
            '../../../packages/fastfree_lowcode/src/runtime/*',
          ];
          tsConfig.compilerOptions.paths['fastfree-auth'] = [
            '../../../packages/fastfree_auth/src/index.ts',
          ];
          tsConfig.compilerOptions.paths['fastfree-auth/*'] = [
            '../../../packages/fastfree_auth/src/*',
          ];
          tsConfig.compilerOptions.paths['fastfree-accounting'] = [
            '../../../packages/fastfree_accounting/src/index.ts',
          ];
          tsConfig.compilerOptions.paths['fastfree-accounting/*'] = [
            '../../../packages/fastfree_accounting/src/*',
          ];
          tsConfig.compilerOptions.paths['fastfree-inventory'] = [
            '../../../packages/fastfree_inventory/src/index.ts',
          ];
          tsConfig.compilerOptions.paths['fastfree-inventory/*'] = [
            '../../../packages/fastfree_inventory/src/*',
          ];
          tsConfig.compilerOptions.paths['fastfree-sales'] = [
            '../../../packages/fastfree_sales/src/index.ts',
          ];
          tsConfig.compilerOptions.paths['fastfree-sales/*'] = [
            '../../../packages/fastfree_sales/src/*',
          ];
        },
      },

      filenameBasedRouting: true,

      vueRouterMode: 'hash',

      extendViteConf(viteConf) {
        const path = require('path');
        const appRoot = __dirname;
        const monorepoRoot = path.resolve(appRoot, '..', '..');
        viteConf.server = viteConf.server || {};
        viteConf.server.fs = viteConf.server.fs || {};
        viteConf.server.fs.allow = [
          appRoot,
          path.join(monorepoRoot, 'node_modules'),
          path.join(monorepoRoot, 'packages', 'fastfree_lowcode'),
          path.join(monorepoRoot, 'packages', 'fastfree_auth'),
          path.join(monorepoRoot, 'packages', 'fastfree_accounting'),
          path.join(monorepoRoot, 'packages', 'fastfree_inventory'),
          path.join(monorepoRoot, 'packages', 'fastfree_sales'),
          path.join(appRoot, 'node_modules', '@quasar', 'extras'),
        ];
      },

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            ssr: ctx.mode.ssr || ctx.mode.ssg,
            include: [ctx.appPaths.resolve.app('src/i18n')],
          },
        ],
        [
          'vite-plugin-checker',
          {
            vueTsc: true,
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    devServer: {
      open: true,
    },

    framework: {
      config: {},
      plugins: ['Loading'],
    },

    animations: [],

    pwa: {
      workboxMode: 'GenerateSW',
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: true,
      injectPWAMetaTags: true,
      manifest: {
        name: 'FastFree POS',
        short_name: 'FastFree POS',
        description: 'Point of Sale System',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        icons: [
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'POS Terminal', url: '/pos', description: 'Open POS Terminal' },
          { name: 'Settings', url: '/settings', description: 'Open Settings' },
        ],
      },
      extendPWAGenerateSWOptions(cfg) {
        cfg.cleanupOutdatedCaches = true;
        cfg.skipWaiting = true;
        cfg.clientsClaim = true;
        cfg.runtimeCaching = [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-stylesheets', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'google-fonts-webfonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
          { urlPattern: /^https:\/\/cdn\./i, handler: 'StaleWhileRevalidate', options: { cacheName: 'cdn-resources', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
          { urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'), handler: 'NetworkFirst', options: { cacheName: 'api-responses', networkTimeoutSeconds: 10, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 } } },
        ];
      },
      extendPWAManifestJson(json) {
        json.categories = ['business', 'productivity'];
        json.prefer_related_applications = false;
      },
    },

    capacitor: {
      hideSplashscreen: true,
    },

    electron: {
      preloadScripts: ['electron-preload'],
      inspectPort: 5858,
      bundler: 'packager',
      packager: {},
      builder: {
        appId: 'fastfree_pos',
      },
    },

    bex: {
      extraScripts: [],
    },
  };
});
