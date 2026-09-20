import { boot } from 'quasar/wrappers';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export default boot(async () => {
  if (!isBrowser()) return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const eruda = await import('eruda');
    eruda.default.init({
      tool: ['console', 'elements', 'network', 'resources', 'info'],
      useShadowDom: true,
      autoScale: true,
    });
    eruda.default.get('entryBtn').hide();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__eruda = eruda.default;
    console.warn('[eruda] initialized — use window.__eruda.show() to open console');
  } catch {
    // eruda is optional — silently ignore on SPA/web builds
  }
});
