/** Phase 2.2 — probe the live Tauri app: locale, theme, SDUI step, sharedState. */
import { connect, makeHelpers } from './mcp-client.mjs';

const client = await connect();
const h = await makeHelpers(client);

console.log('=== Phase 2.2 live probe ===');
await h.call('driver_session', { action: 'start' });

const win = await h.call('manage_window', { action: 'list' });
console.log('windows:', h.call ? '' : '');

const state = await h.evJson(`(() => {
  const root = document.querySelector('#app');
  const step = window.__FASTFREE_CURRENT_STEP__ ? window.__FASTFREE_CURRENT_STEP__.value : null;
  const host = document.querySelector('.sdui-step-host');
  return JSON.stringify({
    step,
    theme: document.documentElement.getAttribute('data-theme'),
    lang: document.documentElement.getAttribute('lang'),
    dir: document.documentElement.getAttribute('dir'),
    hasVueApp: !!(root && root.__vue_app__),
    sduiText: host ? (host.textContent || '').trim().slice(0, 160) : null,
    cardCount: document.querySelectorAll('.q-card').length,
    chipCount: document.querySelectorAll('.q-chip').length,
    unresolvedInterpolations: Array.from(document.querySelectorAll('.sdui-step-host *'))
      .map(function (el) { return el.textContent || ''; })
      .filter(function (t) { return t.indexOf('{{') !== -1; })
      .slice(0, 5)
  });
})()`);
console.log('state:', JSON.stringify(state, null, 2));

// Inspect Vue 3 reactive proxy state (sharedState.locale / sharedState.theme)
const shared = await h.evJson(`(() => {
  const root = document.querySelector('#app');
  if (!root || !root.__vue_app__) return JSON.stringify({ ok: false, reason: 'no vue app' });
  const inst = root.__vue_app__._instance;
  if (!inst) return JSON.stringify({ ok: false, reason: 'no root instance' });
  let found = null; const seen = new Set();
  function scan(vnode) {
    if (!vnode || seen.has(vnode)) return; seen.add(vnode);
    if (vnode.component) {
      const st = vnode.component.setupState;
      if (st) {
        if ('locale' in st && 'theme' in st) found = st;
        if (st.sharedState && typeof st.sharedState === 'object') found = st.sharedState;
      }
      scan(vnode.component.subTree);
    }
    if (Array.isArray(vnode.children)) { for (const c of vnode.children) scan(c); }
    else if (vnode.children && typeof vnode.children === 'object') {
      for (const k of Object.keys(vnode.children)) { const c = vnode.children[k]; if (c && typeof c === 'object') scan(c); }
    }
    if (vnode.dynamicChildren) { for (const c of vnode.dynamicChildren) scan(c); }
  }
  scan(inst.subTree);
  if (!found) return JSON.stringify({ ok: false, reason: 'no sharedState/locale+theme setupState found' });
  const isProxy = !!(found.__v_raw || (found.locale && found.locale.__v_raw) || (found.theme && found.theme.__v_raw));
  return JSON.stringify({
    ok: true,
    isVueReactiveProxy: isProxy,
    keys: Object.keys(found),
    locale: found.locale,
    theme: found.theme,
    sharedStateType: typeof found.sharedState,
    sharedStateKeys: found.sharedState && typeof found.sharedState === 'object' ? Object.keys(found.sharedState) : null,
    sharedStateLocale: found.sharedState ? found.sharedState.locale : undefined,
    sharedStateTheme: found.sharedState ? found.sharedState.theme : undefined
  });
})()`);
console.log('vue sharedState:', JSON.stringify(shared, null, 2));

await client.close();
console.log('=== probe complete ===');
