import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9000',
    supportFile: 'test/cypress/support/e2e.ts',
    specPattern: 'test/cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    video: false,
    screenshotOnRunFailure: false,
    setupNodeEvents(on, _config) {
      on('task', {
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
      });
    },
  },
});
