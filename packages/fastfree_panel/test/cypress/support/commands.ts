/// <reference types="cypress" />

// ***********************************************
// Custom Cypress commands.
//
// Add a new command by:
//   1. declaring it in the `Cypress.Chainable` interface below
//   2. registering it with `Cypress.Commands.add`
// Then use it in any spec as `cy.<command>(...)`.
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Visit a route on the app under test (baseUrl is applied by Cypress).
       * Defaults to the desktop shell at `/`.
       */
      visitApp(path?: string): Chainable;
      /**
       * Request the private backend API. `path` is relative to `/api/v1`.
       * Never fails on a non-2xx status — assert on the response instead.
       */
      apiRequest(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: string,
        body?: string | object | boolean | null,
      ): Chainable;
      /** Assert the backend liveness endpoint reports `status: ok`. */
      backendHealth(): Chainable;
    }
  }
}

Cypress.Commands.add('visitApp', (path = '/') => {
  return cy.visit(path, { timeout: 30000 });
});

Cypress.Commands.add(
  'apiRequest',
  (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: string | object | boolean | null) => {
    return cy.request({
      method,
      url: `/api/v1${path}`,
      body,
      failOnStatusCode: false,
    });
  },
);

Cypress.Commands.add('backendHealth', () => {
  cy.request('/api/v1/health').then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('data');
    expect(response.body.data.status).to.eq('ok');
    expect(response.body.data).to.have.property('uptimeSeconds');
  });
});

export {};
