/**
 * Phase 2.4 probe 5 — find_element output shape.
 * No backslashes in this file.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase24-probe5', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
async function call0(name, args) { const r = await client.callTool({ name, arguments: args }); return r.content ?? []; }
console.log(String(call0("driver_session", { action: "start" })).slice(0, 1));
async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  return res.content ?? [];
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');

console.log('--- find .q-slider ---');
console.log(textOf(await call('webview_find_element', { selector: '.q-slider', strategy: 'css', limit: 3, windowId: 'main' })));
console.log('--- find .q-input ---');
console.log(textOf(await call('webview_find_element', { selector: '.q-input', strategy: 'css', limit: 3, windowId: 'main' })));
console.log('--- find .q-card ---');
console.log(textOf(await call('webview_find_element', { selector: '.q-card', strategy: 'css', limit: 2, windowId: 'main' })));
await client.close();
console.log('done');
