/**
 * Embedded Web MCP (Model Context Protocol) Server for FastFree.
 *
 * Implements MCP specification over Server-Sent Events (SSE) and HTTP JSON-RPC,
 * exposing Clan operations and NixOS system administration tools to AI agents
 * (Antigravity, OpenCode, Claude, etc.).
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

import { clanService } from '../core/clan.service.js';
import { nixosService } from '../core/nixos.service.js';
import { paseoService } from '../core/paseo.service.js';
import { clanMachineUpdateSchema } from '../schemas/clan.schema.js';
import { nixosRollbackSchema } from '../schemas/nixos.schema.js';
import { paseoAgentPromptSchema } from '../schemas/paseo.schema.js';
import { ApiError } from '../http/errors.js';

export interface McpSession {
  sessionId: string;
  transport: SSEServerTransport;
  server: McpServer;
  createdAt: Date;
}

/** Active SSE transport sessions indexed by sessionId */
const activeSessions = new Map<string, McpSession>();

/**
 * Instantiate and configure a new FastFree McpServer instance with registered tools.
 */
export function createFastfreeMcpServer(): McpServer {
  const server = new McpServer({
    name: 'fastfree-panel-mcp',
    version: '1.0.0',
  });

  // Tool 1: clan_machines_list
  server.tool(
    'clan_machines_list',
    'List all machines managed by Clan with their network names and assigned roles/tags.',
    async () => {
      try {
        const machines = await clanService.listMachines();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(machines, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list machines';
        return {
          content: [{ type: 'text', text: `Error listing machines: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // Tool 2: clan_machines_update
  server.tool(
    'clan_machines_update',
    'Update a specific Clan machine configuration and trigger deployment.',
    {
      machine: z.string().describe('Machine identifier to update (e.g. client1, client2)'),
    },
    async (args) => {
      try {
        const result = await clanService.updateMachine(args.machine);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update machine';
        return {
          content: [{ type: 'text', text: `Error updating machine ${args.machine}: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // Tool 3: nixos_health
  server.tool(
    'nixos_health',
    'Return host server health metrics (CPU, Memory, Disk, Systemd) and current NixOS generation.',
    async () => {
      try {
        const health = await nixosService.getSystemHealth();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to collect health metrics';
        return {
          content: [{ type: 'text', text: `Error collecting health: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // Tool 4: nixos_rollback
  server.tool(
    'nixos_rollback',
    'Trigger a rollback to the previous NixOS generation.',
    {
      targetHost: z.string().optional().describe('Optional remote target host address'),
    },
    async (args) => {
      try {
        const result = await nixosService.rollback({ targetHost: args.targetHost });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to execute rollback';
        return {
          content: [{ type: 'text', text: `Error rolling back: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // Tool 5: paseo_status
  server.tool(
    'paseo_status',
    'Condensed snapshot of the whole Paseo session: counts by status and every live agent with its cwd.',
    async () => {
      try {
        const status = await paseoService.getStatus();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to collect Paseo status';
        return {
          content: [{ type: 'text', text: `Error collecting Paseo status: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // Tool 6: paseo_agents
  server.tool(
    'paseo_agents',
    'List live agents recognised by Paseo.',
    async () => {
      try {
        const status = await paseoService.getStatus();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status.agents, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list agents';
        return {
          content: [{ type: 'text', text: `Error listing agents: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // Tool 7: paseo_agent_prompt
  server.tool(
    'paseo_agent_prompt',
    'Submit a prompt to a live agent. Returns once submitted.',
    {
      target: z.string().describe('Live agent id or name'),
      text: z.string().describe('Prompt text'),
      wait: z.boolean().optional().describe('Wait for a settled state before returning'),
      timeout_ms: z.number().optional().describe('Wait timeout in milliseconds'),
    },
    async (args) => {
      try {
        const result = await paseoService.dispatchPrompt({
          target: args.target,
          text: args.text,
          wait: args.wait,
          timeout_ms: args.timeout_ms,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to dispatch prompt';
        return {
          content: [{ type: 'text', text: `Error dispatching prompt: ${message}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}

/**
 * Handle new incoming SSE connection on GET /mcp/sse.
 */
export async function handleSseStream(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const server = createFastfreeMcpServer();
  // Transport directs the client to POST JSON-RPC messages to /mcp/messages?sessionId=<sessionId>
  const transport = new SSEServerTransport('/mcp/messages', res);

  const sessionId = transport.sessionId;
  const session: McpSession = {
    sessionId,
    transport,
    server,
    createdAt: new Date(),
  };

  activeSessions.set(sessionId, session);

  transport.onclose = () => {
    activeSessions.delete(sessionId);
  };

  transport.onerror = (err: Error) => {
    console.error(`[mcp] Transport error on session ${sessionId}:`, err.message);
    activeSessions.delete(sessionId);
  };

  // Clean up if underlying socket closes abruptly
  req.on('close', () => {
    activeSessions.delete(sessionId);
  });

  await server.connect(transport);
}

/**
 * Handle incoming JSON-RPC client messages on POST /mcp/messages?sessionId=<sessionId>.
 */
export async function handleSseMessage(
  sessionId: string,
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody?: unknown,
): Promise<void> {
  const session = activeSessions.get(sessionId);

  if (!session) {
    throw ApiError.notFound(`MCP session "${sessionId}" not found or expired.`);
  }

  await session.transport.handlePostMessage(req, res, parsedBody);
}

/**
 * Direct execution of MCP tools for simple HTTP RPC callers (POST /mcp/call).
 */
export async function executeDirectToolCall(
  toolName: string,
  rawArgs: Record<string, unknown> = {},
): Promise<unknown> {
  switch (toolName) {
    case 'clan_machines_list': {
      return await clanService.listMachines();
    }

    case 'clan_machines_update': {
      const parsed = clanMachineUpdateSchema.parse(rawArgs);
      return await clanService.updateMachine(parsed.machine, parsed.hostKeyCheck);
    }

    case 'nixos_health': {
      return await nixosService.getSystemHealth();
    }

    case 'nixos_rollback': {
      const parsed = nixosRollbackSchema.parse(rawArgs);
      return await nixosService.rollback(parsed);
    }

    case 'paseo_status': {
      return await paseoService.getStatus();
    }

    case 'paseo_agents': {
      const status = await paseoService.getStatus();
      return status.agents;
    }

    case 'paseo_agent_prompt': {
      const parsed = paseoAgentPromptSchema.parse(rawArgs);
      return await paseoService.dispatchPrompt(parsed);
    }

    default:
      throw ApiError.validation(`Unknown MCP tool: "${toolName}". Supported tools: clan_machines_list, clan_machines_update, nixos_health, nixos_rollback, paseo_status, paseo_agents, paseo_agent_prompt.`, {
        field: 'tool',
      });
  }
}

/** Get count of currently active SSE MCP sessions */
export function getActiveSessionCount(): number {
  return activeSessions.size;
}

/** Close and remove a session */
export async function closeSession(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (session) {
    activeSessions.delete(sessionId);
    await session.transport.close();
  }
}
