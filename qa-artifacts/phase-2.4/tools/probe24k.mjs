import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeK', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call('driver_session', { action: 'start' });
console.log('reloading...');
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 'reloading'; })()", windowId: 'main' }); } catch (e) { console.log('reload call err: ' + e.message); }
await sleep(6000);
console.log('=== AFTER RELOAD ===');
console.log(textOf(await call('webview_execute_js', { script: "(() => { const s = window.__FASTFREE_CURRENT_STEP__; const h = document.querySelector('.sdui-step-host'); const w = document.querySelector('.sdui-screen-wrapper'); return JSON.stringify({ step: s ? s.value : null, host: !!h, hostText: h ? h.innerText.slice(0,200) : null, wrapper: !!w, wrapperText: w ? w.innerText.slice(0,300) : null, bodyLen: document.body.innerText.length, qbtn: document.querySelectorAll('.q-btn').length, qcard: document.querySelectorAll('.q-card').length }); })()", windowId: 'main' })));
console.log('=== ELEMENTS ===');
for (const sel of ['.q-btn', '.q-card', '.q-slider', '.q-input', '.q-toggle']) {
  const out = textOf(await call('webview_find_element', { selector: sel, strategy: 'css', limit: 2, windowId: 'main' }));
  console.log(sel + ' => ' + out.replace(/\s+/g, ' ').slice(0, 160));
}
await client.close();
console.log('done');
