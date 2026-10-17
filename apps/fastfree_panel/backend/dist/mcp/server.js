/**
 * Embedded Web MCP (Model Context Protocol) Server for FastFree.
 *
 * Implements MCP specification over Server-Sent Events (SSE) and HTTP JSON-RPC,
 * exposing Clan operations and NixOS system administration tools to AI agents
 * (Antigravity, OpenCode, Claude, etc.).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { clanService } from '../core/clan.service.js';
import { nixosService } from '../core/nixos.service.js';
import { clanMachineUpdateSchema } from '../schemas/clan.schema.js';
import { nixosRollbackSchema } from '../schemas/nixos.schema.js';
import { ApiError } from '../http/errors.js';
/** Active SSE transport sessions indexed by sessionId */
const activeSessions = new Map();
/**
 * Instantiate and configure a new FastFree McpServer instance with registered tools.
 */
export function createFastfreeMcpServer() {
    const server = new McpServer({
        name: 'fastfree-panel-mcp',
        version: '1.0.0',
    });
    // Tool 1: clan_machines_list
    server.tool('clan_machines_list', 'List all machines managed by Clan with their network names and assigned roles/tags.', async () => {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to list machines';
            return {
                content: [{ type: 'text', text: `Error listing machines: ${message}` }],
                isError: true,
            };
        }
    });
    // Tool 2: clan_machines_update
    server.tool('clan_machines_update', 'Update a specific Clan machine configuration and trigger deployment.', {
        machine: z.string().describe('Machine identifier to update (e.g. client1, client2)'),
    }, async (args) => {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update machine';
            return {
                content: [{ type: 'text', text: `Error updating machine ${args.machine}: ${message}` }],
                isError: true,
            };
        }
    });
    // Tool 3: nixos_health
    server.tool('nixos_health', 'Return host server health metrics (CPU, Memory, Disk, Systemd) and current NixOS generation.', async () => {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to collect health metrics';
            return {
                content: [{ type: 'text', text: `Error collecting health: ${message}` }],
                isError: true,
            };
        }
    });
    // Tool 4: nixos_rollback
    server.tool('nixos_rollback', 'Trigger a rollback to the previous NixOS generation.', {
        targetHost: z.string().optional().describe('Optional remote target host address'),
    }, async (args) => {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to execute rollback';
            return {
                content: [{ type: 'text', text: `Error rolling back: ${message}` }],
                isError: true,
            };
        }
    });
    return server;
}
/**
 * Handle new incoming SSE connection on GET /mcp/sse.
 */
export async function handleSseStream(req, res) {
    const server = createFastfreeMcpServer();
    // Transport directs the client to POST JSON-RPC messages to /mcp/messages?sessionId=<sessionId>
    const transport = new SSEServerTransport('/mcp/messages', res);
    const sessionId = transport.sessionId;
    const session = {
        sessionId,
        transport,
        server,
        createdAt: new Date(),
    };
    activeSessions.set(sessionId, session);
    transport.onclose = () => {
        activeSessions.delete(sessionId);
    };
    transport.onerror = (err) => {
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
export async function handleSseMessage(sessionId, req, res, parsedBody) {
    const session = activeSessions.get(sessionId);
    if (!session) {
        throw ApiError.notFound(`MCP session "${sessionId}" not found or expired.`);
    }
    await session.transport.handlePostMessage(req, res, parsedBody);
}
/**
 * Direct execution of MCP tools for simple HTTP RPC callers (POST /mcp/call).
 */
export async function executeDirectToolCall(toolName, rawArgs = {}) {
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
        default:
            throw ApiError.validation(`Unknown MCP tool: "${toolName}". Supported tools: clan_machines_list, clan_machines_update, nixos_health, nixos_rollback.`, {
                field: 'tool',
            });
    }
}
/** Get count of currently active SSE MCP sessions */
export function getActiveSessionCount() {
    return activeSessions.size;
}
/** Close and remove a session */
export async function closeSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (session) {
        activeSessions.delete(sessionId);
        await session.transport.close();
    }
}
//# sourceMappingURL=server.js.map