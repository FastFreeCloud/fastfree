import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi/tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeN', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCAN = [
  "(() => {",
  "  const root = document.querySelector('#app');",
  "  if (!root || !root.__vue_app__) return JSON.stringify({ ok: false });",
  "  const inst = root.__vue_app__._instance;",
  "  let found = null; let scanned = 0; const seen = new Set();",
  "  function scan(vnode) { if (!vnode || seen.has(vnode)) return; seen.add(vnode); if (vnode.component) { scanned++; const st = vnode.component.setupState; if (st && st.dispatcher) found = st.dispatcher; scan(vnode.component.subTree); } if (Array.isArray(vnode.children)) { for (const c of vnode.children) scan(c); } else if (vnode.children && typeof vnode.children === 'object') { for (const k of Object.keys(vnode.children)) { const c = vnode.children[k]; if (c && typeof c === 'object') scan(c); } } if (vnode.dynamicChildren) { for (const c of vnode.dynamicChildren) scan(c); } }",
  "  scan(inst.subTree);",
  "  if (!found) return JSON.stringify({ ok: false, scanned });",
  "  window.__QA_DISPATCHER__ = found;",
  "  return JSON.stringify({ ok: true, scanned });",
  "})()"
].join('\n');
async function logs() { return textOf(await call('webview_execute_js', { script: "(() => { const d = window.__QA_DISPATCHER__; return JSON.stringify(d.getExecutionLogs()); })()", windowId: 'main' })); }
async function errors(since) { return textOf(await call('read_logs', { source: 'console', level: 'error', since, lines: 20 })); }
await call('driver_session', { action: 'start' });
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 1; })()", windowId: 'main' }); } catch (e) {}
await sleep(6000);
await call('webview_execute_js', { script: "(() => { window.__FASTFREE_CURRENT_STEP__.value = 1; return 1; })()", windowId: 'main' });
await sleep(1200);
console.log('scan: ' + textOf(await call('webview_execute_js', { script: SCAN, windowId: 'main' })));
await call('webview_execute_js', { script: "(() => { window.__QA_DISPATCHER__.clearLogs(); return 1; })()", windowId: 'main' });
let since = new Date(Date.now() - 500).toISOString();
console.log('--- click Re-scan Hardware ---');
console.log(textOf(await call('webview_interact', { action: 'click', selector: 'Re-scan Hardware', strategy: 'text', windowId: 'main' })));
await sleep(2500);
console.log('logs: ' + await logs());
console.log('errors: ' + await errors(since));
console.log('--- go step 2, type key, click Verify Key ---');
await call('webview_interact', { action: 'click', selector: 'Proceed to License', strategy: 'text', windowId: 'main' });
await sleep(1500);
console.log('type: ' + textOf(await call('webview_keyboard', { action: 'type', selector: '.q-input input', strategy: 'css', text: 'FF-CL01-41EF-AC89', windowId: 'main' })));
await sleep(600);
console.log('input value: ' + textOf(await call('webview_execute_js', { script: "(() => { const i = document.querySelector('.q-input input'); return JSON.stringify({ v: i ? i.value : null }); })()", windowId: 'main' })));
since = new Date(Date.now() - 500).toISOString();
console.log('verify click: ' + textOf(await call('webview_interact', { action: 'click', selector: 'Verify Key', strategy: 'text', windowId: 'main' })));
await sleep(5000);
console.log('logs: ' + await logs());
console.log('errors: ' + await errors(since));
await client.close();
console.log('done');
