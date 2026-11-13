/// <reference types="cypress" />

/**
 * Desktop shell navigation specs.
 *
 * Covers the window manager shell that the legacy fleet spec only touches
 * incidentally: the dock, opening one window per dock item, the per-window
 * controls and closing a window.
 *
 * Pattern: `cy.visitApp()` (support/commands.ts) loads the SPA, then assert
 * on the stable `.lc-*` / `.window-panel` classes used by the low-code shell.
 */

describe('Desktop shell navigation', () => {
  beforeEach(() => {
    cy.visitApp('/');
  });

  it('renders the desktop header and dock', () => {
    cy.get('.lc-hdr', { timeout: 15000 }).should('be.visible');
    cy.get('.lc-hdr__title-text').should('contain', 'FastFree Clan OS');
    cy.get('.lc-dock').should('be.visible');
  });

  it('opens the Machines window by default', () => {
    cy.get('.window-panel').should('have.length.at.least', 1);
    cy.get('.window-panel').first().should('contain', 'Machines');
    cy.get('.clan-machines-screen').should('be.visible');
  });

  it('opens a window for every dock item', () => {
    const items = ['System', 'Services & Health', 'Config & Security', 'Agents', 'Favorites'];

    items.forEach((label) => {
      cy.get('.lc-dock').contains('.lc-dock__item', label).click();
      cy.get('.window-panel').filter(`:contains("${label}")`).should('have.length.at.least', 1);
    });

    // Machines (default) + the five dock items above.
    cy.get('.window-panel').should('have.length', 6);
  });

  it('marks the active dock item with aria-selected', () => {
    cy.get('.lc-dock').contains('.lc-dock__item', 'Services & Health').click();
    cy.get('.lc-dock').contains('.lc-dock__item', 'Services & Health').should('have.attr', 'aria-selected', 'true');
  });

  it('exposes Minimize, Maximize and Close controls on each window', () => {
    cy.get('.window-panel').first().within(() => {
      cy.get('button[aria-label="Minimize"]').should('exist');
      cy.get('button[aria-label="Maximize"]').should('exist');
      cy.get('button[aria-label="Close"]').should('exist');
    });
  });

  it('closes a window via the Close control', () => {
    cy.get('.window-panel')
      .its('length')
      .then((before) => {
        cy.get('.window-panel').first().find('button[aria-label="Close"]').click();
        cy.get('.window-panel').should('have.length.lessThan', before);
      });
  });

  it('minimizes a window via the Minimize control', () => {
    cy.get('.window-panel').first().find('button[aria-label="Minimize"]').click();
    cy.get('.window-panel').first().should('not.be.visible');
  });
});
