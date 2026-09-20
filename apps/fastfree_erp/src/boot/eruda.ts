import { boot } from 'quasar/wrappers';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export default boot(() => {
  if (!isBrowser()) return;

  // Only load Eruda on native platforms (Capacitor)
  if (window.location.protocol === 'capacitor:') {
    void import('eruda').then((m) => {
      m.default.init({
        tool: ['console', 'elements', 'network', 'resources', 'info'],
        useShadowDom: true,
        autoScale: true,
      });
      console.warn('[eruda] initialized — tap the floating button to open console');
    });
  }
});
