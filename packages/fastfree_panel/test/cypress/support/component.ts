/// <reference types="cypress" />

// ***********************************************************
// support/component.ts is processed and loaded automatically
// before every component spec.
//
// It registers the `mount` command from @cypress/vue and pulls
// in the Quasar stylesheet so Quasar components render with the
// same look as the app.
// ***********************************************************

import { mount } from '@cypress/vue';
import '@quasar/extras/material-icons/material-icons.css';
import '@quasar/extras/mdi-v7/mdi-v7.css';
import 'quasar/src/css/index.sass';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);
