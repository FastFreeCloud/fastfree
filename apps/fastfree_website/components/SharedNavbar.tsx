'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Sun, Moon, X, Menu } from 'lucide-react';
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

  const links = [
    { href: `/${lang}`, key: 'home', label: t('NAV_HOME', 'الرئيسية', 'Home') },
    { href: `/${lang}/services`, key: 'services', label: t('NAV_SERVICES', 'خدماتنا', 'Services') },
    { href: `/${lang}/products`, key: 'products', label: t('NAV_PRODUCTS', 'منتجاتنا', 'Products') },
    { href: `/${lang}/blog`, key: 'blog', label: t('NAV_BLOG', 'المدونة', 'Blog') },
    { href: `/${lang}/about`, key: 'about', label: t('NAV_ABOUT', 'من نحن', 'About Us') },
    { href: `/${lang}/contact`, key: 'contact', label: t('NAV_CONTACT', 'تواصل معنا', 'Contact Us') },
  ];

  return (
    <nav aria-label={t('NAV_MAIN', 'التنقل الرئيسي', 'Main navigation')} className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 shadow-2xl'
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
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
                className={`transition-colors duration-200 ${
                  activePage === link.key
                    ? 'text-[var(--ff-accent)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
              {activePage === link.key && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--ff-accent)] rounded-full" />
              )}
            </div>
          ))}
          <LanguageSwitcher />
          <button
            onClick={toggleTheme}
            className="group relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/10 transition-all duration-300 cursor-pointer"
            aria-label="Toggle theme"
          >
            <div className="relative w-4 h-4">
              {mounted ? (
                theme === 'dark' ? (
                  <Sun size={16} className="absolute inset-0 animate-[spin_8s_linear_infinite] group-hover:text-amber-400 transition-colors" />
                ) : (
                  <Moon size={16} className="absolute inset-0 group-hover:text-[var(--ff-primary)] transition-colors" />
                )
              ) : (
                <Moon size={16} />
              )}
            </div>
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleTheme}
            className="group relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-400 hover:border-amber-400/30 hover:bg-amber-400/10 transition-all duration-300 cursor-pointer"
            aria-label="Toggle theme"
          >
            <div className="relative w-4 h-4">
              {mounted ? (
                theme === 'dark' ? (
                  <Sun size={16} className="absolute inset-0 animate-[spin_8s_linear_infinite] group-hover:text-amber-400 transition-colors" />
                ) : (
                  <Moon size={16} className="absolute inset-0 group-hover:text-[var(--ff-primary)] transition-colors" />
                )
              ) : (
                <Moon size={16} />
              )}
            </div>
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white transition"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#030712]/95 backdrop-blur-xl border-t border-white/5 px-6 pb-6 pt-4">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  activePage === link.key
                    ? 'bg-[var(--ff-accent)]/10 text-[var(--ff-accent)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 px-4 flex items-center gap-3">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
