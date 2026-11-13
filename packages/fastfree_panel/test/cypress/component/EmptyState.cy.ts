/// <reference types="cypress" />

/**
 * Component test for the low-code EmptyState component.
 *
 * Component specs live in `test/cypress/component/` and are bundled by the
 * Vite dev server (`test/cypress/cypress-vite.config.ts`). They mount a single
 * component in isolation — no backend, no router, no full app boot.
 *
 * Pattern: import the `.vue` component, mount it with `cy.mount`, pass props
 * and register the Quasar components it uses (the app's components are
 * Quasar-based).
 */

import { Quasar, QBtn, QIcon } from 'quasar';
import EmptyState from '../../../../fastfree_lowcode/src/runtime/components/EmptyState.vue';

// Quasar's plugin registers the components it is given and provides the `$q`
// global the components rely on.
const quasarWithComponents: [typeof Quasar, { components: Record<string, unknown> }] = [
  Quasar,
  { components: { QIcon, QBtn } },
];

describe('EmptyState', () => {
  it('renders the title and description', () => {
    cy.mount(EmptyState, {
      props: { title: 'No machines found', description: 'Nothing here yet' },
      global: { plugins: [quasarWithComponents] },
    });

    cy.contains('No machines found').should('be.visible');
    cy.contains('Nothing here yet').should('be.visible');
  });

  it('renders the empty-state container with the default icon', () => {
    cy.mount(EmptyState, {
      props: { title: 'Empty' },
      global: { plugins: [quasarWithComponents] },
    });

    cy.get('.lc-empty-state').should('be.visible');
    cy.get('.lc-empty-state .q-icon').should('exist');
  });

  it('omits the action button when actionLabel is not provided', () => {
    cy.mount(EmptyState, {
      props: { title: 'Empty' },
      global: { plugins: [quasarWithComponents] },
    });

    cy.get('.lc-empty-state button').should('not.exist');
  });

  it('emits action when the action button is clicked', () => {
    const onAction = cy.spy().as('actionSpy');

    cy.mount(EmptyState, {
      props: { title: 'Empty', actionLabel: 'Reload', onAction },
      global: { plugins: [quasarWithComponents] },
    });

    cy.contains('button', 'Reload').click();
    cy.get('@actionSpy').should('have.been.calledOnce');
  });
});
