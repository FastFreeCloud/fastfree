// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app';

export default defineConfig((ctx) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['fastfree-auth-init', 'fastfree-accounting-init', 'fastfree-inventory-init', 'fastfree-sales-init', 'fastfree-purchase-init', 'fastfree-hr-init', 'fastfree-crm-init', 'i18n', 'register-service-worker'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      'mdi-v7',
      // 'fontawesome-v7',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        // browser: 'baseline-widely-available',
        // node: 'node22'
      },

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
          tsConfig.compilerOptions.paths['fastfree-purchase'] = [
            '../../../packages/fastfree_purchase/src/index.ts',
          ];
          tsConfig.compilerOptions.paths['fastfree-purchase/*'] = [
            '../../../packages/fastfree_purchase/src/*',
          ];
          tsConfig.compilerOptions.paths['fastfree-hr'] = [
            '../../../packages/fastfree_hr/src/index.ts',
          ];
          tsConfig.compilerOptions.paths['fastfree-hr/*'] = [
            '../../../packages/fastfree_hr/src/*',
          ];
          tsConfig.compilerOptions.paths['fastfree-crm'] = [
            '../../../packages/fastfree_crm/src/index.ts',
          ];
          tsConfig.compilerOptions.paths['fastfree-crm/*'] = [
            '../../../packages/fastfree_crm/src/*',
          ];
        },
      },

      // https://v2.quasar.dev/quasar-cli-vite/page-routing-with-vue-router#filename-based-routing
      filenameBasedRouting: true,

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,

      // publicPath: '/',
      // define: {},
      // defineEnv: {}
      // ignorePublicFolder: true,
      // minify: false,
      // distDir

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
          path.join(monorepoRoot, 'packages', 'fastfree_purchase'),
          path.join(monorepoRoot, 'packages', 'fastfree_hr'),
          path.join(monorepoRoot, 'packages', 'fastfree_crm'),
          path.join(appRoot, 'node_modules', '@quasar', 'extras'),
        ];
      },
      // viteVuePluginOptions: {},

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            ssr: ctx.mode.ssr || ctx.mode.ssg,

            // you need to set i18n resource including paths !
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

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: true, // opens browser window automatically
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins — Dialog & Notify auto-injected by fastfree-lowcode extension
      plugins: ['Loading'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-sw',
    //   pwaServiceWorker: 'src-pwa/sw/custom-sw',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      /**
       * The default port that the production server should use
       * (gets superseded if process.env.PORT is specified at runtime)
       */
      prodPort: 3000,
      middlewares: [
        'render', // keep this as last one
      ],

      // clientSideRenderingRoutes: [],
      // noPreloadTagRoutes: [],
      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,
      // prodScriptNamedExport: false,

      // extendSSRPackageJson (pkgJson) {},
      // extendSSRManifestJson (json) {},
      // extendSSRWebserverConf (rolldownConf) {},

      // pwa: true,
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!
      // extendSSRGenerateSWOptions (cfg) {},
      // extendSSRInjectManifestOptions (cfg) {},
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssg/configuring-ssg
    ssg: {
      // onSsgRendererError: 'abort',
      // ssgRendererConcurrency: 1,
      // ssgRendererRetryCount: 0,
      // ssgRendererRetryDelay: 1000,
      // ssgRendererDirectoryIndexes: true,
      // error404HtmlFilename: '404.html',
      // clientSideRenderingHtmlFilename: 'csr.html',
      // clientSideRenderingRoutes: [],
      // noPreloadTagRoutes: []
      // extendSSGRendererConf (rolldownConf) {},
      // extendSSGManifestJson (json) {},
      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,
      // pwa: true,
      // pwaOfflineHtmlFilename: 'offline.html',
      // extendSSGGenerateSWOptions (cfg) {},
      // extendSSGInjectManifestOptions (cfg) {},
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: true,
      injectPWAMetaTags: true,
      // Manifest configuration
      manifest: {
        name: 'FastFree Ledger',
        short_name: 'FastFree',
        description: 'Low-code Desktop Application',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        icons: [
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          { name: 'Settings', url: '/settings', description: 'Open Settings' },
          { name: 'About', url: '/about', description: 'About FastFree' },
        ],
      },
      // Workbox GenerateSW options
      extendPWAGenerateSWOptions(cfg) {
        cfg.cleanupOutdatedCaches = true;
        cfg.skipWaiting = true;
        cfg.clientsClaim = true;
        cfg.runtimeCaching = [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\./i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-resources',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-responses',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ];
      },
      // Manifest extensions
      extendPWAManifestJson(json) {
        json.categories = ['productivity', 'utilities'];
        json.prefer_related_applications = false;
      },
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {},

    // https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (rolldownConf) {},
      // extendElectronPreloadConf (rolldownConf) {},
      // extendElectronPackageJson (pkgJson) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: ['electron-preload'],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration

        appId: 'fastfree_ledger',
      },
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (rolldownConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: [],
    },
  };
});
