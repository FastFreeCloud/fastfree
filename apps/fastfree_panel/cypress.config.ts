import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9000',
    supportFile: 'test/cypress/support/e2e.ts',
    specPattern: 'test/cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: false,
  },
});
