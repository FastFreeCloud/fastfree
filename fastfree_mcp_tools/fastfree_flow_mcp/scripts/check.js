#!/usr/bin/env node
/**
 * Self-check for fastfree_flow_mcp.
 *
 * Verifies the MCP handshake, counts the tools, and probes the live browser
 * session. Read-only: it never generates and never spends a credit.
 *
 *   npm run check
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const server = path.resolve(here, '..', 'src', 'index.js');

const child = spawn('node', [server], { env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });

let buf = '';
const waiters = new Map();

child.stdout.on('data', (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id); }
    } catch { /* ignore non-JSON noise */ }
  }
});

child.stderr.on('data', (d) => process.stderr.write('[server] ' + d));

let seq = 0;
function rpc(method, params, ms = 60000) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    waiters.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { waiters.delete(id); reject(new Error('timeout: ' + method)); }, ms);
  });
}

function done(code) {
  child.kill();
  process.exit(code);
}

await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'fastfree-flow-check', version: '1.0.0' },
});
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');

const listed = await rpc('tools/list', {});
const tools = listed.result.tools;

console.log('server  : ' + server);
console.log('tools   : ' + tools.length);

for (const t of tools) console.log('  - ' + t.name);

console.log('\nprobing browser session ...');
const status = await rpc('tools/call', { name: 'flow_status', arguments: {} });
const body = status.result?.content?.[0]?.text ?? '';

console.log(body);

const alive = /"authenticated":\s*true/.test(body);
console.log('\nresult  : ' + (alive ? 'OK - session authenticated' : 'FAIL - not authenticated'));

if (!alive) {
  console.log('hint    : run scripts\\launch.cmd and sign in through the browser window');
}

done(alive ? 0 : 1);