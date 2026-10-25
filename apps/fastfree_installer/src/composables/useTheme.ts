import { ref, onMounted } from 'vue';

export type ThemeMode = 'sovereign-dark' | 'light' | 'oled-black';

export interface ThemeOption {
  id: ThemeMode;
  name: string;
  nameAr: string;
  icon: string;
}

export const availableThemes: ThemeOption[] = [
  { id: 'sovereign-dark', name: 'Sovereign Dark', nameAr: 'السيادي الداكن', icon: '🌌' },
  { id: 'light', name: 'Clean Slate', nameAr: 'المؤسسي الفاتح', icon: '☀️' },
  { id: 'oled-black', name: 'Midnight OLED', nameAr: 'سواد أومليد', icon: '🌑' },
];

const THEME_STORAGE_KEY = 'fastfree_installer_theme';

export const currentTheme = ref<ThemeMode>('sovereign-dark');

export function applyTheme(theme: ThemeMode) {
  currentTheme.value = theme;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }
}

export function cycleTheme() {
  const currentIndex = availableThemes.findIndex(t => t.id === currentTheme.value);
  const nextIndex = (currentIndex + 1) % availableThemes.length;
  applyTheme(availableThemes[nextIndex].id);
}

export function useTheme() {
  onMounted(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved && availableThemes.some(t => t.id === saved)) {
        applyTheme(saved);
      } else {
        applyTheme('sovereign-dark');
      }
    } catch {
      applyTheme('sovereign-dark');
    }
  });

  return {
    theme: currentTheme,
    availableThemes,
    applyTheme,
    cycleTheme,
  };
}
