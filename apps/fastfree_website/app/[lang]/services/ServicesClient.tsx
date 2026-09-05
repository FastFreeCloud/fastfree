'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Layers, Code, Palette, Building2, HelpCircle, Users, Clock, Star, Package, TrendingUp, BarChart3, Shield, Check, ArrowLeft, MessageSquare, Pencil, Rocket, Globe } from 'lucide-react';
import { serviceIconMap } from '@/lib/service-icons';
import { useLanguage } from '@/lib/language-provider';
import { useSEOMeta } from '@/lib/use-seo';
import { motion, useInView } from 'framer-motion';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { TextReveal } from '@/components/ui/TextReveal';
import { services as allServices, type Service } from '@/src/data/services';
import { BreadcrumbSchema } from '@/components/SEO/StructuredData';

const IconComponent = ({ name, className }: { name: string; className?: string }) => {
  const Icon = serviceIconMap[name] ?? HelpCircle;
  return <Icon className={className} />;
};

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.6, delay, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  );
}

const CATEGORIES = [
  { key: 'all', icon: Layers, labelAr: 'الكل', labelEn: 'All' },
  { key: 'websites', icon: Globe, labelAr: 'مواقع', labelEn: 'Websites' },
  { key: 'design', icon: Palette, labelAr: 'تصميم', labelEn: 'Design' },
  { key: 'systems', icon: Building2, labelAr: 'أنظمة', labelEn: 'Systems' },
];

const CATEGORY_MAP: Record<string, string[]> = {
  websites: ['Globe'],
  design: ['Palette'],
  systems: ['Blocks', 'LayoutDashboard', 'Calculator', 'Package', 'ShoppingCart', 'Truck', 'Users', 'Contact', 'ShieldCheck', 'Cloud'],
};

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const { t, lang } = useLanguage();
  useSEOMeta('page', 'services', lang);

  const filteredServices = allServices
    .filter((s) => s.is_active)
    .filter((s) => (activeCategory === 'all' ? true : CATEGORY_MAP[activeCategory]?.includes(s.icon)));

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <BreadcrumbSchema items={[{ name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' }, { name: lang === 'ar' ? 'خدماتنا' : 'Services', url: 'https://fastfree.cloud/services' }]} />

      {/* Hero */}
      <section className="relative pt-36 pb-20 overflow-hidden text-center bg-[#030712]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            className="absolute -top-[10%] -left-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/15 to-[var(--ff-primary)]/10 blur-[110px]"
            animate={{ x: [0, 40, 0], y: [0, -40, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] px-5 py-2 rounded-full text-sm font-medium mb-8">
            <Layers size={16} />
              {t('SERVICES_BADGE', '12 خدمة احترافية', '12 Professional Services')}
          </motion.div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-6 flex justify-center" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={t('SERVICES_PAGE_TITLE', 'خدماتنا الرقمية', 'Our Digital Services')} />
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
              {t('SERVICES_PAGE_DESC', 'نقدم حلولاً متكاملة تشمل تصميم وتطوير المواقع والهوية البصرية والأنظمة الذكية لنجاح علامتك التجارية في السوق الرقمي.', 'We offer integrated solutions including website design and development, brand identity, and smart systems for your brand success in the digital market.')}
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-10 border-y border-white/5 bg-[#080c16]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
              { icon: Layers, value: '12+', label: t('SERVICES_COUNT', 'خدمة متخصصة', 'Specialized Services') },
            { icon: Code, value: '150+', label: t('PROJECTS_COUNT', 'مشروع منجز', 'Completed Projects') },
            { icon: Users, value: '120+', label: t('CLIENTS_COUNT', 'عميل سعيد', 'Happy Clients') },
            { icon: Clock, value: '24/7', label: t('SUPPORT_COUNT', 'دعم فني', 'Tech Support') },
          ].map((stat, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--ff-accent)]/10 text-[var(--ff-accent)] flex items-center justify-center">
                  <stat.icon size={20} />
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap justify-center gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                activeCategory === cat.key
                  ? 'bg-[var(--ff-accent)] text-[#030712] shadow-lg shadow-[var(--ff-accent)]/20'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <cat.icon size={16} />
              {lang === 'ar' ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>
      </section>

      {/* ERP/CRM Featured */}
      {activeCategory === 'all' || activeCategory === 'systems' ? (
        <section className="max-w-7xl mx-auto px-6 pb-8">
          <FadeIn>
             <Link href={`/${lang}/contact`} className="block">
               <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-[var(--ff-primary)]/10 to-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-[var(--ff-accent)]/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <div className="inline-flex items-center gap-2 bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] px-4 py-1.5 rounded-full text-xs font-bold mb-4">
                      <Star size={12} />
                      {t('FEATURED_SYSTEM', 'النظام المميز', 'Featured System')}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                      {t('ERP_CARD_TITLE', 'أنظمة ERP & CRM متكاملة', 'Integrated ERP & CRM Systems')}
                    </h2>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                      {t('ERP_CARD_DESC', 'نبني أنظمة تخطيط موارد وإدارة علاقات عملاء مخصصة لاحتياجات شركتك — من المخازن والمبيعات إلى الموارد البشرية.', 'We build customized ERP and CRM systems for your company needs — from inventory and sales to human resources.')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { icon: Package, labelAr: 'المخازن', labelEn: 'Inventory' },
                        { icon: TrendingUp, labelAr: 'المبيعات', labelEn: 'Sales' },
                        { icon: Users, labelAr: 'الموارد البشرية', labelEn: 'HR' },
                        { icon: BarChart3, labelAr: 'التقارير', labelEn: 'Reports' },
                        { icon: Shield, labelAr: 'الصلاحيات', labelEn: 'Permissions' },
                      ].map((feat, j) => (
                        <span key={j} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                          <feat.icon size={12} className="text-[var(--ff-accent)]" />
                          {lang === 'ar' ? feat.labelAr : feat.labelEn}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden lg:flex justify-center">
                    <div className="w-72 h-52 rounded-2xl bg-white/5 border border-white/10 p-4 relative group-hover:scale-105 transition-transform duration-300">
                      <div className="flex gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {['bg-blue-500/20', 'bg-green-500/20', 'bg-purple-500/20'].map((bg, j) => (
                          <div key={j} className={`h-16 rounded-lg ${bg} border border-white/5 flex items-center justify-center`}>
                            <div className="w-6 h-6 rounded bg-white/10" />
                          </div>
                        ))}
                      </div>
                      <div className="h-10 rounded-lg bg-white/5 border border-white/5 flex items-center px-3 gap-2">
                        <div className="w-20 h-2 rounded bg-white/10" />
                        <div className="flex-1" />
                        <div className="w-10 h-5 rounded bg-emerald-500/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </FadeIn>
        </section>
      ) : null}

      {/* Services Grid */}
      <section className="py-8 max-w-7xl mx-auto px-6">
        {filteredServices.length === 0 ? (
          <div className="text-center py-20 text-slate-400">{t('SERVICES_EMPTY', 'لا توجد خدمات في هذا التصنيف', 'No services in this category')}</div>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } }}
              >
                <SpotlightCard className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 group-hover:scale-110 transition-transform">
                        <IconComponent name={service.icon} className="w-7 h-7" />
                      </div>
                      {['LayoutDashboard', 'Users'].includes(service.icon) && (
                        <span className="px-2.5 py-1 rounded-full bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] text-[10px] font-bold">
                          {t('FEATURED', 'مميز', 'Featured')}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold mb-3">{lang === 'ar' ? service.title_ar : service.title_en}</h2>
                    <p className="text-slate-300 leading-relaxed text-sm mb-5">
                      {lang === 'ar' ? service.description_ar : service.description_en}
                    </p>
                    {service.features && Array.isArray(service.features) && (
                      <div className={`space-y-2 mb-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        {service.features.slice(0, 4).map((feat: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-start gap-2 text-slate-400 text-xs">
                            <Check className="text-[var(--ff-accent)] w-3.5 h-3.5 flex-shrink-0" />
                            <span>{feat.ar && feat.en ? (lang === 'ar' ? feat.ar : feat.en) : feat}</span>
                          </div>
                        ))}
                        {service.features.length > 4 && (
                          <div className={`text-xs text-slate-400 ${lang === 'ar' ? 'mr-5' : 'ml-5'}`}>
                            +{service.features.length - 4} {t('AND_MORE', 'مزايا أخرى', 'more features')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <Link href={`/${lang}/contact?service=${encodeURIComponent(lang === 'ar' ? service.title_ar : service.title_en)}`} className="text-sm font-semibold text-[var(--ff-accent)] flex items-center gap-2 hover:underline">
                      {t('REQUEST_QUOTE', 'طلب عرض سعر', 'Request Quote')}
                      <ArrowLeft size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
                    </Link>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Process */}
      <section className="py-24 bg-[#080c16] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('PROCESS_TITLE', 'كيف نعمل؟', 'How We Work?')}
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">            {t('PROCESS_DESC', 'نتبع منهجية واضحة لضمان تحقيق نتائج موثوقة', 'We follow a clear methodology to ensure reliable results')}</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-[var(--ff-accent)]/30 via-[var(--ff-primary)]/30 to-[var(--ff-accent)]/30 hidden md:block" />
            {[
              { icon: MessageSquare, titleAr: 'الاستشارة', titleEn: 'Consultation', descAr: 'نفهم احتياجاتك', descEn: 'We understand your needs' },
              { icon: Pencil, titleAr: 'التصميم', titleEn: 'Design', descAr: 'نصمم الحلول', descEn: 'We design solutions' },
              { icon: Code, titleAr: 'التطوير', titleEn: 'Development', descAr: 'نطور النظام', descEn: 'We develop the system' },
              { icon: Rocket, titleAr: 'الإطلاق', titleEn: 'Launch', descAr: 'نطلق المشروع', descEn: 'We launch the project' },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 0.15}>
                <div className="text-center relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--ff-accent)]/10 to-[var(--ff-primary)]/10 border border-white/10 flex items-center justify-center mx-auto mb-5 relative z-10 group hover:scale-110 transition-transform duration-300">
                    <step.icon size={28} className="text-[var(--ff-accent)]" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--ff-accent)] text-[#030712] text-xs font-bold flex items-center justify-center">{i + 1}</div>
                  </div>
                  <h3 className="font-bold mb-1">{lang === 'ar' ? step.titleAr : step.titleEn}</h3>
                  <p className="text-slate-400 text-sm">{lang === 'ar' ? step.descAr : step.descEn}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 max-w-4xl mx-auto px-6">
        <FadeIn>
          <div className="text-center p-12 md:p-16 rounded-3xl bg-gradient-to-br from-slate-900/60 to-[var(--ff-primary-dark)]/30 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-accent)]/5 to-[var(--ff-primary)]/5 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('SERVICES_CTA_TITLE', 'هل تحتاج خدمة محددة؟', 'Need a Specific Service?')}
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                {t('SERVICES_CTA_DESC', 'تواصل معنا الآن واحصل على استشارة مجانية وعرض سعر مناسب لمشروعك.', 'Contact us now for a free consultation and a suitable quote for your project.')}
              </p>
              <Link href={`/${lang}/contact`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[#030712] transition-all hover:scale-105 shadow-lg" style={{ background: 'var(--ff-gradient)' }}>
                {t('SERVICES_CTA_BTN', 'تواصل معنا', 'Contact Us')}
                <ArrowLeft size={18} className={lang === 'ar' ? '' : 'rotate-180'} />
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
