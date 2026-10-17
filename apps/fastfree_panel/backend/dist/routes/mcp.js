/**
 * FastFree MCP (Model Context Protocol) HTTP & SSE Routes.
 *
 * Exposes:
 *   GET  /mcp/sse       - SSE stream connection establishing session
 *   POST /mcp/messages  - JSON-RPC message endpoint for active session
 *   POST /mcp/call      - Convenience direct HTTP RPC endpoint
 *   GET  /mcp/status    - Health and active sessions metadata
 */
import { Hono } from 'hono';
import { handleSseStream, handleSseMessage, executeDirectToolCall, getActiveSessionCount, } from '../mcp/server.js';
import { ApiError } from '../http/errors.js';
import { ok } from '../http/respond.js';
export const mcpRoutes = new Hono();
/**
 * GET /mcp/sse
 * Establishes an SSE stream connection with the MCP client.
 */
mcpRoutes.get('/sse', async (c) => {
    const incoming = c.env?.incoming;
    const outgoing = c.env?.outgoing;
    if (!incoming || !outgoing) {
        throw new ApiError('INTERNAL', 'HTTP node bindings are unavailable on this server.');
    }
    await handleSseStream(incoming, outgoing);
    // Inform @hono/node-server that the raw node response is handled directly
    return new Response(null, {
        headers: { 'x-hono-already-sent': 'true' },
    });
});
/**
 * POST /mcp/messages?sessionId=<sessionId>
 * Receives JSON-RPC client messages associated with an active SSE session.
 */
mcpRoutes.post('/messages', async (c) => {
    const sessionId = c.req.query('sessionId');
    if (!sessionId) {
        throw ApiError.validation('Missing sessionId query parameter.', { field: 'sessionId' });
    }
    const incoming = c.env?.incoming;
    const outgoing = c.env?.outgoing;
    if (!incoming || !outgoing) {
        throw new ApiError('INTERNAL', 'HTTP node bindings are unavailable on this server.');
    }
    let body = undefined;
    try {
        body = await c.req.json();
    }
    catch {
        // If body is streamed or not JSON, handlePostMessage will consume incoming stream
    }
    await handleSseMessage(sessionId, incoming, outgoing, body);
    return new Response(null, {
        headers: { 'x-hono-already-sent': 'true' },
    });
});
/**
 * POST /mcp/call
 * Convenience direct HTTP RPC endpoint for non-SSE clients.
 * Supports both simple { "tool": "name", "args": {} } and JSON-RPC 2.0 { "method": "tools/call", ... }.
 */
mcpRoutes.post('/call', async (c) => {
    const raw = await c.req.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
        throw ApiError.validation('Invalid request body. Expected a JSON object.');
    }
    const body = raw;
    // 1. JSON-RPC 2.0 Protocol Support
    if (body.jsonrpc === '2.0' && typeof body.method === 'string') {
        const id = body.id ?? null;
        const method = body.method;
        if (method === 'tools/list') {
            return c.json({
                jsonrpc: '2.0',
                id,
                result: {
                    tools: [
                        {
                            name: 'clan_machines_list',
                            description: 'List all machines managed by Clan with their network names and assigned roles/tags.',
                            inputSchema: { type: 'object', properties: {} },
                        },
                        {
                            name: 'clan_machines_update',
                            description: 'Update a specific Clan machine configuration and trigger deployment.',
                            inputSchema: {
                                type: 'object',
                                properties: { machine: { type: 'string', description: 'Machine identifier' } },
                                required: ['machine'],
                            },
                        },
                        {
                            name: 'nixos_health',
                            description: 'Return host server health metrics (CPU, Memory, Disk, Systemd) and current NixOS generation.',
                            inputSchema: { type: 'object', properties: {} },
                        },
                        {
                            name: 'nixos_rollback',
                            description: 'Trigger a rollback to the previous NixOS generation.',
                            inputSchema: {
                                type: 'object',
                                properties: { targetHost: { type: 'string', description: 'Optional target host' } },
                            },
                        },
                    ],
                },
            });
        }
        if (method === 'tools/call') {
            const params = body.params ?? {};
            const name = String(params.name ?? '');
            const args = params.arguments ?? {};
            try {
                const result = await executeDirectToolCall(name, args);
                return c.json({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    },
                });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Tool call failed';
                return c.json({
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32603,
                        message,
                    },
                }, 400);
            }
        }
        throw ApiError.validation(`Unsupported JSON-RPC method: "${method}".`);
    }
    // 2. Simple Convenience REST Format: { "tool": "clan_machines_list", "args": { ... } }
    const toolName = typeof body.tool === 'string'
        ? body.tool
        : typeof body.name === 'string'
            ? body.name
            : null;
    if (!toolName) {
        throw ApiError.validation('Missing "tool" or "name" field in request body.', { field: 'tool' });
    }
    const toolArgs = typeof body.args === 'object' && body.args !== null
        ? body.args
        : {};
    const result = await executeDirectToolCall(toolName, toolArgs);
    return c.json(ok(result));
});
/**
 * GET /mcp/status
 * Metadata endpoint exposing active MCP sessions and supported capabilities.
 */
mcpRoutes.get('/status', (c) => {
    return c.json(ok({
        status: 'ready',
        activeSessions: getActiveSessionCount(),
        tools: ['clan_machines_list', 'clan_machines_update', 'nixos_health', 'nixos_rollback'],
    }));
});
//# sourceMappingURL=mcp.js.map