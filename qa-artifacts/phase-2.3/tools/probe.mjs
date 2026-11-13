import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const outDir = path.resolve(__dirname, '..', 'screenshots');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: __dirname,
});

const client = new Client({ name: 'fastfree-qa-probe', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
console.log('CONNECTED');

const tools = await client.listTools();
console.log('TOOLS:', tools.tools.map(t => t.name).join(', '));

const session = await client.callTool({ name: 'driver_session', arguments: { action: 'start' } });
console.log('SESSION:', JSON.stringify(session.content));

const win = await client.callTool({ name: 'manage_window', arguments: { action: 'list' } });
console.log('WINDOWS:', JSON.stringify(win.content));

const info = await client.callTool({ name: 'manage_window', arguments: { action: 'info', windowId: 'main' } });
console.log('INFO:', JSON.stringify(info.content));

const ss = await client.callTool({
  name: 'webview_screenshot',
  arguments: { format: 'png', filePath: path.join(outDir, 'probe.png') },
});
console.log('SCREENSHOT:', JSON.stringify(ss.content));

const js = await client.callTool({
  name: 'webview_execute_js',
  arguments: { script: '(() => ({ href: location.href, title: document.title, theme: document.documentElement.getAttribute("data-theme"), step: window.__FASTFREE_CURRENT_STEP__ ? window.__FASTFREE_CURRENT_STEP__.value : null, dpr: window.devicePixelRatio, innerW: window.innerWidth, innerH: window.innerHeight }))()' },
});
console.log('JS:', JSON.stringify(js.content));

await client.close();
console.log('DONE');
