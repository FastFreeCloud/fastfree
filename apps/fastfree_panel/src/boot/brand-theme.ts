import { defineBoot } from '#q-app';
import { setCssVar, Dark } from 'quasar';
import { getThemeStore } from '../lib/lowcode';

export default defineBoot(() => {
  // Explicitly enforce light mode (Lite mode)
  Dark.set(false);
  setCssVar('primary', '#4F46E5');

  // Initialize lowcode theme store with signature Cyber Indigo
  const themeStore = getThemeStore();
  themeStore.setMode('light');
  themeStore.setAppSignature('#4F46E5');
});
