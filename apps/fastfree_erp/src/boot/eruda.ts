import { boot } from 'quasar/wrappers';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export default boot(() => {
  if (!isBrowser()) return;

  void import('@capacitor/core').then(({ Capacitor }) => {
    if (!Capacitor.isNativePlatform()) return;

    void import('eruda').then((m) => {
      m.default.init({
        tool: ['console', 'elements', 'network', 'resources', 'info'],
        useShadowDom: true,
        autoScale: true,
      });
      m.default.get('entryBtn').hide();
      (window as Record<string, unknown>).__eruda = m.default;
      console.warn('[eruda] initialized — use window.__eruda.show() to open console');
    });
  });
});
