/**
 * Phase 2.4 probe 2 — locate lowcode module URL and test dispatcher access.
 * No backslashes in this file.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'fastfree-qa-phase24-probe2', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  return res.content ?? [];
}
const textOf = (content) => content.map((c) => c.text ?? '').join('\n');
async function ev(script) {
  const c = await call('webview_execute_js', { script, windowId: 'main' });
  return textOf(c);
}

console.log('--- resource urls containing lowcode/sdui ---');
console.log(await ev("(() => { const rs = performance.getEntriesByType('resource').map(r => r.name); return JSON.stringify(rs.filter(n => n.indexOf('lowcode') >= 0 || n.indexOf('sdui') >= 0 || n.indexOf('Sdui') >= 0).slice(0, 20)); })()"));

console.log('--- all resource hosts (sample) ---');
console.log(await ev("(() => { const rs = performance.getEntriesByType('resource').map(r => r.name); return JSON.stringify(rs.slice(0, 40)); })()"));

console.log('--- set step 1 ---');
console.log(await ev("(() => { window.__FASTFREE_CURRENT_STEP__.value = 1; return JSON.stringify({ step: window.__FASTFREE_CURRENT_STEP__.value }); })()"));

await sleep(1200);
console.log('--- step after wait ---');
console.log(await ev("(() => { return JSON.stringify({ step: window.__FASTFREE_CURRENT_STEP__.value, title: document.title }); })()"));

console.log('--- find step1 proceed button ---');
console.log(textOf(await call('webview_find_element', { selector: 'Proceed to License', strategy: 'text', limit: 5, windowId: 'main' })));

console.log('--- buttons on step1 ---');
console.log(await ev("(() => { const btns = Array.from(document.querySelectorAll('.q-btn')).map(b => (b.textContent || '').trim()).filter(Boolean); return JSON.stringify(btns.slice(0, 30)); })()"));

await client.close();
console.log('done');
