import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeL', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call('driver_session', { action: 'start' });
console.log('reload');
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 1; })()", windowId: 'main' }); } catch (e) {}
await sleep(6000);
console.log('state: ' + textOf(await call('webview_execute_js', { script: "(() => { return JSON.stringify({ step: window.__FASTFREE_CURRENT_STEP__.value, lang: document.documentElement.getAttribute('lang'), dir: document.documentElement.getAttribute('dir'), theme: document.documentElement.getAttribute('data-theme') }); })()", windowId: 'main' })));
console.log('set step 1');
await call('webview_execute_js', { script: "(() => { window.__FASTFREE_CURRENT_STEP__.value = 1; return 1; })()", windowId: 'main' });
await sleep(1200);
console.log('step now: ' + textOf(await call('webview_execute_js', { script: "(() => { return String(window.__FASTFREE_CURRENT_STEP__.value); })()", windowId: 'main' })));
console.log('=== FIND Proceed buttons ===');
for (const t of ['Proceed to License', 'Re-scan Hardware']) {
  console.log(t + ' => ' + textOf(await call('webview_find_element', { selector: t, strategy: 'text', limit: 3, windowId: 'main' })).replace(/\s+/g, ' ').slice(0, 300));
}
console.log('=== CLICK Proceed to License ===');
console.log(textOf(await call('webview_interact', { action: 'click', selector: 'Proceed to License', strategy: 'text', windowId: 'main' })));
await sleep(1500);
console.log('step now: ' + textOf(await call('webview_execute_js', { script: "(() => { return String(window.__FASTFREE_CURRENT_STEP__.value); })()", windowId: 'main' })));
console.log('=== DISPATCH LOGS ===');
console.log(textOf(await call('webview_execute_js', { script: "(() => { const d = window.__QA_DISPATCHER__; if (!d) return 'none'; return JSON.stringify(d.getExecutionLogs()); })()", windowId: 'main' })));
await client.close();
console.log('done');
