/// <reference types="cypress" />

/**
 * Smoke checks for the shared test-data library inside the Cypress browser
 * bundle.
 *
 * These specs prove the factories are importable from E2E specs (the same
 * module Vitest consumes through a relative path) and keep the factory shapes
 * pinned to the real backend contract.
 */

import {
  apiFailure,
  apiSuccess,
  machine,
  multiLineJournalEntry,
  unbalancedJournalEntry,
  type MachineFixture,
} from '../fixtures/factories';

describe('Shared test-data factories (browser bundle)', () => {
  it('builds machine fixtures that match the /api/v1/machines contract', () => {
    const shape: MachineFixture = machine();

    cy.apiRequest('GET', '/machines').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.data.machines).to.be.an('array');

      response.body.data.machines.forEach((row: Record<string, unknown>) => {
        Object.keys(shape).forEach((key) => {
          expect(row, `machine.${key}`).to.have.property(key);
        });
      });
    });
  });

  it('builds the API envelopes used by failure assertions', () => {
    expect(apiSuccess({ status: 'ok' })).to.deep.equal({
      success: true,
      data: { status: 'ok' },
    });

    const failure = apiFailure('VALIDATION_ERROR', 'Unknown MCP tool');
    expect(failure.success).to.eq(false);
    expect(failure.error?.code).to.eq('VALIDATION_ERROR');
    expect(failure.error?.message).to.eq('Unknown MCP tool');
  });

  it('keeps valid and edge-case documents distinct', () => {
    const balanced = multiLineJournalEntry(4);
    expect(balanced.accounts).to.have.length(4);
    expect(balanced.totalDebit).to.eq(balanced.totalCredit);

    const broken = unbalancedJournalEntry();
    expect(broken.totalDebit).not.to.eq(broken.totalCredit);
  });
});
