'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, Building2, Code, Eye, Gem, Globe, Smartphone, Target } from 'lucide-react';
import { useLanguage } from '@/lib/language-provider';
import SharedFooter from '@/components/SharedFooter';
import SharedNavbar from '@/components/SharedNavbar';
import { useSEOMeta } from '@/lib/use-seo';
import { motion, useInView } from 'framer-motion';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { TextReveal } from '@/components/ui/TextReveal';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { useRef } from 'react';
import { services } from '@/src/data/services';
import { siteConfig } from '@/src/data/siteConfig';
import { BreadcrumbSchema } from '@/components/SEO/StructuredData';

function FadeInSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  const { t, lang } = useLanguage();
  useSEOMeta('page', 'about', lang);

  const stats = [
    { value: 60, suffix: '+', labelAr: 'شاشة جاهزة', labelEn: 'Ready Screens' },
    { value: 43, suffix: '', labelAr: 'خدمة', labelEn: 'Services' },
    { value: 1253, suffix: '', labelAr: 'مفتاح ترجمة', labelEn: 'Translation Keys' },
    { value: 0, suffix: '', labelAr: 'خطأ برمجي', labelEn: 'Coding Errors' },
  ];

  const aboutText = siteConfig.aboutText || '';

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <SharedNavbar activePage="about" />
      <BreadcrumbSchema items={[{ name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' }, { name: lang === 'ar' ? 'من نحن' : 'About Us', url: 'https://fastfree.cloud/about' }]} />

      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden text-center bg-[#030712]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            className="absolute -top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/10 to-[var(--ff-primary)]/10 blur-[100px]"
            animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-[10%] -right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-r from-[var(--ff-primary)]/10 to-purple-500/10 blur-[100px]"
            animate={{ x: [0, -20, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] px-5 py-2 rounded-full text-sm font-medium mb-8"
          >
            <Building2 size={16} />
            {t('ABOUT_BADGE', 'تعرف على فريقنا', 'Meet Our Team')}
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 flex justify-center" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={t('ABOUT_TITLE', 'من نحن', 'About Us')} />
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            {t('ABOUT_HERO_DESC', 'فريق من المطورين والمصممين المحترفين ملتزمون ببناء حلول برمجية مبتكرة تسرّع نمو علامتك التجارية وتحقق طموحاتك الرقمية.', 'A team of professional developers and designers committed to building innovative software solutions that accelerate your brand growth.')}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <div className="text-center p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:border-[var(--ff-accent)]/30 transition-all duration-300 group">
                  <div className="text-4xl md:text-5xl font-extrabold text-[var(--ff-accent)] mb-2" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-slate-400 text-sm">{lang === 'ar' ? stat.labelAr : stat.labelEn}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <FadeInSection>
          <div className={`p-8 md:p-14 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-14 items-center ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            <div>
              <div className="inline-flex items-center gap-2 text-[var(--ff-accent)] text-sm font-medium mb-4">
                <BookOpen size={16} />
                {t('ABOUT_STORY_BADGE', 'قصتنا', 'Our Story')}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--ff-font-heading)' }}>{t('ABOUT_STORY_TITLE', 'قصتنا وبدايتنا', 'Our Story & Beginning')}</h2>
               <p className="text-slate-300 leading-relaxed mb-6 text-lg">
                {aboutText}
              </p>
              <div className="flex gap-4 mt-8">
                <Link href={`/${lang}/contact`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[#030712] transition-all hover:scale-105" style={{ background: 'var(--ff-gradient)' }}>
                  {t('ABOUT_CTA', 'تواصل معنا', 'Contact Us')}
                  <ArrowLeft size={16} className={lang === 'ar' ? '' : 'rotate-180'} />
                </Link>
                <Link href={`/${lang}/services`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all">
                  {t('ABOUT_SERVICES', 'خدماتنا', 'Our Services')}
                </Link>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full aspect-video rounded-2xl bg-[#080c16] border border-white/10 overflow-hidden relative group shadow-2xl"
            >
              {/* Animated Project Showcase */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--ff-primary)]/5 to-[var(--ff-accent)]/5" />
              <div className="p-6 h-full flex flex-col justify-center relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-[10px] text-slate-400 ml-2 font-mono">FastFree Projects</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: Globe, label: 'CRM', color: 'from-blue-500/20 to-blue-600/10', text: 'text-blue-400' },
                    { icon: Smartphone, label: 'ERP', color: 'from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-400' },
                    { icon: Code, label: 'Web', color: 'from-purple-500/20 to-purple-600/10', text: 'text-purple-400' },
                  ].map((item, j) => (
                    <motion.div key={j} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + j * 0.2 }} className={`h-20 rounded-xl bg-gradient-to-br ${item.color} border border-white/5 flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform`}>
                      <item.icon size={20} className={item.text} />
                      <span className="text-[10px] font-bold text-slate-300">{item.label}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { w: 'w-[85%]', color: 'from-[var(--ff-accent)] to-[var(--ff-primary)]' },
                    { w: 'w-[65%]', color: 'from-emerald-400 to-emerald-600' },
                    { w: 'w-[90%]', color: 'from-purple-400 to-purple-600' },
                  ].map((bar, j) => (
                    <div key={j} className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 1 + j * 0.3, duration: 1.5, ease: 'easeOut' }} className={`h-full rounded-full bg-gradient-to-r ${bar.color} ${bar.w}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#080c16] via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </FadeInSection>
      </section>

      {/* Vision, Mission, Values */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <FadeInSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              {t('ABOUT_PRINCIPLES_TITLE', 'مبادئنا الأساسية', 'Our Core Principles')}
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">{t('ABOUT_PRINCIPLES_DESC', 'الرسالة والرؤية والقيم التي نعمل بها كل يوم', 'The mission, vision and values we live by every day')}</p>
          </div>
        </FadeInSection>
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          <FadeInSection delay={0}>
            <SpotlightCard className="relative overflow-hidden flex flex-col justify-between h-full">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                  <Target size={28} />
                </div>
                <h3 className="text-xl font-bold mb-4">{t('ABOUT_MISSION_TITLE', 'رسالتنا', 'Our Mission')}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t('ABOUT_MISSION_DESC', 'تمكين المشاريع ورواد الأعمال من تحقيق طموحاتهم الرقمية عبر بناء برمجيات وتطبيقات مخصصة ذات أداء عالٍ.', 'Empowering projects and entrepreneurs to achieve their digital ambitions by building high-performance custom software and applications.')}
                </p>
              </div>
            </SpotlightCard>
          </FadeInSection>
          <FadeInSection delay={0.1}>
            <SpotlightCard className="relative overflow-hidden flex flex-col justify-between h-full">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[var(--ff-accent)]/10 text-[var(--ff-accent)] flex items-center justify-center mb-6">
                  <Eye size={28} />
                </div>
                <h3 className="text-xl font-bold mb-4">{t('ABOUT_VISION_TITLE', 'رؤيتنا', 'Our Vision')}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t('ABOUT_VISION_DESC', 'أن نكون الخيار البرمجي الموثوق في مصر والشرق الأوسط لتطوير البنى التحتية للمواقع والتطبيقات.', 'To be a trusted software choice in Egypt and the Middle East for developing website and application infrastructure.')}
                </p>
              </div>
            </SpotlightCard>
          </FadeInSection>
          <FadeInSection delay={0.2}>
            <SpotlightCard className="relative overflow-hidden flex flex-col justify-between h-full">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                  <Gem size={28} />
                </div>
                <h3 className="text-xl font-bold mb-4">{t('ABOUT_VALUES_TITLE', 'قيمنا', 'Our Values')}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t('ABOUT_VALUES_DESC', 'الالتزام الكامل بالدعم الفني المستمر والجودة العالية وتأمين وحماية البيانات بمعايير عالمية صارمة.', 'Full commitment to continuous technical support, high quality, and data security with rigorous global standards.')}
                </p>
              </div>
            </SpotlightCard>
          </FadeInSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 max-w-4xl mx-auto px-6">
        <FadeInSection>
          <div className="text-center p-12 md:p-16 rounded-3xl bg-gradient-to-br from-slate-900/60 to-[var(--ff-primary-dark)]/30 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-accent)]/5 to-[var(--ff-primary)]/5 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('ABOUT_CTA_TITLE', 'هل لديك مشروع؟', 'Have a Project?')}
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                {t('ABOUT_CTA_DESC', 'دعنا نناقش فكرتك ونحولها إلى واقع رقمي مبتكر.', "Let's discuss your idea and turn it into innovative digital reality.")}
              </p>
              <Link href={`/${lang}/contact`} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[#030712] transition-all hover:scale-105 shadow-lg" style={{ background: 'var(--ff-gradient)' }}>
                {t('ABOUT_CTA_BTN', 'ابدأ مشروعك الآن', 'Start Your Project Now')}
                <ArrowLeft size={18} className={lang === 'ar' ? '' : 'rotate-180'} />
              </Link>
            </div>
          </div>
        </FadeInSection>
      </section>

      <SharedFooter t={t} lang={lang} services={services} />
    </div>
  );
}
