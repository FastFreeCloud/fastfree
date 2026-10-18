import { defineBoot } from '#q-app';
import { setCssVar, Dark } from 'quasar';
import { getThemeStore } from 'quasar-app-extension-fastfree-lowcode/src/runtime';

export default defineBoot(() => {
  Dark.set(false);
  setCssVar('primary', '#E11D48');

  const themeStore = getThemeStore();
  themeStore.setMode('light');
  themeStore.setAppSignature('#E11D48');
});
