/**
 * Stdio Transport entrypoint for FastFree Clan MCP Server.
 * Enables direct local integration with Antigravity, OpenCode, Claude Code, and Herdr.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFastfreeMcpServer } from './server.js';

async function main(): Promise<void> {
  const server = createFastfreeMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('FastFree Clan MCP server running over stdio\n');
}

main().catch((error) => {
  process.stderr.write(`Fatal error in FastFree MCP stdio server: ${error}\n`);
  process.exit(1);
});
