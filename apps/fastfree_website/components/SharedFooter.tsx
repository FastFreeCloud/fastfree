'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
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
  const cfg = siteConfig as unknown as Record<string, string>;
  const emailAddr = siteConfig.email || '';
  const address = siteConfig.address || '';
  const socialLinks: Record<string, string> = siteConfig.socialLinks || {};
  // Canonical contact/social values (siteConfig.ts is the single source).
  const FACEBOOK_URL = 'https://www.facebook.com/share/1DHAKK2ek1/';
  const LINKEDIN_URL = 'https://www.linkedin.com/company/fastfree-cloud/';
  const PHONE_EG_DISPLAY = cfg.phone_eg || '010919999937';
  const PHONE_SA_DISPLAY = cfg.phone_sa || '+966 57 229 3845';
  const PHONE_EG_TEL = 'tel:+201091999937';
  const PHONE_SA_TEL = 'tel:+966572293845';
  const whatsappRaw: string = cfg.whatsapp_eg || siteConfig.whatsapp || siteConfig.phone || 'https://wa.me/201091999937';
  const whatsappHref = whatsappRaw.startsWith('http')
    ? whatsappRaw
    : `https://wa.me/${whatsappRaw.replace(/[^0-9]/g, '')}`;
  const whatsappSaHref: string = cfg.whatsapp_sa || 'https://wa.me/966572293845';

  return (
    <>
      {whatsappRaw && (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
          <motion.a
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-float relative w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all shadow-green-500/30"
            aria-label={lang === 'ar' ? 'واتساب مصر' : 'WhatsApp Egypt'}
            title={lang === 'ar' ? 'واتساب مصر' : 'WhatsApp Egypt'}
          >
            <MessageCircle size={22} />
            <span aria-hidden="true" className="absolute -bottom-1 -right-1 text-base leading-none">🇪🇬</span>
          </motion.a>
          <motion.a
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.15, type: 'spring', stiffness: 260, damping: 20 }}
            href={whatsappSaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-float relative w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all shadow-green-500/30"
            aria-label={lang === 'ar' ? 'واتساب السعودية' : 'WhatsApp Saudi Arabia'}
            title={lang === 'ar' ? 'واتساب السعودية' : 'WhatsApp Saudi Arabia'}
          >
            <MessageCircle size={22} />
            <span aria-hidden="true" className="absolute -bottom-1 -right-1 text-base leading-none">🇸🇦</span>
          </motion.a>
        </div>
      )}

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[var(--ff-accent)]/90 text-[#030712] flex items-center justify-center shadow-lg hover:bg-[var(--ff-accent)] hover:scale-110 transition-all cursor-pointer"
          aria-label={lang === 'ar' ? 'العودة للأعلى' : 'Back to top'}
          title={lang === 'ar' ? 'العودة للأعلى' : 'Back to top'}
        >
          <ArrowUp size={20} />
        </button>
      )}

      <footer className="bg-[#050814] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <Link href={`/${lang}`} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-[#070b19] border border-white/10">
                  <Image src="/fastfree_logo.png" alt="FastFree" width={32} height={32} className="object-cover w-full h-full" sizes="32px" />
                </div>
                <span className="text-lg font-extrabold" style={{ fontFamily: 'var(--ff-font-heading)' }}>{siteName}</span>
              </Link>
              {aboutText && <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{aboutText}</p>}
              <div className="flex gap-2 flex-wrap">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={lang === 'ar' ? 'واتساب مصر' : 'WhatsApp Egypt'} title={lang === 'ar' ? 'واتساب مصر' : 'WhatsApp Egypt'} className="w-11 h-11 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                  <MessageCircle size={18} aria-hidden="true" />
                </a>
                <a href={whatsappSaHref} target="_blank" rel="noopener noreferrer" aria-label={lang === 'ar' ? 'واتساب السعودية' : 'WhatsApp Saudi Arabia'} title={lang === 'ar' ? 'واتساب السعودية' : 'WhatsApp Saudi Arabia'} className="w-11 h-11 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all">
                  <MessageCircle size={18} aria-hidden="true" />
                </a>
                {SOCIAL_ORDER.map(key => {
                  const url = key === 'facebook' ? FACEBOOK_URL : key === 'linkedin' ? LINKEDIN_URL : socialLinks[key];
                  if (!url) return null;
                  const Icon = SOCIAL_ICONS[key] || Globe;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[key] || key} className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[var(--ff-accent)] hover:border-[var(--ff-accent)]/30 hover:bg-[var(--ff-accent)]/5 transition-all" title={SOCIAL_LABELS[key] || key}>
                      <Icon size={16} aria-hidden="true" />
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
                    <Link href={link.href} className="hover:text-white hover:ps-1 transition-all">{link.label}</Link>
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
                    <Link href={`/${lang}/services/${s.id}`} className="hover:text-white hover:ps-1 transition-all">{lang === 'ar' ? s.title_ar : s.title_en}</Link>
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
              <ul className="footer-contact space-y-2.5 text-xs text-slate-400">
                {emailAddr && (
                  <li className="flex items-center gap-2">
                    <Mail size={12} className="text-[var(--ff-accent)] shrink-0" />
                    <span dir="ltr" className="truncate">{emailAddr}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Phone size={12} className="text-[var(--ff-accent)] shrink-0" />
                  <a href={PHONE_EG_TEL} dir="ltr" className="hover:text-white transition">
                    {lang === 'ar' ? `مصر ${PHONE_EG_DISPLAY}` : `Egypt ${PHONE_EG_DISPLAY}`}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={12} className="text-[var(--ff-accent)] shrink-0" />
                  <a href={PHONE_SA_TEL} dir="ltr" className="hover:text-white transition">
                    {lang === 'ar' ? `السعودية ${PHONE_SA_DISPLAY}` : `Saudi ${PHONE_SA_DISPLAY}`}
                  </a>
                </li>
                {address && (
                  <li className="flex items-center gap-2">
                    <MapPin size={12} className="text-[var(--ff-accent)] shrink-0" />
                    <span className="truncate">{address}</span>
                  </li>
                )}
              </ul>
            </div>
          </motion.div>

          {/* Bottom */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }} className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} {siteName}. {t('FOOTER_RIGHTS', 'جميع الحقوق محفوظة', 'All rights reserved')}</span>
            <div className="flex items-center gap-3">
              <Link href={`/${lang}/about`} className="hover:text-white transition py-2">{t('NAV_ABOUT', 'من نحن', 'About')}</Link>
              <Link href={`/${lang}/contact`} className="hover:text-white transition py-2">{t('NAV_CONTACT', 'تواصل', 'Contact')}</Link>
              <Link href={`/${lang}/blog`} className="hover:text-white transition py-2">{t('NAV_BLOG', 'المدونة', 'Blog')}</Link>
            </div>
          </motion.div>
        </div>
      </footer>
    </>
  );
}
