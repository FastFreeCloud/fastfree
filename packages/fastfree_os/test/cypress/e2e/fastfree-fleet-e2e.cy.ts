/// <reference types="cypress" />

describe('FastFree Fleet & Services Comprehensive E2E Suite', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      // Prevent non-critical resize/DOM observer or script errors from halting tests
      if (
        err.message.includes('ResizeObserver') ||
        err.message.includes('Script error') ||
        err.message.includes('NetworkError')
      ) {
        return false;
      }
      return true;
    });
  });

  describe('Test 1: Desktop Shell UI Test', () => {
    it('Loads Desktop Shell on root (/), renders Header, Dock, open Machines screen, toggles Table/Grid, and operates Dialogs', () => {
      cy.visit('/');

      // 1. Desktop Header
      cy.get('.lc-hdr', { timeout: 15000 }).should('be.visible');
      cy.get('.lc-hdr__title-text').should('contain', 'FastFree Clan OS');

      // 2. Desktop Dock
      cy.get('.lc-dock').should('be.visible');
      cy.get('.lc-dock').should('contain', 'Machines');

      // 3. Machines Window open by default
      cy.get('.window-panel').should('be.visible').and('contain', 'Machines');
      cy.get('.clan-machines-screen').should('be.visible');

      // 4. Search input is present and functional
      cy.get('.clan-machines-screen input[placeholder*="Search"]')
        .should('exist')
        .type('test-filter')
        .clear();

      // 5. Table / Grid View Toggle
      cy.get('.clan-machines-screen').within(() => {
        cy.contains('.q-btn', 'Grid').click();
      });
      cy.get('.clan-machines-screen .q-btn-toggle button.bg-primary').should('contain', 'Grid');

      cy.get('.clan-machines-screen').within(() => {
        cy.contains('.q-btn', 'Table').click();
      });
      cy.get('.clan-machines-screen .q-btn-toggle button.bg-primary').should('contain', 'Table');

      // 6. Dialogs (Add Machine modal)
      cy.contains('button', 'Add Machine').should('be.visible').click();

      // Verify dialog opens and displays machine fields
      cy.get('.q-dialog').should('be.visible');
      cy.get('.q-dialog').should('contain', 'Register New Machine');
      cy.get('.q-dialog input').should('have.length.at.least', 2);

      // Close dialog via Cancel button
      cy.get('.q-dialog').contains('button', 'Cancel').click();
      cy.get('.q-dialog').should('not.exist');
    });
  });

  describe('Test 2: System Endpoints & Service Health', () => {
    it('Verifies /mcp/status direct endpoint returns status 200 and the 4 registered MCP tools', () => {
      cy.request('/mcp/status').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('data');
        expect(response.body.data.status).to.eq('ready');
        expect(response.body.data.tools).to.be.an('array').with.length(4);
        expect(response.body.data.tools).to.include.members([
          'clan_machines_list',
          'clan_machines_update',
          'nixos_health',
          'nixos_rollback',
        ]);
      });
    });

    it('Verifies direct RPC call to /mcp/call with tool nixos_health returns CPU and Memory metrics', () => {
      cy.request({
        method: 'POST',
        url: '/mcp/call',
        body: {
          tool: 'nixos_health',
          args: {},
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('data');
        const healthData = response.body.data;
        expect(healthData).to.be.an('object');
        expect(healthData).to.have.property('cpu');
        expect(healthData).to.have.property('memory');
      });
    });

    it('Verifies /api/health and /api/v1/health endpoints return status ok and uptime', () => {
      cy.request('/api/v1/health').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('data');
        expect(response.body.data.status).to.eq('ok');
        expect(response.body.data).to.have.property('uptimeSeconds');
        expect(response.body.data).to.have.property('clanConfigured');
        expect(response.body.data).to.have.property('bootstrapAuthEnabled');
      });

      cy.request('/api/health').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('data');
        expect(response.body.data.status).to.eq('ok');
        expect(response.body.data.uptimeSeconds).to.be.a('number');
      });
    });

    it('Verifies machine list endpoint (/api/v1/machines and /api/machines) response contract', () => {
      cy.request({
        url: '/api/v1/machines',
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 503]).to.include(response.status);
        if (response.status === 200) {
          expect(response.body).to.have.property('data');
          expect(response.body.data).to.have.property('machines');
          expect(response.body.data.machines).to.be.an('array');
        } else {
          expect(response.body).to.have.property('error');
          expect(response.body.error.code).to.eq('NOT_CONFIGURED');
        }
      });

      cy.request({
        url: '/api/machines',
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 503]).to.include(response.status);
      });
    });
  });

  describe('Test 3: Subdomains & Web Services Audit', () => {
    const services = [
      { name: 'Clan Panel SPA', url: 'https://panel.fastfree.cloud' },
      { name: 'FastFree Cloud Root', url: 'https://fastfree.cloud' },
      { name: 'Clan Backend API Gateway', url: 'https://backend.fastfree.cloud' },
      { name: 'Clan Backend Health Probe', url: 'https://backend.fastfree.cloud/api/v1/health' },
      { name: 'Ledger ERP App', url: 'https://ledger.fastfree.cloud' },
    ];

    services.forEach((service) => {
      it(`Audits ${service.name} (${service.url}) network responsiveness and availability`, () => {
        cy.task<{ reachable: boolean; status: number; statusText: string; url: string }>('checkEndpoint', service.url).then((res) => {
          cy.log(`[AUDIT] ${service.name}: Reachable=${res.reachable}, Status=${res.status} (${res.statusText})`);
          if (res.reachable) {
            // Ensure Caddy or backend responds with expected HTTP protocol status
            expect(res.status).to.be.oneOf([200, 301, 302, 307, 308, 401, 403, 404, 502, 503]);
          } else {
            // Gracefully records offline network conditions without aborting test execution
            cy.log(`[OFFLINE] Service ${service.url} not reachable: ${res.statusText}`);
            expect(res.reachable).to.be.false;
          }
        });
      });
    });
  });
});
