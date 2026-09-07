'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/lib/language-provider';
import { useTheme } from '@/lib/theme-provider';

type SharedNavbarProps = {
  activePage?: 'home' | 'services' | 'products' | 'blog' | 'about' | 'contact';
};

export default function SharedNavbar({ activePage }: SharedNavbarProps) {
  const { t, lang } = useLanguage();
  const { theme, mounted, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const links = [
    { href: `/${lang}`, key: 'home', label: t('NAV_HOME', 'الرئيسية', 'Home') },
    { href: `/${lang}/services`, key: 'services', label: t('NAV_SERVICES', 'خدماتنا', 'Services') },
    { href: `/${lang}/products`, key: 'products', label: t('NAV_PRODUCTS', 'منتجاتنا', 'Products') },
    { href: `/${lang}/blog`, key: 'blog', label: t('NAV_BLOG', 'المدونة', 'Blog') },
    { href: `/${lang}/about`, key: 'about', label: t('NAV_ABOUT', 'من نحن', 'About Us') },
    { href: `/${lang}/contact`, key: 'contact', label: t('NAV_CONTACT', 'تواصل معنا', 'Contact Us') },
  ];

  // Derive the active page from the URL when the prop isn't passed
  // (layout renders <SharedNavbar /> without props).
  const pathname = usePathname();
  const activeKey = activePage ?? pathname?.split('/').filter(Boolean)[1] ?? 'home';

  // Close mobile menu on any route change (back/forward, programmatic nav, locale switch).
  // Render-time adjustment (not an effect) so no cascading render is triggered.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <nav aria-label={t('NAV_MAIN', 'التنقل الرئيسي', 'Main navigation')} className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 shadow-2xl'
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-[height] duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
        <Link href={`/${lang}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-[#070b19] border border-white/10 shadow-lg shadow-[var(--ff-accent)]/10 group-hover:border-[var(--ff-accent)]/30 transition-all relative">
            <Image
              src="/fastfree_logo.png"
              alt="FastFree Logo"
              width={40}
              height={40}
              className="object-cover w-full h-full group-hover:scale-110 transition duration-300"
              sizes="40px"
              priority={true}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--ff-primary)]/10 to-transparent pointer-events-none" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white group-hover:text-[var(--ff-accent)] transition" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            FastFree
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          {links.map((link) => (
            <div key={link.key} className="relative group py-2">
              <Link
                href={link.href}
                aria-current={activeKey === link.key ? 'page' : undefined}
                className={`transition-colors duration-200 ${
                  activeKey === link.key
                    ? 'text-[var(--ff-accent)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
              {activeKey === link.key ? (
                <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--ff-accent)] rounded-full" />
              ) : (
                <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-[var(--ff-accent)]/70 origin-center scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
              )}
            </div>
          ))}
          <LanguageSwitcher />
          <button
            onClick={toggleTheme}
            aria-label={mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="group relative w-11 h-11 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/10 hover:shadow-lg hover:shadow-amber-400/20 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <span key={theme} className="relative block w-4 h-4 animate-fade-in" aria-hidden="true">
              {mounted ? (
                <>
                  <Sun size={16} className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100 group-hover:text-amber-400' : 'opacity-0 rotate-90 scale-50 pointer-events-none'}`} />
                  <Moon size={16} className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'opacity-0 -rotate-90 scale-50 pointer-events-none' : 'opacity-100 rotate-0 scale-100 group-hover:text-[var(--ff-primary)]'}`} />
                </>
              ) : (
                <Moon size={16} className="absolute inset-0" />
              )}
            </span>
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            onClick={toggleTheme}
            aria-label={mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="group relative w-11 h-11 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/10 hover:shadow-lg hover:shadow-amber-400/20 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <span key={theme} className="relative block w-4 h-4 animate-fade-in" aria-hidden="true">
              {mounted ? (
                <>
                  <Sun size={16} className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100 group-hover:text-amber-400' : 'opacity-0 rotate-90 scale-50 pointer-events-none'}`} />
                  <Moon size={16} className={`absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'opacity-0 -rotate-90 scale-50 pointer-events-none' : 'opacity-100 rotate-0 scale-100 group-hover:text-[var(--ff-primary)]'}`} />
                </>
              ) : (
                <Moon size={16} className="absolute inset-0" />
              )}
            </span>
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition"
          >
            <span className="relative block w-6 h-6" aria-hidden="true">
              <span className={`absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'top-[11px] rotate-45' : 'top-[7px]'}`} />
              <span className={`absolute left-0 top-[11px] h-0.5 w-6 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`} />
              <span className={`absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300 ${mobileOpen ? 'top-[11px] -rotate-45' : 'top-[15px]'}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu backdrop */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className={`md:hidden fixed inset-x-0 bottom-0 animate-fade-in bg-black/40 cursor-default ${scrolled ? 'top-16' : 'top-20'}`}
        />
      )}
      {/* Mobile Menu — always mounted for grid-rows open/close animation */}
      <div
        id="mobile-menu"
        className={`md:hidden grid transition-all duration-300 ease-out ${mobileOpen ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible'}`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="bg-[#030712]/95 backdrop-blur-xl border-t border-white/5 px-6 pb-6 pt-4 max-h-[calc(100svh-5rem)] overflow-y-auto">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={activeKey === link.key ? 'page' : undefined}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeKey === link.key
                    ? 'bg-[var(--ff-accent)]/10 text-[var(--ff-accent)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${lang}/contact`}
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[#030712] text-sm transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[48px]"
              style={{ background: 'var(--ff-gradient)' }}
            >
              {t('NAV_QUOTE', 'اطلب عرض سعر', 'Get a Quote')}
            </Link>
            <div dir="ltr" className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
              <a href="tel:+201091999937" className="hover:text-white transition min-h-[44px] inline-flex items-center">🇪🇬 01091999937</a>
              <span aria-hidden="true" className="text-slate-600">•</span>
              <a href="tel:+966572293845" className="hover:text-white transition min-h-[44px] inline-flex items-center">🇸🇦 +966 57 229 3845</a>
            </div>
          </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
