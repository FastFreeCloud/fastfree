'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Twitter, Linkedin, Github, Youtube, MessageCircle, Instagram, Music, Globe, Link as LinkIcon, Code, Headphones, Mail, Phone, MapPin, ArrowUp } from 'lucide-react';
import { siteConfig } from '@/src/data/siteConfig';
import { useLanguage } from '@/lib/language-provider';
import { services } from '@/src/data/services';

type SharedFooterProps = {
  t?: (key: string, ar: string, en: string) => string;
  lang?: 'ar' | 'en';
  services?: { id: string; title_ar: string; title_en: string }[];
};

const SOCIAL_ICONS: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  discord: MessageCircle,
  instagram: Instagram,
  tiktok: Music,
};

const SOCIAL_ORDER = ['facebook', 'twitter', 'linkedin', 'github', 'youtube', 'discord', 'instagram', 'tiktok'];

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  youtube: 'YouTube',
  discord: 'Discord',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

export default function SharedFooter(_props: SharedFooterProps) {
  const ctx = useLanguage();
  const t = _props.t ?? ctx.t;
  const lang = _props.lang ?? ctx.lang;
  const servicesData = _props.services ?? services;
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const siteName = siteConfig.siteName || 'FastFree';
  const aboutText = siteConfig.aboutText || '';
  const phone = siteConfig.phone || '';
  const whatsapp = siteConfig.whatsapp || '';
  const emailAddr = siteConfig.email || '';
  const address = siteConfig.address || '';
  const socialLinks: Record<string, string> = siteConfig.socialLinks || {};
  const whatsappNumber = whatsapp || phone || '';

  return (
    <>
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all shadow-green-500/30"
          aria-label="WhatsApp"
        >
          <MessageCircle size={22} />
        </a>
      )}

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-[var(--ff-accent)]/90 text-[#030712] flex items-center justify-center shadow-lg hover:bg-[var(--ff-accent)] hover:scale-110 transition-all cursor-pointer"
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}

      <footer className="bg-[#050814] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <Link href={`/${lang}`} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-[#070b19] border border-white/10">
                  <Image src="/fastfree_logo.png" alt="FastFree" width={32} height={32} className="object-cover w-full h-full" sizes="32px" />
                </div>
                <span className="text-lg font-extrabold" style={{ fontFamily: 'var(--ff-font-heading)' }}>{siteName}</span>
              </Link>
              {aboutText && <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{aboutText}</p>}
              <div className="flex gap-1.5 flex-wrap">
                {SOCIAL_ORDER.map(key => {
                  const url = socialLinks[key];
                  if (!url) return null;
                  const Icon = SOCIAL_ICONS[key] || Globe;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[key] || key} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[var(--ff-accent)] hover:border-[var(--ff-accent)]/30 hover:bg-[var(--ff-accent)]/5 transition-all" title={SOCIAL_LABELS[key] || key}>
                      <Icon size={14} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
                <LinkIcon size={14} className="text-[var(--ff-accent)]" />
                {t('FOOTER_QUICK_LINKS', 'روابط سريعة', 'Quick Links')}
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                {[
                  { href: `/${lang}`, label: t('NAV_HOME', 'الرئيسية', 'Home') },
                  { href: `/${lang}/services`, label: t('NAV_SERVICES', 'خدماتنا', 'Services') },
                  { href: `/${lang}/products`, label: t('NAV_PRODUCTS', 'منتجاتنا', 'Products') },
                  { href: `/${lang}/blog`, label: t('NAV_BLOG', 'المدونة', 'Blog') },
                  { href: `/${lang}/about`, label: t('NAV_ABOUT', 'من نحن', 'About') },
                  { href: `/${lang}/contact`, label: t('NAV_CONTACT', 'تواصل معنا', 'Contact') },
                 ].map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="hover:text-white hover:pl-1 transition-all">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
                <Code size={14} className="text-[var(--ff-accent)]" />
                {t('FOOTER_SERVICES', 'الخدمات', 'Services')}
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                {servicesData.slice(0, 5).map(s => (
                  <li key={s.id}>
                    <Link href={`/${lang}/services`} className="hover:text-white hover:pl-1 transition-all">{lang === 'ar' ? s.title_ar : s.title_en}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
                <Headphones size={14} className="text-[var(--ff-accent)]" />
                {t('FOOTER_CONTACT', 'تواصل معنا', 'Contact')}
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                {emailAddr && (
                  <li className="flex items-center gap-2">
                    <Mail size={12} className="text-[var(--ff-accent)] shrink-0" />
                    <span dir="ltr" className="truncate">{emailAddr}</span>
                  </li>
                )}
                {phone && (
                  <li className="flex items-center gap-2">
                    <Phone size={12} className="text-[var(--ff-accent)] shrink-0" />
                    <span>{phone}</span>
                  </li>
                )}
                {address && (
                  <li className="flex items-center gap-2">
                    <MapPin size={12} className="text-[var(--ff-accent)] shrink-0" />
                    <span className="truncate">{address}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} {siteName}. {t('FOOTER_RIGHTS', 'جميع الحقوق محفوظة', 'All rights reserved')}</span>
            <div className="flex items-center gap-3">
              <Link href={`/${lang}/about`} className="hover:text-white transition">{t('NAV_ABOUT', 'من نحن', 'About')}</Link>
              <Link href={`/${lang}/contact`} className="hover:text-white transition">{t('NAV_CONTACT', 'تواصل', 'Contact')}</Link>
              <Link href={`/${lang}/blog`} className="hover:text-white transition">{t('NAV_BLOG', 'المدونة', 'Blog')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
