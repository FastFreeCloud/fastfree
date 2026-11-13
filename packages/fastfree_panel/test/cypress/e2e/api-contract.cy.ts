/// <reference types="cypress" />

/**
 * Backend API contract tests.
 *
 * These specs exercise the private Node backend through the same origin the
 * SPA uses (the dev server / E2E static server proxy `/api` + `/mcp` to the
 * backend). They never touch the UI, so they are fast and stable.
 *
 * Pattern: use `cy.apiRequest(method, path)` for `/api/v1` endpoints and
 * `cy.request` for the legacy `/api` aliases and the MCP surface.
 */

import { apiFailure, machine, type MachineFixture } from '../fixtures/factories';

describe('Backend API contract', () => {
  describe('Health endpoints', () => {
    it('GET /api/v1/health returns the liveness contract', () => {
      cy.apiRequest('GET', '/health').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('data');
        expect(response.body.data.status).to.eq('ok');
        expect(response.body.data.uptimeSeconds).to.be.a('number');
        expect(response.body.data.clanConfigured).to.be.a('boolean');
        expect(response.body.data.bootstrapAuthEnabled).to.be.a('boolean');
      });
    });

    it('GET /api/health (legacy alias) returns the same liveness contract', () => {
      cy.request('/api/health').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.status).to.eq('ok');
        expect(response.body.data.uptimeSeconds).to.be.a('number');
      });
    });

    it('GET /api/v1/system/diagnostics returns the diagnostics envelope', () => {
      cy.apiRequest('GET', '/system/diagnostics').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.property('failedUnits');
        expect(response.body.data).to.have.property('criticalErrors');
        expect(response.body.data).to.have.property('services');
      });
    });
  });

  describe('Machines endpoints', () => {
    it('GET /api/v1/machines returns the machines envelope', () => {
      cy.apiRequest('GET', '/machines').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.property('machines');
        expect(response.body.data.machines).to.be.an('array');

        // Every entry matches the machine factory shape.
        const shape: MachineFixture = machine();
        response.body.data.machines.forEach((row: Record<string, unknown>) => {
          Object.keys(shape).forEach((key) => {
            expect(row, `machine.${key}`).to.have.property(key);
          });
        });
      });
    });

    it('GET /api/machines (legacy alias) returns the machines envelope', () => {
      cy.request('/api/machines').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.property('machines');
        expect(response.body.data.machines).to.be.an('array');
      });
    });
  });

  describe('MCP endpoints', () => {
    it('GET /mcp/status lists the registered tools', () => {
      cy.request('/mcp/status').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.status).to.eq('ready');
        expect(response.body.data.tools).to.be.an('array').with.length(7);
        expect(response.body.data.tools).to.include.members([
          'clan_machines_list',
          'clan_machines_update',
          'nixos_health',
          'nixos_rollback',
          'paseo_status',
          'paseo_agents',
          'paseo_agent_prompt',
        ]);
      });
    });

    it('POST /mcp/call executes nixos_health and returns cpu/memory metrics', () => {
      cy.request({
        method: 'POST',
        url: '/mcp/call',
        body: { tool: 'nixos_health', args: {} },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.property('cpu');
        expect(response.body.data).to.have.property('memory');
      });
    });

    it('POST /mcp/call rejects an unknown tool with a validation error', () => {
      const expectedError = apiFailure('VALIDATION_ERROR', 'Unknown MCP tool');

      cy.request({
        method: 'POST',
        url: '/mcp/call',
        body: { tool: 'definitely_not_a_tool', args: {} },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
        expect(response.body.error.code).to.eq(expectedError.error?.code);
        expect(response.body.error.message).to.include('Unknown MCP tool');
      });
    });

    it('POST /mcp/call rejects a missing tool field with a validation error', () => {
      const expectedError = apiFailure('VALIDATION_ERROR', 'Missing "tool" or "name" field');

      cy.request({
        method: 'POST',
        url: '/mcp/call',
        body: { args: {} },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error.code).to.eq(expectedError.error?.code);
        expect(response.body.error.message).to.include('Missing "tool" or "name" field');
      });
    });
  });

  describe('Paseo endpoints', () => {
    it('GET /api/v1/paseo/status returns the session snapshot envelope', () => {
      cy.apiRequest('GET', '/paseo/status').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).to.have.property('running');
        expect(response.body.data).to.have.property('connected');
        expect(response.body.data).to.have.property('counts');
        expect(response.body.data.counts).to.have.property('all');
        expect(response.body.data).to.have.property('agents');
        expect(response.body.data.agents).to.be.an('array');
      });
    });
  });
});
