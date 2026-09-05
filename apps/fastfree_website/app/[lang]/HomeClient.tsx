'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MessageSquare, Pencil, Code, Rocket, Zap, Shield, Headphones, DollarSign, Globe, Smartphone, Server, Star, Check, ArrowLeft, HelpCircle } from 'lucide-react';
import { serviceIconMap } from '@/lib/service-icons';
import { useLanguage } from '@/lib/language-provider';
import { services } from '@/src/data/services';
import { products } from '@/src/data/products';
import { blogPosts as posts } from '@/src/data/blog';
import { testimonials } from '@/src/data/testimonials';
import { useSEOMeta } from '@/lib/use-seo';
import { motion } from 'framer-motion';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { TextReveal } from '@/components/ui/TextReveal';
import { useRef } from 'react';
import OrganizationSchema, { WebSiteSchema, BreadcrumbSchema } from '@/components/SEO/StructuredData';
import { useInView } from 'framer-motion';

const IconComponent = ({ name, className }: { name: string; className?: string }) => {
  const Icon = serviceIconMap[name] ?? HelpCircle;
  if (!Icon) return <HelpCircle className={className} />;
  return <Icon className={className} />;
};

function FadeIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
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

export default function Home() {
  const { t, lang } = useLanguage();
  useSEOMeta('page', 'home', lang);

  const steps = [
    { icon: MessageSquare, titleAr: 'الاستشارة المجانية', titleEn: 'Free Consultation', descAr: 'نستمع لفكرتك ونحلل متطلبات المشروع مجاناً', descEn: 'We listen to your idea and analyze project requirements for free' },
    { icon: Pencil, titleAr: 'التصميم والتخطيط', titleEn: 'Design & Planning', descAr: 'نصمم واجهات احترافية ونخطط البنية التقنية', descEn: 'We design professional UI and plan the technical architecture' },
    { icon: Code, titleAr: 'التطوير والبرمجة', titleEn: 'Development', descAr: 'نطور النظام بأحدث التقنيات مع اختبارات جودة', descEn: 'We develop the system with latest technologies and QA testing' },
    { icon: Rocket, titleAr: 'الإطلاق والدعم', titleEn: 'Launch & Support', descAr: 'نطلق المشروع ونقدم دعماً فنياً مستمراً', descEn: 'We launch the project and provide ongoing technical support' },
  ];

  const whyUs = [
    { icon: Zap, titleAr: 'سرعة التنفيذ', titleEn: 'Fast Delivery', descAr: 'نلتزم بالمواعيد النهائية لتسليم مشروعك', descEn: 'We commit to delivery deadlines' },
    { icon: Shield, titleAr: 'جودة عالية', titleEn: 'High Quality', descAr: 'اختبارات شاملة وكود نظيف', descEn: 'Thorough testing and clean code' },
    { icon: Headphones, titleAr: 'دعم مستمر', titleEn: 'Ongoing Support', descAr: 'فريق دعم فني على مدار الساعة', descEn: '24/7 technical support team' },
    { icon: DollarSign, titleAr: 'أسعار منافسة', titleEn: 'Competitive Pricing', descAr: 'قيمة حقيقية مقابل استثمارك', descEn: 'Real value for your investment' },
  ];

  const techStack = [
    { name: 'Next.js', color: '#ffffff' },
    { name: 'React', color: '#61dafb' },
    { name: 'TypeScript', color: '#3178c6' },
    { name: 'Drizzle', color: '#c5f74f' },
    { name: 'Node.js', color: '#68a063' },
    { name: 'Tailwind', color: '#06b6d4' },
    { name: 'Docker', color: '#2496ed' },
    { name: 'MySQL', color: '#4479a1' },
  ];

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <OrganizationSchema />
      <WebSiteSchema />
      <BreadcrumbSchema items={[{ name: 'Home', url: 'https://fastfree.cloud/' }]} />

      {/* Hero */}
      <section className="relative pt-20 overflow-hidden flex items-center bg-[#030712]" style={{ minHeight: '100svh' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/20 to-[var(--ff-primary)]/20 blur-[120px]"
            animate={{ x: [0, 50, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-[var(--ff-primary)]/25 to-pink-600/15 blur-[140px]"
            animate={{ x: [0, -60, 0], y: [0, 60, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={lang === 'ar' ? 'text-right' : 'text-left'}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-semibold" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--ff-accent)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <Zap size={14} className="text-[var(--ff-accent)]" />
              {t('HERO_BADGE', 'نحوّل أفكارك إلى منتجات رقمية', 'We Transform Your Ideas Into Digital Products')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white mb-6 flex flex-col gap-2" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              <TextReveal text={t('HERO_TITLE_LINE1', 'نبني منصات ذكية', 'We Build Smart Platforms')} className="mb-1" />
              <TextReveal
                text={t('HERO_TITLE_LINE2', 'تُسرّع نمو أعمالك', 'That Accelerate Your Business Growth')}
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'var(--ff-gradient)' }}
              />
            </h1>
            <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">
              {t('HERO_SUBTITLE', 'تطبيقات جوال، مواقع ويب متجاوبة، أنظمة CRM متكاملة، وحلول سحابية بأحدث التقنيات. نحن شريكك التقني للنمو والاستقرار.', 'Mobile apps, responsive websites, integrated CRM systems, and cloud solutions with the latest technologies. We are your technical partner for growth and stability.')}
            </p>
            <div className={`flex gap-4 flex-wrap ${lang === 'ar' ? 'justify-start' : 'justify-start'}`}>
              <motion.a
                href={`/${lang}/contact`}
                whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="px-8 py-4 text-[#030712] font-bold rounded-xl shadow-lg relative overflow-hidden group"
                style={{ background: 'var(--ff-gradient)' }}
              >
                <span className="relative z-10">{t('HERO_CTA', 'ابدأ مشروعك الآن', 'Start Your Project')}</span>
                <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              </motion.a>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                <Link href={`/${lang}/services`} className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all block text-center">
                  {t('HERO_BROWSE', 'تصفح خدماتنا', 'Browse Our Services')}
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Interactive Project Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="relative justify-center hidden lg:flex"
            style={{ perspective: 1200 }}
          >
            <div className="absolute w-[350px] h-[350px] bg-gradient-to-tr from-[var(--ff-accent)]/20 to-[var(--ff-primary)]/10 blur-[80px] rounded-full scale-75 pointer-events-none z-0 animate-pulse" />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              whileHover={{ rotateY: -6, rotateX: 6, scale: 1.02, transition: { duration: 0.4 } }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full max-w-[500px] aspect-square rounded-3xl p-6 bg-white/5 border border-white/10 backdrop-blur-2xl relative shadow-2xl overflow-hidden group cursor-pointer z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--ff-primary)]/10 to-transparent pointer-events-none" />
              {/* Window Chrome */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wider">FASTFREE_DASHBOARD</span>
              </div>
              {/* Project Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { icon: Globe, label: 'CRM System', status: 'active', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                  { icon: Smartphone, label: 'Mobile App', status: 'active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { icon: Server, label: 'ERP System', status: 'building', color: 'text-[var(--ff-primary)]', bg: 'bg-[var(--ff-primary)]/10', border: 'border-[var(--ff-primary)]/20' },
                  { icon: Code, label: 'Web Portal', status: 'active', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                ].map((project, j) => (
                  <motion.div key={j} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + j * 0.15 }} className={`p-3 rounded-xl bg-white/5 border ${project.border} hover:scale-105 transition-transform`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-lg ${project.bg} ${project.color} flex items-center justify-center`}>
                        <project.icon size={12} />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-white truncate">{project.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${project.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="text-[10px] sm:text-xs text-slate-400">{project.status === 'active' ? t('ACTIVE', 'نشط', 'Active') : t('BUILDING', 'قيد البناء', 'Building')}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* Progress Bars */}
              <div className="space-y-2.5">
                {[
                  { label: 'UI/UX Design', w: '92%', color: 'from-cyan-400 to-cyan-600' },
                  { label: 'Frontend Dev', w: '78%', color: 'from-[var(--ff-primary)] to-[var(--ff-primary-light)]' },
                  { label: 'Backend API', w: '85%', color: 'from-emerald-400 to-emerald-600' },
                ].map((bar, j) => (
                  <div key={j}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] sm:text-xs text-slate-400 font-medium">{bar.label}</span>
                      <span className="text-[10px] sm:text-xs text-slate-400 font-bold">{bar.w}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: bar.w }} transition={{ delay: 1.2 + j * 0.3, duration: 1.5, ease: 'easeOut' }} className={`h-full rounded-full bg-gradient-to-r ${bar.color}`} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/5 bg-[#080c16] py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-primary)]/5 via-transparent to-[var(--ff-accent)]/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 150, suffix: '+', label: t('STATS_PROJECTS', 'مشروع ناجح', 'Successful Projects') },
            { value: 120, suffix: '+', label: t('STATS_CLIENTS', 'عميل راضٍ', 'Happy Clients') },
            { value: 10, suffix: '+', label: t('STATS_EXPERIENCE', 'سنوات خبرة', 'Years Experience') },
            { value: 45, suffix: '+', label: t('STATS_ENGINEERS', 'مهندس ومصمم', 'Engineers & Designers') },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-3xl font-extrabold text-transparent bg-clip-text" style={{ backgroundImage: 'var(--ff-gradient)' }}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-slate-400 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How We Work */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              {t('PROCESS_TITLE', 'كيف نعمل؟', 'How We Work?')}
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              {t('PROCESS_DESC', 'نتبع منهجية واضحة لضمان تحقيق نتائج موثوقة لمشروعك', 'We follow a clear methodology to ensure reliable results for your project')}
            </p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          <div className="absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-[var(--ff-accent)]/30 via-[var(--ff-primary)]/30 to-[var(--ff-accent)]/30 hidden md:block" />
          {steps.map((step, i) => (
            <FadeIn key={i} delay={i * 0.15}>
              <div className="text-center relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--ff-accent)]/10 to-[var(--ff-primary)]/10 border border-white/10 flex items-center justify-center mx-auto mb-6 relative z-10 group hover:scale-110 transition-transform duration-300">
                  <step.icon size={32} className="text-[var(--ff-accent)]" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[var(--ff-accent)] text-[#030712] text-sm font-bold flex items-center justify-center">{i + 1}</div>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--ff-font-heading)' }}>{lang === 'ar' ? step.titleAr : step.titleEn}</h3>
                <p className="text-slate-400 text-sm">{lang === 'ar' ? step.descAr : step.descEn}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-[#080c16] relative overflow-hidden">
        <div className="absolute -top-[10%] left-[20%] w-72 h-72 rounded-full opacity-5 blur-[100px] pointer-events-none" style={{ background: 'var(--ff-primary)' }} />
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('SERVICES_SECTION_TITLE', 'حلول بسيطة وتطبيق احترافي', 'Simple Solutions, Professional Execution')}
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                {t('SERVICES_SECTION_DESC', 'نقدم خدمات متكاملة لتلبية تطلعات شركتك وتساعدك على المنافسة رقمياً.', 'We offer integrated services to meet your company aspirations and help you compete in the digital market.')}
              </p>
            </div>
          </FadeIn>

          {/* ERP/CRM Highlight Card */}
          <FadeIn>
            <Link href={`/${lang}/services`} className="block mb-12">
              <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-[var(--ff-primary)]/10 to-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-[var(--ff-accent)]/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--ff-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <div className="inline-flex items-center gap-2 bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] px-4 py-1.5 rounded-full text-xs font-bold mb-4">
                      <Star size={12} />
                      {t('FEATURED', 'مميز', 'Featured')}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                      {t('ERP_TITLE', 'أنظمة ERP & CRM متكاملة', 'Integrated ERP & CRM Systems')}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                      {t('ERP_DESC', 'نبني أنظمة تخطيط موارد وإدارة علاقات عملاء مخصصة لاحتياجات شركتك — من المخازن والمبيعات إلى الموارد البشرية.', 'We build customized ERP and CRM systems for your company needs — from inventory and sales to human resources.')}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {['Inventory', 'Sales', 'HR', 'Analytics', 'Reports'].map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden lg:flex justify-center">
                    <div className="w-64 h-48 rounded-2xl bg-white/5 border border-white/10 p-4 relative group-hover:scale-105 transition-transform duration-300">
                      <div className="flex gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {['bg-blue-500/20', 'bg-green-500/20', 'bg-[var(--ff-primary)]/20'].map((bg, j) => (
                          <div key={j} className={`h-14 rounded-lg ${bg} border border-white/5`} />
                        ))}
                      </div>
                      <div className="h-8 rounded-lg bg-white/5 border border-white/5 flex items-center px-3 gap-2">
                        <div className="w-16 h-2 rounded bg-white/10" />
                        <div className="flex-1" />
                        <div className="w-8 h-4 rounded bg-emerald-500/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </FadeIn>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {services.filter(s => s.is_active).map((service) => (
              <motion.div
                key={service.id}
                variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } }}
              >
                <SpotlightCard className="h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 mb-4 group-hover:scale-110 transition-transform">
                      <IconComponent name={service.icon} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{lang === 'ar' ? service.title_ar : service.title_en}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                      {lang === 'ar'
                        ? (service.description_ar ? service.description_ar.substring(0, 80) + '...' : '')
                        : (service.description_en ? service.description_en.substring(0, 80) + '...' : '')}
                    </p>
                    {service.features && Array.isArray(service.features) && (
                      <div className="space-y-1.5 mb-4">
                        {service.features.slice(0, 3).map((feat: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-slate-400 text-xs">
                            <Check className="text-[var(--ff-accent)] w-3 h-3 flex-shrink-0" />
                            <span>{feat.ar && feat.en ? (lang === 'ar' ? feat.ar : feat.en) : feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link href={`/${lang}/services?service=${service.id}`} className="text-sm font-semibold text-[var(--ff-accent)] flex items-center gap-2 hover:underline">
                    {t('SERVICE_VIEW_DETAILS', 'اعرف المزيد', 'Learn More')} <ArrowLeft size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
                  </Link>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
          <FadeIn>
            <div className="text-center mt-10">
              <Link href={`/${lang}/services`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all">
                {t('VIEW_ALL_SERVICES', 'عرض جميع الخدمات', 'View All Services')}
                <ArrowLeft size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Why FastFree */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
              {t('WHY_TITLE', 'لماذا FastFree؟', 'Why FastFree?')}
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              {t('WHY_DESC', 'نلتزم بمعايير جودة عالية لضمان نجاح مشروعك', 'We commit to high quality standards to ensure your project success')}
            </p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {whyUs.map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 text-center hover:border-[var(--ff-accent)]/30 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-[var(--ff-accent)]/10 text-[var(--ff-accent)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <item.icon size={28} />
                </div>
                <h3 className="font-bold mb-2">{lang === 'ar' ? item.titleAr : item.titleEn}</h3>
                <p className="text-slate-400 text-sm">{lang === 'ar' ? item.descAr : item.descEn}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 bg-[#080c16] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('TECH_TITLE', 'التقنيات المستخدمة', 'Technologies We Use')}
              </h2>
              <p className="text-slate-400 text-sm">{t('TECH_DESC', 'نستخدم أحدث التقنيات لضمان أداء عالي وقابلية للتوسع', 'We use the latest technologies for high performance and scalability')}</p>
            </div>
          </FadeIn>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:border-white/20 hover:bg-white/10 transition-all duration-300 cursor-default">
                  <div className="w-2 h-2 rounded-full" style={{ background: tech.color }} />
                  <span className="text-sm font-medium text-slate-300">{tech.name}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('PRODUCTS_TITLE', 'منتجاتنا الرقمية', 'Our Digital Products')}
              </h2>
              <p className="text-slate-400 max-w-md">
                {t('PRODUCTS_DESC', 'تطبيقات هاتف، مواقع ويب، وبرامج سطح مكتب — حلول رقمية متكاملة.', 'Mobile apps, websites, and desktop programs — integrated digital solutions.')}
              </p>
            </div>
            <Link href={`/${lang}/products`} className="mt-6 md:mt-0 text-sm font-bold text-[var(--ff-accent)] flex items-center gap-2 hover:underline">
              {t('VIEW_ALL_PRODUCTS', 'عرض جميع المنتجات', 'View All Products')}
              <ArrowLeft size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
            </Link>
          </div>
        </FadeIn>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {products.slice(0, 6).map((product) => (
            <motion.div
              key={product.id}
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } }}
              className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden group shadow-2xl hover:border-white/20 transition-all hover:scale-[1.01]"
            >
              <div className="h-56 relative overflow-hidden bg-slate-900">
                {product.thumbnail ? (
                  <Image src={product.thumbnail || '/assets/og-default.svg'} alt={lang === 'ar' ? product.name_ar : product.name_en} width={500} height={300} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" priority={true} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><HelpCircle size={48} /></div>
                )}
                <div className="absolute top-4 right-4 bg-[#030712]/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[var(--ff-accent)] border border-white/10">
                  {product.type === 'APP' ? t('PRODUCT_TYPE_APP', 'تطبيق', 'App') : product.type === 'WEBSITE' ? t('PRODUCT_TYPE_WEBSITE', 'موقع', 'Website') : t('PRODUCT_TYPE_PROGRAM', 'برنامج', 'Program')}
                </div>
                {product.version && (
                  <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-white/10 backdrop-blur-sm text-slate-300 border border-white/10">v{product.version}</span>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? product.name_ar : product.name_en}</h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">{lang === 'ar' ? product.short_description_ar : product.short_description_en}</p>
                <Link href={`/${lang}/products/${product.slug}`} className="text-sm font-bold text-white flex items-center gap-2 group-hover:text-[var(--ff-accent)] transition-colors">
                  {t('PRODUCT_DETAILS', 'تفاصيل', 'Details')}
                  <ArrowLeft size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-[#080c16] relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                  {t('TESTIMONIALS_TITLE', 'شركاء النجاح يقولون عنا', 'Our Partners Say About Us')}
                </h2>
              </div>
            </FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.filter((t) => t.isActive).slice(0, 3).map((testimonial) => (
                <SpotlightCard key={testimonial.id} className="flex flex-col justify-between">
                  <div>
                    <div className="flex gap-1 mb-4 text-yellow-500">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} size={16} fill="currentColor" />
                      ))}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4 italic">&ldquo;{testimonial.content}&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                    {testimonial.clientAvatar && (
                      <Image src={testimonial.clientAvatar || '/assets/og-default.svg'} alt={testimonial.clientName} width={40} height={40} className="w-10 h-10 rounded-full object-cover" sizes="(max-width: 768px) 100vw, 200px" />
                    )}
                    <div>
                      <h4 className="font-bold text-white text-sm">{testimonial.clientName}</h4>
                      <span className="text-xs text-slate-400">{testimonial.clientTitle}</span>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog Section */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
                {t('BLOG_TITLE', 'المدونة البرمجية', 'Tech Blog')}
              </h2>
              <p className="text-slate-400 max-w-md">
                {t('BLOG_DESC', 'أحدث المقالات التقنية، الشروحات، ونصائح التحول الرقمي.', 'Latest tech articles, tutorials, and digital transformation tips.')}
              </p>
            </div>
            <Link href={`/${lang}/blog`} className="mt-6 md:mt-0 text-sm font-bold text-[var(--ff-accent)] flex items-center gap-2 hover:underline">
              {t('MORE_ARTICLES', 'عرض كل المقالات', 'More Articles')}
              <ArrowLeft size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
            </Link>
          </div>
        </FadeIn>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {posts.filter((p) => p.is_published).slice(0, 3).map((post) => (
            <motion.div
              key={post.id}
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } }}
              className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden hover:border-white/20 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="h-48 overflow-hidden">
                  <Image src={post.cover_image || '/assets/og-default.svg'} alt={lang === 'ar' ? post.title_ar || '' : post.title_en || ''} width={600} height={400} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                </div>
                <div className="p-6">
                  <span className="text-xs font-bold text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 px-3 py-1 rounded-full">{post.category ?? ''}</span>
                  <h3 className="text-lg font-bold mt-3 mb-2 leading-snug group-hover:text-[var(--ff-accent)] transition-colors">{lang === 'ar' ? post.title_ar : post.title_en}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{lang === 'ar' ? post.excerpt_ar : post.excerpt_en}</p>
                </div>
              </div>
              <div className="px-6 pb-6 flex items-center justify-between text-xs text-slate-400">
                 <span>{post.published_at ? new Date(post.published_at).toLocaleDateString('ar-EG') : ''}</span>
                <Link href={`/${lang}/blog/${post.slug}`} className="font-bold text-white hover:text-[var(--ff-accent)] flex items-center gap-1">
                  {t('READ', 'اقرأ', 'Read')} <ArrowLeft size={12} className={lang === 'ar' ? 'rotate-180' : ''} />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-b from-[var(--ff-primary)]/10 to-[#030712] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--ff-accent)]/30 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            {t('CONTACT_SECTION_TITLE', 'هل لديك فكرة مشروع؟', 'Have a Project Idea?')}
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-10 leading-relaxed">
            {t('CONTACT_SECTION_DESC', 'تواصل معنا الآن للحصول على استشارة مجانية وعرض سعر مناسب لمشروعك.', 'Contact us now for a free consultation and a suitable quote for your project.')}
          </p>
          <motion.div whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(6, 182, 212, 0.4)' }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }} className="inline-block">
            <Link href={`/${lang}/contact`} className="inline-flex items-center gap-2 px-8 py-4 text-[#030712] font-bold rounded-xl shadow-lg" style={{ background: 'var(--ff-gradient)' }}>
              <MessageSquare size={18} />
              {t('CONTACT_CTA_BUTTON', 'تواصل معنا', 'Contact Us')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
