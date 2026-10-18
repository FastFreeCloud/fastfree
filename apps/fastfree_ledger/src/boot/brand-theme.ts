import { defineBoot } from '#q-app';
import { setCssVar, Dark } from 'quasar';
import { getThemeStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime';

export default defineBoot(() => {
  Dark.set(false);
  setCssVar('primary', '#0D9488');

  const themeStore = getThemeStore();
  themeStore.setMode('light');
  themeStore.setAppSignature('#0D9488');
});
