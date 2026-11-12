/// <reference types="cypress" />

describe('Clan Desktop & Web MCP E2E Suite', () => {
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

  it('Verifies direct RPC call to /mcp/call with tool nixos_health executes and returns CPU/Memory health metrics', () => {
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

  it('Verifies Desktop Shell loads on the root page (/), displays the desktop header, dock, and default open windows', () => {
    cy.visit('/');

    // Desktop Header
    cy.get('.lc-hdr').should('be.visible');
    cy.get('.lc-hdr__title-text').should('contain', 'FastFree Clan OS');

    // Desktop Dock
    cy.get('.lc-dock').should('be.visible');

    // Default open windows
    cy.get('.window-panel').should('have.length.at.least', 1);
    cy.get('.window-panel').should('contain', 'Machines');
  });
});
