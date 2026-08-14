'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowLeft, Check, FileText, Code, Rocket, Globe, Smartphone, Server, Megaphone, Search, Feather, Palette, Building2, Users, Headphones, Layers, Clock, Star, Package, TrendingUp, BarChart3, Shield, MessageSquare, Pencil } from 'lucide-react';
import { serviceIconMap } from '@/lib/service-icons';
import { useLanguage } from '@/lib/language-provider';
import SharedFooter from '@/components/SharedFooter';
import SharedNavbar from '@/components/SharedNavbar';
import { useSEOMeta } from '@/lib/use-seo';
import { motion } from 'framer-motion';
import { TextReveal } from '@/components/ui/TextReveal';
import { useParams } from 'next/navigation';
import { services as allServices, type Service } from '@/src/data/services';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema } from '@/components/SEO/StructuredData';

const IconComponent = ({ name, className }: { name: string; className?: string }) => {
  const Icon = serviceIconMap[name] ?? HelpCircle;
  return <Icon className={className} />;
};

export default function ServiceDetailPage() {
  const { t, lang } = useLanguage();
  const params = useParams();
  const serviceId = params.slug as string;

  const service: Service | null = allServices.find((s) => s.id === serviceId) || null;
  useSEOMeta('page', service ? `service-${service.id}` : 'services', lang, service ? (lang === 'ar' ? service.title_ar : service.title_en) : undefined);

  if (!service) {
    notFound();
  }

  const otherServices = allServices.filter((s) => s.is_active && s.id !== service.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <SharedNavbar activePage="services" />
      <BreadcrumbSchema items={[{ name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' }, { name: lang === 'ar' ? 'خدماتنا' : 'Services', url: 'https://fastfree.cloud/services' }, { name: lang === 'ar' ? service.title_ar : service.title_en, url: `https://fastfree.cloud/services/${service.id}` }]} />

      {/* Hero */}
      <section className="relative pt-36 pb-20 overflow-hidden text-center bg-[#030712]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            className="absolute -top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/15 to-[var(--ff-primary)]/10 blur-[110px]"
            animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 mx-auto mb-6">
              <IconComponent name={service.icon} className="w-10 h-10" />
            </div>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 flex justify-center" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={lang === 'ar' ? service.title_ar : service.title_en} />
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            {lang === 'ar' ? service.description_ar : service.description_en}
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Link href={`/${lang}/contact`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[#030712] transition-all hover:scale-105" style={{ background: 'var(--ff-gradient)' }}>
              {t('REQUEST_QUOTE', 'طلب عرض سعر', 'Request Quote')}
              <ArrowLeft size={16} className={lang === 'ar' ? '' : 'rotate-180'} />
            </Link>
            <Link href={`/${lang}/services`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all">
              {t('ALL_SERVICES', 'جميع الخدمات', 'All Services')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      {service.features && Array.isArray(service.features) && service.features.length > 0 && (
        <section className="py-20 max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('FEATURES_TITLE', 'مميزات هذه الخدمة', 'Service Features')}
              </h2>
              <p className="text-slate-400">{t('FEATURES_DESC', 'كل ما تحتاجه في خدمة واحدة متكاملة', 'Everything you need in one integrated service')}</p>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.features.map((feat: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/40 border border-white/10 hover:border-[var(--ff-accent)]/30 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--ff-accent)]/10 text-[var(--ff-accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={20} />
                </div>
                <div>
                  <span className="font-medium text-white text-sm">{feat.ar && feat.en ? (lang === 'ar' ? feat.ar : feat.en) : feat}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Process */}
      <section className="py-20 bg-[#080c16] border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              {t('PROCESS_TITLE', 'مراحل التنفيذ', 'Implementation Steps')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: FileText, titleAr: 'تحليل المتطلبات', titleEn: 'Requirements Analysis', descAr: 'نفهم احتياجاتك بدقة ونحدد نطاق العمل', descEn: 'We precisely understand your needs and define the scope' },
              { icon: Code, titleAr: 'التطوير والاختبار', titleEn: 'Development & Testing', descAr: 'نطور الحل مع اختبارات جودة شاملة', descEn: 'We develop the solution with comprehensive QA testing' },
              { icon: Rocket, titleAr: 'الإطلاق والدعم', titleEn: 'Launch & Support', descAr: 'نطلق النظام ونقدم دعماً فنياً مستمراً', descEn: 'We launch the system and provide ongoing support' },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }} className="text-center p-6 rounded-2xl bg-slate-900/40 border border-white/10 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--ff-accent)] text-[#030712] text-sm font-bold flex items-center justify-center">{i + 1}</div>
                <div className="w-14 h-14 rounded-2xl bg-[var(--ff-accent)]/10 text-[var(--ff-accent)] flex items-center justify-center mx-auto mb-4 mt-2">
                  <step.icon size={28} />
                </div>
                <h3 className="font-bold mb-2">{lang === 'ar' ? step.titleAr : step.titleEn}</h3>
                <p className="text-slate-400 text-sm">{lang === 'ar' ? step.descAr : step.descEn}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Services */}
      {otherServices.length > 0 && (
        <section className="py-20 max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              {t('OTHER_SERVICES', 'خدمات أخرى قد تهمك', 'Other Services You May Like')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherServices.map((s) => (
              <Link key={s.id} href={`/${lang}/services/${s.id}`} className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 hover:border-[var(--ff-accent)]/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-[var(--ff-accent)]/10 text-[var(--ff-accent)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <IconComponent name={s.icon} className="w-6 h-6" />
                </div>
                <h3 className="font-bold mb-2">{lang === 'ar' ? s.title_ar : s.title_en}</h3>
                <p className="text-slate-400 text-sm line-clamp-2">{lang === 'ar' ? s.description_ar : s.description_en}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 max-w-4xl mx-auto px-6">
        <div className="text-center p-12 rounded-3xl bg-gradient-to-br from-slate-900/60 to-[var(--ff-primary-dark)]/30 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-accent)]/5 to-[var(--ff-primary)]/5 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              {t('CTA_TITLE', 'جاهز للبدء؟', 'Ready to Start?')}
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              {t('CTA_DESC', 'تواصل معنا الآن واحصل على استشارة مجانية لهذا الخدمة.', 'Contact us now for a free consultation for this service.')}
            </p>
            <Link href={`/${lang}/contact?service=${encodeURIComponent(lang === 'ar' ? service.title_ar : service.title_en)}`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[#030712] transition-all hover:scale-105 shadow-lg" style={{ background: 'var(--ff-gradient)' }}>
              {t('CONTACT_NOW', 'تواصل معنا الآن', 'Contact Us Now')}
              <ArrowLeft size={18} className={lang === 'ar' ? '' : 'rotate-180'} />
            </Link>
          </div>
        </div>
      </section>

      <SharedFooter t={t} lang={lang} services={allServices} />
    </div>
  );
}
