'use client';

import { createContext, useContext, useCallback, useEffect, useSyncExternalStore, ReactNode } from 'react';

type Theme = 'dark' | 'light';

type ThemeContextType = {
  theme: Theme;
  mounted: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', mounted: false, toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

const THEME_EVENT = 'ff-theme-change';

let currentTheme: Theme = 'dark';

function emitChange() {
  window.dispatchEvent(new Event(THEME_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getServerSnapshot(): Theme {
  return 'dark';
}

function getClientSnapshot(): Theme {
  return currentTheme;
}

function readStorageTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('ff_theme') as Theme | null;
  return saved === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    const saved = readStorageTheme();
    if (saved !== currentTheme) {
      currentTheme = saved;
      document.documentElement.classList.toggle('light', saved === 'light');
      emitChange();
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    currentTheme = next;
    localStorage.setItem('ff_theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
    emitChange();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mounted, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
