import { spawn } from 'node:child_process';

const child = spawn('node', ['C:/Users/FastFree/Desktop/fastfree/fastfree_mcp_tools/fastfree_flow_mcp/src/index.js'], {
  env: {
    ...process.env,
    FLOW_CDP_PORT: '9222',
    FLOW_PROJECT_ID: 'WRONG_PROJECT_ID_12345'
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
const w = new Map();
child.stdout.on('data', d => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const l = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!l) continue;
    try { const m = JSON.parse(l); if (w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); } } catch {}
  }
});

let s = 0;
const rpc = (m, p, ms = 60000) => {
  const id = ++s;
  return new Promise((res, rej) => {
    w.set(id, res);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method: m, params: p }) + '\n');
    setTimeout(() => rej(new Error('timeout')), ms);
  });
};

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');

const r = await rpc('tools/call', { name: 'flow_status', arguments: {} }, 60000);
console.log('isError:', r.result?.isError);
console.log(r.result?.content?.[0]?.text?.slice(0, 300));

child.kill();
process.exit(0);