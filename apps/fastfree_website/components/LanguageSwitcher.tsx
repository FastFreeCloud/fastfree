'use client';

import { useLanguage } from '@/lib/language-provider';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      aria-pressed={lang === 'ar'}
      aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
      title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Languages size={14} aria-hidden="true" />
      {lang === 'ar' ? 'EN' : 'AR'}
    </button>
  );
}
