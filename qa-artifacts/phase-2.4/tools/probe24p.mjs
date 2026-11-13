import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi/tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeP', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call('driver_session', { action: 'start' });
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 1; })()", windowId: 'main' }); } catch (e) {}
await sleep(9000);
const dump = "(() => { return JSON.stringify({ step: window.__FASTFREE_CURRENT_STEP__.value, bodyLen: document.body.innerText.length, qbtn: document.querySelectorAll('.q-btn').length, qcard: document.querySelectorAll('.q-card').length, qslider: document.querySelectorAll('.q-slider').length, qinput: document.querySelectorAll('.q-input input').length, qtoggle: document.querySelectorAll('.q-toggle').length, hostText: (document.querySelector('.sdui-step-host') || {}).innerText ? document.querySelector('.sdui-step-host').innerText.slice(0,120) : null }); })()";
console.log('after reload: ' + textOf(await call('webview_execute_js', { script: dump, windowId: 'main' })));
for (let n = 1; n <= 6; n++) {
  await call('webview_execute_js', { script: "(() => { window.__FASTFREE_CURRENT_STEP__.value = " + n + "; return 1; })()", windowId: 'main' });
  await sleep(3000);
  console.log('step ' + n + ': ' + textOf(await call('webview_execute_js', { script: dump, windowId: 'main' })));
}
await client.close();
console.log('done');
