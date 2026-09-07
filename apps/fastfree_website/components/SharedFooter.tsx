'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Facebook, Linkedin, MessageCircle, Headphones, Mail, Phone, MapPin, ArrowUp, Clock } from 'lucide-react';
import { siteConfig } from '@/src/data/siteConfig';
import { useLanguage } from '@/lib/language-provider';

type SharedFooterProps = {
  t?: (key: string, ar: string, en: string) => string;
  lang?: 'ar' | 'en';
  services?: { id: string; title_ar: string; title_en: string }[];
};

export default function SharedFooter(_props: SharedFooterProps) {
  const ctx = useLanguage();
  const t = _props.t ?? ctx.t;
  const lang = _props.lang ?? ctx.lang;
  const [showTop, setShowTop] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const siteName = siteConfig.siteName || 'FastFree';
  const aboutText = siteConfig.aboutText || '';
  const cfg = siteConfig as unknown as Record<string, string>;
  const emailAddr = siteConfig.email || '';
  const address = siteConfig.address || '';
  // Canonical contact/social values (siteConfig.ts is the single source).
  const FACEBOOK_URL = 'https://www.facebook.com/share/1DHAKK2ek1/';
  const LINKEDIN_URL = 'https://www.linkedin.com/company/fastfree-cloud/';
  const PHONE_EG_DISPLAY = cfg.phone_eg || '01091999937';
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
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className={`fixed bottom-6 left-6 z-50 flex flex-col gap-3 transition-opacity duration-300 ${footerVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <motion.a
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
            href={whatsappSaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-float relative w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all shadow-green-500/30"
            aria-label={lang === 'ar' ? 'ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©' : 'WhatsApp Saudi Arabia'}
            title={lang === 'ar' ? 'ÙˆØ§ØªØ³Ø§Ø¨ Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©' : 'WhatsApp Saudi Arabia'}
          >
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-green-400 animate-ping [animation-duration:2.5s] opacity-25" />
            <MessageCircle size={22} className="relative" />
            <span aria-hidden="true" className="absolute -bottom-1 -right-1 text-base leading-none drop-shadow">ðŸ‡¸ðŸ‡¦</span>
          </motion.a>
          <motion.a
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.15, type: 'spring', stiffness: 260, damping: 20 }}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-float relative w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all shadow-green-500/30"
            aria-label={lang === 'ar' ? 'ÙˆØ§ØªØ³Ø§Ø¨ Ù…ØµØ±' : 'WhatsApp Egypt'}
            title={lang === 'ar' ? 'ÙˆØ§ØªØ³Ø§Ø¨ Ù…ØµØ±' : 'WhatsApp Egypt'}
          >
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-green-400 animate-ping [animation-duration:2.5s] [animation-delay:1.25s] opacity-25" />
            <MessageCircle size={22} className="relative" />
            <span aria-hidden="true" className="absolute -bottom-1 -right-1 text-base leading-none drop-shadow">ðŸ‡ªðŸ‡¬</span>
          </motion.a>
        </motion.div>
      )}

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[var(--ff-accent)]/90 text-[#030712] flex items-center justify-center shadow-lg hover:bg-[var(--ff-accent)] hover:scale-110 transition-all cursor-pointer"
          aria-label={lang === 'ar' ? 'Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ø£Ø¹Ù„Ù‰' : 'Back to top'}
          title={lang === 'ar' ? 'Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ø£Ø¹Ù„Ù‰' : 'Back to top'}
        >
          <ArrowUp size={20} />
        </button>
      )}

      <footer ref={footerRef} className="bg-[#050814] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: 'easeOut' }} className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <Link href={`/${lang}`} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-[#070b19] border border-white/10">
                  <Image src="/fastfree_logo.png" alt="FastFree" width={32} height={32} className="object-cover w-full h-full" sizes="32px" />
                </div>
                <span className="text-lg font-extrabold" style={{ fontFamily: 'var(--ff-font-heading)' }}>{siteName}</span>
              </Link>
              {aboutText && <p title={aboutText} className="text-slate-400 text-xs leading-relaxed">{aboutText}</p>}
              <div className="flex gap-2 flex-wrap">
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[var(--ff-accent)] hover:border-[var(--ff-accent)]/30 hover:bg-[var(--ff-accent)]/5 hover:-translate-y-0.5 transition-all">
                  <Facebook size={16} aria-hidden="true" />
                </a>
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[var(--ff-accent)] hover:border-[var(--ff-accent)]/30 hover:bg-[var(--ff-accent)]/5 hover:-translate-y-0.5 transition-all">
                  <Linkedin size={16} aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
                <Headphones size={14} className="text-[var(--ff-accent)]" />
                {t('FOOTER_CONTACT', 'ØªÙˆØ§ØµÙ„ Ù…Ø¹Ù†Ø§', 'Contact')}
              </h4>
              <ul className="footer-contact space-y-2.5 text-xs text-slate-400">
                {emailAddr && (
                  <li className="flex items-center gap-2.5 min-w-0">
                    <Mail size={14} className="text-[var(--ff-accent)] shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[11px] text-slate-500">{t('FOOTER_EMAIL', 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ', 'Email')}</span>
                      <a href={`mailto:${emailAddr}`} dir="ltr" title={emailAddr} className="block truncate hover:text-white transition text-xs">{emailAddr}</a>
                    </span>
                  </li>
                )}
                <li className="flex items-center gap-2.5 min-w-0">
                  <Phone size={14} className="text-[var(--ff-accent)] shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[11px] text-slate-500">{lang === 'ar' ? 'Ù…ØµØ± ðŸ‡ªðŸ‡¬' : 'Egypt ðŸ‡ªðŸ‡¬'}</span>
                    <a href={PHONE_EG_TEL} dir="ltr" title={PHONE_EG_DISPLAY} className="block truncate hover:text-white transition text-xs font-bold">{PHONE_EG_DISPLAY}</a>
                    <span className="mt-1.5 flex items-center gap-1.5">
                      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[var(--ff-accent)] hover:border-[var(--ff-accent)]/30 hover:bg-[var(--ff-accent)]/5 hover:-translate-y-0.5 transition-all">
                        <Facebook size={14} aria-hidden="true" />
                      </a>
                      <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[var(--ff-accent)] hover:border-[var(--ff-accent)]/30 hover:bg-[var(--ff-accent)]/5 hover:-translate-y-0.5 transition-all">
                        <Linkedin size={14} aria-hidden="true" />
                      </a>
                    </span>
                  </span>
                </li>
                <li className="flex items-center gap-2.5 min-w-0">
                  <Phone size={14} className="text-[var(--ff-accent)] shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[11px] text-slate-500">{lang === 'ar' ? 'Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ© ðŸ‡¸ðŸ‡¦' : 'Saudi Arabia ðŸ‡¸ðŸ‡¦'}</span>
                    <a href={PHONE_SA_TEL} dir="ltr" title={PHONE_SA_DISPLAY} className="block truncate hover:text-white transition text-xs font-bold">{PHONE_SA_DISPLAY}</a>
                  </span>
                </li>
                {address && (
                  <li className="flex items-start gap-2 min-w-0">
                    <MapPin size={12} className="text-[var(--ff-accent)] shrink-0 mt-0.5" />
                    <span title={address} className="leading-relaxed">{address}</span>
                  </li>
                )}
                <li className="flex items-center gap-2 min-w-0">
                  <Clock size={12} className="text-[var(--ff-accent)] shrink-0" />
                  <span>{t('FOOTER_HOURS', 'Ø§Ù„Ø³Ø¨Øª â€“ Ø§Ù„Ø®Ù…ÙŠØ³: 9Øµ â€“ 6Ù…', 'Sat â€“ Thu: 9AM â€“ 6PM')}</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Bottom */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }} className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span><bdi>Â© {new Date().getFullYear()} {siteName}. {t('FOOTER_RIGHTS', 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ‚ Ù…Ø­ÙÙˆØ¸Ø©', 'All rights reserved')}</bdi></span>
            <div className="flex items-center gap-3">
              <Link href={`/${lang}/about`} className="hover:text-white transition py-2">{t('NAV_ABOUT', 'Ù…Ù† Ù†Ø­Ù†', 'About')}</Link>
              <span aria-hidden="true" className="text-slate-600">â€¢</span>
              <Link href={`/${lang}/contact`} className="hover:text-white transition py-2">{t('NAV_CONTACT', 'ØªÙˆØ§ØµÙ„', 'Contact')}</Link>
              <span aria-hidden="true" className="text-slate-600">â€¢</span>
              <Link href={`/${lang}/blog`} className="hover:text-white transition py-2">{t('NAV_BLOG', 'Ø§Ù„Ù…Ø¯ÙˆÙ†Ø©', 'Blog')}</Link>
            </div>
          </motion.div>
        </div>
      </footer>
    </>
  );
}