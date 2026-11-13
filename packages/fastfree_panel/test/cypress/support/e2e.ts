/// <reference types="cypress" />

// ***********************************************************
// support/e2e.ts is processed and loaded automatically before
// every E2E spec file.
//
// Put global behaviour here: custom commands, global hooks and
// browser-event handlers shared by all specs.
// ***********************************************************

import './commands';

// Ignore benign third-party errors that do not affect the app under test
// (layout loops, cross-origin script errors, transient network failures).
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('ResizeObserver') ||
    err.message.includes('Script error') ||
    err.message.includes('NetworkError') ||
    err.message.includes('Loading chunk') ||
    err.message.includes('Failed to fetch')
  ) {
    return false;
  }
  return true;
});
