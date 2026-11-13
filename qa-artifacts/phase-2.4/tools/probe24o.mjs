import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi/tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeO', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call('driver_session', { action: 'start' });
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 1; })()", windowId: 'main' }); } catch (e) {}
await sleep(6000);
const dump = "(() => { const q = (s) => document.querySelectorAll(s); const btns = Array.prototype.map.call(q('.q-btn'), function(b){ return (b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40); }); const sliders = Array.prototype.map.call(q('.q-slider'), function(s){ return { now: s.getAttribute('aria-valuenow'), min: s.getAttribute('aria-valuemin'), max: s.getAttribute('aria-valuemax') }; }); const inputs = Array.prototype.map.call(q('.q-input input'), function(i){ return { v: i.value, ph: i.placeholder }; }); const toggles = Array.prototype.map.call(q('.q-toggle'), function(t){ return t.getAttribute('aria-checked'); }); const steps = Array.prototype.map.call(q('.step-item'), function(s){ return (s.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30); }); return JSON.stringify({ step: window.__FASTFREE_CURRENT_STEP__.value, btns, sliders, inputs, toggles, steps, cards: q('.q-card').length }); })()";
for (let n = 1; n <= 6; n++) {
  await call('webview_execute_js', { script: "(() => { window.__FASTFREE_CURRENT_STEP__.value = " + n + "; return 1; })()", windowId: 'main' });
  await sleep(1300);
  console.log('===== STEP ' + n + ' =====');
  console.log(textOf(await call('webview_execute_js', { script: dump, windowId: 'main' })));
}
await client.close();
console.log('done');
