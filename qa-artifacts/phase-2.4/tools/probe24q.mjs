import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi/tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeQ', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call('driver_session', { action: 'start' });
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 1; })()", windowId: 'main' }); } catch (e) {}
await sleep(9000);
const dump = "(() => { const m = (el) => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 45); const btns = Array.prototype.map.call(document.querySelectorAll('.q-btn'), m); const inputs = Array.prototype.map.call(document.querySelectorAll('.q-input input'), function(i){ return { v: i.value, ph: i.placeholder, type: i.type }; }); const toggles = Array.prototype.map.call(document.querySelectorAll('.q-toggle'), function(t){ return { checked: t.getAttribute('aria-checked'), label: m(t).slice(0,40) }; }); const sliders = Array.prototype.map.call(document.querySelectorAll('.q-slider'), function(s){ return { now: s.getAttribute('aria-valuenow'), min: s.getAttribute('aria-valuemin'), max: s.getAttribute('aria-valuemax') }; }); return JSON.stringify({ step: window.__FASTFREE_CURRENT_STEP__.value, btns, inputs, toggles, sliders }); })()";
for (let n = 1; n <= 6; n++) {
  await call('webview_execute_js', { script: "(() => { window.__FASTFREE_CURRENT_STEP__.value = " + n + "; return 1; })()", windowId: 'main' });
  await sleep(3000);
  console.log('===== STEP ' + n + ' =====');
  console.log(textOf(await call('webview_execute_js', { script: dump, windowId: 'main' })));
}
await client.close();
console.log('done');
