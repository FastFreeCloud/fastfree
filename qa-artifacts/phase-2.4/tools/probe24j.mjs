import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'qa-probeJ', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
function textOf(c) { return c.map((x) => x.text ?? '').join('\n'); }
async function call(n, a) { const r = await client.callTool({ name: n, arguments: a }); return r.content ?? []; }
await call('driver_session', { action: 'start' });
console.log('=== WINDOWS ===');
console.log(textOf(await call('manage_window', { action: 'list' })));
console.log('=== STEP + COMPONENT ===');
console.log(textOf(await call('webview_execute_js', { script: "(() => { const s = window.__FASTFREE_CURRENT_STEP__; const h = document.querySelector('.sdui-step-host'); let info = null; if (h && h.__vueParentComponent) { const i = h.__vueParentComponent; info = { loading: i.setupState && i.setupState.loading, hasSchema: !!(i.setupState && i.setupState.currentSchema), schemaId: i.setupState && i.setupState.currentSchema ? i.setupState.currentSchema.id : null, activeNamed: i.setupState && i.setupState.activeNamedScreen }; } return JSON.stringify({ step: s ? s.value : null, hostFound: !!h, info, bodyLen: document.body.innerText.length }); })()", windowId: 'main' })));
console.log('=== RECENT LOGS (last 15) ===');
console.log(textOf(await call('read_logs', { source: 'console', lines: 15 })));
await client.close();
console.log('done');
