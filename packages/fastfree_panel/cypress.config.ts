import { defineConfig } from 'cypress';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

/**
 * Cypress configuration for the FastFree Clan Panel.
 *
 * E2E specs live in `test/cypress/e2e/` (all `*.cy.ts` files) and run against the SPA
 * served on http://localhost:9000 — the Quasar dev server in development, or
 * the production build served by `pnpm run test:e2e:serve` in CI.
 *
 * Component specs live in `test/cypress/component/` (all `*.cy.ts` files) and are
 * bundled by an inline Vite dev-server config (see `component.devServer` below).
 *
 * The monorepo root can run everything with:
 *   pnpm --filter @fastfree/panel test:e2e
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9000',
    specPattern: 'test/cypress/e2e/**/*.cy.ts',
    supportFile: 'test/cypress/support/e2e.ts',
    fixturesFolder: 'test/cypress/fixtures',
    downloadsFolder: 'cypress/downloads',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    video: false,
    screenshotOnRunFailure: true,
    // Retry flaky UI specs once in CI; never retry during interactive runs.
    retries: { runMode: 2, openMode: 0 },
    env: {
      apiBase: '/api/v1',
      mcpBase: '/mcp',
    },
    setupNodeEvents(on, config) {
      on('task', {
        /**
         * Probe an external URL from the Node side (not the browser), so the
         * specs can audit deployed subdomains without CORS restrictions.
         */
        async checkEndpoint(url: string) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
            clearTimeout(timer);
            return {
              reachable: true,
              status: res.status,
              statusText: res.statusText,
              url,
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              reachable: false,
              status: 0,
              statusText: msg,
              url,
            };
          }
        },
        /** Write a line to the terminal from a spec via `cy.task('log', ...)`. */
        log(message: string) {
          // eslint-disable-next-line no-console
          console.log(`[cypress spec] ${message}`);
          return null;
        },
      });
      return config;
    },
  },
  component: {
    specPattern: 'test/cypress/component/**/*.cy.ts',
    supportFile: 'test/cypress/support/component.ts',
    indexHtmlFile: 'test/cypress/support/component-index.html',
    devServer: {
      framework: 'vue',
      bundler: 'vite',
      viteConfig: {
        plugins: [vue()],
        resolve: {
          alias: {
            // Mirror the Quasar app alias so low-code runtime imports resolve.
            '#lc': resolve(process.cwd(), '../fastfree_lowcode/src/runtime'),
          },
        },
      },
    },
  },
});
