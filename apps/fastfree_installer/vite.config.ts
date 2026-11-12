import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@fastfree/lowcode': resolve(__dirname, '../../packages/fastfree_lowcode/src/runtime'),
      'quasar-app-extension-fastfree-lowcode': resolve(__dirname, '../../packages/fastfree_lowcode/src/runtime'),
      'quasar': resolve(__dirname, '../../packages/fastfree_lowcode/node_modules/quasar'),
      'dexie': resolve(__dirname, '../../packages/fastfree_lowcode/node_modules/dexie'),
      '@quasar/extras': resolve(__dirname, '../../node_modules/.pnpm/@quasar+extras@2.1.0/node_modules/@quasar/extras'),
      '@tauri-apps/api': resolve(__dirname, 'node_modules/@tauri-apps/api'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        splashscreen: resolve(__dirname, 'splashscreen.html'),
      },
    },
  },
});
