import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeI', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
await call('driver_session', { action: 'start' });
console.log('=== CONSOLE LOGS (all) ===');
console.log(textOf(await call('read_logs', { source: 'console', lines: 60 })));
console.log('=== CONSOLE ERRORS ===');
console.log(textOf(await call('read_logs', { source: 'console', level: 'error', lines: 40 })));
console.log('=== STEP HOST DETAIL ===');
console.log(textOf(await call('webview_execute_js', { script: "(() => { const h = document.querySelector('.sdui-step-host'); const w = document.querySelector('.sdui-screen-wrapper'); return JSON.stringify({ hostText: h ? h.innerText.slice(0,300) : null, wrapper: !!w, wrapperText: w ? w.innerText.slice(0,300) : null, bodyText: document.body.innerText.slice(0,500) }); })()", windowId: 'main' })));
console.log('=== DISPATCHER ===');
console.log(textOf(await call('webview_execute_js', { script: "(() => { const d = window.__QA_DISPATCHER__; if (!d) return 'none'; const L = d.getExecutionLogs(); return JSON.stringify({ count: L.length, logs: L.slice(0,10) }); })()", windowId: 'main' })));
await client.close();
console.log('done');
