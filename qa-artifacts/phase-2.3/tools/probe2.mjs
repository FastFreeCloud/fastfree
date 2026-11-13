import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'node_modules', '@hypothesi', 'tauri-mcp-server', 'dist', 'index.js');
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: __dirname });
const client = new Client({ name: 'ff-probe2', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const call = async (name, args) => (await client.callTool({ name, arguments: args })).content.map(c => c.text ?? '').join('\n');
const parse = (t) => { const m = String(t).match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; };

await call('driver_session', { action: 'start' });
await call('manage_window', { action: 'resize', windowId: 'main', width: 1024, height: 768, logical: true });
await new Promise(r => setTimeout(r, 500));

// light theme
await call('webview_execute_js', { windowId: 'main', script: `(() => { const b=document.querySelector('.theme-btn'); let t=0; while(document.documentElement.getAttribute('data-theme')!=='light'&&t<4){b.click();t++;} return document.documentElement.getAttribute('data-theme'); })()` });
await new Promise(r => setTimeout(r, 300));
// step 1
await call('webview_execute_js', { windowId: 'main', script: `(() => { window.__FASTFREE_CURRENT_STEP__.value = 1; return window.__FASTFREE_CURRENT_STEP__.value; })()` });
await new Promise(r => setTimeout(r, 900));

const raw = await call('webview_execute_js', {
  windowId: 'main',
  script: `(() => {
    function parseRgb(s){ const m=String(s||'').match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p[3]===undefined?1:p[3]}; }
    function lum(c){ function f(v){v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);} return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); }
    function effBg(el){ let e=el; while(e){ const c=parseRgb(getComputedStyle(e).backgroundColor); if(c&&c.a>0.01) return c; e=e.parentElement; } return {r:255,g:255,b:255,a:1}; }
    function ratio(fg,bg){ const L1=lum(fg),L2=lum(bg); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); }
    const out = { theme: document.documentElement.getAttribute('data-theme'), step: window.__FASTFREE_CURRENT_STEP__.value, innerW: innerWidth, innerH: innerHeight, scrollH: document.documentElement.scrollHeight, items: [] };
    const seen = new Set();
    document.querySelectorAll('.sdui-screen-wrapper *').forEach(function(el){
      if (el.children.length === 0 && el.textContent && el.textContent.trim()) {
        const t = el.textContent.trim();
        if (!/[A-Za-z0-9]/.test(t)) return;
        const cs = getComputedStyle(el);
        const fg = parseRgb(cs.color) || {r:0,g:0,b:0,a:1};
        const bg = effBg(el);
        const r = el.getBoundingClientRect();
        const key = t.slice(0,20);
        if (seen.has(key)) return; seen.add(key);
        out.items.push({ text: t.slice(0,40), color: cs.color, bg: cs.backgroundColor, parentBg: getComputedStyle(el.parentElement).backgroundColor, contrast: Math.round(ratio(fg,bg)*100)/100, rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}, fontSize: cs.fontSize, fontWeight: cs.fontWeight });
      }
    });
    return out;
  })()`,
});
const data = parse(raw);
console.log('theme:', data.theme, 'step:', data.step, 'inner:', data.innerW + 'x' + data.innerH, 'scrollH:', data.scrollH);
console.log('--- low contrast items (contrast < 4.5) ---');
for (const it of data.items.filter(i => i.contrast < 4.5).sort((a,b)=>a.contrast-b.contrast)) {
  console.log(`${it.contrast} | color ${it.color} | parentBg ${it.parentBg} | ${it.fontSize}/${it.fontWeight} | rect ${JSON.stringify(it.rect)} | ${JSON.stringify(it.text)}`);
}
console.log('--- sample of readable items (contrast >= 4.5) ---');
for (const it of data.items.filter(i => i.contrast >= 4.5).slice(0, 8)) {
  console.log(`${it.contrast} | color ${it.color} | parentBg ${it.parentBg} | ${JSON.stringify(it.text)}`);
}

await call('webview_screenshot', { windowId: 'main', format: 'png', filePath: path.join(__dirname, '..', 'screenshots', 'probe-light-step1.png') });
await client.close();
console.log('DONE');
