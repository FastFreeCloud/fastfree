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
      className="group flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-300 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white min-h-[44px] min-w-[44px] active:scale-95"
      title={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Languages size={14} aria-hidden="true" className="transition-transform duration-300 group-hover:rotate-12" />
      <span key={lang} className="animate-fade-in inline-block min-w-[2ch] text-center">
        {lang === 'ar' ? 'EN' : 'AR'}
      </span>
    </button>
  );
}
