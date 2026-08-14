'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
  forwardRef,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Locale } from './i18n';

type LangContextType = {
  lang: Locale;
  setLang: (lang: Locale) => void;
  toggleLang: () => void;
  dir: 'rtl' | 'ltr';
  t: (key: string, ar: string, en: string) => string;
};

const LangContext = createContext<LangContextType>({
  lang: 'ar',
  setLang: () => {},
  toggleLang: () => {},
  dir: 'rtl',
  t: (_key: string, ar: string) => ar,
});

function setCookie(name: string, value: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=${value};path=/;max-age=${365 * 24 * 60 * 60}`;
  }
}

export function LanguageProvider({
  children,
  initialLang = 'ar',
}: {
  children: React.ReactNode;
  initialLang?: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<string>('');
  const [lang, setLangState] = useState<Locale>(initialLang);

  // Keep the document in sync with the active locale on every change.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [lang]);

  const setLang = useCallback(
    (newLang: Locale) => {
      setLangState(newLang);
      setCookie('ff_lang', newLang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      }
      // Navigate to the same in-app path under the chosen locale,
      // preserving the current query string (e.g. ?service=xyz).
      if (pathname) {
        const segments = pathname.split('/');
        segments[1] = newLang; // replace the locale segment
        const nextPath = segments.join('/') || `/${newLang}`;
        const q = searchRef.current;
        const next = q ? `${nextPath}?${q}` : nextPath;
        router.push(next);
      }
    },
    [pathname, router],
  );

  const toggleLang = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  }, [lang, setLang]);

  const t = useCallback(
    (_key: string, ar: string, en: string) => (lang === 'ar' ? ar : en),
    [lang],
  );

  return (
    <LangContext.Provider
      value={{ lang, setLang, toggleLang, dir: lang === 'ar' ? 'rtl' : 'ltr', t }}
    >
      {/* Tracks the live search string without forcing the whole
          prerendered tree into a client-render bailout. */}
      <Suspense fallback={null}>
        <SearchParamsTracker searchRef={searchRef} />
      </Suspense>
      {children}
    </LangContext.Provider>
  );
}

// Null-rendering component that mirrors the current search params into a ref.
// Isolated in a Suspense boundary so useSearchParams does not deopt the page.
function SearchParamsTracker({
  searchRef,
}: {
  searchRef: React.MutableRefObject<string>;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    searchRef.current = searchParams.toString();
  }, [searchParams, searchRef]);
  return null;
}

export function useLanguage() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
