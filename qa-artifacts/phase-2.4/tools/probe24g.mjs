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
async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  return res.content ?? [];
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');

console.log('--- session ---');
console.log(textOf(await call('driver_session', { action: 'start' })));
console.log('--- localStorage ---');
console.log(textOf(await call('webview_execute_js', { script: "JSON.stringify(Object.keys(localStorage).filter(k => k.indexOf('fastfree') >= 0).map(k => [k, localStorage.getItem(k)]))", windowId: 'main' })));
console.log('--- find .q-slider ---');
console.log(textOf(await call('webview_find_element', { selector: '.q-slider', strategy: 'css', limit: 3, windowId: 'main' })));
console.log('--- find .q-input ---');
console.log(textOf(await call('webview_find_element', { selector: '.q-input', strategy: 'css', limit: 3, windowId: 'main' })));
await client.close();
console.log('done');
