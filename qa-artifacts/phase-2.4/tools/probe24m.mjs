import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi/tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeM', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await call('driver_session', { action: 'start' });
try { await call('webview_execute_js', { script: "(() => { window.location.reload(); return 1; })()", windowId: 'main' }); } catch (e) {}
await sleep(6000);
await call('webview_execute_js', { script: "(() => { window.__FASTFREE_CURRENT_STEP__.value = 1; return 1; })()", windowId: 'main' });
await sleep(1200);
const scan = textOf(await call('webview_execute_js', { script: [
  "(() => {",
  "  const root = document.querySelector('#app');",
  "  if (!root || !root.__vue_app__) return JSON.stringify({ ok: false, reason: 'no vue app' });",
  "  const inst = root.__vue_app__._instance;",
  "  if (!inst) return JSON.stringify({ ok: false, reason: 'no root instance' });",
  "  let found = null; let scanned = 0; const seen = new Set();",
  "  function scan(vnode) {",
  "    if (!vnode || seen.has(vnode)) return; seen.add(vnode);",
  "    if (vnode.component) { scanned++; const st = vnode.component.setupState; if (st && st.dispatcher) found = st.dispatcher; scan(vnode.component.subTree); }",
  "    if (Array.isArray(vnode.children)) { for (const c of vnode.children) scan(c); }",
  "    else if (vnode.children && typeof vnode.children === 'object') { for (const k of Object.keys(vnode.children)) { const c = vnode.children[k]; if (c && typeof c === 'object') scan(c); } }",
  "    if (vnode.dynamicChildren) { for (const c of vnode.dynamicChildren) scan(c); }",
  "  }",
  "  scan(inst.subTree);",
  "  if (!found) return JSON.stringify({ ok: false, scanned });",
  "  window.__QA_DISPATCHER__ = found;",
  "  return JSON.stringify({ ok: true, scanned, count: found.getExecutionLogs().length });",
  "})()"
].join('\n'), windowId: 'main' }));
console.log('dispatcher scan: ' + scan);
const since = new Date(Date.now() - 1000).toISOString();
console.log('since: ' + since);
const steps = [
  ['Proceed to License', 2],
  ['Proceed to Resource Sizing', 3],
  ['Proceed to WireGuard Mesh', 4],
  ['Proceed to Machine Deployment', 5],
  ['Complete & Open Sovereign Launchpad', 6]
];
for (const [label, expect] of steps) {
  const out = textOf(await call('webview_interact', { action: 'click', selector: label, strategy: 'text', windowId: 'main' }));
  await sleep(1500);
  const step = textOf(await call('webview_execute_js', { script: "(() => { return String(window.__FASTFREE_CURRENT_STEP__.value); })()", windowId: 'main' }));
  console.log('click "' + label + '" => ' + out.trim() + ' | step=' + step.trim() + ' (expect ' + expect + ')');
}
console.log('=== DISPATCH LOGS ===');
console.log(textOf(await call('webview_execute_js', { script: "(() => { const d = window.__QA_DISPATCHER__; return JSON.stringify(d.getExecutionLogs()); })()", windowId: 'main' })));
console.log('=== CONSOLE ERRORS since ===');
console.log(textOf(await call('read_logs', { source: 'console', level: 'error', since, lines: 40 })));
await client.close();
console.log('done');
