/**
 * Phase 2.4 probe 4 — reach SduiActionDispatcher singleton via Vue app tree.
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
const client = new Client({ name: 'fastfree-qa-phase24-probe4', version: '1.0.0' }, { capabilities: {} });
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

const script = [
  "(() => {",
  "  try {",
  "    const root = document.querySelector('#app');",
  "    if (!root) return 'NO_ROOT';",
  "    const app = root.__vue_app__;",
  "    if (!app) return 'NO_APP';",
  "    const inst = app._instance;",
  "    if (!inst) return 'NO_INSTANCE';",
  "    let found = null; let scanned = 0;",
  "    const seen = new Set();",
  "    function scan(vnode) {",
  "      if (!vnode || seen.has(vnode)) return; seen.add(vnode);",
  "      if (vnode.component) {",
  "        scanned++;",
  "        const st = vnode.component.setupState;",
  "        if (st && st.dispatcher) { found = st.dispatcher; }",
  "        scan(vnode.component.subTree);",
  "      }",
  "      if (Array.isArray(vnode.children)) { for (const c of vnode.children) scan(c); }",
  "      else if (vnode.children && typeof vnode.children === 'object') {",
  "        for (const k of Object.keys(vnode.children)) { const c = vnode.children[k]; if (c && typeof c === 'object') scan(c); }",
  "      }",
  "      if (vnode.dynamicChildren) { for (const c of vnode.dynamicChildren) scan(c); }",
  "    }",
  "    scan(inst.subTree);",
  "    if (!found) return JSON.stringify({ ok: false, scanned: scanned, hasApp: true });",
  "    window.__QA_DISPATCHER__ = found;",
  "    const logs = found.getExecutionLogs();",
  "    return JSON.stringify({ ok: true, scanned: scanned, count: logs.length, sample: logs.slice(0, 3) });",
  "  } catch (e) { return 'ERR:' + e.message + ' | ' + (e.stack || '').slice(0, 300); }",
  "})()",
].join('\n');

console.log('--- vue tree scan ---');
console.log(await ev(script));

console.log('--- read logs via window.__QA_DISPATCHER__ ---');
console.log(await ev("(() => { const d = window.__QA_DISPATCHER__; if (!d) return 'NO_DISPATCHER'; return JSON.stringify(d.getExecutionLogs()); })()"));

await client.close();
console.log('done');
