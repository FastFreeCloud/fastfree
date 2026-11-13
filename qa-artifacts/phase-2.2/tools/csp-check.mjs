/** Check whether eval / new Function is permitted by the Tauri CSP in the webview. */
import { connect, makeHelpers } from './mcp-client.mjs';

const client = await connect();
const h = await makeHelpers(client);
await h.call('driver_session', { action: 'start' });

const r = await h.evJson(`(() => {
  const out = {};
  try { out.newFunction = (new Function('return 40 + 2'))(); } catch (e) { out.newFunction = 'BLOCKED: ' + e.message; }
  try { out.eval = eval('30 + 12'); } catch (e) { out.eval = 'BLOCKED: ' + e.message; }
  try { out.setTimeoutEval = 'n/a'; } catch (e) { out.setTimeoutEval = 'BLOCKED'; }
  out.cspMeta = (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || null;
  return JSON.stringify(out);
})()`);
console.log('CSP/eval probe:', JSON.stringify(r, null, 2));

await client.close();
